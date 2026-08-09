/**
 * Every name used in src\ must be declared there, imported, or a real browser
 * global.
 *
 * This catches the mistake that slipped past everything else: code was moved
 * into a module and main.js was rewritten to call it, but the import was
 * missing. The build succeeded, the app booted, every screen rendered — and
 * several click handlers were dead, because nothing runs a click handler until
 * someone clicks. This check runs in milliseconds and would have caught it.
 */
import { it, expect } from 'vitest';
import { findUndeclared } from '../tools/check-globals.mjs';

it('no undeclared names anywhere in src', () => {
  const problems = findUndeclared('src').map((p) => `${p.file}:${p.line} ${p.name}`);
  expect(problems).toEqual([]);
});
