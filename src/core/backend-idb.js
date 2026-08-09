/**
 * Storage backend: the browser's own database (IndexedDB).
 *
 * Used when the app is opened as a file, with no server behind it. Data lives
 * on this machine only, in this browser only.
 */
const DB = 'timelink_db', ST = 'kv', FILE_STORE = 'files';

export const name = 'this browser';
export const shared = false;

function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(ST)) db.createObjectStore(ST);
      if (!db.objectStoreNames.contains(FILE_STORE)) db.createObjectStore(FILE_STORE);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function loadData() {
  const db = await idb();
  const data = await new Promise((r) => {
    const q = db.transaction(ST).objectStore(ST).get('data');
    q.onsuccess = () => r(q.result);
    q.onerror = () => r(undefined);
  });
  return data ? { data, rev: null } : null;
}

export async function saveData(data) {
  const db = await idb();
  await new Promise((r, j) => {
    const t = db.transaction(ST, 'readwrite');
    t.objectStore(ST).put(data, 'data');
    t.oncomplete = () => r();
    t.onerror = () => j(t.error);
  });
  return { rev: null };
}

export async function putFile(id, blob) {
  const db = await idb();
  return new Promise((r, j) => {
    const t = db.transaction(FILE_STORE, 'readwrite');
    t.objectStore(FILE_STORE).put(blob, id);
    t.oncomplete = () => r(true);
    t.onerror = () => j(t.error);
  });
}

export async function getFile(id) {
  const db = await idb();
  return new Promise((r) => {
    const q = db.transaction(FILE_STORE).objectStore(FILE_STORE).get(id);
    q.onsuccess = () => r(q.result || null);
    q.onerror = () => r(null);
  });
}

export async function delFile(id) {
  const db = await idb();
  return new Promise((r) => {
    const t = db.transaction(FILE_STORE, 'readwrite');
    t.objectStore(FILE_STORE).delete(id);
    t.oncomplete = () => r(true);
    t.onerror = () => r(false);
  });
}
