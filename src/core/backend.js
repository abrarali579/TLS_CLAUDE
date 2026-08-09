/**
 * Picks where data is stored, and hands the rest of the app one small
 * interface so nothing else has to care.
 *
 * The choice is automatic, and deliberately so:
 *
 *   opened as a file        -> this browser's own storage
 *   served by the server    -> the shared office database
 *
 * At startup we ask the server whether it is there. If it answers, we use it.
 * If not — offline, opened from a USB stick, server switched off — the app
 * still works exactly as it always did.
 */
import * as idb from './backend-idb.js';
import * as api from './backend-api.js';

let active = idb;
let chosen = false;

/**
 * Work out which backend to use. Safe to call more than once.
 * Returns the backend's human-readable name.
 */
export async function chooseBackend({ timeout = 2500 } = {}) {
  if (chosen) return active.name;
  chosen = true;

  // No point asking when there is nothing to ask — a file:// page has no server.
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) {
    active = idb;
    return active.name;
  }

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);
    const r = await fetch('/api/health', { cache: 'no-store', signal: ac.signal });
    clearTimeout(timer);
    if (r.ok) {
      const body = await r.json();
      if (body && body.timelink) active = api;
    }
  } catch {
    // No server, or it did not answer in time. Local storage it is.
  }
  return active.name;
}

/** Which backend is in use — for the Data & Settings screen. */
export const backendName = () => active.name;
/** True when other people are looking at the same data. */
export const isShared = () => active.shared;

export const loadData = (...a) => active.loadData(...a);
export const saveData = (...a) => active.saveData(...a);
export const putFile = (...a) => active.putFile(...a);
export const getFile = (...a) => active.getFile(...a);
export const delFile = (...a) => active.delFile(...a);

export { ConflictError } from './backend-api.js';

/** Test seam: force a backend instead of detecting one. */
export function useBackend(which) {
  active = which === 'api' ? api : which === 'idb' ? idb : which;
  chosen = true;
  return active.name;
}
