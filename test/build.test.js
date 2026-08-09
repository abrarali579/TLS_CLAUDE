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
import { existsSync } from 'node:fs';
import { bootApp, APP_FILES } from './harness.js';

const built = existsSync(APP_FILES.built);
const when = built ? describe : describe.skip;

when('the built single-file app', () => {
  let original, build;
  beforeAll(async () => {
    original = await bootApp('suite');
    build = await bootApp('built');
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

  it('loads the same seed data', () => {
    for (const key of Object.keys(original.D)) {
      const a = original.D[key], b = build.D[key];
      if (Array.isArray(a)) expect(b.length, `${key} row count`).toBe(a.length);
    }
  });

  it('produces identical account balances', () => {
    expect(build.accountBalances()).toEqual(original.accountBalances());
  });

  it('produces identical partner figures', () => {
    expect(build.partnerData()).toEqual(original.partnerData());
  });

  it('prices identically off the rates master', () => {
    for (const item of Object.keys(original.rateMap()).slice(0, 40)) {
      expect(build.findRate(item), item).toEqual(original.findRate(item));
    }
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
