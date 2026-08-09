/** Phase 5 clean-up: the screens that had to move together. */
import { extract } from './extract.mjs';

const plan = [
  // Data Entry and the Cash Book call each other — a cash-book row can create a
  // transaction and vice versa — so they cannot be separated without breaking
  // the cycle first. They live together and share the table machinery.
  ['src/views/sheets.js',
   ['EF', 'SKIP_FOCUS', 'HEAD_ACCOUNTS', 'PANEL_HIDDEN', 'txRows', 'txRow', 'touchRow',
    'applyWorkRate', 'paintProfit', 'growEntry', 'ensureSpare', 'topUpBlanks',
    'refreshEntryTotals', 'buildAccountPanel', 'buildSearchPanel', 'openSearch',
    'dateFilterDialog', 'exportTxCSV', 'renderEntry',
    'CB', 'CBCOL', 'cbColumn', 'cbRows', 'topUpCB', 'cbRefresh', 'ensureCBSpare', 'growCB',
    'refreshCBTotals', 'buildCashbookPanel', 'syncLinkedTransfer', 'syncLinkedPayment',
    'renderCashbook'],
`/**
 * The two spreadsheet screens: Data Entry and the Cash Book.
 *
 * They live in one file on purpose. A cash-book row can create a transaction
 * and a transaction can mirror into the cash book, so the two call each other.
 * Splitting them would mean a circular import; keeping them together is
 * honest about how they actually work.
 */\n`],

  ['src/views/data.js', ['repairDialog', 'renderData'],
`/** Data & Settings — backup, restore, repair, company details. */\n`],

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
    console.log(`ok   ${r.outFile.padEnd(28)} ${r.moved.length}`);
  } catch (e) {
    console.log(`SKIP ${out.padEnd(28)} ${e.message.split('\n')[0]}`);
  }
}
