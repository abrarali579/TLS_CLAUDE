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

/** True when every cell in the row is blank. */
export const isBlankRow = (row) => row.every((c) => String(c ?? '').trim() === '');

/**
 * Parse into objects keyed by column heading.
 *
 * Real exports often have a title or a blank line above the headings, so the
 * header row is found rather than assumed: the first row that has several
 * non-empty cells and no duplicates.
 */
export function parseTable(text) {
  // Keep each row's original line number. Reporting "line 6" when the
  // spreadsheet says line 8 sends someone hunting through the wrong rows.
  const all = parseCsv(text).map((cells, i) => ({ cells, line: i + 1 }));
  const rows = all.filter((r) => !isBlankRow(r.cells));
  if (!rows.length) return { headers: [], rows: [], headerLine: -1 };

  let headerAt = 0;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const filled = rows[i].cells.filter((c) => String(c).trim() !== '');
    if (filled.length >= 2 && new Set(filled.map((c) => c.trim().toLowerCase())).size === filled.length) {
      headerAt = i;
      break;
    }
  }

  const headers = rows[headerAt].cells.map((h) => String(h).trim());
  const out = rows.slice(headerAt + 1).map((r) => {
    const obj = { __line: r.line };
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
  for (const w of wanted) {
    const partial = normalised.findIndex((h) => h && (h.includes(w) || w.includes(h)));
    if (partial !== -1) return headers[partial];
  }
  return null;
}
