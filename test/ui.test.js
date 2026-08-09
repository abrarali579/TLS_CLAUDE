// @vitest-environment jsdom
/**
 * Tests for the shared plumbing extracted in Phase 4.
 *
 * These import straight from src\ and run against a lightweight fake DOM — no
 * app boot, no seed data. They finish in milliseconds.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { $, $$, el, debounce } from '../src/lib/dom.js';
import { csv } from '../src/lib/csv.js';
import { gridCells, focusCell, maxRow, lockRow, unlockRow } from '../src/ui/grid.js';

beforeEach(() => { document.body.innerHTML = ''; });

describe('lib/dom', () => {
  it('el builds an element with a class and text in one call', () => {
    const e = el('div', 'card big', 'Hello');
    expect(e.tagName).toBe('DIV');
    expect(e.className).toBe('card big');
    expect(e.textContent).toBe('Hello');
  });

  it('el sets text safely — a customer name cannot inject markup', () => {
    const e = el('div', null, '<img onerror="alert(1)">');
    expect(e.querySelector('img')).toBeNull();
    expect(e.textContent).toContain('<img');
  });

  it('el leaves text alone when none is given, so empty string still works', () => {
    expect(el('div').textContent).toBe('');
    expect(el('div', null, '').textContent).toBe('');
  });

  it('$ finds one element and $$ returns a real array', () => {
    document.body.append(el('p', 'x', 'a'), el('p', 'x', 'b'));
    expect($('.x').textContent).toBe('a');
    expect(Array.isArray($$('.x'))).toBe(true);
    expect($$('.x').map((n) => n.textContent)).toEqual(['a', 'b']);
  });

  it('$ returns null rather than throwing when nothing matches', () => {
    expect($('#nope')).toBeNull();
    expect($$('#nope')).toEqual([]);
  });

  it('debounce runs once after the calls stop', async () => {
    let calls = 0;
    const bump = debounce(() => calls++, 20);
    bump(); bump(); bump();
    expect(calls).toBe(0);
    await new Promise((r) => setTimeout(r, 60));
    expect(calls).toBe(1);
  });

  it('debounce passes through the latest arguments', async () => {
    let seen;
    const bump = debounce((v) => { seen = v; }, 10);
    bump('first'); bump('last');
    await new Promise((r) => setTimeout(r, 40));
    expect(seen).toBe('last');
  });
});

describe('lib/csv', () => {
  it('joins plain values with commas and newlines', () => {
    expect(csv([['a', 'b'], ['c', 'd']])).toBe('a,b\nc,d');
  });

  it('quotes anything containing a comma, quote or newline', () => {
    expect(csv([['plain', 'has,comma']])).toBe('plain,"has,comma"');
    expect(csv([['says "hi"']])).toBe('"says ""hi"""');
    expect(csv([['two\nlines']])).toBe('"two\nlines"');
  });

  it('renders empty and missing values as blanks, not "null"', () => {
    expect(csv([[null, undefined, '', 0]])).toBe(',,,0');
  });

  it('survives a company name with a comma — the classic CSV bug', () => {
    const out = csv([['DATE', 'COMPANY'], ['2026-03-05', 'BAB AL QAMAR, LLC']]);
    expect(out.split('\n')[1]).toBe('2026-03-05,"BAB AL QAMAR, LLC"');
  });
});

describe('ui/grid', () => {
  function sheet(rows = 3, cols = 3) {
    const table = el('div');
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const cell = el('input', 'cell');
        cell.dataset.nav = '1';
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        table.append(cell);
      }
    }
    document.body.append(table);
    return table;
  }

  it('finds every navigable cell', () => {
    expect(gridCells(sheet(3, 3)).length).toBe(9);
  });

  it('reports the last row number', () => {
    expect(maxRow(sheet(4, 2))).toBe(4);
  });

  it('moves focus to an exact cell', () => {
    const s = sheet();
    expect(focusCell(s, 2, 3)).toBe(true);
    expect(document.activeElement.dataset.r).toBe('2');
    expect(document.activeElement.dataset.c).toBe('3');
  });

  it('falls back to the nearest column when that cell does not exist', () => {
    const s = sheet(2, 2);
    expect(focusCell(s, 2, 99)).toBe(true);
    expect(document.activeElement.dataset.r).toBe('2');
    expect(document.activeElement.dataset.c).toBe('2');
  });

  it('reports failure for a row that is not there', () => {
    expect(focusCell(sheet(2, 2), 99, 1)).toBe(false);
  });

  it('locking a row makes its cells read-only, unlocking restores them', () => {
    const tr = el('div');
    const a = el('input', 'cell');
    const profit = el('input', 'pf');
    profit.dataset.k = 'profit';
    tr.append(a, profit);
    document.body.append(tr);

    lockRow(tr);
    expect(tr.classList.contains('locked')).toBe(true);
    expect(a.readOnly).toBe(true);
    expect(profit.readOnly).toBe(true);

    unlockRow(tr);
    expect(tr.classList.contains('locked')).toBe(false);
    expect(a.readOnly).toBe(false);
    // profit stays read-only on purpose — it is calculated, never typed
    expect(profit.readOnly).toBe(true);
  });
});
