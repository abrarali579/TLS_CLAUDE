/**
 * Move top-level declarations out of src/main.js into their own module.
 *
 * It works off the real syntax tree, not regexes, so it cannot slice a
 * function in half. It also refuses to run when the code being moved still
 * depends on something left behind in main.js, because that would create a
 * circular import.
 *
 * Always run `npm run build && npm test` afterwards.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { load, topLevel, referencedNames } from './analyze.mjs';

const MAIN = 'src/main.js';

/**
 * Which module owns which name.
 *
 * Built by reading the exports of every module already in src/, so it can
 * never drift out of date. An earlier version of this file kept the list by
 * hand; it fell behind, an import was silently dropped, and the app broke at
 * startup. Deriving it is the fix.
 */
function exportedNames(src) {
  const out = [];
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'module' }); }
  catch { return out; }
  for (const node of ast.body) {
    if (node.type !== 'ExportNamedDeclaration' || !node.declaration) continue;
    const d = node.declaration;
    if (d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') out.push(d.id.name);
    else if (d.type === 'VariableDeclaration') {
      for (const v of d.declarations) if (v.id.type === 'Identifier') out.push(v.id.name);
    }
  }
  return out;
}

function scanExports(dir = 'src', acc = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) { scanExports(p, acc); continue; }
    if (!entry.name.endsWith('.js') || p === MAIN) continue;
    const names = exportedNames(fs.readFileSync(p, 'utf8'));
    if (names.length) acc[p] = [...new Set(names)];
  }
  return acc;
}

export const REGISTRY = scanExports();

const ownerOf = (name) =>
  Object.entries(REGISTRY).find(([, names]) => names.includes(name))?.[0] ?? null;

function rel(from, to) {
  const p = path.relative(path.dirname(from), to).replace(/\\/g, '/');
  return p.startsWith('.') ? p : './' + p;
}

export function extract(outFile, names, header = '') {
  const mod = load(MAIN);
  const decls = topLevel(mod);

  const missing = names.filter((n) => !decls.has(n));
  if (missing.length) throw new Error(`not top-level in main.js: ${missing.join(', ')}`);

  // `const a=1, b=2;` is one statement — moving a moves b too.
  const moving = new Set(names);
  for (const n of names) {
    const d = decls.get(n);
    if (d.shared) for (const [other, od] of decls) if (od.start === d.start) moving.add(other);
  }

  // Dependencies can point at names still in main.js OR at names that earlier
  // extractions already moved into modules. Missing that second case silently
  // drops an import and the app breaks at runtime, so check against both.
  const known = new Set([...decls.keys(), ...Object.values(REGISTRY).flat()]);
  const external = new Set();
  for (const n of moving) {
    const d = decls.get(n);
    for (const id of referencedNames(mod.src, d.start, d.end)) {
      if (id !== n && known.has(id) && !moving.has(id)) external.add(id);
    }
  }

  const stuck = [...external].filter((d) => !ownerOf(d));
  if (stuck.length) {
    throw new Error(
      `cannot extract ${path.basename(outFile)} yet — still in main.js: ${stuck.join(', ')}`
    );
  }

  const byOwner = new Map();
  for (const d of external) {
    const o = ownerOf(d);
    byOwner.set(o, [...(byOwner.get(o) ?? []), d]);
  }
  const imports = [...byOwner.entries()]
    .sort()
    .map(([o, l]) => `import { ${[...new Set(l)].sort().join(', ')} } from '${rel(outFile, o)}';`)
    .join('\n');

  // one entry per statement
  const stmts = [...new Map([...moving].map((n) => [decls.get(n).start, decls.get(n)])).values()]
    .sort((a, b) => a.start - b.start);

  const body = stmts.map((d) => 'export ' + mod.src.slice(d.start, d.end)).join('\n\n');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${header}${imports ? imports + '\n\n' : ''}${body}\n`);

  let src = mod.src;
  for (const d of [...stmts].sort((a, b) => b.start - a.start)) src = src.slice(0, d.start) + src.slice(d.end);

  // An imported binding cannot be reassigned. Anything main.js still assigns to
  // needs a setter, exactly like setD() for the data store.
  const mutable = new Set(
    [...moving].filter((n) => {
      const k = decls.get(n)?.kind;
      return k === 'let' || k === 'var';
    })
  );
  const assigned = [];
  if (mutable.size) {
    const ast2 = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'module' });
    walk.full(ast2, (node) => {
      if (node.type !== 'AssignmentExpression') return;
      if (node.left.type !== 'Identifier' || !mutable.has(node.left.name)) return;
      if (node.operator !== '=') {
        throw new Error(`${node.left.name} uses "${node.operator}" in main.js — rewrite it by hand first`);
      }
      assigned.push(node);
    });
  }
  const needSetter = [...new Set(assigned.map((a) => a.left.name))];
  for (const a of assigned.sort((x, y) => y.start - x.start)) {
    const rhs = src.slice(a.right.start, a.right.end);
    src = src.slice(0, a.start) + `set${a.left.name}(${rhs})` + src.slice(a.end);
  }
  if (needSetter.length) {
    const setters = needSetter
      .map((nm) => `\n/** Replace ${nm} — imported bindings cannot be assigned directly. */\nexport function set${nm}(v) {\n  ${nm} = v;\n  return ${nm};\n}\n`)
      .join('');
    fs.appendFileSync(outFile, setters);
  }

  const lines = src.split('\n');
  let k = 0;
  while (k < lines.length && (lines[k].startsWith('import ') || lines[k].trim() === '')) k++;
  const bring = [...new Set([...moving, ...needSetter.map((nm) => 'set' + nm)])].sort();
  lines.splice(k, 0, `import { ${bring.join(', ')} } from '${rel(MAIN, outFile)}';`);
  fs.writeFileSync(MAIN, lines.join('\n'));

  REGISTRY[outFile] = [...moving, ...needSetter.map((nm) => 'set' + nm)];
  return { outFile, moved: [...moving] };
}
