# Where things stand

Last updated: 9 August 2026

## Immediate next step

The Google Sheets import is **built, debugged against the real workbook, and
not yet loaded**. Nothing has been written into the app.

```powershell
node tools/import/import.mjs
```

Latest run: **14,918 rows read · 442 things to look at · 14 notes**.

**The one thing left to do before loading:** compare the monthly totals in
`import/report.md` against the banner figures at the top of each Google Sheets
tab.

| Sheet | Banner total (SALES) |
|---|---:|
| Nov 2024 – Jan 2025 | 860,100 |
| Feb – Dec 2025 | 3,465,467 |
| Jan – Aug 2026 | 2,543,400 |

Before the duplicate fix, the import came in short by 1,350 / 5,223 / 10,848
respectively — consistently under, never over, which is what dropped rows look
like. That fix landed but the comparison has not been re-checked.

To see the totals:

```powershell
Select-String -Path import\report.md -Pattern "^\| \d{4}-\d{2}|^\| \*\*TOTAL" |
  ForEach-Object { $_.Line }
```

If they match, load it:

```powershell
node tools/import/import.mjs --write
```

then in the app: **Data & Settings → ⬆ Restore Backup** with
`import/timelink-import.json`. Take a backup of whatever is in the app first.

## Known things still worth a look

- **18 rows where profit ≠ received − expense.** Imported exactly as written —
  the importer never silently corrects figures. Line numbers are in the report.
  Usually real adjustments, occasionally a typo.
- **The remaining 442 issues** have not been read through since the last fixes.
- **Old formats.** Nov 2024 (`CARD FEE / AMER / TOTAL EXP`) and Feb 2025
  (`FEE / AMER / EXPENSE`) both import; Jan 2026 is the current format.

## Bugs found by importing real data, now fixed and tested

Each has a test named after it in `test/import.test.js`.

1. **Genuine repeated sales were dropped as duplicates.** Two identical
   `WALKING PARTY / CASH / PRINT / 1 / 0` rows on one day are two real sales.
   Rows are now identified by content *plus* how many times that content has
   appeared, so re-importing still never duplicates.
2. **246 of 284 insurance rows were discarded** by an over-eager "looks like a
   header" rule. A named worker makes it a policy however untidy the row.
3. **748 empty visa rows produced complaints** — the tick-box columns filled in
   false-for-everything before the blank check ran.
4. **The date column has no heading.** It is typed into column A each morning.
   Found by looking for an unheaded column whose values read as dates; blank
   ones take the date from the row above.
5. **Windows entry points did nothing.** Every CLI used
   `` `file://${process.argv[1]}` ``, false on Windows. `npm start` was affected
   too. See `test/commands.test.js`.

## Project state

- 240 tests · `npm test`
- `src\main.js` is 12 KB of wiring; 60 modules
- Server with logins and roles: Abrar (owner), M Irfan (partner), Ayesha
  (staff). Staff cannot see partner figures — enforced server-side in
  `server/redact.js`
- Sample records removed; shipped file is 352 KB, down from 1.1 MB
- Office access: `http://192.168.70.203:4000` (Ethernet). Not `172.18.160.1`,
  which is WSL's virtual adapter

## After the import

1. Change the placeholder passwords — see SERVER.md
2. Phone layout (`initMobile()` exists; screens aren't designed for small
   displays)
3. The customisation layer — column widths and colours as saved preferences, a
   config file for formulas
4. Bank feeds via an aggregator — needs the server, which now exists. Check
   UAE coverage before committing to a provider

## Reading order

`README.md` → `SERVER.md` → `USING.md` → `BUILD.md` → `TESTING.md` →
`import/README.md`
