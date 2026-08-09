/**
 * Characterization tests for the money math: invoice totals, VAT, account
 * balances and partner shares. These are the numbers a person acts on, so a
 * silent change here is the most expensive kind of bug in this app.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { bootApp } from './harness.js';

let app;
beforeAll(async () => { app = await bootApp('suite'); });

describe('n() — turning typed text into a number', () => {
  it('reads plain and comma-grouped numbers', () => {
    expect(app.n('1,234.50')).toBe(1234.5);
    expect(app.n('-5')).toBe(-5);
    expect(app.n(42)).toBe(42);
  });

  it('treats unreadable input as zero rather than NaN', () => {
    for (const bad of ['', null, undefined, 'abc']) expect(app.n(bad)).toBe(0);
  });
});

describe('invTotals — VAT applies to the service fee ONLY', () => {
  const inv = () => ({
    items: [
      { desc: 'GOVT CHARGE A', qty: 2, rate: 100 },
      { desc: 'GOVT CHARGE B', qty: 1, rate: 50 },
    ],
    ServiceFee: 200,
    Advance: 0,
  });

  it('sums government line items as qty x rate', () => {
    expect(app.invTotals(inv()).govt).toBe(250);
  });

  it('charges VAT on the service fee and NOT on government charges', () => {
    const t = app.invTotals(inv());
    const rate = app.vatRate();
    expect(t.vat).toBe(Math.round(200 * rate * 100) / 100);
    // The giveaway that govt is excluded: VAT is unchanged by govt charges.
    const noGovt = app.invTotals({ items: [], ServiceFee: 200, Advance: 0 });
    expect(noGovt.vat).toBe(t.vat);
  });

  it('grand total is govt + fee + VAT', () => {
    const t = app.invTotals(inv());
    expect(t.grand).toBe(Math.round((t.govt + t.fee + t.vat) * 100) / 100);
  });

  it('balance is the grand total minus any advance', () => {
    const t = app.invTotals({ ...inv(), Advance: 100 });
    expect(t.advance).toBe(100);
    expect(t.balance).toBe(Math.round((t.grand - 100) * 100) / 100);
  });

  it('ignores rows that have no description yet', () => {
    // Stops a half-typed row from inflating the total shown on screen.
    const withBlank = app.invTotals({
      items: [...inv().items, { desc: '   ', qty: 9, rate: 999 }],
      ServiceFee: 200, Advance: 0,
    });
    expect(withBlank.govt).toBe(250);
  });

  it('rounds every returned figure to 2 decimals', () => {
    const t = app.invTotals({ items: [{ desc: 'X', qty: 3, rate: 33.333 }], ServiceFee: 10.005, Advance: 0 });
    for (const k of ['govt', 'vat', 'grand', 'balance', 'feeInc']) {
      expect(t[k]).toBe(Math.round(t[k] * 100) / 100);
    }
  });
});

describe('vatRate', () => {
  it('falls back to 5% when the setting is missing', () => {
    const saved = app.D.settings.vatRate;
    app.D.settings.vatRate = '';
    expect(app.vatRate()).toBe(0.05);
    app.D.settings.vatRate = saved;
  });
});

describe('accountBalances — one row per account', () => {
  let rows;
  beforeAll(() => { rows = app.accountBalances(); });

  it('returns every configured account', () => {
    const configured = app.D.settings.accounts.map((a) => a.name);
    for (const name of configured) expect(rows.some((r) => r.name === name)).toBe(true);
  });

  it('gives every row the same shape', () => {
    for (const r of rows) {
      expect(r).toMatchObject({ name: expect.any(String), balance: expect.any(Number) });
      expect(Number.isFinite(r.balance)).toBe(true);
    }
  });

  it('asset accounts balance to money in, minus money out, plus adjustment', () => {
    for (const r of rows.filter((x) => x.type === 'asset')) {
      expect(r.balance).toBeCloseTo(r.in - r.out + r.adjust, 6);
    }
  });

  it('credit accounts report what is still OWED, not a cash balance', () => {
    for (const r of rows.filter((x) => x.type === 'credit')) {
      expect(r.kind).toBe('owed');
      expect(r.balance).toBeCloseTo(r.out - r.in + r.adjust, 6);
    }
  });

  it('counts a payment mirrored from the cash book only once', () => {
    // Payments carrying srcLedger are already counted in the ledger total.
    const target = rows.find((r) => r.type === 'asset' && r.moves > 0);
    const before = app.accountBalances().find((r) => r.name === target.name).balance;
    app.D.payments.push({ account: target.name, amount: 1000, srcLedger: 'some-ledger-id' });
    const after = app.accountBalances().find((r) => r.name === target.name).balance;
    app.D.payments.pop();
    expect(after).toBe(before);
  });
});

describe('partnerData — profit split', () => {
  let p;
  beforeAll(() => { p = app.partnerData(); });

  it('distributable = gross profit minus office expenses and reserves', () => {
    expect(p.distributable).toBe(Math.round((p.grossProfit - p.office - p.reserves) * 100) / 100);
  });

  it('entitles each partner to their share of the distributable profit', () => {
    for (const r of p.rows) {
      expect(r.entitled).toBe(Math.round(p.distributable * r.share * 100) / 100);
    }
  });

  it('outstanding is what they are entitled to, minus what they drew', () => {
    for (const r of p.rows) {
      expect(r.outstanding).toBe(Math.round((r.entitled - r.drawn) * 100) / 100);
    }
  });

  it('partner shares add up to 100%', () => {
    expect(p.rows.reduce((a, r) => a + r.share, 0)).toBeCloseTo(1, 6);
  });
});
