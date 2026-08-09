/**
 * Fail if any source file uses a name that is neither declared locally, nor
 * imported, nor a real browser/JavaScript global.
 *
 * This exists because of a bug that got through everything else: an extraction
 * moved a value into a module and rewrote main.js to call its setter, but
 * forgot the import. The build succeeded, the app booted, every screen
 * rendered — and eight click handlers were dead. Nothing noticed until someone
 * clicked. A free-variable check catches that class of mistake in milliseconds.
 */
import fs from 'node:fs';
import path from 'node:path';
import detect from 'acorn-globals';

const ALLOWED = new Set([
  // JavaScript
  'globalThis', 'console', 'Math', 'JSON', 'Date', 'Number', 'String', 'Boolean', 'Array',
  'Object', 'Promise', 'Set', 'Map', 'WeakMap', 'WeakSet', 'Symbol', 'RegExp', 'Error',
  'TypeError', 'RangeError', 'Infinity', 'NaN', 'undefined', 'isNaN', 'isFinite',
  'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI',
  'decodeURI', 'Intl', 'Proxy', 'Reflect', 'BigInt', 'structuredClone', 'queueMicrotask',
  // Browser
  'window', 'document', 'navigator', 'location', 'history', 'screen', 'localStorage',
  'sessionStorage', 'indexedDB', 'IDBKeyRange', 'fetch', 'Headers', 'Request', 'Response',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame',
  'cancelAnimationFrame', 'alert', 'confirm', 'prompt', 'print', 'open', 'close', 'scrollTo',
  'matchMedia', 'getComputedStyle', 'crypto', 'performance', 'Blob', 'File', 'FileReader',
  'FormData', 'URL', 'URLSearchParams', 'AbortController', 'Image', 'Audio', 'Event',
  'CustomEvent', 'MutationObserver', 'ResizeObserver', 'IntersectionObserver', 'DOMParser',
  'XMLHttpRequest', 'TextEncoder', 'TextDecoder', 'CSS', 'Node', 'Element', 'HTMLElement',
  'ClipboardItem', 'AbortSignal', 'EventSource', 'WebSocket', 'Worker', 'atob', 'btoa',
  'Option', 'addEventListener', 'removeEventListener', 'dispatchEvent', 'innerWidth',
  'innerHeight', 'scrollX', 'scrollY', 'devicePixelRatio', 'top', 'parent', 'self', 'frames',
  'name', 'status', 'onload', 'onerror', 'requestIdleCallback', 'DataTransfer', 'Range',
  'Selection', 'getSelection', 'HTMLCanvasElement', 'CanvasRenderingContext2D', 'SVGElement',
]);

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });

export function findUndeclared(dir = 'src') {
  const problems = [];
  for (const file of walk(dir)) {
    const src = fs.readFileSync(file, 'utf8');
    let globals;
    try {
      globals = detect(src);
    } catch (e) {
      problems.push({ file, name: '(could not parse)', detail: e.message });
      continue;
    }
    for (const g of globals) {
      if (ALLOWED.has(g.name)) continue;
      const line = src.slice(0, g.nodes?.[0]?.start ?? 0).split('\n').length;
      problems.push({ file, name: g.name, line });
    }
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = findUndeclared(process.argv[2] || 'src');
  if (!problems.length) { console.log('OK — every name is declared, imported, or a known global'); process.exit(0); }
  for (const p of problems) console.error(`${p.file}:${p.line ?? '?'}  ${p.name} is not defined${p.detail ? ' — ' + p.detail : ''}`);
  console.error(`\n${problems.length} undeclared name(s)`);
  process.exit(1);
}
