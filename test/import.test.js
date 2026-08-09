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
import { SHEETS } from '../tools/import/schema.mjs';

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

describe('the awkward things a 1.5-year workbook actually contains', () => {
  it('recognises a tab even when the name is misspelled', () => {
    // The real workbook says "DATA ENTERY". Three months of records were
    // missed because the pattern only allowed the correct spelling.
    expect(classify('REAL DATA - DATA ENTERY FROM NOV 2024 - JAN 2025.csv')).toBe('transactions');
    expect(classify('REAL DATA - DATA ENTRY FROM 1ST JAN 2026.csv')).toBe('transactions');
  });

  it('skips tabs that are not records, quietly', () => {
    for (const f of ['REAL DATA - DASHBOARD.csv', 'REAL DATA - OVERVIEW.csv',
                     'REAL DATA - INVOICE_ENTRY.csv', 'REAL DATA - LEARN VISA STEPS.csv']) {
      expect(classify(f), f).toBe('skip');
    }
  });

  it('reads service templates', () => {
    expect(classify('REAL DATA - SERVICE_TEMPLATES.csv')).toBe('taskTemplates');
  });

  it('drops a header row repeated in the middle of the data', () => {
    // Long sheets repeat their headings. Those rows arrive looking like data:
    // no readable date, no money in them.
    const csv = [
      'Company,UID/Emirates ID,Worker Name,Inception Date,Expiry Date,Premium',
      'ACME,784197042791638,ALI,05/03/2026,04/03/2027,1200',
      'EID,EID,EID,EID,EID,EID',
      'ACME,784199911909341,OMAR,06/03/2026,05/03/2027,900',
    ].join('\n');

    const { rows, problems } = convert('insurance', parseTable(csv));
    expect(rows.length).toBe(2);
    expect(problems.some((p) => /repeated header/.test(p.why))).toBe(true);
  });

  it('keeps a row that has a bad date but real money in it', () => {
    // Not junk — a genuine record with one column mistyped. Dropping it
    // silently would lose a real payment.
    const csv = 'DATE,AMOUNT,COMPANY,REMARKS\nnotadate,500,IDRIS,part payment';
    const { problems } = convert('payments', parseTable(csv));
    expect(problems.some((p) => /repeated header/.test(p.why))).toBe(false);
    expect(problems.some((p) => /could not read the date/.test(p.why))).toBe(true);
  });

  it('groups repeated problems instead of listing them 200 times', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tl-noise-'));
    const lines = ['DATE,AMOUNT,COMPANY,REMARKS'];
    for (let i = 0; i < 50; i++) lines.push(`rubbish${i},10,CO,note`);
    writeFileSync(join(dir, 'Payments.csv'), lines.join('\n'));

    const { report } = run({ dir });
    const bullets = report.split('Things to look at')[1].split('\n').filter((l) => l.startsWith('- '));
    expect(bullets.length).toBeLessThan(5);
    expect(report).toMatch(/50 row\(s\)/);
    rmSync(dir, { recursive: true, force: true });
  });

  it('says loudly when a file produced nothing at all', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tl-empty2-'));
    writeFileSync(join(dir, 'DataEntry.csv'), 'COMPANY,WORK\nACME,PRINT\n'); // no date column
    const { report } = run({ dir });
    expect(report).toContain('Nothing was read from these files');
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('the real workbook’s actual layouts', () => {
  it('finds the headings under a summary banner', () => {
    // The Data Entry tabs carry two rows of running totals above the real
    // headings. Reading the banner as the header row loses every record.
    const csv = [
      ',,SALES,WORK EXP,PROFIT,IRFAN CARD,ABRAR CARD',
      ',TIME LINK,"2,543,400","2,137,063","32,592",-986,204',
      ',COMPANY NAME,EMPLOYEE NAME,WORK,RECEIVED,EXPENSE,PROFIT,PAID FROM',
      ',ACME LLC,SEKAR,FULL PACKAGE,280,51,229,ADCB',
    ].join('\n');

    const t = parseTable(csv, SHEETS.transactions.columns);
    expect(t.headerLine).toBe(3);
    expect(t.rows[0]['COMPANY NAME']).toBe('ACME LLC');
  });

  it('numbers repeated headings instead of letting them overwrite', () => {
    // The Payments tab has a second table beside the first, with its own
    // COMPANY NAME column. Unnumbered, the second overwrites the first and you
    // import the wrong table's companies.
    const csv = 'DATE,AMAOUNT,COMPANY NAME,REMARKS,,COMPANY NAME,RECEIVED\n' +
                '2 Nov 2024,5490,PAYING CO,,,OTHER TABLE CO,625';
    const t = parseTable(csv, SHEETS.payments.columns);
    expect(t.headers).toContain('COMPANY NAME');
    expect(t.headers).toContain('COMPANY NAME (2)');
    expect(t.rows[0]['COMPANY NAME']).toBe('PAYING CO');
  });

  it('reads the payments tab, misspelling and all, from the correct table', () => {
    const csv = 'DATE,AMAOUNT,COMPANY NAME,REMARKS,,COMPANY NAME,RECEIVED,USED,BALANCE\n' +
                '2 Nov 2024,5490,PAYING CO,part,,OTHER TABLE CO,625,625,0';
    const { rows } = convert('payments', parseTable(csv, SHEETS.payments.columns));

    expect(rows[0].amount).toBe(5490);        // AMAOUNT, not RECEIVED
    expect(rows[0].company).toBe('PAYING CO'); // first table, not the second
    expect(rows[0].account).toBeUndefined();   // no account column exists here
  });

  it('does not read a row number as an invoice number', () => {
    // "No." used to match invoiceNo, so every insurance row was imported with
    // its line number as the tax invoice number.
    const csv = 'No.,Company,UID/Emirates ID,Worker Name,Inception Date,Expiry Date,Tax Invoice No,Premium,Total Premium\n' +
                '1,Time Link,784199511987994,AYESHA JABBAR,11-05-2025,10-05-2027,16517061,120,126';
    const { rows } = convert('insurance', parseTable(csv, SHEETS.insurance.columns));

    expect(rows[0].invoiceNo).toBe('16517061');
    expect(rows[0].eid).toBe('784199511987994');
    expect(rows[0].inception).toBe('2025-05-11');   // day-first
    expect(rows[0].premium).toBe(120);
    expect(rows[0].total).toBe(126);
  });

  it('says what headings it DID find when a required one is missing', () => {
    const csv = ',COMPANY NAME,EMPLOYEE NAME,WORK,RECEIVED\n,ACME,SEKAR,PRINT,100';
    const { problems } = convert('transactions', parseTable(csv, SHEETS.transactions.columns));
    expect(problems[0].why).toMatch(/no column found for: date/);
    expect(problems[0].why).toMatch(/COMPANY NAME/);   // shows what it read
  });
});

describe('the date column that has no heading', () => {
  const SHEET = [
    ',,SALES,WORK EXP,PROFIT',
    ',TIME LINK,"2,543,400","2,137,063","32,592"',
    ',COMPANY NAME,EMPLOYEE NAME,WORK,RECEIVED,EXPENSE,PROFIT,PAID FROM',
    '2 Jan 2026,WALKING PARTY,CASH,PRINT,11,0,11,',
    '2 Jan 2026,IDRIS,SEKAR,FULL PACKAGE,150,51,99,ADCB',
    ',BAB AL QAMAR,UBAIDURRAHMAN,FULL PACKAGE,280,51,229,ADCB',
    '3 Jan 2026,ACME,SEKAR,PRINT,100,40,60,ADCB',
  ].join('\n');

  it('finds the date in an unheaded column', () => {
    // The sheet keeps the date in column A and column A has no heading — it is
    // simply typed in each morning. Matching on names alone can never find it,
    // and without a date there are no monthly totals, no VAT periods, no ageing.
    const { rows, mapping } = convert('transactions', parseTable(SHEET, SHEETS.transactions.columns));
    expect(rows.length).toBe(4);
    expect(rows[0].date).toBe('2026-01-02');
    expect(rows[3].date).toBe('2026-01-03');
    expect(mapping.date).toMatch(/no heading/);
  });

  it('carries the date down to rows left blank beneath it', () => {
    // A date typed once for the day is normal in a hand-kept sheet.
    const { rows } = convert('transactions', parseTable(SHEET, SHEETS.transactions.columns));
    expect(rows[2].company).toBe('BAB AL QAMAR');
    expect(rows[2].date).toBe('2026-01-02');
  });

  it('says in the report that it did both of those things', () => {
    const { problems } = convert('transactions', parseTable(SHEET, SHEETS.transactions.columns));
    expect(problems.some((p) => /no heading/.test(p.why))).toBe(true);
    expect(problems.some((p) => /took the date from the row above/.test(p.why))).toBe(true);
  });

  it('reads "2 Jan 2026" as 2 January', () => {
    const { rows } = convert('transactions', parseTable(SHEET, SHEETS.transactions.columns));
    expect(rows[0].date).toBe('2026-01-02');
  });

  it('does not mistake a column of amounts for the date column', () => {
    const csv = [
      ',COMPANY NAME,EMPLOYEE NAME,WORK,RECEIVED,EXPENSE,PROFIT,PAID FROM',
      '100,ACME,SEKAR,PRINT,11,0,11,',
      '200,IDRIS,SEKAR,PRINT,12,0,12,',
      '300,OTHER,SEKAR,PRINT,13,0,13,',
    ].join('\n');
    const { problems } = convert('transactions', parseTable(csv, SHEETS.transactions.columns));
    expect(problems.some((p) => /no column found for: date/.test(p.why))).toBe(true);
  });
});

describe('the three Data Entry formats', () => {
  const run3 = (headerLine, ...dataLines) =>
    convert('transactions', parseTable([',BANNER,SALES', ',TIME LINK,"1,000"', headerLine, ...dataLines].join('\n'),
      SHEETS.transactions.columns));

  it('reads the Nov 2024 layout (CARD FEE / AMER / TOTAL EXP)', () => {
    const { rows } = run3(
      ',COMPANY NAME,EMPLOYEE NAME,WORK,RECEIVED,CARD FEE,AMER,TOTAL EXP,PROFIT,PAID FROM',
      '2 Nov 2024,ATIF FARAZ,TOUSEEF,FULL PACKAGE,280.0,51,,51.0,229.0,IRFAN CARD',
      '3 Nov 2024,AXIS TRUST,SHAROZE,DRIVING LICENCE,300,,120,120,180,COUNTER CASH');
    expect(rows[0]).toMatchObject({ date: '2024-11-02', received: 280, expense: 51, profit: 229, paidFrom: 'IRFAN CARD' });
  });

  it('reads the Feb 2025 layout (FEE / AMER / EXPENSE)', () => {
    const { rows } = run3(
      ',COMPANY NAME,EMPLOYEE NAME,WORK,RECEIVED,FEE,AMER,EXPENSE,PROFIT,PAID FROM',
      '1 Feb 2025,SHEHRYAR FAMILY,SEEMAN,OUTSIDE ENTRY PERMIT,500,,404,404,96,AMER',
      '1 Feb 2025,S H K REAL ESTATE,BRUGIMU,DUBAI INSURANCE,189,189,,189,0,MASHREQ CARD');
    // EXPENSE is the total; FEE and AMER are its parts and must not be used.
    expect(rows[0]).toMatchObject({ date: '2025-02-01', received: 500, expense: 404, profit: 96 });
  });

  it('reads the Jan 2026 layout (EXPENSE only)', () => {
    const { rows } = run3(
      ',COMPANY NAME,EMPLOYEE NAME,WORK,RECEIVED,EXPENSE,PROFIT,PAID FROM',
      '2 Jan 2026,IDRIS,SEKAR,FULL PACKAGE,150,51,99,ADCB',
      '2 Jan 2026,WALKING PARTY,CASH,PRINT,11,0,11,');
    expect(rows[0]).toMatchObject({ date: '2026-01-02', received: 150, expense: 51, profit: 99, paidFrom: 'ADCB' });
  });
});

describe('the visa tracker’s tick boxes', () => {
  const csv = [
    ',,,,',
    'COMPANY NAME,EMPLOYEE NAME,FULL PACKAGE,DUBAI VISA INSURANCE,LABOUR FEE,CHANGE STATUS,PROGRESS,DATE STARTED',
    'SOUUL TRADING,JABIR,TRUE,TRUE,TRUE,TRUE,92%,27 Feb',
    'PINNACLE,NIDA ZAHID,TRUE,FALSE,FALSE,FALSE,8%,30 Dec',
  ].join('\n');

  it('turns the tick-box columns into one steps object', () => {
    const { rows } = convert('visa', parseTable(csv, SHEETS.visa.columns));
    expect(rows[0].steps).toEqual({
      'FULL PACKAGE': true, 'DUBAI VISA INSURANCE': true, 'LABOUR FEE': true, 'CHANGE STATUS': true,
    });
    expect(rows[1].steps['DUBAI VISA INSURANCE']).toBe(false);
  });

  it('keeps PROGRESS and DATE STARTED out of the steps', () => {
    const { rows } = convert('visa', parseTable(csv, SHEETS.visa.columns));
    expect(Object.keys(rows[0].steps)).not.toContain('PROGRESS');
    expect(Object.keys(rows[0].steps)).not.toContain('DATE STARTED');
  });

  it('gives every row the same step names, which is what the screen needs', () => {
    const { rows } = convert('visa', parseTable(csv, SHEETS.visa.columns));
    expect(Object.keys(rows[1].steps)).toEqual(Object.keys(rows[0].steps));
  });
});
