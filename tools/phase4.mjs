/** Phase 4: pull the shared plumbing out of main.js, in dependency order. */
import { extract } from './extract.mjs';

const plan = [
  ['src/lib/dom.js', ['$', '$$', 'el', 'debounce'],
`/**
 * The smallest possible DOM helpers, used by every screen.
 *   $('#id')            one element
 *   $$('.cls')          all of them, as a real array
 *   el('div','cls','x') create an element in one line
 *   debounce(fn, ms)    run fn only once things settle down
 */
`],

  ['src/lib/csv.js', ['csv'],
`/** Turn rows of values into CSV text. Pure — no DOM, no app state. */
`],

  ['src/ui/theme.js', ['setTheme', 'accentFor'],
`/** Light/dark theme, and the colour picked for each account. */
`],

  ['src/ui/toast.js', ['toast', 'toastUndo'],
`/**
 * The small message that slides in at the bottom of the screen.
 * toastUndo() adds an Undo button — use it for anything destructive.
 */
`],

  ['src/ui/download.js', ['dl'],
`/** Hand the browser a file to save. */
`],

  ['src/ui/forms.js', ['field', 'input', 'pillControl', 'mkBtn'],
`/** Form building blocks: labelled fields, inputs, pill toggles, buttons. */
`],

  ['src/ui/modal.js', ['modal'],
`/** The dialog box used by every "are you sure" and every edit form. */
`],
  ['src/core/persist.js',
   ['DB', 'idb', 'kvGet', 'kvSet', 'fdb', 'FILE_STORE', 'MAX_FILE', 'filePut', 'fileGet', 'fileDel',
    '_t', 'save', 'audit', 'publishD'],
`/**
 * Saving to the browser's own database (IndexedDB).
 *
 * Two stores live in one database, opened at the SAME version everywhere.
 * save() is debounced, so rapid edits become one write. If storage is
 * unavailable the app keeps working in memory and warns the person once,
 * rather than dying with a blank screen.
 */
`],

  ['src/ui/autocomplete.js',
   ['AC_ADD', 'acT', 'acPlace', 'acShow', 'acHide', 'acOpen', 'acPicking', 'acPick', 'acNav', 'acKeys', 'bindAC'],
`/**
 * The suggestion list that drops down under company, employee and item fields.
 * Includes the "create this value" row, so a new name can be added without
 * leaving the sheet.
 */
`],

  ['src/ui/grid.js',
   ['gridCells', 'focusCell', 'maxRow', 'lockRow', 'unlockRow', 'bindRowLock', 'gridKey', 'bindPaste'],
`/**
 * The spreadsheet-style sheet: arrow-key movement between cells, row locking,
 * and pasting a block of cells straight from Excel.
 */
`],
];

for (const [out, names, header] of plan) {
  const r = extract(out, names, header);
  console.log(`${r.outFile.padEnd(24)} <- ${r.moved.join(', ')}`);
}
