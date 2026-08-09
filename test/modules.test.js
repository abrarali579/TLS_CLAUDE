/**
 * Unit tests that import the extracted modules DIRECTLY.
 *
 * This is the payoff from splitting the code up: no browser, no app boot, no
 * seed data — these run in milliseconds. As more logic moves out of main.js,
 * more of the suite should look like this.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { n, m0, m2, uid, esc } from '../src/lib/format.js';
import { fmtDate, today, daysAgo, parseAnyDate, parseClipTable } from '../src/lib/dates.js';
import { D, setD } from '../src/core/store.js';
import { rateMap, rateBust, findRate, invoiceRate } from '../src/domain/rates.js';

describe('lib/format', () => {
  it('n reads numbers and never returns NaN', () => {
    expect(n('1,234.50')).toBe(1234.5);
    expect(n(-5)).toBe(-5);
    for (const bad of ['', null, undefined, 'abc', {}]) expect(n(bad)).toBe(0);
  });

  it('m2 always shows exactly two decimals', () => {
    expect(m2(1234.5)).toBe('1,234.50');
    expect(m2(0)).toBe('0.00');
  });

  it('m0 rounds to whole units', () => {
    expect(m0(1234.6)).toBe('1,235');
  });

  it('esc neutralises HTML so customer names cannot break the page', () => {
    expect(esc('<script>alert(1)</script>')).not.toContain('<script>');
    expect(esc('Tom & "Jerry"')).toBe('Tom &amp; &quot;Jerry&quot;');
    expect(esc(null)).toBe('');
  });

  it('uid produces unique ids', () => {
    const ids = new Set(Array.from({ length: 500 }, uid));
    expect(ids.size).toBe(500);
  });
});

describe('lib/dates', () => {
  it('fmtDate renders a readable date, and a dash when empty', () => {
    expect(fmtDate('2026-03-05')).toBe('5 Mar 2026');
    expect(fmtDate('')).toBe('—');
  });

  it('today and daysAgo return ISO dates', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(daysAgo(7)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(daysAgo(7) < today()).toBe(true);
  });

  it('parseAnyDate keeps the day-first rule', () => {
    expect(parseAnyDate('05/03/2026')).toBe('2026-03-05');
  });

  it('parseClipTable splits rows and cells', () => {
    expect(parseClipTable('a\tb\nc\td')).toEqual([['a', 'b'], ['c', 'd']]);
  });
});

describe('core/store', () => {
  it('setD swaps the store and importers see it live', () => {
    setD({ marker: 1 });
    expect(D.marker).toBe(1);
    setD({ marker: 2 });
    expect(D.marker).toBe(2);
  });
});

describe('domain/rates (against a tiny made-up rate list)', () => {
  beforeEach(() => {
    setD({ rates: [
      { item: 'Attestation', rate: 120, fee: 10 },
      { item: 'Bank Account', rate: 300, fee: 0 },
      { item: 'Attestation', rate: 999, fee: 99 }, // duplicate, must be ignored
    ] });
    rateBust();
  });

  it('indexes rates by uppercase name and keeps the first duplicate', () => {
    expect(rateMap()['ATTESTATION']).toEqual({ rate: 120, fee: 10, src: 'master' });
  });

  it('finds a rate regardless of case, spacing or punctuation', () => {
    for (const q of ['attestation', '  ATTESTATION ', 'Attestation', 'bank-account']) {
      expect(findRate(q), q).toBeTruthy();
    }
  });

  it('ignores an Arabic suffix after a dash', () => {
    expect(findRate('ATTESTATION - تصديق')).toEqual({ rate: 120, fee: 10, src: 'master' });
  });

  it('returns null rather than a wrong price when nothing matches', () => {
    expect(findRate('SOMETHING ELSE')).toBeNull();
  });

  it('template price beats the master price', () => {
    expect(invoiceRate('ATTESTATION', 75)).toEqual({ rate: 75, src: 'template' });
    expect(invoiceRate('ATTESTATION', 0)).toEqual({ rate: 120, src: 'master' });
    expect(invoiceRate('UNKNOWN', 0)).toEqual({ rate: 0, src: 'none' });
  });

  it('rateBust makes a newly added rate visible', () => {
    expect(findRate('NEW SERVICE')).toBeNull();
    D.rates.push({ item: 'New Service', rate: 55, fee: 0 });
    expect(findRate('NEW SERVICE')).toBeNull(); // still cached
    rateBust();
    expect(findRate('NEW SERVICE')).toMatchObject({ rate: 55 });
  });
});
