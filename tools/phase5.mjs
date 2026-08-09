/** Phase 5: move the business calculations out of main.js, in dependency order. */
import { extract } from './extract.mjs';

const plan = [
  ['src/domain/statement.js', ['SS', 'companyEntries', 'buildStatement', 'allCompanies'],
`/**
 * Statement of account for one company: every entry, what was paid, what is
 * still owed, and the running balance.
 */
`],

  ['src/domain/invoices.js',
   ['LINE_ROWS', 'DOC_TYPES', 'docCfg', 'blankInvoice', 'yymm', 'docPrefix', 'parseInvNo',
    'nextInvNo', 'invMismatch', 'findInvoice', 'invTotals', 'normDate'],
`/**
 * Invoices: numbering, blank documents, and the totals.
 *
 * The rule that matters most: VAT applies to the SERVICE FEE only, never to
 * government charges passed through at cost. Pinned in test/money.test.js.
 */
`],

  ['src/domain/partners.js', ['partnerData'],
`/**
 * Partner profit split: gross profit less office expenses and reserves, then
 * shared out, minus whatever each partner has already drawn.
 */
`],

  ['src/domain/recurring.js', ['FREQ', 'newRecurring', 'advanceDate', 'dueRecurring', 'postRecurring', 'postAllDue'],
`/** Scheduled entries — rent, salaries, renewals — and posting them when due. */
`],

  ['src/domain/employees.js', ['employeeStats', 'employeeList', 'workList', 'employeeHistory'],
`/** Per-employee work history and the profit each one brought in. */
`],

  ['src/domain/accounts.js',
   ['ACC_FALLBACK', 'accMeta', 'accColor', 'accountBalances', 'accountNames', 'accSettleNames',
    'PALETTE', 'companyBalances', 'accountMovements'],
`/**
 * Cash, bank and credit accounts.
 *
 * Asset accounts show a balance (in − out). Credit accounts show what is still
 * OWED, which is the opposite direction — mixing the two up is the classic bug
 * here, so both are pinned in test/money.test.js.
 */
`],

  ['src/domain/vat.js', ['vatRate', 'vatRows', 'quarterOf', 'vatPeriods', 'periodLabel', 'vatDetail'],
`/** VAT return: output tax on service fees, grouped into filing periods. */
`],

  ['src/domain/ageing.js', ['AGE_BUCKETS', 'daysBetween', 'ageCompany', 'ageAll'],
`/** Receivables ageing: who owes money, and how long it has been outstanding. */
`],
];

for (const [out, names, header] of plan) {
  const r = extract(out, names, header);
  console.log(`${r.outFile.padEnd(28)} <- ${r.moved.length} names`);
}
