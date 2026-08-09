# Bringing your Google Sheets workbook in

This folder is where you drop the CSV exports. Nothing here gets loaded into
the app automatically — the importer produces a file and a report, you check
the report, and only then do you load anything.

## 1. Export from Google Sheets

For each tab: **File → Download → Comma Separated Values (.csv)**.

Save them into this folder. The names only need to *contain* a recognisable
word — case and spacing don't matter:

| Your tab | Name it something like | Recognised by |
|---|---|---|
| Daily work sheet | `DataEntry.csv` | data entry, transactions, entries, daily |
| Payments received | `Payments.csv` | payment, receipt, collection |
| Cash / bank book | `Cash Book.csv` | cash book, ledger, bank book |
| Rates | `Rates Master.csv` | rate, price, master |
| Invoices | `Invoices.csv` | invoice |
| Invoice line items | `Invoice Items.csv` | invoice item, invoice line |
| Contacts | `Contacts.csv` | contact, phone, directory |
| Employees | `Employees.csv` | employee, staff, worker |
| Insurance | `Insurance.csv` | insurance, policy, medical |
| Visa tracker | `Visa.csv` | visa, immigration |

If a file can't be matched, the report says so rather than guessing.

## 2. Run it

```powershell
cd D:\TLS_CLAUDE
node tools/import/import.mjs
```

It prints a line or two and writes **`import/report.md`**. It changes nothing
else.

If it prints nothing at all, something is wrong — say so rather than assuming
it worked.

## 3. Read the report — this is the important step

Three things to check, in order:

**The column mapping.** The report lists which spreadsheet column it used for
each field. A column matched to the wrong field is the easiest way to get an
import that looks perfect and is quietly wrong. If something's mapped
incorrectly, tell me the column name and I'll add it to
`tools/import/schema.mjs`.

**The monthly totals.** The report prints rows, received, expense and profit
for every month. **Compare these against the same totals in your Google
Sheet.** If a single month differs, stop and find out why. This is the check
that actually proves the import worked.

**Things to look at.** Rows the importer wasn't sure about, each with the line
number as your spreadsheet shows it. Common ones:

- *could not read the date* — that row is left out; fix it in the sheet and
  re-run
- *profit is X but received − expense is Y* — the row is imported **exactly as
  written**. The importer never silently corrects your figures. Usually these
  are real adjustments you already know about.
- *duplicate row ignored* — two identical rows in the same export

## 4. Load it

When the totals match:

```powershell
node tools/import/import.mjs --write
```

That produces `import/timelink-import.json`. In the app: **Data & Settings →
⬆ Restore Backup**, choose that file.

**Take a backup of whatever is currently in the app first.** Restore replaces
everything.

## Running it again — keeping both systems going

You said you want to run the Google Sheet and TimeLink side by side for a
while. That works, because the importer is repeatable.

Every row gets an id worked out from its own contents, so:

- re-importing an updated export brings in **only the new rows**
- rows already there are **left exactly as they are** — including any you
  edited inside TimeLink, which are never overwritten by the sheet
- rows you typed straight into the app are never touched

To top up:

```powershell
# 1. export the changed tabs again into this folder
# 2. merge on top of what the app already has
node tools/import/import.mjs --into import/timelink-import.json --write
```

Then restore the new file. One caveat: **if you edit an existing row in Google
Sheets** — change an amount on a row already imported — it becomes a different
row as far as the importer is concerned, and comes in as a new entry. So while
you're running both, add new rows in the sheet but make corrections in TimeLink.

## A note on privacy

CSV exports of your real books will sit in this folder. It's gitignored, so it
never reaches GitHub — but it is plain text on your disk. Delete them once the
import is done and reconciled.
