# Graph Report - .  (2026-08-08)

## Corpus Check
- 2 files · ~46,841 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 246 nodes · 429 edges · 28 communities (11 shown, 17 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.86)
- Token cost: 200,903 input · 0 output

## Community Hubs (Navigation)
- Phase1 App Core & Views
- Suite Core Shell & Reporting
- Suite Data Entry & Rate Engine
- Suite Grid Paste & Spare-Row Pattern
- Suite Invoicing & Templates
- Suite Accounts & Cash Book
- Phase1 Statement Generation
- Suite Audit, Partners & Sharing
- Phase1 IndexedDB Persistence
- Phase1 Currency Prefix Helper
- Phase1 DOM Element Factory
- Phase1 Numeric Coercion Helper
- Suite Customer Name List
- Suite Document Type List
- Suite DOM Element Factory
- Suite Employee Name List
- Suite Form Field Helper
- Suite Input Helper
- Suite Item Name List
- Suite Button Factory Helper
- Suite Modal Dialog Helper
- Suite Flexible Date Parser
- Suite Service Type List
- Suite Toast Notification
- Suite Undo Toast
- Suite Work Item List

## God Nodes (most connected - your core abstractions)
1. `switchView() — router: activates a view and calls its render function` - 26 edges
2. `renderData() (Data/Backup view renderer)` - 21 edges
3. `SEED (embedded seed JSON constant)` - 15 edges
4. `accountBalances() — computes balances for every cash/bank/credit account` - 15 edges
5. `switchView() (router dispatcher)` - 13 edges
6. `save() — debounced persistence of D to IndexedDB` - 13 edges
7. `renderInvoice() — renders the Invoice Builder view` - 13 edges
8. `renderPayments() (Payments view renderer)` - 12 edges
9. `txRow() (transaction row builder)` - 11 edges
10. `renderStatement() (Statement view renderer)` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Debounced Search/Filter Inputs` --rationale_for--> `renderCompanies() (Companies view renderer)`  [INFERRED]
  TimeLink-App-Phase1.html → TimeLink-App-Phase1.html  _Bridges community 6 → community 0_
- `accountBalances() — computes balances for every cash/bank/credit account` --shares_data_with--> `D (in-memory application data store)`  [INFERRED]
  TimeLink-Suite.html → TimeLink-Suite.html  _Bridges community 1 → community 5_
- `partnerData() — computes distributable profit and per-partner entitlement` --shares_data_with--> `D (in-memory application data store)`  [INFERRED]
  TimeLink-Suite.html → TimeLink-Suite.html  _Bridges community 1 → community 7_
- `renderEntry() — renders the Data Entry sheet view` --shares_data_with--> `D (in-memory application data store)`  [INFERRED]
  TimeLink-Suite.html → TimeLink-Suite.html  _Bridges community 1 → community 3_
- `Row Locking rationale — saved rows are read-only until double-clicked, blank rows stay instantly typeable` --semantically_similar_to--> `Spare-row grid rationale — every entry grid keeps N blank rows at the end and grows on overflow so entry is never slowed`  [INFERRED] [semantically similar]
  TimeLink-Suite.html → TimeLink-Suite.html  _Bridges community 2 → community 3_

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Spare-row auto-growing grid pattern (Data Entry, Expenses, Cash Book, Payments)** — timelink_suite_topupblanks, timelink_suite_topupexpenses, timelink_suite_topupcb, timelink_suite_topuppayments, timelink_suite_spare_row_pattern [INFERRED 0.85]
- **Cross-view account balance reconciliation (Data Entry paidFrom, Cash Book ledger, linked Payments, Accounts view)** — timelink_suite_accountbalances, timelink_suite_accountmovements, timelink_suite_synclinkedpayment, timelink_suite_cbcolumn, timelink_suite_renderaccounts [INFERRED 0.85]
- **Invoice line pricing precedence: Service Template price wins, Rates Master fills gaps, manual entry overrides** — timelink_suite_findrate, timelink_suite_invoicerate, timelink_suite_applytemplate, timelink_suite_invline [EXTRACTED 1.00]
- **Statement Generation Pipeline** — timelink_app_phase1_companyentries, timelink_app_phase1_buildstatement, timelink_app_phase1_drawstatement, timelink_app_phase1_exportstatementpdf, timelink_app_phase1_transactions, timelink_app_phase1_payments [INFERRED 0.85]
- **Local Data Persistence Lifecycle** — timelink_app_phase1_seed, timelink_app_phase1_freshseed, timelink_app_phase1_boot, timelink_app_phase1_d, timelink_app_phase1_kvget, timelink_app_phase1_kvset, timelink_app_phase1_indexeddb_persistence [INFERRED 0.85]
- **SPA View Router Pattern** — timelink_app_phase1_views, timelink_app_phase1_switchview, timelink_app_phase1_renderentry, timelink_app_phase1_renderstatement, timelink_app_phase1_renderpayments, timelink_app_phase1_rendercompanies, timelink_app_phase1_renderrates, timelink_app_phase1_rendervisa, timelink_app_phase1_renderinsurance, timelink_app_phase1_renderinvoices, timelink_app_phase1_renderdata, timelink_app_phase1_client_side_router [INFERRED 0.80]

## Communities (28 total, 17 thin omitted)

### Community 0 - "Phase1 App Core & Views"
Cohesion: 0.08
Nodes (53): acHide() (autocomplete hide), acNav() (autocomplete keyboard nav), acPick() (autocomplete pick), acShow() (autocomplete show), addRow(), Client-Side View Router (VIEWS map + switchView), Companies (autocomplete name list), Contacts data (+45 more)

### Community 1 - "Suite Core Shell & Reporting"
Cohesion: 0.06
Nodes (49): accMeta() — looks up an account's configuration, accountMovements() — every ledger/expense/payment movement touching one account, Alerts Centre — aggregated insurance, visa, balance, pricing and reconciliation alerts, allAlerts() — aggregates insurance/visa/balance/pricing/reconciliation alerts, allCompanies() — distinct company names across transactions and payments, autoRange() — widens the dashboard date range if it would otherwise be empty, boot() — application startup IIFE, buildNav() — builds the sidebar navigation from the NAV table (+41 more)

### Community 2 - "Suite Data Entry & Rate Engine"
Cohesion: 0.12
Nodes (25): acKeys() — keyboard handling for the autocomplete dropdown, acPick() — commits an autocomplete selection, acPlace() — positions the autocomplete dropdown, acShow() — renders the autocomplete dropdown, applyTemplate() — populates invoice line items from a Service Template, applyWorkRate() — fills Received/Expense from Rates Master on a Data Entry row, bindAC() — attaches autocomplete behavior to an input, bindRowLock() — wires double-click-to-unlock on a saved row (+17 more)

### Community 3 - "Suite Grid Paste & Spare-Row Pattern"
Cohesion: 0.13
Nodes (21): accountNames() — distinct account names for pickers, bindPaste() — wires Google-Sheets-style block paste onto a grid, buildFilterBar() — date/search filter bar for Data Entry, ensureCBSpare() — tops up spare rows after a Cash Book edit, ensureExpSpare() — tops up spare rows after an Expenses edit, ensurePaySpare() — tops up spare rows after a Payments edit, focusCell() — focuses a specific grid cell by row/col, gridKey() — arrow/Enter/Home/End navigation inside a data grid (+13 more)

### Community 4 - "Suite Invoicing & Templates"
Cohesion: 0.15
Nodes (20): Abrar Ali — Authorized Signatory named on TIME LINK invoices, blankInvoice() — creates a fresh invoice/quotation/receipt draft, docCfg() — wording/labels config for the current document type, exportInvoicePDF() — renders an invoice to a printable PDF, findInvoice() — looks up a saved invoice by number, invMismatch() — flags invoices whose stored totals disagree with saved line items, Invoice numbering rationale — prefix + YYMM + NN, widened when NN rolls past 99, invTotals() — computes govt subtotal, service fee, VAT and grand total (+12 more)

### Community 5 - "Suite Accounts & Cash Book"
Cohesion: 0.16
Nodes (20): accColor() — resolves an account's display color, Account balance formulas rationale — asset=top-ups-spend, credit=spend-repayments=owed, tally=running total, accountBalances() — computes balances for every cash/bank/credit account, accountDialog() — add/edit account modal, accountHistory() — modal transaction history for one account, adjustDialog() — post a manual balance adjustment, TimeLink Business Suite (single-file web app), buildAccountPanel() — Cash & Bank Position panel above the entry sheet (+12 more)

### Community 6 - "Phase1 Statement Generation"
Cohesion: 0.17
Nodes (16): Statement Generator Ported from Google Apps Script, buildStatement(), companyEntries(), Cost vs Received Field Semantic Inversion, drawStatement(), esc() (HTML escape helper), exportStatementPDF(), fmtDate() (+8 more)

### Community 7 - "Suite Audit, Partners & Sharing"
Cohesion: 0.17
Nodes (15): accSettleNames() — distinct settlement/ledger account names, audit() — appends an entry to the audit trail, Audit Trail — logs additions/edits/removals/withdrawals across the app, Partner profit-share rationale — distributable = gross profit - office expenses - reserves, split by share %, partnerData() — computes distributable profit and per-partner entitlement, partnerDialog() — add/edit partner modal, rateDialog() — add/edit a Rates Master work item, renderAudit() — renders the Activity Log view (+7 more)

### Community 8 - "Phase1 IndexedDB Persistence"
Cohesion: 0.47
Nodes (6): boot() (app bootstrap IIFE), D (in-memory live database state), idb(), Client-Side IndexedDB Persistence, kvGet(), kvSet()

## Knowledge Gaps
- **50 isolated node(s):** `el() (DOM element factory helper)`, `$() (querySelector helper)`, `n() (numeric coercion helper)`, `uid() (id generator)`, `D (in-memory live database state)` (+45 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `switchView() — router: activates a view and calls its render function` connect `Suite Core Shell & Reporting` to `Suite Grid Paste & Spare-Row Pattern`, `Suite Invoicing & Templates`, `Suite Accounts & Cash Book`, `Suite Audit, Partners & Sharing`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Why does `renderInvoice() — renders the Invoice Builder view` connect `Suite Invoicing & Templates` to `Suite Core Shell & Reporting`, `Suite Data Entry & Rate Engine`, `Suite Accounts & Cash Book`, `Suite Audit, Partners & Sharing`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `renderEntry() — renders the Data Entry sheet view` connect `Suite Grid Paste & Spare-Row Pattern` to `Suite Core Shell & Reporting`, `Suite Data Entry & Rate Engine`, `Suite Accounts & Cash Book`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `el() (DOM element factory helper)`, `$() (querySelector helper)`, `n() (numeric coercion helper)` to the rest of the system?**
  _50 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Phase1 App Core & Views` be split into smaller, more focused modules?**
  _Cohesion score 0.07896575821104122 - nodes in this community are weakly interconnected._
- **Should `Suite Core Shell & Reporting` be split into smaller, more focused modules?**
  _Cohesion score 0.06037414965986394 - nodes in this community are weakly interconnected._
- **Should `Suite Data Entry & Rate Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.11666666666666667 - nodes in this community are weakly interconnected._