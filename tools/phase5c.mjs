/** Phase 5, final pass: the screens themselves, plus the bits they share. */
import { extract } from './extract.mjs';

const plan = [
  // ---- shared UI pieces, needed by many screens ----
  ['src/ui/widgets.js', ['kpiRow', 'gw', 'listView', 'svgLine'],
`/** Small building blocks reused across screens: KPI tiles, grid widths, list layouts, sparklines. */\n`],

  ['src/ui/quick-add.js', ['quickAddCompany', 'quickAddEmployee', 'quickAddWork'],
`/** "Create this value" — adding a company, employee or work item without leaving the sheet. */\n`],

  ['src/ui/attachments-ui.js', ['attachButton', 'attachmentDialog'],
`/** The paperclip button and the dialog listing files attached to an entry. */\n`],

  ['src/domain/alerts.js', ['allAlerts', 'insuranceSoon', 'dataIssues'],
`/** Everything needing attention: expiring insurance, mismatched invoices, data problems. */\n`],

  // ---- the data entry sheet and everything it owns ----
  ['src/views/entry.js',
   ['EF', 'SKIP_FOCUS', 'HEAD_ACCOUNTS', 'PANEL_HIDDEN', 'txRows', 'txRow', 'touchRow',
    'applyWorkRate', 'paintProfit', 'growEntry', 'ensureSpare', 'topUpBlanks',
    'refreshEntryTotals', 'buildAccountPanel', 'buildSearchPanel', 'openSearch',
    'dateFilterDialog', 'exportTxCSV', 'renderEntry'],
`/** Data Entry — the daily work sheet, and the table machinery other screens reuse. */\n`],

  // ---- cash book ----
  ['src/views/cashbook.js',
   ['CB', 'CBCOL', 'cbColumn', 'cbRows', 'topUpCB', 'cbRefresh', 'ensureCBSpare', 'growCB',
    'refreshCBTotals', 'buildCashbookPanel', 'syncLinkedTransfer', 'syncLinkedPayment',
    'renderCashbook'],
`/** Cash Book — manual cash and bank entries, and the transfers they mirror. */\n`],

  // ---- accounts ----
  ['src/views/accounts.js',
   ['accountHistory', 'accountDialog', 'adjustDialog', 'transferDialog',
    'renderAccounts', 'renderAccountsBalancesOnly'],
`/** Cash & Bank — account cards, movements, adjustments and transfers. */\n`],

  // ---- invoicing ----
  ['src/views/invoice.js',
   ['INV', 'ICOL', 'invLine', 'srcTag', 'applyTemplate', 'validateInv', 'saveInvoice',
    'loadInvoice', 'navInv', 'shareInvoiceWA', 'exportInvoicePDF', 'renderInvoice',
    'renderInvoiceList'],
`/** Invoice Builder and Invoice Register. */\n`],

  ['src/views/statement.js',
   ['drawStatement', 'exportStatementCSV', 'exportStatementPDF', 'shareStatementWA', 'renderStatement'],
`/** Statement of Account, with PDF and WhatsApp sharing. */\n`],

  ['src/views/payments.js', ['PCOL', 'topUpPayments', 'growPayments', 'ensurePaySpare', 'renderPayments'],
`/** Payments Received. */\n`],

  ['src/views/expenses.js', ['XCOL', 'topUpExpenses', 'growExpenses', 'ensureExpSpare', 'renderExpenses'],
`/** Expenses — office and business overheads. */\n`],

  ['src/views/partners.js', ['partnerDialog', 'withdrawDialog', 'renderPartners'],
`/** Partner Shares — the profit split and withdrawals. */\n`],

  ['src/views/vat.js', ['VATMODE', 'renderVAT'], `/** VAT Return. */\n`],
  ['src/views/ageing.js', ['batchStatements', 'renderAgeing'], `/** Receivables Ageing. */\n`],
  ['src/views/recurring.js', ['recurringDialog', 'renderRecurring'], `/** Recurring Entries. */\n`],
  ['src/views/companies.js', ['companyDialog', 'renderCompanies'], `/** Companies & Balances. */\n`],
  ['src/views/rates.js', ['rateDialog', 'renderRates'], `/** Rates Master. */\n`],
  ['src/views/templates.js', ['templateDialog', 'renderTemplates'], `/** Service Templates. */\n`],
  ['src/views/data.js', ['repairDialog', 'renderData'], `/** Data & Settings — backup, restore, company details. */\n`],
  ['src/views/dashboard.js', ['renderDash'], `/** Dashboard. */\n`],
  ['src/views/alerts.js', ['renderAlerts'], `/** Alerts Centre. */\n`],
  ['src/views/employees.js', ['renderEmployees'], `/** Employees. */\n`],
  ['src/views/audit.js', ['renderAudit'], `/** Activity Log. */\n`],
  ['src/views/visa.js', ['renderVisa'], `/** Visa Tracker. */\n`],
  ['src/views/insurance.js', ['renderInsurance'], `/** Insurance Data. */\n`],
  ['src/views/contacts.js', ['renderContacts'], `/** Contacts. */\n`],

  ['src/views/assistant.js',
   ['aiCfg', 'aiSnapshot', 'AI_TOOLS', 'AI_UNDO', 'aiRecord', 'aiUndoLast', 'aiRunTool',
    'aiToolSpecs', 'AI_SYSTEM', 'aiPing', 'aiChat', 'aiTurn', 'aiOffline', 'AI_HISTORY',
    'AI_BUSY', 'aiOpen', 'aiCheck', 'aiGreet', 'aiBubble', 'aiToolChip', 'aiSend',
    'aiSetupHint', 'aiSettings', 'renderAssistant'],
`/**
 * AI Assistant — talks to a local Ollama model, so business data never leaves
 * the machine. Every action it takes is recorded so it can be undone.
 */\n`],
];

for (const [out, names, header] of plan) {
  try {
    const r = extract(out, names, header);
    console.log(`ok   ${r.outFile.padEnd(30)} ${r.moved.length}`);
  } catch (e) {
    console.log(`SKIP ${out.padEnd(30)} ${e.message.split('\n')[0]}`);
  }
}
