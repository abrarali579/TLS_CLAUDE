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
import * as apiClient from '../src/core/backend-api.js';

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
  let db, server, base;

  beforeAll(async () => {
    db = openDb(':memory:');
    server = createServer(db).listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => { server.close(); closeDb(db); });

  const get = (p, o) => fetch(base + p, o);

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
    server = createServer(db).listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
    apiClient.setApiBase(base + '/api');
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
