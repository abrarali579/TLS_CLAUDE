import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import FDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';

const HERE = dirname(fileURLToPath(import.meta.url));

export const APP_FILES = {
  // the original hand-written single files
  suite: resolve(HERE, '..', 'TimeLink-Suite.html'),
  phase1: resolve(HERE, '..', 'TimeLink-App-Phase1.html'),
  // what `npm run build` produces from src/ — the file you actually ship
  built: resolve(HERE, '..', 'dist', 'TimeLink-Suite.html'),
};

/**
 * Pull out the app's own inline <script> — the biggest one with no src and no
 * type attribute. The seed data lives in a type="application/json" tag, so the
 * negative lookahead skips it.
 */
function splitAppScript(html) {
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let biggest = null;
  for (const m of html.matchAll(re)) {
    const attrs = m[1];
    if (/\bsrc=/.test(attrs)) continue;            // external file
    if (/application\/json/.test(attrs)) continue;  // the seed data blob
    if (!biggest || m[2].length > biggest[2].length) biggest = m;
  }
  if (!biggest) throw new Error('no inline app script found');
  // The built file ships this as type="module". Bundling has already resolved
  // every import, so it evaluates fine as a plain script.
  return { code: biggest[2], shell: html.replace(biggest[0], '') };
}

/**
 * `function foo(){}` at the top level of a script becomes window.foo, but
 * `const foo = ...` and `let foo = ...` go into the global *lexical* scope,
 * which jsdom does not share between separate eval() calls. So we append a
 * bridge that publishes each of those bindings on window as a live getter —
 * live, so `window.D` still works after boot replaces D.
 */
function buildBridge(code) {
  const names = [
    ...new Set(
      [...code.matchAll(/^[ \t]*(?:const|let)[ \t]+([A-Za-z_$][\w$]*)[ \t]*=/gm)].map((m) => m[1])
    ),
  ];
  const defs = names
    .map(
      (nm) =>
        `try{Object.defineProperty(window,${JSON.stringify(nm)},` +
        `{configurable:true,get:function(){return ${nm};},` +
        `set:function(v){${nm}=v;}});}catch(e){}`
    )
    .join('');
  return `\n;(function(){${defs}})();`;
}

/**
 * Boot one of the app files inside jsdom and return its window.
 * Every top-level function and constant is reachable as a property:
 *
 *   const app = await bootApp('suite');
 *   app.findRate('ATTESTATION');
 */
export async function bootApp(which = 'suite', { timeout = 20000 } = {}) {
  const html = readFileSync(APP_FILES[which], 'utf8');
  const { code, shell } = splitAppScript(html);

  const consoleErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => consoleErrors.push(e.message));
  virtualConsole.on('error', (...a) => consoleErrors.push(a.join(' ')));

  const dom = new JSDOM(shell, {
    url: 'https://timelink.test/',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    virtualConsole,
  });
  const win = dom.window;

  // Browser APIs jsdom lacks but the app touches.
  win.indexedDB = new FDBFactory();
  win.IDBKeyRange = FDBKeyRange;
  if (!win.matchMedia) {
    win.matchMedia = () => ({
      matches: false, media: '', addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {}, onchange: null,
    });
  }
  if (!win.ResizeObserver) win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  if (!win.crypto) win.crypto = {};
  if (!win.crypto.randomUUID) { let i = 0; win.crypto.randomUUID = () => `test-uuid-${++i}`; }
  if (!win.URL.createObjectURL) { win.URL.createObjectURL = () => 'blob:test'; win.URL.revokeObjectURL = () => {}; }
  win.print = () => {};
  win.scrollTo = () => {};
  // Never let a test pop open a real window while rendering a PDF or statement.
  win.open = () => ({ document: { write() {}, close() {} }, focus() {}, print() {}, close() {} });

  const uncaught = [];
  win.addEventListener('error', (e) => uncaught.push(e.message || String(e.error)));
  win.addEventListener('unhandledrejection', (e) => uncaught.push(String(e.reason)));

  win.eval(code + buildBridge(code));

  // Boot is async — wait until the data store exists.
  const ready = () => win.D != null || (win.TimeLink && win.TimeLink.D != null);
  const start = Date.now();
  while (!ready()) {
    if (Date.now() - start > timeout) {
      const seen = [...consoleErrors, ...uncaught].join(' | ') || 'none';
      throw new Error(`${which} did not boot within ${timeout}ms. errors: ${seen}`);
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  await new Promise((r) => setTimeout(r, 50)); // let the first render settle

  // The built bundle keeps its internals private and publishes a deliberate
  // surface on window.TimeLink. Mirror it so one set of tests can run against
  // both the original file and the build.
  if (win.TimeLink) {
    for (const key of Object.keys(win.TimeLink)) {
      if (key in win && typeof win[key] !== 'undefined') continue;
      const desc = Object.getOwnPropertyDescriptor(win.TimeLink, key);
      try { Object.defineProperty(win, key, { configurable: true, ...desc }); } catch { /* ignore */ }
    }
  }

  return Object.assign(win, { __errors: consoleErrors, __uncaught: uncaught, __dom: dom });
}

/** Read the seed dataset without booting anything. */
export function readSeed(which = 'suite') {
  const html = readFileSync(APP_FILES[which], 'utf8');
  const m = html.match(/<script id="seedjson" type="application\/json">([\s\S]*?)<\/script>/);
  return JSON.parse(m[1]);
}
