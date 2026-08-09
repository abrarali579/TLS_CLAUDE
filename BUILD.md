# Building

The app used to be one enormous HTML file. It still *ships* as one enormous
HTML file — that part is worth keeping, because you can double-click it and it
runs with no server and no install.

What changed is that you no longer *write* it that way. The code now lives in
small files under `src/`, and a build step stitches them back into the single
file you open.

## The three commands

```powershell
npm run dev      # live preview while you edit — changes appear instantly
npm run build    # produce the file you actually use
npm test         # check nothing broke
```

`npm run build` takes under a second and writes:

```
dist\TimeLink-Suite.html
```

That's your app. Copy it anywhere, email it, put it on a USB stick — it has no
dependencies.

## Which file do I edit?

This is the one thing worth getting straight.

| File | What it is | Edit it? |
|---|---|---|
| `src\**` | The real source code | **Yes — this is where you work** |
| `dist\TimeLink-Suite.html` | Built output | No — overwritten on every build |
| `TimeLink-Suite.html` (root) | Frozen baseline, kept for comparison | No — see below |
| `TimeLink-App-Phase1.html` | The old Phase 1 app, untouched | Not yet |

`dist\` is gitignored, because it's generated. If you clone this repo fresh,
run `npm install` then `npm run build` to get the app back.

## Why the root file is still there

`TimeLink-Suite.html` at the root is the original, from before any of this. It
is a **frozen reference**. `test\build.test.js` boots the built app and the
original side by side and compares them: same screens, same account balances,
same partner figures, same prices, same date handling.

That comparison is what makes refactoring safe. As long as it's green, moving
code around in `src\` cannot have changed what the app does.

Once you deliberately change behaviour — a new feature, a fixed bug — the two
will legitimately differ. At that point delete the baseline and that one test
file. Until then, leave it alone and don't edit it.

## How src is organised

```
src\
  index.html      the page shell, styles, and the seed data
  main.js         everything not yet extracted (still large — this shrinks over time)
  lib\
    format.js     numbers, money, escaping text
    dates.js      reading and displaying dates, parsing pasted tables
  core\
    store.js      D — the one live copy of your business data
  domain\
    rates.js      pricing: rateMap, findRate, invoiceRate
```

`main.js` is still the bulk of it. That's expected — code moves out
incrementally, a module at a time, with the tests green after each move. A
half-finished split that works is worth more than a complete one that doesn't.

## How modules work, briefly

A file makes something available with `export`:

```js
// src/lib/format.js
export const n = (v) => { /* ... */ };
```

Another file asks for it with `import`:

```js
// src/domain/rates.js
import { n } from '../lib/format.js';
```

Two practical consequences:

- **If you forget the import, the build fails immediately** with a clear
  message. That's the point — the old single file would have failed silently at
  runtime, on one screen, possibly weeks later.
- **`import { D } from '../core/store.js'` gives you a live view.** When a
  backup restore replaces the whole store, every file sees the new data. You
  can change things *on* `D` normally; to replace `D` itself, call `setD()`.

## When the build fails

The error names the file and line. The two you'll hit most:

**`"x" is not exported by ...`** — you imported something the other file
doesn't offer. Either add `export` in front of it there, or fix the spelling.

**`Failed to resolve import "./foo.js"`** — wrong path. Relative paths need the
`./` or `../` prefix and the `.js` extension.

## Debugging in the browser

The built app publishes a handle on `window.TimeLink`. Open the app, press F12,
and in the Console tab you can poke at live state:

```js
TimeLink.D.settings           // your company settings
TimeLink.accountBalances()    // what every account currently shows
TimeLink.switchView('vat')    // jump to a screen
TimeLink.findRate('ATTESTATION')
```

The tests use the same handle. Adding to it is safe; removing from it breaks
tests.
