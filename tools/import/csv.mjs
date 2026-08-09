/**
 * Reading CSV the way spreadsheets actually write it.
 *
 * Google Sheets exports hit every awkward case: a company name containing a
 * comma, a remark containing a newline, quotes inside quotes, a byte-order mark
 * at the start of the file, Windows line endings. Splitting on commas loses
 * data silently, which is the worst way to lose it.
 */

/** Parse CSV text into an array of arrays. */
export function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, ''); // strip the BOM Excel adds
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let i = 0;

  while (i < src.length) {
    const c = src[i];

    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }  // "" is a literal quote
        quoted = false; i++; continue;
      }
      field += c; i++; continue;
    }

    if (c === '"') { quoted = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }

    field += c; i++;
  }

  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * Find a column that has no heading but clearly holds dates.
 *
 * Your Data Entry sheet keeps the date in column A, and column A has no
 * heading — the date is simply typed in each morning. Matching on names alone
 * can never find it, and without a date nothing downstream works: no monthly
 * totals, no VAT periods, no ageing.
 */
export function findUnnamedDateColumn(headers, rows, isDate) {
  let best = null;
  headers.forEach((h, i) => {
    if (String(h).trim() !== '') return;   // it has a name; matched elsewhere
    const sample = rows.slice(0, 200).map((r) => String(r.cells?.[i] ?? r[`__col${i}`] ?? '').trim()).filter(Boolean);
    if (sample.length < 2) return;
    // A bare number must not count. JavaScript reads "100" as the year 100, so
    // a column of amounts would otherwise look like a perfect column of dates
    // and get imported as one.
    const looksLikeADate = (v) => !/^-?[\d.,]+$/.test(v) && isDate(v);
    const hits = sample.filter(looksLikeADate).length;
    const ratio = hits / sample.length;
    if (ratio >= 0.7 && (!best || ratio > best.ratio)) best = { index: i, ratio, seen: sample.length };
  });
  return best;
}

/** True when every cell in the row is blank. */
export const isBlankRow = (row) => row.every((c) => String(c ?? '').trim() === '');

/**
 * Parse into objects keyed by column heading.
 *
 * Real exports often have a title or a blank line above the headings, so the
 * header row is found rather than assumed: the first row that has several
 * non-empty cells and no duplicates.
 */
/**
 * Score each early row on how many of the expected columns it contains.
 * Real workbooks put a summary banner, a title, or a frozen totals row above
 * the actual headings — guessing "the first row with a few filled cells" picks
 * the banner and everything below it is read against the wrong names.
 */
export function findHeaderRow(rows, columnCandidates) {
  const groups = Object.values(columnCandidates ?? {});
  if (!groups.length) return null;

  let best = null;
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const headers = rows[i].cells.map((c) => String(c).trim());
    let score = 0;
    for (const candidates of groups) if (findColumn(headers, candidates)) score++;
    if (!best || score > best.score) best = { index: i, score };
  }
  return best && best.score >= 2 ? best : null;
}

export function parseTable(text, expect = null) {
  // Keep each row's original line number. Reporting "line 6" when the
  // spreadsheet says line 8 sends someone hunting through the wrong rows.
  const all = parseCsv(text).map((cells, i) => ({ cells, line: i + 1 }));
  const rows = all.filter((r) => !isBlankRow(r.cells));
  if (!rows.length) return { headers: [], rows: [], headerLine: -1 };

  // When we know what the columns should be called, find the row that has them.
  const scored = expect ? findHeaderRow(rows, expect) : null;
  let headerAt = scored ? scored.index : 0;

  if (!scored) for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const filled = rows[i].cells.filter((c) => String(c).trim() !== '');
    if (filled.length >= 2 && new Set(filled.map((c) => c.trim().toLowerCase())).size === filled.length) {
      headerAt = i;
      break;
    }
  }

  // Two tables side by side in one sheet means the same heading twice. Left as
  // is, the second column overwrites the first and you silently read the wrong
  // table. Number the repeats instead.
  const seenHeads = new Map();
  const headers = rows[headerAt].cells.map((h) => {
    const name = String(h).trim();
    if (name === '') return '';
    const n = (seenHeads.get(name) ?? 0) + 1;
    seenHeads.set(name, n);
    return n === 1 ? name : `${name} (${n})`;
  });
  const out = rows.slice(headerAt + 1).map((r) => {
    // __cells keeps the unnamed columns reachable — the date column has no
    // heading, so without this it would be invisible.
    const obj = { __line: r.line, __cells: r.cells.map((c) => (c === undefined ? '' : String(c).trim())) };
    headers.forEach((h, k) => { if (h) obj[h] = r.cells[k] === undefined ? '' : String(r.cells[k]).trim(); });
    return obj;
  });

  return { headers, rows: out, headerLine: rows[headerAt].line };
}

/**
 * Find the column that holds a given field.
 * Headings drift — "Received", "RECEIVED", "Amount Received", "received " —
 * so match loosely rather than making people rename their columns.
 */
export function findColumn(headers, candidates) {
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const wanted = candidates.map(norm);
  const normalised = headers.map(norm);

  for (const w of wanted) {
    const exact = normalised.indexOf(w);
    if (exact !== -1) return headers[exact];
  }
  // Header contains the whole candidate: "amount received" matches "received".
  for (const w of wanted) {
    const partial = normalised.findIndex((h) => h && h.includes(w));
    if (partial !== -1) return headers[partial];
  }
  // Deliberately no "candidate contains header" pass. It matched a column
  // called "No." to invoiceNo, and a column called "RECEIVED" to
  // "received into" — importing the wrong table's figures both times. If a
  // real column needs matching, add its exact name to the list in schema.mjs.
  return null;
}
