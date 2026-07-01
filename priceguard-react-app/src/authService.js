// ─── PriceGuard AI — Auth Service ────────────────────────────────────────────
// localStorage-backed auth with email 2FA + Google/Apple OAuth.
// Replace localStorage calls with your backend / Firebase in production.

const USERS_KEY   = 'pg_users';
const SESSION_KEY = 'pg_session';
const ACTIVITY_KEY = 'pg_activity';

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch { return {}; }
}
function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

export function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function saveSession(user) { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
export function clearSession() { localStorage.removeItem(SESSION_KEY); }

// ── Register ──────────────────────────────────────────────────────────────────
export async function registerEmail(email, password, name) {
  await new Promise(r => setTimeout(r, 400));
  const users = getUsers();
  const key = email.toLowerCase();
  if (users[key]) throw new Error('An account with this email already exists.');
  const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const user = { id, email: key, name, provider: 'email', createdAt: Date.now(), avatarUrl: null };
  users[key] = { ...user, pwHash: btoa(password) };
  saveUsers(users);
  saveSession(user);
  return user;
}

// ── Verify email code → create account (deprecated, kept for compatibility) ─────
export async function verifyEmailAndCreateAccount(inputCode) {
  // No-op - registration now creates account directly
  throw new Error('Email verification is no longer required. Please use the simplified registration flow.');
}

// ── Login without 2FA ───────────────────────────────────────────────────────────
export async function loginEmail(email, password, tfaCode = null) {
  await new Promise(r => setTimeout(r, 400));
  const users = getUsers();
  const key = email.toLowerCase();
  const record = users[key];
  if (!record) throw new Error('No account found with this email.');
  if (record.pwHash !== btoa(password)) throw new Error('Incorrect password.');
  const { pwHash, ...user } = record; // eslint-disable-line no-unused-vars
  saveSession(user);
  return { user };
}

// ── OAuth sign-in ─────────────────────────────────────────────────────────────
export function oauthSignIn(profile) {
  const users = getUsers();
  const key = profile.email?.toLowerCase() || `oauth_${profile.sub || Date.now()}`;
  let user = users[key];
  if (!user) {
    user = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email: key, name: profile.name || 'User', provider: profile.provider || 'oauth',
      avatarUrl: profile.picture || null, createdAt: Date.now(),
    };
    users[key] = user;
    saveUsers(users);
  }
  saveSession(user);
  return user;
}

// ── Decode Google JWT ─────────────────────────────────────────────────────────
export function decodeGoogleCredential(credential) {
  try {
    const payload = JSON.parse(atob(credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { name: payload.name || payload.given_name, email: payload.email, picture: payload.picture, sub: payload.sub, provider: 'google' };
  } catch {
    return { name: 'Google User', email: `google_${Date.now()}@gmail.com`, provider: 'google', sub: `g_${Date.now()}` };
  }
}

// ── Parse native Google Sign-In result (Capacitor iOS) ────────────────────────
export function parseNativeGoogleResult(res) {
  const profile = res?.result?.profile || {};
  return {
    name: profile.name || profile.givenName || 'Google User',
    email: profile.email || `google_${Date.now()}@gmail.com`,
    picture: profile.imageUrl || null,
    sub: profile.id || `g_${Date.now()}`,
    provider: 'google',
  };
}

// ── Parse native Apple Sign-In result (Capacitor iOS) ─────────────────────────
// Apple only returns email/name on the user's very first authorization with this app;
// later sign-ins omit both, so we must not invent a unique fallback email each time —
// that would create a new duplicate account per login. oauthSignIn() already falls back
// to keying on `sub` (Apple's stable per-user id) whenever email is falsy, so leave it '' here.
export function parseNativeAppleResult(res) {
  const profile = res?.result?.profile || {};
  const name = profile.givenName ? `${profile.givenName} ${profile.familyName || ''}`.trim() : 'Apple User';
  return {
    name,
    email: profile.email || '',
    picture: null,
    sub: profile.user || `a_${Date.now()}`,
    provider: 'apple',
  };
}

// ── Parse Apple response ──────────────────────────────────────────────────────
export function parseAppleResponse(res) {
  const email = res?.authorization?.id_token
    ? (() => { try { return JSON.parse(atob(res.authorization.id_token.split('.')[1])).email; } catch { return null; } })()
    : null;
  return {
    name: res?.user?.name?.firstName ? `${res.user.name.firstName} ${res.user.name.lastName || ''}`.trim() : 'Apple User',
    email: email || `apple_${Date.now()}@icloud.com`, provider: 'apple', sub: `a_${Date.now()}`,
  };
}

// ── Profile update ────────────────────────────────────────────────────────────
export function updateProfile(userId, changes) {
  const session = loadSession();
  if (!session || session.id !== userId) return session;
  const updated = { ...session, ...changes };
  saveSession(updated);
  const users = getUsers();
  const key = Object.keys(users).find(k => users[k].id === userId);
  if (key) { users[key] = { ...users[key], ...changes }; saveUsers(users); }
  return updated;
}

// ── Delete account (App Store guideline 5.1.1(v) requires in-app deletion) ────
export function deleteAccount(userId) {
  const users = getUsers();
  const key = Object.keys(users).find(k => users[k].id === userId);
  if (key) { delete users[key]; saveUsers(users); }
  localStorage.removeItem(`${ACTIVITY_KEY}_${userId}`);
  clearSession();
}

// ── Activity log ──────────────────────────────────────────────────────────────
export function logActivity(userId, action, detail = '') {
  if (!userId) return;
  const key = `${ACTIVITY_KEY}_${userId}`;
  let log; try { log = JSON.parse(localStorage.getItem(key) || '[]'); } catch { log = []; }
  log.unshift({ id: Date.now(), ts: Date.now(), action, detail });
  if (log.length > 50) log.length = 50;
  localStorage.setItem(key, JSON.stringify(log));
}

export function getActivity(userId) {
  if (!userId) return [];
  try { return JSON.parse(localStorage.getItem(`${ACTIVITY_KEY}_${userId}`) || '[]'); } catch { return []; }
}
