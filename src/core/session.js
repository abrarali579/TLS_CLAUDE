/**
 * Who is signed in, when there is a server to ask.
 *
 * Opened as a plain file there is no server and no session — one person, one
 * machine, no restrictions. So when nothing answers, every permission is
 * granted rather than denied. Locking someone out of their own offline copy
 * would be a strange way to be careful.
 *
 * Worth being clear about what this is for: hiding a screen someone may not
 * use. It is NOT the security boundary. The server strips partner figures out
 * of the response before they ever reach the browser — see server/redact.js.
 * This only stops people tripping over screens that would look broken to them.
 */
let me = null;
let asked = false;

export async function loadSession() {
  if (asked) return me;
  asked = true;
  try {
    const r = await fetch('/api/me', { cache: 'no-store' });
    if (r.ok) {
      const body = await r.json();
      me = { ...body.user, permissions: body.permissions ?? {} };
    }
  } catch {
    // No server. Local single-user mode.
  }
  return me;
}

/** The signed-in person, or null when running from a local file. */
export const currentUser = () => me;

/** Is this allowed? Always yes when there is no server. */
export const may = (what) => (me ? Boolean(me.permissions?.[what]) : true);

export async function signOut() {
  try { await fetch('/api/logout', { method: 'POST' }); } catch { /* going anyway */ }
  location.href = '/login';
}
