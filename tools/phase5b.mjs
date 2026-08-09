/** Phase 5, second pass: seed data, pick lists, row shapes, PDF chrome. */
import { extract } from './extract.mjs';

const plan = [
  ['src/core/seed.js', ['SEED', 'freshSeed', 'migrate'],
`/**
 * The starting dataset baked into the page, and the upgrade path for data
 * saved by older versions.
 *
 * migrate() must stay backwards compatible: someone restoring a year-old
 * backup should end up with a usable store, not a crash.
 */
`],

  ['src/domain/rows.js',
   ['COL', 'SPARE', 'isBlankTx', 'newTx', 'isBlankPay', 'newPay', 'isBlankExp', 'newExp',
    'isBlankCB', 'newCB', 'monthKey'],
`/**
 * The shape of a row in each sheet, and how to tell a genuinely blank one from
 * a half-typed one. The isBlank* checks stop empty spare rows being saved.
 */
`],

  ['src/domain/lists.js',
   ['XFER_PREFIX', 'serviceTypes', 'itemNames', 'customerNames', 'expCategories',
    'accountPick', 'companyMatch', 'cbPickList'],
`/** The pick lists that feed every dropdown and autocomplete in the app. */
`],

  ['src/domain/attachments.js', ['attachmentsFor', 'attachCount'],
`/** Files attached to an entry, kept in the browser's own file store. */
`],

  ['src/domain/whatsapp.js', ['waNumber'],
`/** Turning a stored phone number into something WhatsApp will accept. */
`],

  ['src/ui/pdf.js', ['PDF_CSS', 'PDF_LOGO', 'pdfHeader', 'pdfBank', 'openPDF'],
`/** Print/PDF output: the page styling, letterhead and bank block. */
`],

  ['src/domain/dashboard.js', ['DR', 'AF', 'inRange', 'autoRange', 'trendPoints', 'dayspan'],
`/** Date ranges and trend lines behind the dashboard. */
`],
];

for (const [out, names, header] of plan) {
  const r = extract(out, names, header);
  console.log(`${r.outFile.padEnd(28)} <- ${r.moved.length} names`);
}
