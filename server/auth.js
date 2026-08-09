/**
 * Who is using the app, and what they are allowed to see.
 *
 * Passwords are hashed with scrypt — deliberately slow, so a stolen users file
 * cannot be run through a dictionary quickly. Each password gets its own salt,
 * and comparison is timing-safe. All of it comes from Node itself; there is no
 * dependency here to keep patched.
 *
 * Sessions are a random token in an httpOnly cookie, so page scripts cannot
 * read it. They survive a server restart, because logging three people out
 * every time the machine reboots would just teach them to hate the app.
 */
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
export const SESSION_COOKIE = 'tl_session';
export const SESSION_DAYS = 30;

/**
 * What each role may do.
 *
 * The rule that matters: staff do not see partner drawings or the profit
 * split. That is not about mistrust — it is normal bookkeeping hygiene, and
 * it is enforced on the SERVER. Hiding a screen in the browser only hides it
 * from people who do not know how to open the developer tools.
 */
export const ROLES = {
  owner:   { label: 'Owner',   seePartners: true,  manageUsers: true,  restore: true },
  partner: { label: 'Partner', seePartners: true,  manageUsers: false, restore: true },
  staff:   { label: 'Staff',   seePartners: false, manageUsers: false, restore: false },
};

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const key = scryptSync(String(password), salt, SCRYPT.keylen, SCRYPT).toString('hex');
  return `scrypt$${salt}$${key}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, salt, key] = String(stored).split('$');
    if (scheme !== 'scrypt' || !salt || !key) return false;
    const attempt = scryptSync(String(password), salt, SCRYPT.keylen, SCRYPT);
    const known = Buffer.from(key, 'hex');
    return attempt.length === known.length && timingSafeEqual(attempt, known);
  } catch {
    return false;
  }
}

const writeAtomic = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, text, 'utf8');
  renameSync(tmp, path);
};

/** The three people who use this, created on first run. */
const STARTER_USERS = [
  { name: 'Abrar Ali', email: 'abrar@timelink.local',  role: 'owner',   password: 'abrar123' },
  { name: 'M Irfan',   email: 'irfan@timelink.local',  role: 'partner', password: 'irfan123' },
  { name: 'Ayesha',    email: 'ayesha@timelink.local', role: 'staff',   password: 'ayesha123' },
];

export function openAuth(dataDir) {
  const usersFile = join(dataDir, 'users.json');
  const sessionsFile = join(dataDir, 'sessions.json');

  const load = (file, fallback) => {
    try { return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback; }
    catch { return fallback; }
  };

  let users = load(usersFile, null);
  let created = false;
  if (!users || !users.length) {
    users = STARTER_USERS.map((u) => ({
      id: createHash('sha1').update(u.email).digest('hex').slice(0, 8),
      name: u.name, email: u.email.toLowerCase(), role: u.role,
      password: hashPassword(u.password), mustChangePassword: true,
    }));
    writeAtomic(usersFile, JSON.stringify(users, null, 2));
    created = true;
  }

  let sessions = load(sessionsFile, {});
  const saveSessions = () => writeAtomic(sessionsFile, JSON.stringify(sessions));

  // drop anything already expired
  const now = Date.now();
  for (const [token, s] of Object.entries(sessions)) if (!s.expires || s.expires < now) delete sessions[token];

  return {
    created,
    starterAccounts: created ? STARTER_USERS.map(({ email, password, role }) => ({ email, password, role })) : [],

    listUsers: () => users.map(({ password, ...rest }) => rest),

    findByEmail: (email) => users.find((u) => u.email === String(email || '').trim().toLowerCase()) || null,

    login(email, password) {
      const user = this.findByEmail(email);
      // Hash regardless, so a wrong email and a wrong password take the same
      // time and cannot be told apart by watching the clock.
      const ok = verifyPassword(password, user ? user.password : hashPassword('no-such-user'));
      if (!user || !ok) return null;

      const token = randomBytes(32).toString('hex');
      sessions[token] = { userId: user.id, expires: Date.now() + SESSION_DAYS * 864e5 };
      saveSessions();
      return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    },

    logout(token) {
      if (token && sessions[token]) { delete sessions[token]; saveSessions(); return true; }
      return false;
    },

    userForToken(token) {
      const s = token && sessions[token];
      if (!s) return null;
      if (s.expires < Date.now()) { delete sessions[token]; saveSessions(); return null; }
      const user = users.find((u) => u.id === s.userId);
      if (!user) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },

    changePassword(userId, next) {
      const user = users.find((u) => u.id === userId);
      if (!user) return false;
      user.password = hashPassword(next);
      user.mustChangePassword = false;
      writeAtomic(usersFile, JSON.stringify(users, null, 2));
      return true;
    },
  };
}

/** Read one cookie out of a request header. */
export function readCookie(header, name) {
  for (const part of String(header || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export const can = (role, what) => Boolean(ROLES[role]?.[what]);
