/**
 * The single live copy of the business data.
 *
 * Every screen reads `D`. Because this is an ES module the binding is live:
 * when setD() swaps in a restored backup, every importer sees the new object.
 * Mutate properties on D as normal; use setD() to replace the whole thing.
 */
export let D = null;

/** Replace the entire data store — used by boot, backup restore and reset. */
export function setD(next) {
  D = next;
  return D;
}
