# TimeLink

Business management apps for a UAE services company — invoicing, payments,
statements, cash book, partner shares, visa and insurance tracking.

The app ships as a **single self-contained HTML file**. No server, no install,
no internet needed. Data lives in the browser's IndexedDB.

## Quick start

```powershell
npm install          # once
npm run build        # produces dist\TimeLink-Suite.html
```

Open `dist\TimeLink-Suite.html` in any modern browser.

While developing, `npm run dev` gives you a live preview that updates as you
save.

## The apps

**TimeLink Suite** — the main application:

- **Data Entry** — spreadsheet-style grid with paste support and a rate engine
- **Dashboard / Alerts** — the business at a glance, and anything needing attention
- **Money** — statements, payments, companies, receivables ageing, cash book,
  expenses, recurring entries, accounts, partner shares
- **Invoicing** — invoice builder with PDF output, register, service templates, VAT return
- **Records** — employees, rates master, visa tracker, insurance, contacts
- **AI Assistant** — runs against a local model; your data never leaves the machine
- **System** — activity log, backup/restore, company settings

**TimeLink Phase 1** (`TimeLink-App-Phase1.html`) — the earlier build: companies,
transactions and statement generation. Still runs standalone; not yet migrated
into the build.

## Working on it

Read these, in this order:

- **[USING.md](USING.md)** — running the app day to day, where your data lives,
  backups
- **[BUILD.md](BUILD.md)** — which file to edit, how the build works, how
  modules fit together
- **[TESTING.md](TESTING.md)** — how to run the tests and what to do when one
  goes red

Short version:

```powershell
npm run dev      # live preview while editing
npm test         # 121 tests, about 13 seconds
npm run check    # instant sanity check on imports
npm run build    # ship it
```

Edit files in `src\`. Never edit `dist\` — it's regenerated every build.

## How it's put together

Pure vanilla JavaScript. No React, no jQuery, no CSS framework, no runtime
dependencies at all. The build tools are the only thing `npm install` fetches,
and none of them end up in the shipped file.

```
src\
  index.html   page shell, styles, seed data
  main.js      the bulk of the app (shrinks as code is extracted)
  lib\         format, dates, dom, csv
  core\        store (D), persist (IndexedDB), seed
  domain\      accounts, invoices, statement, vat, ageing, partners,
               recurring, employees, rates, rows, lists, dashboard
  ui\          toast, modal, forms, grid, autocomplete, download, pdf, theme
test\          121 tests (simulated browser)
e2e\           real-Chrome tests
tools\         safe code-extraction helpers
dist\          build output (gitignored)
```

Inside the app, a `switchView()` router activates a screen and calls its
`render*()` function; a debounced `save()` writes the store to IndexedDB.

`graphify-out\GRAPH_REPORT.md` maps the code structure — hub functions,
clusters and cross-links. Useful when you're hunting for where something lives.

## Rules the tests protect

Easy to break by accident, expensive when broken:

- Ambiguous dates are read **day first** — `05/03/2026` is 5 March
- **VAT applies to the service fee only**, never to government charges
- A payment mirrored from the cash book is **counted once**, not twice
- When no rate matches, the price is `0` with source `none` — the app never
  guesses

## Automation

Every push checks imports, builds the app, runs 121 tests, runs the
real-browser tests in Chrome, verifies the output is genuinely self-contained,
and attaches it to the run as a download. Nothing is published
if a test fails. Dependabot proposes build-tool updates monthly and CI tests
each one.

Grab the latest tested build from **Actions → newest run → Artifacts**.

## Status

Modularization is in progress. 29 modules are extracted; `src\main.js` still
holds the screen-rendering code. Code moves out one module at a time, with the
full suite green after each move. See BUILD.md for why the original
`TimeLink-Suite.html` is still in the repo root.
