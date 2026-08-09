/**
 * Bring a Google Sheets workbook into TimeLink — safely, and more than once.
 *
 *   node tools/import/import.mjs                    read import/, write import/report.md
 *   node tools/import/import.mjs --into backup.json  merge on top of an existing backup
 *   node tools/import/import.mjs --write             also write the TimeLink backup file
 *
 * Nothing is loaded into the app. This produces a file and a report; you read
 * the report, check the monthly totals against your spreadsheet, and only then
 * use Data & Settings → Restore Backup.
 *
 * Running it again is safe. Every row gets an id derived from its own content,
 * so re-importing an updated export brings in the new rows and leaves the
 * existing ones alone.
 */
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { parseTable, findColumn, findUnnamedDateColumn } from './csv.mjs';
import { SHEETS, NOT_DATA } from './schema.mjs';
import { parseAnyDate } from '../../src/lib/dates.js';
import { n } from '../../src/lib/format.js';

const IMPORT_DIR = process.env.TIMELINK_IMPORT_DIR || 'import';

/** A row's identity, from the fields that define it. Stable across re-imports. */
export function rowKey(sheet, row) {
  const parts = SHEETS[sheet].key.map((f) => String(row[f] ?? '').trim().toUpperCase());
  return 'imp-' + createHash('sha1').update(sheet + '|' + parts.join('|')).digest('hex').slice(0, 12);
}

/** Which sheet type is this file? */
export function classify(filename) {
  const name = basename(filename, '.csv');
  if (NOT_DATA.test(name)) return 'skip';
  for (const [key, def] of Object.entries(SHEETS)) if (def.match.test(name)) return key;
  return null;
}

/** Turn one parsed CSV table into TimeLink rows, collecting anything odd. */
export function convert(sheet, table) {
  const def = SHEETS[sheet];
  const problems = [];
  const mapping = {};
  const missing = [];

  for (const [field, candidates] of Object.entries(def.columns)) {
    const col = findColumn(table.headers, candidates);
    if (col) mapping[field] = col;
    else if ((def.required ?? []).includes(field)) missing.push(field);
  }

  // A date column with no heading — typed straight into column A each day.
  let dateColumnIndex = null;
  const notes = [];
  for (const field of def.dates ?? []) {
    if (mapping[field] || !(def.required ?? []).includes(field)) continue;
    const found = findUnnamedDateColumn(
      table.headers,
      table.rows.map((r) => ({ cells: r.__cells })),
      (v) => Boolean(parseAnyDate(v))
    );
    if (found) {
      dateColumnIndex = { field, index: found.index };
      mapping[field] = `column ${found.index + 1} (no heading — dates)`;
      missing.splice(missing.indexOf(field), 1);
      notes.push(`used column ${found.index + 1}, which has no heading, for ${field} — ${Math.round(found.ratio * 100)}% of its values read as dates`);
    }
  }
  if (missing.length) {
    // Say what WAS found, otherwise "no column found for: date" leaves you
    // guessing whether the file is wrong or the header row was misread.
    const seen = table.headers.filter((h) => h !== '').join(' | ') || '(no headings found)';
    return {
      rows: [], mapping, skipped: table.rows.length,
      problems: [{
        line: 0,
        why: `no column found for: ${missing.join(', ')}. The headings read at line ${table.headerLine} were: ${seen}`,
      }],
    };
  }

  const rows = [];
  let skipped = 0;
  let lastDate = '';
  let carried = 0;

  table.rows.forEach((raw) => {
    const line = raw.__line; // the row number the spreadsheet shows
    const out = {};
    for (const [field, col] of Object.entries(mapping)) out[field] = raw[col] ?? '';
    if (dateColumnIndex) out[dateColumnIndex.field] = raw.__cells?.[dateColumnIndex.index] ?? '';

    // Tick-box columns (the visa tracker) become one object of step -> done.
    if (def.booleanGroup) {
      const used = new Set(Object.values(mapping));
      const steps = {};
      for (const h of table.headers) {
        if (!h || used.has(h) || (def.booleanGroup.exclude ?? []).some((x) => h.toUpperCase().includes(x.toUpperCase()))) continue;
        steps[h] = /^(true|yes|y|1|done|✓)$/i.test(String(raw[h] ?? '').trim());
      }
      if (Object.keys(steps).length) out[def.booleanGroup.field] = steps;
    }

    // A row with nothing in any mapped column is padding, not data.
    if (Object.values(out).every((v) => String(v).trim() === '')) { skipped++; return; }

    // Long spreadsheets repeat their header row every so often, and those
    // rows arrive looking like data. Read the values first, then decide.
    const dateTries = [];
    for (const f of def.dates ?? []) {
      const before = out[f];
      out[f] = parseAnyDate(before);
      if (before) dateTries.push({ f, before, ok: Boolean(out[f]) });
    }
    for (const f of def.numbers ?? []) out[f] = n(out[f]);

    const everyDateFailed = dateTries.length > 0 && dateTries.every((d) => !d.ok);
    const everyNumberZero = (def.numbers ?? []).length > 0 && (def.numbers ?? []).every((f) => n(out[f]) === 0);
    if (everyDateFailed && everyNumberZero) {
      // Not a record: no readable date anywhere and no money in it either.
      problems.push({ line, why: 'looks like a repeated header or divider row — skipped' });
      skipped++;
      return;
    }

    // A date entered once at the top of the day, with the rows beneath left
    // blank, is normal in a hand-kept sheet. Carry it down rather than losing
    // those rows — and count how often, so it can be sanity-checked.
    for (const f of def.dates ?? []) {
      if (!(def.required ?? []).includes(f)) continue;
      if (out[f]) lastDate = out[f];
      else if (lastDate) { out[f] = lastDate; carried++; }
    }

    for (const d of dateTries) {
      if (!d.ok) problems.push({ line, why: `could not read the date "${d.before}"` });
    }

    for (const f of def.required ?? []) {
      if (String(out[f] ?? '').trim() === '') { problems.push({ line, why: `${f} is empty` }); skipped++; return; }
    }

    if (def.checkProfit) {
      const expected = Math.round((n(out.received) - n(out.expense)) * 100) / 100;
      if (Math.abs(expected - n(out.profit)) > 0.005) {
        problems.push({
          line,
          why: `profit is ${out.profit} but received − expense is ${expected} — kept your figure, not corrected`,
        });
      }
    }

    out.id = rowKey(sheet, out);
    rows.push(out);
  });

  // Two identical rows in the same export would collide on id.
  const seen = new Map();
  const unique = [];
  for (const r of rows) {
    if (seen.has(r.id)) { problems.push({ line: 0, why: `duplicate row ignored: ${describe(sheet, r)}` }); continue; }
    seen.set(r.id, true);
    unique.push(r);
  }

  if (carried) notes.push(`${carried} row(s) had no date of their own and took the date from the row above`);
  for (const note of notes) problems.push({ line: 0, why: note, note: true });

  return { rows: unique, mapping, problems, skipped };
}

const describe = (sheet, r) =>
  SHEETS[sheet].key.map((f) => r[f]).filter((x) => x !== '' && x !== undefined).join(' / ');

/** Merge imported rows into an existing collection, matching on id. */
export function merge(existing = [], incoming = []) {
  const byId = new Map(existing.filter((r) => r && r.id).map((r) => [r.id, r]));
  let added = 0, kept = 0;
  for (const row of incoming) {
    if (byId.has(row.id)) { kept++; continue; }
    byId.set(row.id, row);
    added++;
  }
  const untracked = existing.filter((r) => !r || !r.id);
  return { rows: [...untracked, ...byId.values()], added, kept };
}

/** Row counts and per-month money totals, for checking against the spreadsheet. */
export function monthlyTotals(rows, dateField, valueFields) {
  const months = new Map();
  for (const r of rows) {
    const key = String(r[dateField] ?? '').slice(0, 7) || '(no date)';
    const acc = months.get(key) ?? Object.fromEntries(valueFields.map((f) => [f, 0]));
    for (const f of valueFields) acc[f] = Math.round((acc[f] + n(r[f])) * 100) / 100;
    acc.rows = (acc.rows ?? 0) + 1;
    months.set(key, acc);
  }
  return [...months.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function run({ dir = IMPORT_DIR, into = null, write = false } = {}) {
  if (!existsSync(dir)) { mkdirSync(dir, { recursive: true }); }
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.csv'));

  const base = into && existsSync(into) ? JSON.parse(readFileSync(into, 'utf8')) : {};
  const store = { ...base };
  const lines = [];
  const say = (s = '') => lines.push(s);

  say('# Import report');
  say('');
  say(`Ran ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${files.length} file(s) in \`${dir}/\``);
  say('');
  say('**Nothing has been loaded into the app.** Check the monthly totals below');
  say('against your Google Sheet first. If they match, load the backup file with');
  say('Data & Settings → ⬆ Restore Backup.');
  say('');

  if (!files.length) {
    say('## No CSV files found');
    say('');
    say(`Export each tab from Google Sheets (File → Download → CSV) into \`${dir}/\`,`);
    say('then run this again. See `import/README.md` for the naming.');
    writeFileSync(join(dir, 'report.md'), lines.join('\n'));
    return { store, files: [], report: lines.join('\n') };
  }

  const summary = [];
  const allProblems = [];

  for (const file of files.sort()) {
    const sheet = classify(file);
    if (sheet === 'skip') {
      summary.push({ file, sheet: 'skip', label: 'not a data tab — skipped', added: 0, kept: 0, skipped: 0, problems: 0 });
      continue;
    }
    if (!sheet) {
      summary.push({ file, sheet: '—', added: 0, kept: 0, skipped: 0, problems: 1 });
      allProblems.push({ file, line: 0, why: 'could not tell which tab this is from the filename' });
      continue;
    }
    const table = parseTable(readFileSync(join(dir, file), 'utf8'), SHEETS[sheet].columns);
    const { rows, mapping, problems, skipped } = convert(sheet, table);
    const { rows: merged, added, kept } = merge(store[sheet] ?? [], rows);
    store[sheet] = merged;

    summary.push({ file, sheet, label: SHEETS[sheet].label, added, kept, skipped, problems: problems.length, mapping });
    for (const p of problems) allProblems.push({ file, ...p });
  }

  say('## What was read');
  say('');
  say('| File | Tab | New rows | Already there | Blank rows skipped | Notes |');
  say('|---|---|---:|---:|---:|---:|');
  for (const s of summary) {
    say(`| ${s.file} | ${s.label ?? s.sheet} | ${s.added} | ${s.kept} | ${s.skipped} | ${s.problems} |`);
  }
  say('');

  const emptyFiles = summary.filter((x) => x.sheet !== 'skip' && x.added === 0 && x.kept === 0);
  if (emptyFiles.length) {
    say('## Nothing was read from these files');
    say('');
    say('This is the part to fix first — these tabs contributed no rows at all.');
    say('');
    for (const f of emptyFiles) say(`- **${f.file}** (${f.label ?? f.sheet}) — ${f.skipped} row(s) skipped`);
    say('');
  }

  say('## Column mapping');
  say('');
  say('Check this. A column matched to the wrong field is the easiest way to get');
  say('a clean-looking import that is quietly wrong.');
  say('');
  for (const s of summary) {
    if (!s.mapping) continue;
    say(`**${s.file}** → ${s.label}`);
    say('');
    for (const [field, col] of Object.entries(s.mapping)) say(`- \`${field}\` ← column "${col}"`);
    say('');
  }

  const tx = store.transactions ?? [];
  if (tx.length) {
    say('## Monthly totals — compare these with your spreadsheet');
    say('');
    say('| Month | Rows | Received | Expense | Profit |');
    say('|---|---:|---:|---:|---:|');
    let R = 0, E = 0, P = 0;
    for (const [month, t] of monthlyTotals(tx, 'date', ['received', 'expense', 'profit'])) {
      say(`| ${month} | ${t.rows} | ${t.received.toFixed(2)} | ${t.expense.toFixed(2)} | ${t.profit.toFixed(2)} |`);
      R += t.received; E += t.expense; P += t.profit;
    }
    say(`| **TOTAL** | **${tx.length}** | **${R.toFixed(2)}** | **${E.toFixed(2)}** | **${P.toFixed(2)}** |`);
    say('');
  }

  if (allProblems.length) {
    say(`## Things to look at (${allProblems.length})`);
    say('');
    say('Grouped, because the same issue repeated 200 times tells you nothing');
    say('extra. Each group shows the first few line numbers.');
    say('');

    // "could not read the date \"784199...\"" and the same for another id are
    // the same problem, so strip the specific value before grouping.
    const kindOf = (why) => why
      .replace(/"[^"]*"/g, '"…"')
      .replace(/\b\d[\d.,]*\b/g, 'N');

    const groups = new Map();
    for (const p of allProblems) {
      const key = `${p.file}|${kindOf(p.why)}`;
      const g = groups.get(key) ?? { file: p.file, why: kindOf(p.why), lines: [], examples: [] };
      if (p.line) g.lines.push(p.line);
      if (g.examples.length < 3) g.examples.push(p.why);
      groups.set(key, g);
    }

    for (const g of [...groups.values()].sort((a, b) => b.lines.length - a.lines.length)) {
      const where = g.lines.length
        ? ` — ${g.lines.length} row(s), first at line ${g.lines.slice(0, 5).join(', ')}${g.lines.length > 5 ? '…' : ''}`
        : '';
      say(`- **${g.file}**${where}`);
      say(`  - ${g.examples[0]}`);
      if (g.examples[1] && g.examples[1] !== g.examples[0]) say(`  - ${g.examples[1]}`);
    }
    say('');
  } else {
    say('## Things to look at');
    say('');
    say('Nothing. Every row read cleanly.');
    say('');
  }

  const report = lines.join('\n');
  writeFileSync(join(dir, 'report.md'), report);
  if (write) writeFileSync(join(dir, 'timelink-import.json'), JSON.stringify(store, null, 0));

  return { store, files: summary, problems: allProblems, report };
}

// Only run when this file IS the command, not when it is imported.
// `file://${process.argv[1]}` looks right and works on Linux, but on Windows
// argv[1] is "D:\\path\\file.mjs" while import.meta.url is
// "file:///D:/path/file.mjs" — they never match, so the command does nothing
// at all and prints nothing to explain why. pathToFileURL does it properly.
// `node -e "import(...)"` has no argv[1] at all, so check before converting.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const into = args.includes('--into') ? args[args.indexOf('--into') + 1] : null;
  const write = args.includes('--write');
  const { files, problems } = run({ into, write });
  console.log(`read ${files.length} file(s), ${problems?.length ?? 0} thing(s) to look at`);
  console.log('report written to import/report.md');
  if (write) console.log('backup written to import/timelink-import.json');
  else console.log('(add --write to also produce the backup file)');
}
