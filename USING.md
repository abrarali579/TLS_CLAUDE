# Using TimeLink

How to actually run and live with the app day to day.

## Getting the app

Two ways.

**From your own machine** — after any change:

```powershell
cd D:\TLS_CLAUDE
npm run build
```

That writes `dist\TimeLink-Suite.html`. Double-click it.

**From GitHub** — every push now builds the app automatically. Go to your repo →
**Actions** tab → click the newest run → scroll to **Artifacts** → download
**TimeLink-Suite**. It's a zip containing the same single HTML file.

The advantage of the GitHub copy: it only exists if the tests passed. A broken
version never gets published.

## Where your data lives

This is the most important thing to understand, because it's where people lose
work.

Your business data is **not in the HTML file**. It's stored by your browser,
against the exact address the page was opened from. The HTML file is just the
program; your data sits beside it in the browser's own storage.

Three consequences:

- **Move the file to a different folder and your data may not follow.** The
  address changed, so the browser may treat it as a different app with an empty
  database.
- **Open it in a different browser and it starts empty.** Chrome's storage and
  Edge's storage are separate.
- **Clearing "site data" or "cookies and other site data" can wipe it.**

None of this is a bug — it's how browser storage works for every offline web
app. But it means you should do two things.

**1. Pick one location and one browser, and stick to them.** Put the file
somewhere permanent, make a desktop shortcut, and always open it the same way.
Don't work from a copy in Downloads.

**2. Take backups.** In the app: **Data & Settings → Backup & Restore →
↓ Full JSON Backup**. That downloads a complete snapshot with today's date in
the filename. Keep them somewhere that isn't your browser — a folder you sync,
or a USB stick.

Restoring is the same screen: **⬆ Restore Backup**, pick the file. It replaces
everything, so restore onto a fresh copy if you're unsure.

There's also **↓ Entries CSV** and **↓ Payments CSV** if you want the data in
Excel.

### If it isn't saving

You'll see a message: *"Could not open local storage — working in this tab only,
changes will not be saved."* The app deliberately keeps working so you don't
lose what's on screen, but nothing is being written.

Usual causes: a private/incognito window, storage disabled for local files in
that browser, or the disk being full. Try a normal window in Chrome or Edge
first. If you need a guaranteed-stable setup:

```powershell
npm run preview
```

Then open the address it prints (something like `http://localhost:4173`). Served
pages get reliable storage in every browser. The tradeoff is you have to run
that command each time, and data saved this way is separate from data saved by
opening the file directly.

**Take a backup before switching between the two.**

## First run

On a fresh browser the app loads the seed dataset that's baked into the file —
sample companies, employees and transactions. It's there so nothing looks
broken on day one.

To start clean, delete the sample rows from each screen, then take a backup so
you have a known-empty starting point.

Note that **Data & Settings → Reset to original sheet import** does the
opposite of what you might hope: it restores the *sample* data, wiping whatever
you've entered. Use Restore Backup instead.

## Making changes to the app

The loop is short:

```powershell
npm run dev      # live preview, updates as you save
```

Edit files in `src\`, watch the browser update. When it looks right:

```powershell
npm test         # did anything break?
npm run build    # produce the real file
```

Then commit and push:

```powershell
git add -A
git commit -m "what you changed"
git push
```

GitHub runs the tests again and builds a fresh downloadable copy.

**If `npm test` goes red, don't push.** Read [TESTING.md](TESTING.md) — it
explains how to tell an accident from a deliberate change.

`npm run dev` uses its own separate storage from the built file, so experiment
freely there without touching your real data.

## Poking at things without changing code

Open the app, press **F12**, click **Console**. You have a live handle:

```js
TimeLink.D.settings              // your company details, VAT rate, accounts
TimeLink.D.transactions.length   // how many entries exist
TimeLink.accountBalances()       // every account's current position
TimeLink.partnerData()           // the profit split, calculated
TimeLink.findRate('ATTESTATION') // what the rates master says
TimeLink.switchView('vat')       // jump to a screen
```

Reading is safe. Writing (`TimeLink.D.something = ...`) changes real data
without going through the app's checks — take a backup first.

## What runs automatically now

| When | What happens |
|---|---|
| Every push to `main` | Install, build, run 74 tests, verify the file is self-contained, publish it as a downloadable artifact |
| Every pull request | Same checks, so you see the result before merging |
| Monthly | Dependabot opens PRs for build-tool updates; CI tests each one |

Failed run? Actions tab → click the red run → click the failed step. The error
is at the bottom of the log.

## Quick reference

| I want to... | Do this |
|---|---|
| Use the app | Open `dist\TimeLink-Suite.html` |
| Rebuild after changes | `npm run build` |
| Try changes live | `npm run dev` |
| Check nothing broke | `npm test` |
| Back up my data | In-app: Data & Settings → ↓ Full JSON Backup |
| Restore a backup | In-app: Data & Settings → ⬆ Restore Backup |
| Get the latest tested build | GitHub → Actions → newest run → Artifacts |
| Understand a failing test | [TESTING.md](TESTING.md) |
| Understand the code layout | [BUILD.md](BUILD.md) |
