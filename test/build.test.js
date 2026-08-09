/**
 * Build parity: the file produced by `npm run build` must behave exactly like
 * the original hand-written single file.
 *
 * This is the test that makes it safe to move code around. As long as it
 * passes, refactoring src/ cannot silently change what you ship.
 *
 * Requires `npm run build` to have been run first.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { bootApp, APP_FILES } from './harness.js';

const built = existsSync(APP_FILES.built);
const when = built ? describe : describe.skip;

/** Newest modification time anywhere under src/. */
function newestSrcTime(dir = 'src') {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestSrcTime(p) : statSync(p).mtimeMs);
  }
  return newest;
}

when('the built single-file app', () => {
  let original, build;
  beforeAll(async () => {
    original = await bootApp('suite');
    build = await bootApp('built');
  });

  it('is actually up to date with src — a stale build proves nothing', () => {
    // Without this, editing src/ and forgetting to rebuild makes every test
    // below pass against the previous build. Silent false confidence.
    expect(
      statSync(APP_FILES.built).mtimeMs,
      'dist is older than src — run `npm run build`'
    ).toBeGreaterThan(newestSrcTime());
  });

  it('boots clean', () => {
    expect(build.__errors).toEqual([]);
    expect(build.__uncaught).toEqual([]);
  });

  it('is genuinely self-contained — no external scripts or stylesheets', () => {
    const doc = build.document;
    expect(doc.querySelectorAll('script[src]').length).toBe(0);
    expect(doc.querySelectorAll('link[rel="stylesheet"]').length).toBe(0);
  });

  it('ships the same screens as the original', () => {
    expect(build.NAV.filter((x) => x.v).map((x) => x.v))
      .toEqual(original.NAV.filter((x) => x.v).map((x) => x.v));
  });

  // The sample records were removed once real data arrived, so the build no
  // longer carries the same rows as the frozen original. What still has to
  // match is the CODE — same screens, same date handling, same shapes.
  // Figures are checked against the empty store below instead.

  it('ships empty, ready for real data', () => {
    // The Data Entry sheet always keeps a few blank rows so there is somewhere
    // to type. Those are not records — judge by the business fields.
    const filled = (r) => Boolean(r.company || r.employee || r.work || r.received || r.expense || r.amount || r.item || r.name || r.InvoiceNo);

    for (const key of ['transactions', 'payments', 'invoices', 'ledger', 'rates', 'contacts', 'insurance']) {
      const real = (build.D[key] ?? []).filter(filled);
      expect(real.length, `${key} still contains sample records`).toBe(0);
    }
  });

  it('still gives you blank rows to type into', () => {
    expect(build.D.transactions.length).toBeGreaterThan(0);
  });

  it('keeps the company set-up — accounts, partners, VAT rate', () => {
    // Configuration is not sample data. Wiping it would mean setting the
    // business up again from scratch.
    expect(build.D.settings.accounts.length).toBeGreaterThan(0);
    expect(build.D.settings.partners.length).toBeGreaterThan(0);
    expect(build.vatRate()).toBeGreaterThan(0);
  });

  it('is much smaller without the sample records', () => {
    const built = statSync(APP_FILES.built).size;
    const before = statSync(APP_FILES.suite).size;
    expect(built).toBeLessThan(before / 2);
  });

  it('reports zeroes rather than breaking on an empty store', () => {
    const partners = build.partnerData();
    expect(partners.grossProfit).toBe(0);
    expect(partners.distributable).toBe(0);
    expect(partners.rows.length).toBe(build.D.settings.partners.length);

    for (const account of build.accountBalances()) {
      expect(Number.isFinite(account.balance), `${account.name} balance`).toBe(true);
    }
  });

  it('still refuses to invent a price when the rates master is empty', () => {
    expect(build.findRate('ANYTHING AT ALL')).toBeNull();
    expect(build.invoiceRate('ANYTHING AT ALL', 0)).toEqual({ rate: 0, src: 'none' });
  });

  it('starts invoice numbering from the first number of the month', () => {
    expect(build.nextInvNo('2026-03-05')).toMatch(/^[A-Z]+260301$/);
  });

  it('reads dates identically', () => {
    for (const d of ['05/03/2026', '13/01/2026', '2026-1-2', '3.4.26', 'garbage']) {
      expect(build.parseAnyDate(d), d).toBe(original.parseAnyDate(d));
    }
  });

  it('renders every screen without an error card', () => {
    const broken = [];
    for (const view of build.NAV.filter((x) => x.v)) {
      build.switchView(view.v);
      if (build.document.querySelector('#view').innerHTML.includes('Something went wrong'))
        broken.push(view.v);
    }
    expect(broken).toEqual([]);
  });
});

/**
 * Hiding the page must flush a pending save.
 *
 * Scope, honestly: this proves the flush happens at all — remove it and this
 * test fails. It does NOT prove the listener is on the right object, because
 * the synthetic event here bubbles just as a real one does, so window and
 * document both hear it. The listener lives on document because that is where
 * visibilitychange is fired; the browser test is what exercises the real path.
 */
when('flushing on page hide', () => {
  it('writes a debounced save when the page is hidden', async () => {
    const app = await bootApp('built');
    const marker = `HIDE-${Date.now()}`;

    app.TimeLink.D.transactions.push({
      id: 'hide-test', date: '2026-03-05', company: marker,
      employee: 'T', work: 'PRINT', received: 10, expense: 0, profit: 10, paidFrom: '',
    });
    app.TimeLink.save(); // debounced — deliberately not awaited

    Object.defineProperty(app.document, 'visibilityState', { value: 'hidden', configurable: true });
    app.document.dispatchEvent(new app.window.Event('visibilitychange', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 150));

    const stored = await app.TimeLink.readStored();
    expect(stored, 'nothing was written at all').toBeTruthy();
    expect(
      stored.transactions.some((t) => t.company === marker),
      'the pending save was lost when the page was hidden'
    ).toBe(true);
  });
});
