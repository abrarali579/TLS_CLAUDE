import { n, m0, m2, uid, esc } from './lib/format.js';
import { MON, fmtDate, today, daysAgo, parseClipTable, parseAnyDate } from './lib/dates.js';
import { D, setD } from './core/store.js';
import { rateMap, rateBust, findRate, invoiceRate } from './domain/rates.js';
import { $, $$, debounce, el } from './lib/dom.js';
import { csv } from './lib/csv.js';
import { accentFor, setTheme } from './ui/theme.js';
import { toast, toastUndo } from './ui/toast.js';
import { dl } from './ui/download.js';
import { field, input, mkBtn, pillControl } from './ui/forms.js';
import { modal } from './ui/modal.js';
import { audit, kvGet, kvSet, publishD, save, saveNow } from './core/persist.js';
import { backendName, chooseBackend, isShared } from './core/backend.js';
import { currentUser, loadSession, may, signOut } from './core/session.js';
import { AC_ADD, acAdd, acHide, acI, acKeys, acNav, acOpen, acPick, acPicking, acPlace, acShow, acT, acX, bindAC } from './ui/autocomplete.js';
import { bindPaste, bindRowLock, focusCell, gridCells, gridKey, lockRow, maxRow, unlockRow } from './ui/grid.js';
import { SS, allCompanies, buildStatement, companyEntries, setSS } from './domain/statement.js';
import { DOC_TYPES, LINE_ROWS, blankInvoice, docCfg, docPrefix, findInvoice, invMismatch, invTotals, nextInvNo, normDate, parseInvNo, yymm } from './domain/invoices.js';
import { partnerData } from './domain/partners.js';
import { FREQ, advanceDate, dueRecurring, newRecurring, postAllDue, postRecurring } from './domain/recurring.js';
import { employeeHistory, employeeList, employeeStats, workList } from './domain/employees.js';
import { ACC_FALLBACK, PALETTE, accColor, accMeta, accSettleNames, accountBalances, accountMovements, accountNames, companyBalances } from './domain/accounts.js';
import { periodLabel, quarterOf, vatDetail, vatPeriods, vatRate, vatRows } from './domain/vat.js';
import { AGE_BUCKETS, ageAll, ageCompany, daysBetween } from './domain/ageing.js';
import { SEED, freshSeed, migrate } from './core/seed.js';
import { COL, SPARE, isBlankCB, isBlankExp, isBlankPay, isBlankTx, monthKey, newCB, newExp, newPay, newTx } from './domain/rows.js';
import { XFER_PREFIX, accountPick, cbPickList, companyMatch, customerNames, expCategories, itemNames, serviceTypes } from './domain/lists.js';
import { attachCount, attachmentsFor } from './domain/attachments.js';
import { waNumber } from './domain/whatsapp.js';
import { PDF_CSS, PDF_LOGO, openPDF, pdfBank, pdfHeader } from './ui/pdf.js';
import { AF, DR, autoRange, dayspan, inRange, setAF, setDR, trendPoints } from './domain/dashboard.js';
import { switchView, buildNav, closeNav, setNav } from './core/router.js';
import { gw, kpiRow, listView, svgLine } from './ui/widgets.js';
import { quickAddCompany, quickAddEmployee, quickAddWork } from './ui/quick-add.js';
import { attachButton, attachmentDialog } from './ui/attachments-ui.js';
import { allAlerts, dataIssues, insuranceSoon } from './domain/alerts.js';
import { accountDialog, accountHistory, adjustDialog, renderAccounts, renderAccountsBalancesOnly, transferDialog } from './views/accounts.js';
import { ICOL, INV, applyTemplate, exportInvoicePDF, invLine, loadInvoice, navInv, renderInvoice, renderInvoiceList, saveInvoice, setINV, shareInvoiceWA, srcTag, validateInv } from './views/invoice.js';
import { drawStatement, exportStatementCSV, exportStatementPDF, renderStatement, shareStatementWA } from './views/statement.js';
import { PCOL, ensurePaySpare, growPayments, renderPayments, topUpPayments } from './views/payments.js';
import { XCOL, ensureExpSpare, growExpenses, renderExpenses, topUpExpenses } from './views/expenses.js';
import { partnerDialog, renderPartners, withdrawDialog } from './views/partners.js';
import { VATMODE, renderVAT } from './views/vat.js';
import { batchStatements, renderAgeing } from './views/ageing.js';
import { recurringDialog, renderRecurring } from './views/recurring.js';
import { companyDialog, renderCompanies } from './views/companies.js';
import { rateDialog, renderRates } from './views/rates.js';
import { renderTemplates, templateDialog } from './views/templates.js';
import { renderDash } from './views/dashboard.js';
import { renderAlerts } from './views/alerts.js';
import { renderEmployees } from './views/employees.js';
import { renderAudit } from './views/audit.js';
import { renderVisa } from './views/visa.js';
import { renderInsurance } from './views/insurance.js';
import { renderContacts } from './views/contacts.js';
import { CB, CBCOL, EF, HEAD_ACCOUNTS, PANEL_HIDDEN, SKIP_FOCUS, applyWorkRate, buildAccountPanel, buildCashbookPanel, buildSearchPanel, cbColumn, cbRefresh, cbRows, dateFilterDialog, ensureCBSpare, ensureSpare, exportTxCSV, growCB, growEntry, openSearch, paintProfit, refreshCBTotals, refreshEntryTotals, renderCashbook, renderEntry, syncLinkedPayment, syncLinkedTransfer, topUpBlanks, topUpCB, touchRow, txRow, txRows } from './views/sheets.js';
import { renderData, repairDialog } from './views/data.js';
import { AI_BUSY, AI_HISTORY, AI_SYSTEM, AI_TOOLS, AI_UNDO, aiBubble, aiCfg, aiChat, aiCheck, aiGreet, aiOffline, aiOpen, aiPing, aiRecord, aiRunTool, aiSend, aiSettings, aiSetupHint, aiSnapshot, aiToolChip, aiToolSpecs, aiTurn, aiUndoLast, renderAssistant } from './views/assistant.js';

/* =========================================================
   TIME LINK Business Suite — application entry point
   Ported from the TimeLink Google Sheet + Apps Script modules.

   Everything here is wiring. The screens live in src/views/, the
   calculations in src/domain/, the shared widgets in src/ui/.
   ========================================================= */

/* ---------- global keyboard and window handlers ---------- */

$("#tbtn").onclick = () => {
  const cur = document.documentElement.getAttribute("data-theme");
  setTheme(cur === "dark" ? "light" : "dark");
};

// keep the autocomplete panel glued to its field while anything scrolls
document.addEventListener("scroll", () => { if (acOpen()) acPlace(); }, true);
addEventListener("resize", () => { if (acOpen()) acPlace(); });

// Write anything still pending before the page goes away. Without this, a
// change typed in the last third of a second before closing the tab is lost.
// visibilitychange is fired AT document, so listen there. Hanging it on window
// only works while the event happens to bubble, which is exactly the kind of
// thing that silently stops being true.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveNow();
});
addEventListener("pagehide", () => { saveNow(); });

// Ctrl+K / Cmd+K opens search from anywhere
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
});

/* ---------- the screen list ---------- */
/* Order here is the order in the sidebar. `f` is the render function, `badge`
   an optional count shown beside the name. */

const NAV = [
  {g:'Overview'},
  {v:'entry',i:'▦',l:'Data Entry',t:'Data Entry',s:'daily work sheet',f:renderEntry},
  {v:'dashboard',i:'◧',l:'Dashboard',t:'Dashboard',s:'business at a glance',f:renderDash},
  {v:'alerts',i:'!',l:'Alerts',t:'Alerts Centre',s:'everything needing attention',f:renderAlerts,badge:()=>allAlerts().filter(a=>a.sev==='high').length},
  {g:'Money'},
  {v:'statement',i:'▤',l:'Statements',t:'Statement of Account',s:'per company, with PDF',f:renderStatement},
  {v:'payments',i:'₳',l:'Payments',t:'Payments Received',s:'balances sheet',f:renderPayments},
  {v:'companies',i:'◎',l:'Companies',t:'Companies & Balances',s:'receivables and advances',f:renderCompanies},
  {v:'ageing',i:'◷',l:'Receivables Ageing',t:'Receivables Ageing',s:'who owes you, and for how long',f:renderAgeing},
  {v:'cashbook',i:'▤',l:'Cash Book',t:'Cash Book',s:'manual entries for cash and bank',f:renderCashbook},
  {v:'expenses',i:'▾',l:'Expenses',t:'Expenses',s:'office and business overheads',f:renderExpenses},
  {v:'recurring',i:'↻',l:'Recurring',t:'Recurring Entries',s:'rent, salaries, renewals',f:renderRecurring,badge:()=>dueRecurring().length},
  {v:'accounts',i:'▧',l:'Cash & Bank',t:'Cash & Bank Accounts',s:'account movements',f:renderAccounts},
  {v:'partners',i:'◑',l:'Partner Shares',t:'Partner Shares',s:'profit split and withdrawals',f:renderPartners},
  {g:'Invoicing'},
  {v:'invoice',i:'🧾',l:'New / Edit Invoice',t:'Invoice Builder',s:'tax invoice with PDF',f:renderInvoice},
  {v:'invoices',i:'☰',l:'Invoice Register',t:'Invoice Register',s:'all saved invoices',f:renderInvoiceList},
  {v:'templates',i:'⧉',l:'Service Templates',t:'Service Templates',s:'task packages',f:renderTemplates},
  {v:'vat',i:'%',l:'VAT Return',t:'VAT Return',s:'output tax on service fees',f:renderVAT},
  {g:'Records'},
  {v:'employees',i:'☺',l:'Employees',t:'Employees',s:'staff, history and profit',f:renderEmployees},
  {v:'rates',i:'₤',l:'Rates Master',t:'Rates Master',s:'received, expense and profit',f:renderRates},
  {v:'visa',i:'✓',l:'Visa Tracker',t:'Visa Tracker',s:'file progress',f:renderVisa},
  {v:'insurance',i:'⛨',l:'Insurance',t:'Insurance Data',s:'policies and expiry',f:renderInsurance},
  {v:'contacts',i:'☏',l:'Contacts',t:'Contacts',s:'customer directory',f:renderContacts},
  {v:'assistant',i:'✦',l:'AI Assistant',t:'AI Assistant',s:'local model, your data',f:renderAssistant},
  {g:'System'},
  {v:'audit',i:'☷',l:'Activity Log',t:'Activity Log',s:'what changed and when',f:renderAudit},
  {v:'data',i:'⚙',l:'Data & Settings',t:'Data & Settings',s:'backup, restore, company details',f:renderData}
];

/**
 * The screens this person may actually use.
 *
 * Staff have no reason to see the partner profit split, so it is dropped from
 * their sidebar. This is tidiness, not security — the server has already
 * removed the figures themselves before they reach the browser.
 */
function visibleNav() {
  if (may('seePartners')) return NAV;
  return NAV.filter((x) => x.v !== 'partners');
}

/* ---------- startup wiring ---------- */

/** A small chip in the toolbar: who you are, and a way out. */
function showWhoIsSignedIn() {
  const who = currentUser();
  const tools = $('#tools');
  if (!who || !tools) return;   // local file, nothing to show

  const chip = el('div', 'userchip');
  chip.append(el('span', 'un', who.name));
  chip.append(el('span', 'ur', who.permissions?.label ?? who.role));

  const out = el('button', 'btn ico', '⏻');
  out.title = `Sign out of ${who.name}`;
  out.onclick = async () => { await saveNow(); signOut(); };

  chip.append(out);
  tools.append(chip);
}

function initAI() {
  const b = $("#aifab");
  if (b) b.onclick = aiOpen;
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "/") { e.preventDefault(); aiOpen(); }
  });
}

function initMobile() {
  const t = $("#navtoggle"), sc = $("#scrim");
  if (!t) return;
  t.onclick = () => {
    const open = document.body.classList.toggle("navopen");
    sc.classList.toggle("on", open);
  };
  sc.onclick = closeNav;
  $("#nav").addEventListener("click", (e) => { if (e.target.closest("a")) closeNav(); });
}

function initMobileQuickActions() {
  const bar = $("#mobilebar");
  if (!bar) return;
  const go = (view, after) => {
    switchView(view);
    closeNav();
    if (after) requestAnimationFrame(after);
  };
  const actions = [
    { v: "entry", i: "▦", l: "Entry", fn: () => go("entry") },
    { v: "payments", i: "+", l: "Payment", fn: () => go("payments", () => growPayments()) },
    { v: "expenses", i: "-", l: "Expense", fn: () => go("expenses", () => growExpenses()) },
    { v: "search", i: "⌕", l: "Search", fn: openSearch },
    { v: "statement", i: "▤", l: "Statement", fn: () => go("statement") },
    { v: "alerts", i: "!", l: "Alerts", fn: () => go("alerts") },
  ];
  actions.forEach((a) => {
    const b = el("button");
    b.type = "button";
    b.dataset.v = a.v;
    b.innerHTML = `<span class="mi">${a.i}</span><span>${a.l}</span>`;
    b.onclick = a.fn;
    bar.append(b);
  });
}

(async function boot() {
  try { setTheme(localStorage.getItem("tl_theme") || "light"); } catch (e) { setTheme("light"); }
  const ts = $("#tsearch"); if (ts) ts.onclick = openSearch;

  await loadSession();
  setNav(visibleNav());   // the router owns the screen list from here on
  buildNav();
  showWhoIsSignedIn();
  initMobile();
  initMobileQuickActions();
  initAI();

  // Work out where data lives before touching it: the office server if it
  // answers, otherwise this browser's own storage.
  await chooseBackend();

  // If storage is unavailable — private browsing, a quota error, a version
  // conflict, the server refusing — carry on in memory and say so, rather than
  // dying with a blank screen and no explanation.
  let stored = null, storageFailed = false;
  try { stored = await kvGet("data"); } catch (e) { storageFailed = true; }

  setD(stored && stored.transactions ? migrate(stored) : freshSeed());
  if (!stored) { try { await kvSet("data", D); } catch (e) { storageFailed = true; } }
  publishD();

  if (storageFailed) {
    setTimeout(() => toast("Could not open local storage — working in this tab only, changes will not be saved.", 1), 900);
  }

  if (isShared()) {
    setTimeout(() => toast(`Working on the shared books (${backendName()})`), 700);
  }

  const due = dueRecurring().length;
  if (due) setTimeout(() => toast(`${due} recurring ${due === 1 ? "entry is" : "entries are"} due`), 900);

  switchView("entry");
})();

/* =========================================================
   Public handle — window.TimeLink

   Exposed on purpose, for two reasons:
     1. the automated tests drive the app through it
     2. you can inspect live state from the browser console, e.g.
        TimeLink.D.settings      TimeLink.switchView("vat")

   Adding to this object is safe. Removing from it breaks tests.
   ========================================================= */
window.TimeLink = {
  get D() { return D; },
  set D(v) { setD(v); },
  NAV, switchView,
  save, saveNow, audit,
  // read straight back out of storage, so a test can prove a write landed
  readStored: kvGet,
  get SS() { return SS; }, setSS,
  n, m2, esc, parseAnyDate, parseClipTable,
  rateMap, rateBust, findRate, invoiceRate,
  invTotals, vatRate, accountBalances, partnerData,
  ageAll, allAlerts, nextInvNo, waNumber,
  // who is signed in, and what they may see
  currentUser, may,
  // where the data is coming from, for tests and for the Data & Settings screen
  backendName, isShared,
};
