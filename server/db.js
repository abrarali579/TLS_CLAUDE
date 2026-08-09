/**
 * The store: plain files on disk. No database engine, no native modules,
 * nothing to compile.
 *
 * That is a deliberate choice. The books are one JSON document — there are no
 * relational queries to run — so SQLite would have bought nothing but a native
 * build step that breaks on Windows and in CI. Files also mean your backup
 * procedure is "copy the folder", which is the one people actually follow.
 *
 * Layout:
 *   data/timelink.json          the current books, plus a revision number
 *   data/revisions/000042.json  every previous version, newest last
 *   data/files/<id>             attachments, with a .meta.json beside each
 *
 * Two ideas worth knowing:
 *
 *  - Every write bumps the revision, and a client must say which revision it
 *    started from. If two people save at once the second is REJECTED rather
 *    than silently overwriting the first. Silent loss is the one outcome
 *    bookkeeping cannot tolerate.
 *
 *  - Writes go to a temporary file and are then renamed over the real one.
 *    Rename is atomic, so a crash mid-write cannot leave you with half a file.
 */
import {
  mkdirSync, readFileSync, writeFileSync, renameSync, existsSync,
  readdirSync, unlinkSync, rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export const KEEP_SNAPSHOTS = 200;

/** Open (and create) a data folder. Pass ':memory:' in tests. */
export function openDb(dir = process.env.TIMELINK_DB || 'data') {
  const root = dir === ':memory:' ? join(tmpdir(), `timelink-test-${process.pid}-${Math.random().toString(36).slice(2)}`) : dir;
  const db = {
    root,
    store: join(root, 'timelink.json'),
    revisions: join(root, 'revisions'),
    files: join(root, 'files'),
    ephemeral: dir === ':memory:',
  };
  mkdirSync(db.revisions, { recursive: true });
  mkdirSync(db.files, { recursive: true });
  return db;
}

/** Remove a test folder. Does nothing for a real data directory. */
export function closeDb(db) {
  if (db.ephemeral) rmSync(db.root, { recursive: true, force: true });
}

function writeAtomic(path, text) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, text, 'utf8');
  renameSync(tmp, path);
}

const pad = (rev) => String(rev).padStart(6, '0');

export function readStore(db) {
  if (!existsSync(db.store)) return null;
  const raw = JSON.parse(readFileSync(db.store, 'utf8'));
  return { data: raw.data, rev: raw.rev, updatedAt: raw.updatedAt };
}

/**
 * Write the books. `baseRev` is the revision the client started from; pass
 * null only for the very first write.
 * Returns { ok:true, rev } or { ok:false, conflict:true, rev }.
 */
export function writeStore(db, data, baseRev, author = null) {
  const cur = readStore(db);
  const now = new Date().toISOString();

  if (!cur) {
    const rev = 1;
    writeAtomic(db.store, JSON.stringify({ rev, updatedAt: now, data }));
    writeAtomic(join(db.revisions, `${pad(rev)}.json`), JSON.stringify({ rev, createdAt: now, author, data }));
    return { ok: true, rev };
  }

  if (baseRev !== null && baseRev !== undefined && Number(baseRev) !== cur.rev) {
    return { ok: false, conflict: true, rev: cur.rev };
  }

  const rev = cur.rev + 1;
  writeAtomic(db.store, JSON.stringify({ rev, updatedAt: now, data }));
  writeAtomic(join(db.revisions, `${pad(rev)}.json`), JSON.stringify({ rev, createdAt: now, author, data }));

  // keep the folder from growing without limit
  for (const name of readdirSync(db.revisions)) {
    const n = Number(name.replace('.json', ''));
    if (Number.isFinite(n) && n <= rev - KEEP_SNAPSHOTS) {
      try { unlinkSync(join(db.revisions, name)); } catch { /* already gone */ }
    }
  }
  return { ok: true, rev };
}

export function listSnapshots(db, limit = 50) {
  return readdirSync(db.revisions)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, limit)
    .map((f) => {
      const raw = JSON.parse(readFileSync(join(db.revisions, f), 'utf8'));
      return { rev: raw.rev, created_at: raw.createdAt, author: raw.author, size: JSON.stringify(raw.data).length };
    });
}

export function readSnapshot(db, rev) {
  const path = join(db.revisions, `${pad(rev)}.json`);
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return { data: raw.data, rev: raw.rev, createdAt: raw.createdAt };
}

export const files = {
  put(db, id, mime, bytes) {
    writeFileSync(join(db.files, id), bytes);
    writeAtomic(join(db.files, `${id}.meta.json`), JSON.stringify({ mime: mime || 'application/octet-stream', createdAt: new Date().toISOString() }));
  },
  get(db, id) {
    const path = join(db.files, id);
    if (!existsSync(path)) return null;
    let mime = 'application/octet-stream';
    const meta = join(db.files, `${id}.meta.json`);
    if (existsSync(meta)) { try { mime = JSON.parse(readFileSync(meta, 'utf8')).mime; } catch { /* keep default */ } }
    return { id, mime, bytes: readFileSync(path) };
  },
  del(db, id) {
    const path = join(db.files, id);
    if (!existsSync(path)) return false;
    unlinkSync(path);
    try { unlinkSync(join(db.files, `${id}.meta.json`)); } catch { /* fine */ }
    return true;
  },
};
