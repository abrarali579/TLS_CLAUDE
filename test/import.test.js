/**
 * Importing the Google Sheets workbook.
 *
 * The whole point of the importer is that it can be trusted with 1.5 years of
 * real records, and run more than once. So the things tested here are: does it
 * read spreadsheet CSV correctly, does it refuse to quietly "fix" figures, and
 * does running it twice leave you with one copy rather than two.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCsv, parseTable, findColumn } from '../tools/import/csv.mjs';
import { convert, merge, classify, rowKey, run } from '../tools/import/import.mjs';

const table = (text) => parseTable(text);

describe('reading spreadsheet CSV', () => {
  it('splits plain rows', () => {
    expect(parseCsv('a,b\nc,d')).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('keeps a comma inside a quoted company name', () => {
    expect(parseCsv('name\n"BAB AL QAMAR, LLC"')).toEqual([['name'], ['BAB AL QAMAR, LLC']]);
  });

  it('keeps a newline inside a quoted remark', () => {
    expect(parseCsv('note\n"line one\nline two"')).toEqual([['note'], ['line one\nline two']]);
  });

  it('handles doubled quotes', () => {
    expect(parseCsv('q\n"say ""hi"""')).toEqual([['q'], ['say "hi"']]);
  });

  it('copes with Windows line endings and a byte-order mark', () => {
    expect(parseCsv('﻿a,b\r\nc,d')).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('finds the header row under a title and a blank line', () => {
    const t = table('MY WORKBOOK\n\nDATE,COMPANY\n05/03/2026,ACME\n');
    expect(t.headers).toEqual(['DATE', 'COMPANY']);
    expect(t.rows[0].COMPANY).toBe('ACME');
  });

  it('reports the line number the spreadsheet shows, not the row index', () => {
    const t = table('TITLE\n\nDATE,COMPANY\n01/01/2026,A\n\n02/01/2026,B\n');
    expect(t.rows.map((r) => r.__line)).toEqual([4, 6]);
  });

  it('matches column names loosely', () => {
    expect(findColumn(['DATE', 'Amount Received'], ['received'])).toBe('Amount Received');
    expect(findColumn(['paid from'], ['paidFrom'])).toBe('paid from');
    expect(findColumn(['DATE'], ['nothing like it'])).toBeNull();
  });
});

describe('working out which tab a file came from', () => {
  it('recognises the usual names', () => {
    expect(classify('DataEntry.csv')).toBe('transactions');
    expect(classify('Payments.csv')).toBe('payments');
    expect(classify('Cash Book.csv')).toBe('ledger');
    expect(classify('Rates Master.csv')).toBe('rates');
    expect(classify('Invoice Items.csv')).toBe('invoiceItems');
  });

  it('tells invoices apart from invoice lines', () => {
    expect(classify('Invoices.csv')).toBe('invoices');
    expect(classify('Invoice Lines.csv')).toBe('invoiceItems');
  });

  it('returns null rather than guessing', () => {
    expect(classify('Sheet42.csv')).toBeNull();
  });
});

describe('converting transaction rows', () => {
  const HEAD = 'DATE,COMPANY NAME,EMPLOYEE,WORK,RECEIVED,EXPENSE,PROFIT,PAID FROM';

  it('reads a normal row', () => {
    const { rows } = convert('transactions', table(`${HEAD}\n05/03/2026,ACME,SEKAR,PRINT,280,51,229,ADCB`));
    expect(rows[0]).toMatchObject({
      date: '2026-03-05', company: 'ACME', employee: 'SEKAR',
      work: 'PRINT', received: 280, expense: 51, profit: 229, paidFrom: 'ADCB',
    });
  });

  it('reads dates day-first, the way the sheet writes them', () => {
    const { rows } = convert('transactions', table(`${HEAD}\n05/03/2026,A,B,C,1,0,1,`));
    expect(rows[0].date).toBe('2026-03-05'); // 5 March, not 3 May
  });

  it('reads comma-grouped amounts', () => {
    const { rows } = convert('transactions', table(`${HEAD}\n05/03/2026,A,B,C,"1,150.50",100,1050.5,`));
    expect(rows[0].received).toBe(1150.5);
  });

  it('skips blank padding rows without complaining', () => {
    // A 1.5-year sheet is full of these. They must not become empty entries,
    // and they must not fill the report with noise.
    const { rows, problems } = convert('transactions', table(`${HEAD}\n,,,,,,,\n05/03/2026,A,B,C,1,0,1,`));
    expect(rows.length).toBe(1);
    expect(problems.length).toBe(0);
  });

  it('skips a row that only has data in columns we do not import', () => {
    const { rows, skipped, problems } = convert(
      'transactions',
      table(`${HEAD},SCRATCH\n,,,,,,,,some working note\n05/03/2026,A,B,C,1,0,1,,`)
    );
    expect(rows.length).toBe(1);
    expect(skipped).toBe(1);
    expect(problems.length).toBe(0);
  });

  it('reports a date it cannot read, and leaves the row out', () => {
    const { rows, problems } = convert('transactions', table(`${HEAD}\nnotadate,A,B,C,1,0,1,`));
    expect(rows.length).toBe(0);
    expect(problems.some((p) => /could not read the date/.test(p.why))).toBe(true);
  });

  it('reports a profit that does not add up — but keeps YOUR figure', () => {
    // 300 - 100 is 200, the sheet says 175. That is usually a real correction,
    // so it is flagged for a human and imported exactly as written.
    const { rows, problems } = convert('transactions', table(`${HEAD}\n05/03/2026,A,B,C,300,100,175,`));
    expect(rows[0].profit).toBe(175);
    expect(problems.some((p) => /profit is 175/.test(p.why))).toBe(true);
  });

  it('drops a second identical row and says so', () => {
    const line = '05/03/2026,ACME,SEKAR,PRINT,280,51,229,ADCB';
    const { rows, problems } = convert('transactions', table(`${HEAD}\n${line}\n${line}`));
    expect(rows.length).toBe(1);
    expect(problems.some((p) => /duplicate/.test(p.why))).toBe(true);
  });

  it('gives up clearly when a required column is missing', () => {
    const { rows, problems } = convert('transactions', table('COMPANY,WORK\nACME,PRINT'));
    expect(rows.length).toBe(0);
    expect(problems[0].why).toMatch(/no column found for: date/);
  });
});

describe('row identity', () => {
  it('gives the same row the same id every time', () => {
    const row = { date: '2026-03-05', company: 'ACME', employee: 'S', work: 'PRINT', received: 280, expense: 51 };
    expect(rowKey('transactions', row)).toBe(rowKey('transactions', row));
  });

  it('ignores case and stray spacing, so a re-typed name is still the same row', () => {
    const a = { date: '2026-03-05', company: 'ACME', employee: 'S', work: 'PRINT', received: 280, expense: 51 };
    const b = { ...a, company: ' acme ' };
    expect(rowKey('transactions', a)).toBe(rowKey('transactions', b));
  });

  it('gives different rows different ids', () => {
    const a = { date: '2026-03-05', company: 'ACME', employee: 'S', work: 'PRINT', received: 280, expense: 51 };
    expect(rowKey('transactions', a)).not.toBe(rowKey('transactions', { ...a, received: 281 }));
  });
});

describe('merging into what is already there', () => {
  it('adds rows that are new', () => {
    const { rows, added } = merge([{ id: 'a' }], [{ id: 'b' }]);
    expect(added).toBe(1);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('leaves rows that are already there alone', () => {
    const existing = [{ id: 'a', company: 'EDITED IN THE APP' }];
    const { rows, added, kept } = merge(existing, [{ id: 'a', company: 'FROM THE SHEET' }]);
    expect(added).toBe(0);
    expect(kept).toBe(1);
    expect(rows[0].company).toBe('EDITED IN THE APP');
  });

  it('never discards rows that were typed straight into the app', () => {
    const typedHere = [{ company: 'NO ID, TYPED IN THE APP' }];
    const { rows } = merge(typedHere, [{ id: 'x' }]);
    expect(rows.length).toBe(2);
  });
});

describe('running the whole thing', () => {
  function fixture() {
    const dir = mkdtempSync(join(tmpdir(), 'tl-import-'));
    writeFileSync(join(dir, 'DataEntry.csv'),
      'TIMELINK\n\nDATE,COMPANY,EMPLOYEE,WORK,RECEIVED,EXPENSE,PROFIT,PAID FROM\n' +
      '05/03/2026,"BAB AL QAMAR, LLC",SEKAR,FULL PACKAGE,280,51,229,ADCB\n' +
      '13/01/2026,IDRIS,MALIK,PRINT,"1,150.50",100,1050.50,ADCB\n');
    writeFileSync(join(dir, 'Payments.csv'), 'DATE,AMOUNT,COMPANY,REMARKS\n05/03/2026,500,IDRIS,part payment\n');
    return dir;
  }

  it('reads every file and reports monthly totals', () => {
    const dir = fixture();
    const { store, report } = run({ dir });
    expect(store.transactions.length).toBe(2);
    expect(store.payments.length).toBe(1);
    expect(report).toContain('Monthly totals');
    expect(report).toContain('1430.50');   // 280 + 1150.50
    rmSync(dir, { recursive: true, force: true });
  });

  it('running it twice does not duplicate anything', () => {
    const dir = fixture();
    const first = run({ dir });
    writeFileSync(join(dir, 'base.json'), JSON.stringify(first.store));
    const second = run({ dir, into: join(dir, 'base.json') });

    expect(second.store.transactions.length).toBe(2);
    expect(second.files.every((f) => f.added === 0)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  it('picks up new rows added to the sheet later', () => {
    const dir = fixture();
    const first = run({ dir });
    writeFileSync(join(dir, 'base.json'), JSON.stringify(first.store));

    writeFileSync(join(dir, 'DataEntry.csv'),
      'TIMELINK\n\nDATE,COMPANY,EMPLOYEE,WORK,RECEIVED,EXPENSE,PROFIT,PAID FROM\n' +
      '05/03/2026,"BAB AL QAMAR, LLC",SEKAR,FULL PACKAGE,280,51,229,ADCB\n' +
      '13/01/2026,IDRIS,MALIK,PRINT,"1,150.50",100,1050.50,ADCB\n' +
      '20/03/2026,NEW CO,SEKAR,TYPING,90,10,80,ADCB\n');

    const second = run({ dir, into: join(dir, 'base.json') });
    expect(second.store.transactions.length).toBe(3);
    rmSync(dir, { recursive: true, force: true });
  });

  it('says so plainly when the folder is empty', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tl-empty-'));
    const { report } = run({ dir });
    expect(report).toContain('No CSV files found');
    rmSync(dir, { recursive: true, force: true });
  });
});
