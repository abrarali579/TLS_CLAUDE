/**
 * Work out which screen owns which leftover helper in main.js.
 *
 * A helper reached by exactly one screen belongs with that screen. A helper
 * reached by several is shared and goes to a common module. Anything reached
 * by none is startup code and stays in main.js.
 */
import { load, topLevel, referencedNames } from './analyze.mjs';

const mod = load('src/main.js');
const decls = topLevel(mod);
const names = new Set(decls.keys());

const deps = new Map();
for (const [name, d] of decls) {
  deps.set(name, new Set([...referencedNames(mod.src, d.start, d.end)].filter((x) => names.has(x) && x !== name)));
}

const views = [...names].filter((n) => /^render[A-Z]/.test(n)).sort();

/** everything reachable from a starting name */
function reach(start) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop();
    for (const d of deps.get(cur) ?? []) if (!seen.has(d)) { seen.add(d); stack.push(d); }
  }
  return seen;
}

const reachedBy = new Map();
for (const v of views) for (const r of reach(v)) {
  if (views.includes(r)) continue;
  reachedBy.set(r, [...(reachedBy.get(r) ?? []), v]);
}

const exclusive = new Map(views.map((v) => [v, []]));
const shared = [];
for (const [helper, owners] of reachedBy) {
  if (owners.length === 1) exclusive.get(owners[0]).push(helper);
  else shared.push({ helper, count: owners.length });
}

const orphans = [...names].filter((n) => !views.includes(n) && !reachedBy.has(n));

console.log('SCREENS AND THEIR PRIVATE HELPERS');
for (const v of views) {
  const own = exclusive.get(v);
  console.log(`  ${v.padEnd(22)} ${own.length ? own.join(' ') : '(none)'}`);
}
console.log('\nSHARED BY SEVERAL SCREENS (' + shared.length + ')');
console.log('  ' + shared.sort((a, b) => b.count - a.count).map((s) => `${s.helper}(${s.count})`).join(' '));
console.log('\nNOT REACHED FROM ANY SCREEN — startup / wiring (' + orphans.length + ')');
console.log('  ' + orphans.join(' '));
