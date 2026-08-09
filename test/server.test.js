/**
 * The server and the client that talks to it.
 *
 * The behaviour worth protecting here is conflict handling. Three people share
 * one set of books; if two save at once, the second must NOT quietly overwrite
 * the first. Losing an entry without anyone noticing is the worst thing this
 * app could do, so it is tested from both ends.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { openDb, closeDb, readStore, writeStore, listSnapshots, readSnapshot, files } from '../server/db.js';
import { createServer } from '../server/index.js';
import { openAuth, hashPassword, verifyPassword, readCookie, can } from '../server/auth.js';
import { redactFor, restoreRedacted, protectedAccounts } from '../server/redact.js';
import * as apiClient from '../src/core/backend-api.js';

/** Sign in and return the cookie header to use for later calls. */
async function signIn(base, email, password) {
  const r = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) return null;
  return r.headers.getSetCookie()[0].split(';')[0];
}

const OWNER = ['abrar@timelink.local', 'abrar123'];
const PARTNER = ['irfan@timelink.local', 'irfan123'];
const STAFF = ['ayesha@timelink.local', 'ayesha123'];

const store = (extra = {}) => ({ transactions: [], settings: {}, ...extra });

describe('the database', () => {
  let db;
  beforeEach(() => { if (db) closeDb(db); db = openDb(':memory:'); });
  afterAll(() => closeDb(db));

  it('starts empty', () => {
    expect(readStore(db)).toBeNull();
  });

  it('accepts the first write and numbers it revision 1', () => {
    expect(writeStore(db, store(), null)).toEqual({ ok: true, rev: 1 });
    expect(readStore(db).rev).toBe(1);
  });

  it('bumps the revision on every write', () => {
    writeStore(db, store(), null);
    expect(writeStore(db, store({ transactions: [{ id: 'a' }] }), 1).rev).toBe(2);
    expect(writeStore(db, store({ transactions: [{ id: 'b' }] }), 2).rev).toBe(3);
  });

  it('refuses a write based on an out-of-date revision', () => {
    writeStore(db, store(), null);
    writeStore(db, store({ transactions: [{ id: 'first' }] }), 1);
    const late = writeStore(db, store({ transactions: [{ id: 'second' }] }), 1);
    expect(late).toEqual({ ok: false, conflict: true, rev: 2 });
  });

  it('does not lose the first person’s work when the second is rejected', () => {
    writeStore(db, store(), null);
    writeStore(db, store({ transactions: [{ id: 'first' }] }), 1);
    writeStore(db, store({ transactions: [{ id: 'second' }] }), 1); // rejected
    expect(readStore(db).data.transactions).toEqual([{ id: 'first' }]);
  });

  it('keeps every revision as a snapshot you can go back to', () => {
    writeStore(db, store({ transactions: [{ id: 'one' }] }), null);
    writeStore(db, store({ transactions: [{ id: 'two' }] }), 1);
    expect(listSnapshots(db).map((s) => s.rev)).toEqual([2, 1]);
    expect(readSnapshot(db, 1).data.transactions).toEqual([{ id: 'one' }]);
  });

  it('stores and returns file attachments', () => {
    files.put(db, 'a1', 'text/plain', Buffer.from('hello'));
    expect(files.get(db, 'a1').bytes.toString()).toBe('hello');
    expect(files.del(db, 'a1')).toBe(true);
    expect(files.get(db, 'a1')).toBeNull();
  });
});

describe('the HTTP API', () => {
  let db, server, base, cookie;

  beforeAll(async () => {
    db = openDb(':memory:');
    server = createServer(db, openAuth(db.root)).listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
    cookie = await signIn(base, ...OWNER);
  });
  afterAll(() => { server.close(); closeDb(db); });

  const get = (p, o = {}) => fetch(base + p, { ...o, headers: { cookie, ...(o.headers ?? {}) } });

  it('says who it is', async () => {
    const body = await (await get('/api/health')).json();
    expect(body.timelink).toBe(true);
  });

  it('reports 404 before there is any data', async () => {
    expect((await get('/api/data')).status).toBe(404);
  });

  it('accepts the first save without a revision', async () => {
    const r = await get('/api/data', { method: 'PUT', body: JSON.stringify(store()) });
    expect(r.status).toBe(200);
    expect((await r.json()).rev).toBe(1);
  });

  it('returns the data with its revision', async () => {
    const body = await (await get('/api/data')).json();
    expect(body.rev).toBe(1);
    expect(body.data.transactions).toEqual([]);
  });

  it('answers 409 to a save based on an old revision', async () => {
    await get('/api/data', { method: 'PUT', headers: { 'if-match': '1' }, body: JSON.stringify(store({ transactions: [{ id: 'x' }] })) });
    const late = await get('/api/data', { method: 'PUT', headers: { 'if-match': '1' }, body: JSON.stringify(store()) });
    expect(late.status).toBe(409);
    expect((await late.json()).conflict).toBe(true);
  });

  it('rejects a body that is not JSON, and one that is not a TimeLink store', async () => {
    expect((await get('/api/data', { method: 'PUT', body: 'nonsense' })).status).toBe(400);
    expect((await get('/api/data', { method: 'PUT', body: '{"hello":1}' })).status).toBe(400);
  });

  it('round-trips a file', async () => {
    await get('/api/files/note1', { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: 'attached' });
    expect(await (await get('/api/files/note1')).text()).toBe('attached');
    await get('/api/files/note1', { method: 'DELETE' });
    expect((await get('/api/files/note1')).status).toBe(404);
  });

  it('refuses a file id with a path in it', async () => {
    expect((await get('/api/files/..%2Fescape')).status).toBe(404);
  });

  it('404s an unknown endpoint instead of serving the app', async () => {
    expect((await get('/api/nope')).status).toBe(404);
  });
});

describe('the browser client', () => {
  let db, server, base;

  beforeAll(async () => {
    db = openDb(':memory:');
    server = createServer(db, openAuth(db.root)).listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
    apiClient.setApiBase(base + '/api');

    // The browser client relies on the session cookie; give it one.
    const cookie = await signIn(base, ...OWNER);
    const realFetch = globalThis.fetch;
    globalThis.fetch = (url, opts = {}) =>
      realFetch(url, { ...opts, headers: { cookie, ...(opts.headers ?? {}) } });
  });
  afterAll(() => { server.close(); closeDb(db); });
  beforeEach(() => apiClient.resetRev());

  it('returns null when the server has nothing yet', async () => {
    expect(await apiClient.loadData()).toBeNull();
  });

  it('saves, then reads back what it saved', async () => {
    await apiClient.saveData(store({ transactions: [{ id: 'a', company: 'ACME' }] }));
    const got = await apiClient.loadData();
    expect(got.data.transactions[0].company).toBe('ACME');
  });

  it('tracks the revision so the next save is accepted', async () => {
    await apiClient.loadData();
    const before = apiClient.rev();
    await apiClient.saveData(store({ transactions: [{ id: 'b' }] }));
    expect(apiClient.rev()).toBe(before + 1);
  });

  it('raises a conflict rather than overwriting someone else', async () => {
    await apiClient.loadData();               // this person is on the current revision
    writeStore(db, store({ transactions: [{ id: 'theirs' }] }), apiClient.rev()); // someone else saves

    await expect(apiClient.saveData(store({ transactions: [{ id: 'mine' }] })))
      .rejects.toMatchObject({ conflict: true });

    // and their work is still there
    expect(readStore(db).data.transactions).toEqual([{ id: 'theirs' }]);
  });
});

describe('passwords', () => {
  it('never stores the password itself', () => {
    const stored = hashPassword('correct horse');
    expect(stored).not.toContain('correct horse');
    expect(stored.startsWith('scrypt$')).toBe(true);
  });

  it('accepts the right one and rejects everything else', () => {
    const stored = hashPassword('abrar123');
    expect(verifyPassword('abrar123', stored)).toBe(true);
    expect(verifyPassword('Abrar123', stored)).toBe(false);
    expect(verifyPassword('', stored)).toBe(false);
  });

  it('salts each password, so two people with the same one look different', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'));
  });

  it('treats a corrupt stored value as a failure, not a crash', () => {
    for (const junk of ['', 'nonsense', 'scrypt$only-salt', null]) {
      expect(verifyPassword('anything', junk)).toBe(false);
    }
  });
});

describe('signing in', () => {
  let db, server, base;
  beforeAll(async () => {
    db = openDb(':memory:');
    server = createServer(db, openAuth(db.root)).listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
    writeStore(db, { transactions: [], settings: {} }, null);
  });
  afterAll(() => { server.close(); closeDb(db); });

  it('creates the three accounts on first run', async () => {
    for (const [email, password] of [OWNER, PARTNER, STAFF]) {
      expect(await signIn(base, email, password), email).toBeTruthy();
    }
  });

  it('refuses a wrong password', async () => {
    expect(await signIn(base, OWNER[0], 'wrong')).toBeNull();
  });

  it('refuses an unknown email', async () => {
    expect(await signIn(base, 'nobody@timelink.local', 'anything')).toBeNull();
  });

  it('gives the same answer for a wrong email and a wrong password', async () => {
    // Different replies would let someone work out which emails exist.
    const a = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: OWNER[0], password: 'wrong' }) });
    const b = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'ghost@timelink.local', password: 'wrong' }) });
    expect(a.status).toBe(b.status);
    expect(await a.json()).toEqual(await b.json());
  });

  it('locks the data away from anyone not signed in', async () => {
    expect((await fetch(`${base}/api/data`)).status).toBe(401);
    expect((await fetch(`${base}/api/snapshots`)).status).toBe(401);
  });

  it('sends a visitor to the login page instead of the app', async () => {
    const r = await fetch(`${base}/`, { redirect: 'manual' });
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/login');
  });

  it('serves the login page itself', async () => {
    const r = await fetch(`${base}/login`);
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('Sign in');
  });

  it('keeps the session cookie away from page scripts', async () => {
    const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: OWNER[0], password: OWNER[1] }) });
    expect(r.headers.getSetCookie()[0]).toMatch(/HttpOnly/i);
  });

  it('signing out stops the session working', async () => {
    const cookie = await signIn(base, ...STAFF);
    expect((await fetch(`${base}/api/me`, { headers: { cookie } })).status).toBe(200);
    await fetch(`${base}/api/logout`, { method: 'POST', headers: { cookie } });
    expect((await fetch(`${base}/api/me`, { headers: { cookie } })).status).toBe(401);
  });

  it('rejects a made-up session token', async () => {
    expect((await fetch(`${base}/api/data`, { headers: { cookie: 'tl_session=deadbeef' } })).status).toBe(401);
  });
});

describe('what each role may see', () => {
  const books = () => ({
    transactions: [{ id: 't1', company: 'ACME', received: 100, expense: 40, profit: 60 }],
    settings: {
      vatRate: 0.05,
      partners: [{ name: 'IRFAN', drawAccount: 'IRFAN', share: 0.5 }, { name: 'ABRAR', drawAccount: 'ABRAR', share: 0.5 }],
    },
    ledger: [
      { account: 'ADCB', amount: 100, remark: 'sale' },
      { account: 'IRFAN', amount: 4000, remark: 'drawing' },
      { account: 'WITHDRAWN PROFIT', amount: 2000 },
    ],
  });

  it('knows which accounts are private', () => {
    expect([...protectedAccounts(books())].sort()).toEqual(['ABRAR', 'IRFAN', 'WITHDRAWN PROFIT']);
  });

  it('owners and partners see everything', () => {
    for (const role of ['owner', 'partner']) {
      const seen = redactFor(role, books());
      expect(seen.ledger.length, role).toBe(3);
      expect(seen.settings.partners.length, role).toBe(2);
    }
  });

  it('staff see the business, not the partners’ drawings', () => {
    const seen = redactFor('staff', books());
    expect(seen.ledger.map((l) => l.account)).toEqual(['ADCB']);
    expect(seen.settings.partners).toEqual([]);
    expect(seen.transactions.length).toBe(1); // ordinary work is still theirs to do
  });

  describe('and — the dangerous part — staff saving cannot destroy it', () => {
    it('puts back the rows staff never received', () => {
      const current = books();
      const staffCopy = redactFor('staff', current);
      const staffSave = { ...staffCopy, ledger: [...staffCopy.ledger, { account: 'ADCB', amount: 50 }] };

      const merged = restoreRedacted('staff', staffSave, current);
      expect(merged.ledger.filter((l) => l.account === 'IRFAN').length).toBe(1);
      expect(merged.ledger.filter((l) => l.account === 'WITHDRAWN PROFIT').length).toBe(1);
      expect(merged.settings.partners.length).toBe(2);
      expect(merged.ledger.filter((l) => l.account === 'ADCB').length).toBe(2); // their new row kept
    });

    it('ignores a forged partner row sent by staff', () => {
      const current = books();
      const forged = {
        ...redactFor('staff', current),
        ledger: [{ account: 'IRFAN', amount: 999999 }],
        settings: { partners: [{ name: 'AYESHA', share: 1 }] },
      };
      const merged = restoreRedacted('staff', forged, current);
      expect(merged.ledger.find((l) => l.account === 'IRFAN').amount).toBe(4000);
      expect(merged.settings.partners.map((p) => p.name)).toEqual(['IRFAN', 'ABRAR']);
    });

    it('leaves an owner’s save completely alone', () => {
      const current = books();
      const edit = { ...current, ledger: [{ account: 'ADCB', amount: 1 }] };
      expect(restoreRedacted('owner', edit, current)).toEqual(edit);
    });
  });

  it('permissions are what you would expect', () => {
    expect(can('owner', 'manageUsers')).toBe(true);
    expect(can('partner', 'manageUsers')).toBe(false);
    expect(can('staff', 'seePartners')).toBe(false);
    expect(can('staff', 'restore')).toBe(false);
  });
});

describe('roles over HTTP', () => {
  let db, server, base;
  beforeAll(async () => {
    db = openDb(':memory:');
    server = createServer(db, openAuth(db.root)).listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
    writeStore(db, {
      transactions: [{ id: 't1', company: 'ACME', received: 100, expense: 40, profit: 60 }],
      settings: { partners: [{ name: 'IRFAN', drawAccount: 'IRFAN', share: 1 }] },
      ledger: [{ account: 'ADCB', amount: 100 }, { account: 'IRFAN', amount: 4000 }],
    }, null);
  });
  afterAll(() => { server.close(); closeDb(db); });

  it('serves staff a copy with the partner rows already removed', async () => {
    const cookie = await signIn(base, ...STAFF);
    const body = await (await fetch(`${base}/api/data`, { headers: { cookie } })).json();
    expect(body.data.ledger.map((l) => l.account)).toEqual(['ADCB']);
    expect(body.data.settings.partners).toEqual([]);
  });

  it('a staff save leaves the partner figures intact on disk', async () => {
    const cookie = await signIn(base, ...STAFF);
    const before = await (await fetch(`${base}/api/data`, { headers: { cookie } })).json();

    const save = { ...before.data, transactions: [...before.data.transactions, { id: 't2', company: 'NEW', received: 50, expense: 10, profit: 40 }] };
    const r = await fetch(`${base}/api/data`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json', 'if-match': String(before.rev) },
      body: JSON.stringify(save),
    });
    expect(r.status).toBe(200);

    const onDisk = readStore(db).data;
    expect(onDisk.ledger.filter((l) => l.account === 'IRFAN').length).toBe(1);
    expect(onDisk.settings.partners.length).toBe(1);
    expect(onDisk.transactions.length).toBe(2);
  });

  it('records who saved, so the activity log means something', async () => {
    const cookie = await signIn(base, ...OWNER);
    const snaps = await (await fetch(`${base}/api/snapshots`, { headers: { cookie } })).json();
    expect(snaps.snapshots[0].author).toBe('Ayesha');
  });

  it('staff cannot browse earlier versions', async () => {
    const cookie = await signIn(base, ...STAFF);
    expect((await fetch(`${base}/api/snapshots`, { headers: { cookie } })).status).toBe(403);
  });

  it('tells the app who is signed in and what they may do', async () => {
    const cookie = await signIn(base, ...STAFF);
    const body = await (await fetch(`${base}/api/me`, { headers: { cookie } })).json();
    expect(body.user.name).toBe('Ayesha');
    expect(body.permissions.seePartners).toBe(false);
  });
});
