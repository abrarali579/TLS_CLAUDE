/**
 * Storage backend: the TimeLink server.
 *
 * Used when the app is served from the server, so everyone in the office works
 * on the same books.
 *
 * Every save carries the revision it started from. If someone else saved in
 * between, the server refuses and we raise a conflict rather than overwriting
 * their work — silent loss is the one outcome bookkeeping cannot tolerate.
 */
let BASE = '/api';

/**
 * Point the client at a different address.
 * Used by the tests, and useful if the server ever lives on another host.
 */
export function setApiBase(url) {
  BASE = String(url || '/api').replace(/\/$/, '');
  return BASE;
}

export const name = 'the office server';
export const shared = true;

let currentRev = null;

/** Thrown when someone else saved while you were editing. */
export class ConflictError extends Error {
  constructor(serverRev) {
    super('Someone else saved while you were editing');
    this.name = 'ConflictError';
    this.conflict = true;
    this.serverRev = serverRev;
  }
}

export function rev() {
  return currentRev;
}

/** Forget the revision we think we are on. Used between tests. */
export function resetRev() {
  currentRev = null;
}

export async function loadData() {
  const r = await fetch(`${BASE}/data`, { cache: 'no-store' });
  if (r.status === 404) { currentRev = null; return null; }
  if (!r.ok) throw new Error(`server said ${r.status}`);
  const body = await r.json();
  currentRev = body.rev;
  return { data: body.data, rev: body.rev };
}

export async function saveData(data) {
  const r = await fetch(`${BASE}/data`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      ...(currentRev === null ? {} : { 'if-match': String(currentRev) }),
    },
    body: JSON.stringify(data),
  });

  if (r.status === 409) {
    const body = await r.json().catch(() => ({}));
    throw new ConflictError(body.rev);
  }
  if (!r.ok) throw new Error(`server said ${r.status}`);

  const body = await r.json();
  currentRev = body.rev;
  return { rev: body.rev };
}

export async function putFile(id, blob) {
  const r = await fetch(`${BASE}/files/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'content-type': blob.type || 'application/octet-stream' },
    body: blob,
  });
  if (!r.ok) throw new Error(`server said ${r.status}`);
  return true;
}

export async function getFile(id) {
  const r = await fetch(`${BASE}/files/${encodeURIComponent(id)}`);
  if (!r.ok) return null;
  return r.blob();
}

export async function delFile(id) {
  const r = await fetch(`${BASE}/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return r.ok;
}
