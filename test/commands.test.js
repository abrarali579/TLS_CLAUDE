/**
 * The commands actually run when you type them.
 *
 * This test exists because of a bug that wasted someone's time: every
 * command-line entry point used
 *
 *     if (import.meta.url === `file://${process.argv[1]}`)
 *
 * which is true on Linux and false on Windows, where argv[1] is
 * `D:\path\file.mjs` and import.meta.url is `file:///D:/path/file.mjs`. The
 * commands did nothing and printed nothing to say why. Every unit test still
 * passed, because the code underneath was fine — nothing was checking that
 * running the file did anything.
 *
 * So these tests run the real commands as real processes.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const node = process.execPath;
const runs = (file, args = []) => execFileSync(node, [file, ...args], { encoding: 'utf8', timeout: 60_000 });

describe('the command-line tools produce output when run', () => {
  it('the import tool reports what it did', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tl-cmd-'));
    writeFileSync(join(dir, 'DataEntry.csv'),
      'DATE,COMPANY,EMPLOYEE,WORK,RECEIVED,EXPENSE,PROFIT,PAID FROM\n' +
      '05/03/2026,ACME,SEKAR,PRINT,100,40,60,ADCB\n');

    const out = execFileSync(node, ['tools/import/import.mjs'], {
      encoding: 'utf8', timeout: 60_000, env: { ...process.env, TIMELINK_IMPORT_DIR: dir },
    });

    expect(out.trim(), 'the import command printed nothing at all').not.toBe('');
    expect(out).toMatch(/report written/);
    rmSync(dir, { recursive: true, force: true });
  });

  it('the import tool writes the report file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tl-cmd-'));
    writeFileSync(join(dir, 'Payments.csv'), 'DATE,AMOUNT,COMPANY,REMARKS\n05/03/2026,500,IDRIS,part\n');

    execFileSync(node, ['tools/import/import.mjs'], {
      encoding: 'utf8', timeout: 60_000, env: { ...process.env, TIMELINK_IMPORT_DIR: dir },
    });

    const report = join(dir, 'report.md');
    expect(existsSync(report), 'no report.md was written').toBe(true);
    expect(readFileSync(report, 'utf8')).toContain('Import report');
    rmSync(dir, { recursive: true, force: true });
  });

  it('the import check prints a verdict', () => {
    expect(runs('tools/check-globals.mjs').trim()).not.toBe('');
  });

  it('the code analyser prints an inventory', () => {
    expect(runs('tools/analyze.mjs', ['src/main.js'])).toMatch(/top-level declarations/);
  });
});

describe('the server actually starts when run', () => {
  let child, dir, port;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'tl-serve-'));
    port = 4700 + Math.floor(Math.random() * 200);
    child = spawn(node, ['server/index.js'], {
      env: { ...process.env, TIMELINK_DB: dir, TIMELINK_PORT: String(port), TIMELINK_HOST: '127.0.0.1' },
      stdio: 'pipe',
    });

    // Wait for it to answer, rather than guessing at a delay.
    const started = Date.now();
    while (Date.now() - started < 20_000) {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (r.ok) return;
      } catch { /* not up yet */ }
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error('the server never started listening');
  }, 30_000);

  afterAll(() => {
    child?.kill();
    rmSync(dir, { recursive: true, force: true });
  });

  it('answers on the port it was told to use', async () => {
    const body = await (await fetch(`http://127.0.0.1:${port}/api/health`)).json();
    expect(body.timelink).toBe(true);
  });

  it('serves the login page', async () => {
    const r = await fetch(`http://127.0.0.1:${port}/login`);
    expect(r.status).toBe(200);
  });

  it('creates its data folder and the three accounts', async () => {
    const users = JSON.parse(readFileSync(join(dir, 'users.json'), 'utf8'));
    expect(users.map((u) => u.role).sort()).toEqual(['owner', 'partner', 'staff']);
    expect(users.every((u) => u.password.startsWith('scrypt$'))).toBe(true);
  });
});
