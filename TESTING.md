# Testing

This is the safety net. Before any code gets moved or rewritten, these tests
record how TimeLink behaves **today**. If a change breaks something, a test
fails and names what broke — instead of you finding out weeks later from a
wrong invoice.

You don't need to understand the test code to benefit from it. You need to know
how to run it and what to do when it goes red.

## One-time setup

Install Node.js (LTS) from https://nodejs.org, then in PowerShell:

```powershell
cd D:\TLS_CLAUDE
npm install
```

That downloads the test tools into a `node_modules` folder. It's gitignored, so
it never goes to GitHub. You only do this once.

## Running the tests

```powershell
npm test
```

Takes about 12 seconds. You want to see:

```
Test Files  10 passed (10)
     Tests  141 passed (141)
```

Some tests check the built app, so run `npm run build` first if you've changed
anything in `src\`. They skip themselves rather than fail if `dist\` is missing.

While you're editing, this reruns automatically every time you save:

```powershell
npm run test:watch
```

Press `q` to quit it.

## What to do when a test fails

**Don't panic and don't delete the test.** A red test is the net doing its job.

Read the failure. It tells you the file, the test name, what it expected, and
what it got:

```
FAIL  test/money.test.js > invTotals — VAT applies to the service fee ONLY
expected 10 to be 22.5
```

Then ask one question: **did I mean to change this?**

- **No** — you broke something by accident. Undo your last change and run again.
- **Yes** — you deliberately changed a rule. Update the expected value in the
  test, in the same commit as the code change, so the test keeps describing
  reality.

That second case is the only time it's right to edit a test to make it pass.

## What's covered

| File | Covers |
|---|---|
| `test/modules.test.js` | format, dates, store and rates — imported directly, runs in milliseconds |
| `test/ui.test.js` | the shared plumbing: dom, csv, grid — against a lightweight fake DOM |
| `test/domain.test.js` | invoice numbering, VAT periods, ageing, recurring dates, row shapes |
| `test/globals.test.js` | every name in `src\` is declared, imported, or a real browser global |
| `test/dates.test.js` | `parseAnyDate` and `parseClipTable` — reading typed and pasted dates |
| `test/rates.test.js` | `rateMap`, `findRate`, `invoiceRate` — what a customer gets charged |
| `test/money.test.js` | invoice totals, VAT, `accountBalances`, `partnerData` |
| `test/smoke.test.js` | opens all 25 screens in both apps and fails if any breaks |
| `test/build.test.js` | proves the built app behaves identically to the original |
| `test/server.test.js` | the shared database and API, including two-people-at-once conflicts |

`build.test.js` is the one that makes refactoring safe. It boots the built app
and the frozen original side by side and compares screens, balances, partner
figures, prices and date handling. While it's green, moving code around in
`src\` cannot have changed what the app does.

`modules.test.js` is the direction of travel. It imports from `src\` directly —
no browser, no app boot, no seed data — so it runs in milliseconds. As more code
moves out of `main.js`, more of the suite should look like that and less like
the slow whole-app tests.

Some rules these tests deliberately pin down, because they're valuable and easy
to break by accident:

- **Dates are day-first.** `05/03/2026` is 5 March, not 3 May.
- **VAT applies to the service fee only**, never to government charges.
- **A payment mirrored from the cash book is counted once**, not twice.
- **An explicit template rate beats the master rate**; when nothing matches the
  rate is `0` with source `none` — the app never guesses a price.

## How the tests reach into the app

The apps are single HTML files with all their code in one `<script>` tag, so
there's nothing to `import`. `test/harness.js` handles this: it loads the HTML
into a simulated browser, runs the script, and exposes every top-level function
so a test can call `findRate(...)` directly.

It also fills in browser features the simulator lacks (IndexedDB, printing,
popups). If you add code using a browser API that isn't there, a test may fail
with something like `X is not a function` — the fix is to add a stub in
`harness.js`, not to change the app.

## Are the tests any good?

They were checked by deliberately introducing seven bugs and confirming the
suite caught them. Six were caught, each naming the right area:

| Deliberate bug | Caught |
|---|---|
| Dates read month-first instead of day-first | yes — 3 tests |
| VAT charged on government charges too | yes |
| Cash-book payment counted twice | yes |
| Template rate ignored | yes |
| The Partner Shares screen throws | yes — named `partners` |
| `switchView` stops setting the page title | yes |
| Rate lookup made case-sensitive | no — see below |

The one that slipped through isn't a gap in the tests: `findRate` has a second,
normalising lookup that upper-cases anyway, so making the first lookup
case-sensitive genuinely doesn't change the result. Behaviour was preserved, so
passing was correct.

## The real-browser tests

`npm test` runs against a *simulated* browser. Fast, but it can't prove your
data survives a reload or that a download really produces a file. A second
suite runs in an actual Chrome:

```powershell
npx playwright install chromium   # once
npm run test:browser
```

It covers what the simulator can't:

- every screen opens in a real browser with no console errors
- **an entry typed in is still there after refreshing the page** — the one that
  matters most
- the backup button downloads real, parseable JSON matching the live data
- the CSV export downloads
- a statement opens a printable page
- the data entry grid accepts typing

These also run in CI on every push, in their own job.

### If it says "Timed out waiting 60000ms from config.webServer"

That message means the test server never came up, and it used to hide the real
reason. Two causes, both now fixed in `playwright.config.js`:

- **`dist\` didn't exist.** The preview server has nothing to serve, exits
  immediately, and Playwright just waits. The config now runs `npm run build`
  first.
- **localhost vs 127.0.0.1.** On Windows, `localhost` resolves to IPv6 `::1`,
  so a server bound there is invisible to Playwright polling IPv4. Both ends
  are now pinned to `127.0.0.1`.

The config also pipes the server's own output, so a genuine error shows up
instead of a bare timeout. If it still stalls, run the server by hand and read
what it says:

```powershell
npm run build
npx vite preview --port 4173 --strictPort --host 127.0.0.1
```

Then open http://127.0.0.1:4173/TimeLink-Suite.html in a browser.

## What is still not covered

- Visual layout and CSS.
- The AI Assistant screen renders, but the Ollama calls aren't exercised.
- Restoring a backup end to end through the file picker.
