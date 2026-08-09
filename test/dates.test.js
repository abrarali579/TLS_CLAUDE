/**
 * Characterization tests for parseAnyDate().
 *
 * These record what the app does TODAY. If a refactor changes any of these
 * answers, a test fails — that is the whole point. If you change the behaviour
 * on purpose, update the expected value here in the same commit.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { bootApp } from './harness.js';

let app;
beforeAll(async () => { app = await bootApp('suite'); });

describe('parseAnyDate — always returns YYYY-MM-DD or an empty string', () => {
  it('passes ISO dates through, zero-padding the parts', () => {
    expect(app.parseAnyDate('2026-01-02')).toBe('2026-01-02');
    expect(app.parseAnyDate('2026-1-2')).toBe('2026-01-02');
  });

  it('reads ambiguous slash dates as DAY first, not month first', () => {
    // 05/03/2026 is 5 March, not 3 May. This is the UK/UAE convention and it
    // is load-bearing: reading it month-first would silently shift money
    // between months in every report.
    expect(app.parseAnyDate('05/03/2026')).toBe('2026-03-05');
  });

  it('keeps day-first when the day cannot be a month', () => {
    expect(app.parseAnyDate('13/01/2026')).toBe('2026-01-13');
  });

  it('swaps to month-first only when the FIRST number cannot be a day', () => {
    expect(app.parseAnyDate('01/13/2026')).toBe('2026-01-13');
  });

  it('accepts dot and dash separators and expands 2-digit years to 20xx', () => {
    expect(app.parseAnyDate('3.4.26')).toBe('2026-04-03');
    expect(app.parseAnyDate('31-12-2025')).toBe('2025-12-31');
  });

  it('takes the date part of a timestamp', () => {
    expect(app.parseAnyDate('2026-01-02T10:00:00Z')).toBe('2026-01-02');
  });

  it('returns an empty string for anything it cannot read', () => {
    for (const bad of ['', null, undefined, '   ', 'garbage']) {
      expect(app.parseAnyDate(bad)).toBe('');
    }
  });
});

describe('parseClipTable — pasted spreadsheet data', () => {
  it('splits rows on newlines and cells on tabs', () => {
    expect(app.parseClipTable('a\tb\nc\td')).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('handles Windows line endings', () => {
    expect(app.parseClipTable('a\tb\r\nc\td')).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('drops a single trailing newline but keeps genuinely blank cells', () => {
    expect(app.parseClipTable('a\tb\n')).toEqual([['a', 'b']]);
    expect(app.parseClipTable('a\t\tb')).toEqual([['a', '', 'b']]);
  });

  it('returns an empty array for empty input', () => {
    for (const bad of ['', null, undefined]) expect(app.parseClipTable(bad)).toEqual([]);
  });
});
