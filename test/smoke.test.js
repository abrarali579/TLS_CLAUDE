/**
 * Smoke tests: open every screen in the app and insist nothing blows up.
 *
 * switchView() catches render errors and shows a "Something went wrong"
 * card instead of crashing, which is good for users but means a broken view
 * looks fine to a naive test. So we check for that card explicitly.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { bootApp } from './harness.js';

const ERROR_CARD = 'Something went wrong rendering this view';

describe('TimeLink Suite', () => {
  let app, views;
  beforeAll(async () => {
    app = await bootApp('suite');
    views = app.NAV.filter((x) => x.v);
  });

  it('boots without console errors', () => {
    expect(app.__errors).toEqual([]);
    expect(app.__uncaught).toEqual([]);
  });

  it('loads its data store with the expected collections', () => {
    for (const key of ['transactions', 'ledger', 'payments', 'rates', 'invoices', 'settings']) {
      expect(app.D[key]).toBeDefined();
    }
  });

  it('has a navigation entry for every screen', () => {
    expect(views.length).toBeGreaterThan(20);
  });

  it('renders every screen without an error card', () => {
    const broken = [];
    for (const view of views) {
      app.switchView(view.v);
      const html = app.document.querySelector('#view').innerHTML;
      if (html.includes(ERROR_CARD)) broken.push(view.v);
      // A rendered screen should put *something* on the page.
      if (!html.trim()) broken.push(`${view.v} (empty)`);
    }
    expect(broken).toEqual([]);
  });

  it('sets the page title for every screen', () => {
    for (const view of views) {
      app.switchView(view.v);
      expect(app.document.querySelector('#vtitle').textContent).toBe(view.t);
    }
  });

  it('can be navigated repeatedly without leaking errors', () => {
    const before = app.__uncaught.length;
    for (let pass = 0; pass < 2; pass++) for (const view of views) app.switchView(view.v);
    expect(app.__uncaught.length).toBe(before);
  });

  it('survives being sent to a screen that does not exist', () => {
    expect(() => app.switchView('no-such-view')).not.toThrow();
  });
});

describe('TimeLink Phase 1', () => {
  let app;
  beforeAll(async () => { app = await bootApp('phase1'); });

  it('boots without console errors', () => {
    expect(app.__errors).toEqual([]);
    expect(app.__uncaught).toEqual([]);
  });

  it('loads its data store', () => {
    expect(app.D.transactions).toBeDefined();
  });
});
