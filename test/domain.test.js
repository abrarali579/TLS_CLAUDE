/**
 * Direct unit tests for the business calculations extracted in Phase 5.
 *
 * Each one sets up a tiny made-up dataset rather than leaning on the seed
 * data, so a failure points at the rule that broke, not at the fixture.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setD } from '../src/core/store.js';
import { waNumber } from '../src/domain/whatsapp.js';
import { isBlankTx, isBlankPay, isBlankExp, isBlankCB, newTx, monthKey, COL } from '../src/domain/rows.js';
import { advanceDate, FREQ } from '../src/domain/recurring.js';
import { quarterOf, periodLabel } from '../src/domain/vat.js';
import { daysBetween, AGE_BUCKETS } from '../src/domain/ageing.js';
import { yymm, docPrefix, parseInvNo, nextInvNo } from '../src/domain/invoices.js';

describe('whatsapp/waNumber — UAE numbers', () => {
  it('adds the country code when it is missing', () => {
    expect(waNumber('0501234567')).toBe('971501234567');
    expect(waNumber('501234567')).toBe('971501234567');
  });

  it('leaves a number that already has the country code alone', () => {
    expect(waNumber('971501234567')).toBe('971501234567');
    expect(waNumber('+971 50 123 4567')).toBe('971501234567');
  });

  it('strips spaces, dashes and brackets', () => {
    expect(waNumber('(050) 123-4567')).toBe('971501234567');
  });

  it('returns empty for nothing usable', () => {
    for (const bad of ['', null, undefined, 'abc']) expect(waNumber(bad)).toBe('');
  });
});

describe('rows — telling a blank row from a real one', () => {
  it('a freshly added transaction row counts as blank', () => {
    expect(isBlankTx(newTx())).toBe(true);
  });

  it('any filled field makes the row real', () => {
    expect(isBlankTx({ ...newTx(), company: 'ACME' })).toBe(false);
    expect(isBlankTx({ ...newTx(), received: 100 })).toBe(false);
    expect(isBlankTx({ ...newTx(), paidFrom: 'ADCB' })).toBe(false);
  });

  it('a zero amount alone does not make a row real', () => {
    expect(isBlankTx({ ...newTx(), received: 0, expense: 0 })).toBe(true);
  });

  it('the other sheets use the same idea', () => {
    expect(isBlankPay({})).toBe(true);
    expect(isBlankPay({ company: 'ACME' })).toBe(false);
    expect(isBlankExp({})).toBe(true);
    expect(isBlankExp({ amount: 50 })).toBe(false);
    expect(isBlankCB({})).toBe(true);
    expect(isBlankCB({ remark: 'note' })).toBe(false);
  });

  it('newTx gives every row its own id', () => {
    expect(newTx().id).not.toBe(newTx().id);
  });

  it('monthKey takes the year and month', () => {
    expect(monthKey('2026-03-05')).toBe('2026-03');
    expect(monthKey('')).toBe('');
  });

  it('COL keeps the sheet column order stable', () => {
    expect(COL.date).toBeLessThan(COL.company);
    expect(COL.received).toBeLessThan(COL.expense);
    expect(COL.expense).toBeLessThan(COL.profit);
  });
});

describe('recurring/advanceDate', () => {
  it('moves a monthly entry on by one month', () => {
    expect(advanceDate('2026-01-15', 'monthly')).toBe('2026-02-15');
  });

  it('clamps to the last day of a shorter month', () => {
    // 31 Jan + 1 month must not silently become 3 March.
    expect(advanceDate('2026-01-31', 'monthly')).toBe('2026-02-28');
  });

  it('handles every frequency it offers', () => {
    for (const key of Object.keys(FREQ)) {
      expect(advanceDate('2026-01-15', key)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(advanceDate('2026-01-15', key) > '2026-01-15').toBe(true);
    }
  });

  it('falls back to monthly for an unknown frequency', () => {
    expect(advanceDate('2026-01-15', 'nonsense')).toBe(advanceDate('2026-01-15', 'monthly'));
  });
});

describe('vat — filing periods', () => {
  it('puts each month in the right quarter', () => {
    expect(quarterOf('2026-01-15')).toEqual({ y: '2026', q: 1 });
    expect(quarterOf('2026-03-31')).toEqual({ y: '2026', q: 1 });
    expect(quarterOf('2026-04-01')).toEqual({ y: '2026', q: 2 });
    expect(quarterOf('2026-12-31')).toEqual({ y: '2026', q: 4 });
  });

  it('labels months and quarters readably', () => {
    expect(periodLabel('2026-03')).toBe('Mar 2026');
    expect(periodLabel('2026-Q2')).toBe('2026 Q2');
  });
});

describe('ageing', () => {
  it('counts whole days between two dates', () => {
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30);
    expect(daysBetween('2026-03-31', '2026-03-31')).toBe(0);
  });

  it('treats a missing date as zero rather than NaN', () => {
    expect(daysBetween('', '2026-03-31')).toBe(0);
  });

  it('buckets run oldest-last and cover everything', () => {
    const maxes = AGE_BUCKETS.map((b) => b.max);
    expect(maxes).toEqual([...maxes].sort((a, b) => a - b));
    expect(maxes.at(-1)).toBe(Infinity);
  });
});

describe('invoices — numbering', () => {
  beforeEach(() => {
    setD({ settings: { prefix: 'TL' }, invoices: [] });
  });

  it('yymm is the two-digit year then the month', () => {
    expect(yymm('2026-03-05')).toBe('2603');
    expect(yymm('2026-12-01')).toBe('2612');
  });

  it('uses the company prefix from settings', () => {
    expect(docPrefix({})).toBe('TL');
    setD({ settings: { prefix: 'ABC' }, invoices: [] });
    expect(docPrefix({})).toBe('ABC');
  });

  it('starts at 01 for a month with no invoices', () => {
    expect(nextInvNo('2026-03-05')).toBe('TL260301');
  });

  it('continues from the highest number already used that month', () => {
    setD({
      settings: { prefix: 'TL' },
      invoices: [{ InvoiceNo: 'TL260301' }, { InvoiceNo: 'TL260307' }, { InvoiceNo: 'TL260304' }],
    });
    expect(nextInvNo('2026-03-05')).toBe('TL260308');
  });

  it('numbers restart in a new month', () => {
    setD({ settings: { prefix: 'TL' }, invoices: [{ InvoiceNo: 'TL260309' }] });
    expect(nextInvNo('2026-04-01')).toBe('TL260401');
  });

  it('reads a number back apart', () => {
    expect(parseInvNo('TL260307')).toMatchObject({ yymm: '2603', nn: 7 });
  });

  it('refuses a number that is not ours rather than guessing', () => {
    for (const bad of ['', null, 'XX260307', 'TL26', 'nonsense']) {
      expect(parseInvNo(bad)).toBeNull();
    }
  });

  it('is case-insensitive when reading a number back', () => {
    expect(parseInvNo('tl260307')).toMatchObject({ nn: 7 });
  });
});
