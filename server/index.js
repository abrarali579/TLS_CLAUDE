/**
 * The TimeLink server.
 *
 * It does two jobs: serve the built app, and hold the data so several people
 * share one set of books. Plain Node — no web framework — because the whole
 * surface is nine routes and every dependency is something you have to keep
 * patched.
 *
 *   node server/index.js
 *   TIMELINK_PORT=8080 TIMELINK_DB=data/timelink.db node server/index.js
 *
 * Authentication is deliberately not here yet. Run it on your office network,
 * not on the open internet, until logins are added.
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, readStore, writeStore, listSnapshots, readSnapshot, files } from './db.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_FILE = resolve(HERE, '..', 'dist', 'TimeLink-Suite.html');
const MAX_BODY = 64 * 1024 * 1024; // a big backup restore must still fit

const json = (res, code, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(payload);
};

function readBody(req, limit = MAX_BODY) {
  return new Promise((res, rej) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { rej(Object.assign(new Error('body too large'), { code: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => res(Buffer.concat(chunks)));
    req.on('error', rej);
  });
}

export function createServer(db) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    // Same-origin by default; allow a dev server on another port to talk to us.
    res.setHeader('access-control-allow-origin', req.headers.origin || '*');
    res.setHeader('access-control-allow-headers', 'content-type, if-match');
    res.setHeader('access-control-allow-methods', 'GET, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    try {
      if (path === '/api/health') {
        const cur = readStore(db);
        return json(res, 200, { timelink: true, rev: cur?.rev ?? 0, hasData: !!cur });
      }

      if (path === '/api/data' && req.method === 'GET') {
        const cur = readStore(db);
        if (!cur) return json(res, 404, { error: 'no data yet' });
        return json(res, 200, cur);
      }

      if (path === '/api/data' && req.method === 'PUT') {
        const raw = await readBody(req);
        let data;
        try { data = JSON.parse(raw.toString('utf8')); }
        catch { return json(res, 400, { error: 'body is not valid JSON' }); }
        if (!data || typeof data !== 'object' || !Array.isArray(data.transactions)) {
          return json(res, 400, { error: 'that does not look like a TimeLink store' });
        }

        const ifMatch = req.headers['if-match'];
        const baseRev = ifMatch === undefined || ifMatch === '*' ? null : Number(ifMatch);
        const author = req.headers['x-timelink-user'] || null;
        const out = writeStore(db, data, baseRev, author);

        if (!out.ok) {
          return json(res, 409, {
            error: 'someone else saved while you were editing',
            conflict: true, rev: out.rev,
          });
        }
        return json(res, 200, { ok: true, rev: out.rev });
      }

      if (path === '/api/snapshots' && req.method === 'GET') {
        return json(res, 200, { snapshots: listSnapshots(db, Number(url.searchParams.get('limit')) || 50) });
      }

      const snap = path.match(/^\/api\/snapshots\/(\d+)$/);
      if (snap && req.method === 'GET') {
        const found = readSnapshot(db, Number(snap[1]));
        return found ? json(res, 200, found) : json(res, 404, { error: 'no such revision' });
      }

      const file = path.match(/^\/api\/files\/([A-Za-z0-9._-]+)$/);
      if (file) {
        const id = file[1];
        if (req.method === 'PUT') {
          const bytes = await readBody(req);
          files.put(db, id, req.headers['content-type'], bytes);
          return json(res, 200, { ok: true, id, size: bytes.length });
        }
        if (req.method === 'GET') {
          const row = files.get(db, id);
          if (!row) return json(res, 404, { error: 'no such file' });
          res.writeHead(200, { 'content-type': row.mime, 'content-length': row.bytes.length });
          return res.end(row.bytes);
        }
        if (req.method === 'DELETE') {
          return json(res, 200, { ok: files.del(db, id) });
        }
      }

      if (path.startsWith('/api/')) return json(res, 404, { error: 'no such endpoint' });

      // Anything else serves the app itself.
      if (req.method === 'GET') {
        if (!existsSync(APP_FILE)) {
          res.writeHead(503, { 'content-type': 'text/plain' });
          return res.end('The app has not been built yet. Run: npm run build');
        }
        const html = await readFile(APP_FILE);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(html);
      }

      return json(res, 405, { error: 'method not allowed' });
    } catch (e) {
      if (e.code === 413) return json(res, 413, { error: 'that upload is too large' });
      console.error(e);
      return json(res, 500, { error: 'server error' });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = openDb();
  const port = Number(process.env.TIMELINK_PORT) || 4000;
  const host = process.env.TIMELINK_HOST || '0.0.0.0';
  createServer(db).listen(port, host, () => {
    console.log(`TimeLink server on http://${host}:${port}`);
    console.log(`data folder: ${db.root}`);
    console.log('no authentication yet — keep this on your office network');
  });
}
