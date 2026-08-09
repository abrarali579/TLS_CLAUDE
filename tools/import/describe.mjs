/**
 * Show what is actually in the CSV exports.
 *
 *   node tools/import/describe.mjs                 column names only — safe to share
 *   node tools/import/describe.mjs --sample 2      also show 2 real rows per file
 *
 * The importer has to guess which spreadsheet column means what. When it
 * guesses wrong, this is how you find out why. Column names alone contain no
 * customer data, so the default output can be pasted anywhere.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCsv, parseTable } from './csv.mjs';
import { classify } from './import.mjs';
import { SHEETS } from './schema.mjs';

const DIR = process.env.TIMELINK_IMPORT_DIR || 'import';

export function describe({ dir = DIR, sample = 0 } = {}) {
  if (!existsSync(dir)) return `no folder called ${dir}`;
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.csv')).sort();
  if (!files.length) return `no CSV files in ${dir}`;

  const out = [];
  for (const file of files) {
    const text = readFileSync(join(dir, file), 'utf8');
    const raw = parseCsv(text);
    const sheet = classify(file);
    const t = parseTable(text, sheet && sheet !== 'skip' ? SHEETS[sheet]?.columns : null);

    out.push('='.repeat(70));
    out.push(file);
    out.push(`  recognised as : ${sheet ?? 'NOT RECOGNISED'}`);
    out.push(`  lines in file : ${raw.length}`);
    out.push(`  header found  : line ${t.headerLine}`);
    out.push(`  data rows     : ${t.rows.length}`);
    out.push('  columns:');
    t.headers.forEach((h, i) => out.push(`    ${String(i + 1).padStart(3)}. ${h === '' ? '(blank)' : h}`));

    // The first few lines verbatim, so a title row or a second header shows up.
    // Every column, not the first dozen — the missing one is always the
    // thirteenth. Truncating this is how a whole day of guessing starts.
    out.push('  first 6 lines, every column:');
    raw.slice(0, 6).forEach((line, i) => {
      out.push(`    line ${i + 1}:`);
      line.forEach((cell, k) => {
        const v = String(cell).trim();
        if (v !== '') out.push(`      col ${String(k + 1).padStart(2)} = ${v.slice(0, 40)}`);
      });
    });

    if (sample > 0) {
      out.push(`  ${sample} sample row(s):`);
      for (const row of t.rows.slice(0, sample)) {
        const pairs = Object.entries(row).filter(([k]) => k !== '__line').slice(0, 12);
        out.push(`    ${pairs.map(([k, v]) => `${k}=${String(v).slice(0, 20)}`).join('  ')}`);
      }
    }
    out.push('');
  }
  return out.join('\n');
}

// `node -e "import(...)"` has no argv[1] at all, so check before converting.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const sample = args.includes('--sample') ? Number(args[args.indexOf('--sample') + 1]) || 1 : 0;
  console.log(describe({ sample }));
}
