// ─── PriceGuard AI — Auth Service ────────────────────────────────────────────
// localStorage-backed auth with email 2FA + Google/Apple OAuth.
// Replace localStorage calls with your backend / Firebase in production.

const USERS_KEY   = 'pg_users';
const SESSION_KEY = 'pg_session';
const PENDING_KEY = 'pg_pending';
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

function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

// ── Register ──────────────────────────────────────────────────────────────────
export async function registerEmail(email, password, name) {
  await new Promise(r => setTimeout(r, 400));
  const users = getUsers();
  const key = email.toLowerCase();
  if (users[key]) throw new Error('An account with this email already exists.');
  const code = genCode();
  localStorage.setItem(PENDING_KEY, JSON.stringify({
    email: key, password, name, code, expiresAt: Date.now() + 10 * 60 * 1000,
  }));
  console.info(`[DEV] Verification code for ${email}: ${code}`);
  return { code };
}

// ── Verify email code → create account ───────────────────────────────────────
export async function verifyEmailAndCreateAccount(inputCode) {
  await new Promise(r => setTimeout(r, 300));
  const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
  if (!pending) throw new Error('No pending registration. Please start again.');
  if (Date.now() > pending.expiresAt) throw new Error('Code expired. Please register again.');
  if (inputCode.trim() !== pending.code) throw new Error('Incorrect code. Try again.');
  const users = getUsers();
  const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const user = { id, email: pending.email, name: pending.name, provider: 'email', createdAt: Date.now(), avatarUrl: null };
  users[pending.email] = { ...user, pwHash: btoa(pending.password) };
  saveUsers(users);
  localStorage.removeItem(PENDING_KEY);
  saveSession(user);
  return user;
}

// ── Login with 2FA ────────────────────────────────────────────────────────────
export async function loginEmail(email, password, tfaCode = null) {
  await new Promise(r => setTimeout(r, 400));
  const users = getUsers();
  const key = email.toLowerCase();
  const record = users[key];
  if (!record) throw new Error('No account found with this email.');
  if (record.pwHash !== btoa(password)) throw new Error('Incorrect password.');
  if (tfaCode === null) {
    const code = genCode();
    localStorage.setItem('pg_tfa', JSON.stringify({ email: key, code, expiresAt: Date.now() + 5 * 60 * 1000 }));
    console.info(`[DEV] TFA code for ${email}: ${code}`);
    return { requiresTfa: true, code };
  }
  const tfa = JSON.parse(localStorage.getItem('pg_tfa') || 'null');
  if (!tfa || tfa.email !== key) throw new Error('TFA session expired. Sign in again.');
  if (Date.now() > tfa.expiresAt) throw new Error('TFA code expired. Sign in again.');
  if (tfaCode.trim() !== tfa.code) throw new Error('Incorrect TFA code.');
  localStorage.removeItem('pg_tfa');
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
