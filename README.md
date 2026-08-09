# TimeLink

Business management apps for a UAE services company — invoicing, payments,
statements, cash book, partner shares, visa and insurance tracking.

The app ships as a **single self-contained HTML file** — no install, no
internet needed. Open it on its own and your data stays in that browser; run
the included server and the whole team shares one set of books from laptops and
phones.

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

- **[SERVER.md](SERVER.md)** — running the shared server for your team
- **[USING.md](USING.md)** — running the app day to day, where your data lives,
  backups
- **[BUILD.md](BUILD.md)** — which file to edit, how the build works, how
  modules fit together
- **[TESTING.md](TESTING.md)** — how to run the tests and what to do when one
  goes red

Short version:

```powershell
npm run dev      # live preview while editing
npm test         # 215 tests, about 20 seconds
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
  main.js      startup wiring only — 12 KB
  lib\         format, dates, dom, csv
  core\        store, router, persist, storage backends, seed
  domain\      accounts, invoices, statement, vat, ageing, partners,
               recurring, employees, rates, rows, lists, dashboard, alerts
  ui\          toast, modal, forms, grid, autocomplete, pdf, widgets, theme
  views\       one file per screen
server\        Node API for shared use — plain files, nothing to compile
test\          215 tests
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

Every push checks imports, builds the app, runs 215 tests, runs the
real-browser tests in Chrome, verifies the output is genuinely self-contained,
and attaches it to the run as a download. Nothing is published
if a test fails. Dependabot proposes build-tool updates monthly and CI tests
each one.

Grab the latest tested build from **Actions → newest run → Artifacts**.

## Sharing it with your team

```powershell
npm start
```

Then everyone opens `http://<that-machine's-IP>:4000` — laptops and phones and
signs in. Three accounts exist: Abrar (owner), M Irfan (partner), Ayesha
(staff). Staff cannot see the partner profit split — enforced by the server,
not just hidden in the menu. See **[SERVER.md](SERVER.md)**.

## Status

Modularization is **done** — `src\main.js` is 12 KB of startup wiring, down
from 279 KB, across 60 modules. Storage sits behind an interface, so the app
uses the shared server when there is one and this browser when there isn't.
Logins and roles are in. The sample records have been removed, which took the
shipped file from 1.1 MB to 352 KB.

Next: import the real workbook, then the phone layout.
