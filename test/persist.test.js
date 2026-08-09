/**
 * Saving: the debounce, and making sure nothing is lost.
 *
 * The bug these were written for: save() waits 350ms for typing to settle. If
 * the tab closes inside that window the write never happens and the change is
 * gone, silently. The browser tests caught it; these pin it down cheaply.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { D, setD } from '../src/core/store.js';
import { useBackend } from '../src/core/backend.js';
import { save, saveNow } from '../src/core/persist.js';

function fakeBackend() {
  const writes = [];
  return {
    name: 'test', shared: false, writes,
    async loadData() { return null; },
    async saveData(data) { writes.push(structuredClone(data)); return { rev: writes.length }; },
    async putFile() { return true; },
    async getFile() { return null; },
    async delFile() { return true; },
  };
}

let backend;
beforeEach(() => {
  backend = fakeBackend();
  useBackend(backend);
  setD({ transactions: [], settings: {} });
  vi.useRealTimers();
});

describe('save', () => {
  it('does not write straight away — it waits for typing to settle', async () => {
    save();
    expect(backend.writes.length).toBe(0);
  });

  it('collapses a burst of edits into one write', async () => {
    save(); save(); save();
    await save();
    expect(backend.writes.length).toBe(1);
  });

  it('returns a promise that resolves only after the write has happened', async () => {
    const done = save();
    expect(backend.writes.length).toBe(0);
    await done;
    expect(backend.writes.length).toBe(1);
  });

  it('writes what the store held at the time of writing', async () => {
    D_push('ACME');
    await save();
    expect(backend.writes[0].transactions[0].company).toBe('ACME');
  });
});

describe('saveNow', () => {
  it('writes immediately, without the wait', async () => {
    D_push('URGENT');
    const started = Date.now();
    await saveNow();
    const took = Date.now() - started;

    expect(backend.writes.length).toBe(1);
    expect(backend.writes[0].transactions[0].company).toBe('URGENT');
    // The point of saveNow is that it does NOT sit through the debounce.
    // Without this the test passes even if saveNow just calls save().
    expect(took, 'saveNow waited for the debounce instead of writing now').toBeLessThan(100);
  });

  it('flushes a save that was still waiting, instead of leaving it pending', async () => {
    D_push('PENDING');
    const pending = save();     // debounced, not yet written
    await saveNow();            // page is closing

    // The original promise must settle too. Race it rather than awaiting, so a
    // regression fails in a second with a clear message instead of hanging.
    const settled = await Promise.race([
      pending.then(() => 'settled'),
      new Promise((r) => setTimeout(() => r('still waiting'), 1000)),
    ]);
    expect(settled, 'save() never resolved after saveNow flushed it').toBe('settled');
    expect(backend.writes.length).toBe(1);
    expect(backend.writes[0].transactions[0].company).toBe('PENDING');
  });

  it('a failed write does not leave save() hanging forever', async () => {
    useBackend({ ...backend, async saveData() { throw new Error('disk full'); } });
    await expect(saveNow()).resolves.toBeUndefined();
  });
});

/** Add a row to the live store, the way a screen would. */
function D_push(company) {
  D.transactions.push({ id: 'r' + D.transactions.length, company, received: 0, expense: 0, profit: 0 });
}
