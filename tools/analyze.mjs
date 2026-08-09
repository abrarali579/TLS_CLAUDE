/**
 * Inventory and dependency map for a source file, using a real JS parser.
 *
 *   node tools/analyze.mjs src/main.js                 -> list everything
 *   node tools/analyze.mjs src/main.js toast modal     -> what those depend on
 *   node tools/analyze.mjs src/main.js --users el      -> who depends on el
 */
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

export function load(file) {
  const src = fs.readFileSync(file, 'utf8');
  return { file, src, ast: acorn.parse(src, { ecmaVersion: 2022, sourceType: 'module' }) };
}

export function topLevel({ ast }) {
  const decls = new Map();
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration') {
      decls.set(node.id.name, { name: node.id.name, start: node.start, end: node.end, kind: 'function' });
    } else if (node.type === 'VariableDeclaration') {
      const shared = node.declarations.length > 1;
      for (const d of node.declarations) {
        if (d.id.type === 'Identifier') {
          decls.set(d.id.name, { name: d.id.name, start: node.start, end: node.end, kind: node.kind, shared });
        }
      }
    }
  }
  return decls;
}

/** Identifiers actually referenced as values (not property names, not object keys). */
export function referencedNames(src, start, end) {
  const sub = acorn.parse(src.slice(start, end), { ecmaVersion: 2022, sourceType: 'module' });
  const used = new Set();
  walk.ancestor(sub, {
    Identifier(node, _state, ancestors) {
      const parent = ancestors[ancestors.length - 2];
      if (!parent) return;
      if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return;
      if (parent.type === 'Property' && parent.key === node && !parent.computed) return;
      if (parent.type === 'MethodDefinition' && parent.key === node && !parent.computed) return;
      used.add(node.name);
    },
  });
  return used;
}

export function depsOf(mod, decls, name) {
  const d = decls.get(name);
  if (!d) return null;
  const out = new Set();
  for (const id of referencedNames(mod.src, d.start, d.end)) {
    if (id !== name && decls.has(id)) out.add(id);
  }
  return out;
}

// Only run when this file IS the command, not when it is imported.
// `file://${process.argv[1]}` looks right and works on Linux, but on Windows
// argv[1] is "D:\\path\\file.mjs" while import.meta.url is
// "file:///D:/path/file.mjs" — they never match, so the command does nothing
// at all and prints nothing to explain why. pathToFileURL does it properly.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, ...rest] = process.argv.slice(2);
  const mod = load(file);
  const decls = topLevel(mod);

  if (rest[0] === '--users') {
    const want = new Set(rest.slice(1));
    const users = new Map([...want].map((w) => [w, []]));
    for (const name of decls.keys()) {
      for (const dep of depsOf(mod, decls, name) || []) if (want.has(dep)) users.get(dep).push(name);
    }
    for (const [w, list] of users) console.log(`${w} (${list.length} users): ${list.join(' ')}`);
  } else if (rest.length) {
    for (const t of rest) {
      const d = decls.get(t);
      const deps = depsOf(mod, decls, t);
      console.log(t.padEnd(15), d ? `[${d.kind}${d.shared ? ' SHARED-DECL' : ''}]`.padEnd(18) : 'NOT FOUND',
        deps ? '-> ' + ([...deps].sort().join(' ') || '(nothing)') : '');
    }
  } else {
    console.log(`${decls.size} top-level declarations`);
  }
}
