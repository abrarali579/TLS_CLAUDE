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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openDb, readStore, writeStore, listSnapshots, readSnapshot, files } from './db.js';
import { openAuth, readCookie, can, ROLES, SESSION_COOKIE, SESSION_DAYS } from './auth.js';
import { redactFor, restoreRedacted } from './redact.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_FILE = resolve(HERE, '..', 'dist', 'TimeLink-Suite.html');
const LOGIN_FILE = resolve(HERE, 'login.html');
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

export function createServer(db, auth = null) {
  const users = auth ?? openAuth(db.root);

  const setSession = (res, token) => {
    res.setHeader('set-cookie',
      `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`);
  };
  const clearSession = (res) => {
    res.setHeader('set-cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  };

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    // Same-origin by default; allow a dev server on another port to talk to us.
    res.setHeader('access-control-allow-origin', req.headers.origin || '*');
    res.setHeader('access-control-allow-headers', 'content-type, if-match');
    res.setHeader('access-control-allow-methods', 'GET, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    const me = users.userForToken(token);

    try {
      if (path === '/api/login' && req.method === 'POST') {
        const body = JSON.parse((await readBody(req, 64 * 1024)).toString('utf8') || '{}');
        const out = users.login(body.email, body.password);
        if (!out) return json(res, 401, { error: 'Wrong email or password' });
        setSession(res, out.token);
        return json(res, 200, { ok: true, user: out.user });
      }

      if (path === '/api/logout' && req.method === 'POST') {
        users.logout(token);
        clearSession(res);
        return json(res, 200, { ok: true });
      }

      if (path === '/api/me') {
        if (!me) return json(res, 401, { error: 'not signed in' });
        return json(res, 200, { user: me, permissions: ROLES[me.role] ?? {} });
      }

      if (path === '/login' && req.method === 'GET') {
        const html = await readFile(LOGIN_FILE);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(html);
      }

      if (path === '/api/health') {
        const cur = readStore(db);
        return json(res, 200, { timelink: true, rev: cur?.rev ?? 0, hasData: !!cur });
      }

      // Everything past here needs a signed-in person.
      if (path.startsWith('/api/') && !me) return json(res, 401, { error: 'not signed in' });

      if (path === '/api/data' && req.method === 'GET') {
        const cur = readStore(db);
        if (!cur) return json(res, 404, { error: 'no data yet' });
        // Strip anything this person may not see, before it leaves the server.
        return json(res, 200, { ...cur, data: redactFor(me.role, cur.data) });
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

        // Put back the rows this person was never shown, so saving a redacted
        // copy cannot delete what they could not see.
        const current = readStore(db);
        const complete = restoreRedacted(me.role, data, current?.data);

        const out = writeStore(db, complete, baseRev, me.name);

        if (!out.ok) {
          return json(res, 409, {
            error: 'someone else saved while you were editing',
            conflict: true, rev: out.rev,
          });
        }
        return json(res, 200, { ok: true, rev: out.rev });
      }

      if (path.startsWith('/api/snapshots') && !can(me.role, 'restore')) {
        return json(res, 403, { error: 'your account cannot see earlier versions' });
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

      // Anything else serves the app itself — to signed-in people only.
      if (req.method === 'GET') {
        if (!me) {
          res.writeHead(302, { location: '/login' });
          return res.end();
        }
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

// Only run when this file IS the command, not when it is imported.
// `file://${process.argv[1]}` looks right and works on Linux, but on Windows
// argv[1] is "D:\\path\\file.mjs" while import.meta.url is
// "file:///D:/path/file.mjs" — they never match, so the command does nothing
// at all and prints nothing to explain why. pathToFileURL does it properly.
// `node -e "import(...)"` has no argv[1] at all, so check before converting.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = openDb();
  const auth = openAuth(db.root);
  const port = Number(process.env.TIMELINK_PORT) || 4000;
  const host = process.env.TIMELINK_HOST || '0.0.0.0';
  createServer(db, auth).listen(port, host, () => {
    console.log(`TimeLink server on http://${host}:${port}`);
    console.log(`data folder: ${db.root}`);
    if (auth.created) {
      console.log('');
      console.log('Created the three starter accounts:');
      for (const a of auth.starterAccounts) console.log(`  ${a.email.padEnd(26)} ${a.password.padEnd(10)} (${a.role})`);
      console.log('');
      console.log('These are placeholders — change them before real use.');
    }
    console.log('Keep this on your office network: there is no HTTPS.');
  });
}
