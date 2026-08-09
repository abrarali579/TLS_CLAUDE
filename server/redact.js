/**
 * Keeping partner figures away from staff — properly.
 *
 * Hiding a screen in the browser is decoration. If the numbers are in the
 * response, anyone can open the developer tools and read them. So the server
 * strips them out before sending.
 *
 * That creates a second problem, and it is the dangerous one. If staff receive
 * a copy of the books with partner rows missing and then save, they would
 * write that copy back and DELETE the partner data. So every write from an
 * account that cannot see those rows has them put back first, from the
 * server's own copy. Staff can never see them, and can never destroy them.
 */
import { can } from './auth.js';

/** Accounts that only owners and partners may see. */
export function protectedAccounts(data) {
  const names = new Set(['WITHDRAWN PROFIT']);
  for (const p of data?.settings?.partners ?? []) {
    if (p?.drawAccount) names.add(String(p.drawAccount).trim().toUpperCase());
    if (p?.name) names.add(String(p.name).trim().toUpperCase());
  }
  return names;
}

const accountOf = (row) => String(row?.account ?? '').trim().toUpperCase();

/** A copy of the books with anything this role may not see removed. */
export function redactFor(role, data) {
  if (!data || can(role, 'seePartners')) return data;

  const hidden = protectedAccounts(data);
  return {
    ...data,
    settings: { ...(data.settings ?? {}), partners: [] },
    ledger: (data.ledger ?? []).filter((row) => !hidden.has(accountOf(row))),
  };
}

/**
 * Put back what this role was never shown, using the server's current copy.
 * Call this on every write before storing it.
 */
export function restoreRedacted(role, incoming, current) {
  if (!incoming || can(role, 'seePartners')) return incoming;
  if (!current) return incoming;

  const hidden = protectedAccounts(current);
  const hiddenRows = (current.ledger ?? []).filter((row) => hidden.has(accountOf(row)));

  // Anything the client sends for a hidden account is ignored — they could not
  // have seen those rows, so they cannot have meant to change them.
  const visibleRows = (incoming.ledger ?? []).filter((row) => !hidden.has(accountOf(row)));

  return {
    ...incoming,
    settings: {
      ...(incoming.settings ?? {}),
      partners: current.settings?.partners ?? [],
    },
    ledger: [...visibleRows, ...hiddenRows],
  };
}
