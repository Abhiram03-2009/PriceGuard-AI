// ─── PriceGuard AI — Auth Service ─────────────────────────────────────────────
// Provides localStorage-backed auth with email verification (2FA) and Google/Apple OAuth stubs.
// In production, replace localStorage with a backend API (Firebase, Supabase, etc.).

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

// ── Generate a 6-digit code ───────────────────────────────────────────────────
function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

// ── Register with email — stores pending user + sends (simulates) code ────────
export async function registerEmail(email, password, name) {
  await new Promise(r => setTimeout(r, 400)); // simulate network
  const users = getUsers();
  const key = email.toLowerCase();
  if (users[key]) throw new Error('An account with this email already exists.');
  const code = genCode();
  const pending = { email: key, password, name, code, expiresAt: Date.now() + 10 * 60 * 1000 };
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  // In production: send code to email via backend
  console.info(`[DEV] Verification code for ${email}: ${code}`);
  return { code }; // returned so UI can show it in dev
}

// ── Verify code and create account ────────────────────────────────────────────
export async function verifyEmailAndCreateAccount(inputCode) {
  await new Promise(r => setTimeout(r, 300));
  const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
  if (!pending) throw new Error('No pending registration found. Please start again.');
  if (Date.now() > pending.expiresAt) throw new Error('Verification code expired. Please register again.');
  if (inputCode.trim() !== pending.code) throw new Error('Incorrect code. Please try again.');
  const users = getUsers();
  const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const user = { id, email: pending.email, name: pending.name, provider: 'email', createdAt: Date.now(), avatarUrl: null };
  // Hash password (simple btoa for demo — use bcrypt in production)
  users[pending.email] = { ...user, pwHash: btoa(pending.password) };
  saveUsers(users);
  localStorage.removeItem(PENDING_KEY);
  saveSession(user);
  return user;
}

// ── Login with email (+ optional TFA code) ───────────────────────────────────
export async function loginEmail(email, password, tfaCode = null) {
  await new Promise(r => setTimeout(r, 400));
  const users = getUsers();
  const key = email.toLowerCase();
  const record = users[key];
  if (!record) throw new Error('No account found with this email.');
  if (record.pwHash !== btoa(password)) throw new Error('Incorrect password.');

  if (tfaCode === null) {
    // Generate TFA and return prompt
    const code = genCode();
    localStorage.setItem('pg_tfa', JSON.stringify({ email: key, code, expiresAt: Date.now() + 5 * 60 * 1000 }));
    console.info(`[DEV] TFA code for ${email}: ${code}`);
    return { requiresTfa: true, code };
  }

  // Validate TFA
  const tfa = JSON.parse(localStorage.getItem('pg_tfa') || 'null');
  if (!tfa || tfa.email !== key) throw new Error('TFA session expired. Please sign in again.');
  if (Date.now() > tfa.expiresAt) throw new Error('TFA code expired. Please sign in again.');
  if (tfaCode.trim() !== tfa.code) throw new Error('Incorrect TFA code.');
  localStorage.removeItem('pg_tfa');

  const { pwHash, ...user } = record; // eslint-disable-line no-unused-vars
  saveSession(user);
  return { user };
}

// ── OAuth sign-in (Google / Apple) ───────────────────────────────────────────
export function oauthSignIn(profile) {
  const users = getUsers();
  const key = profile.email?.toLowerCase() || `oauth_${profile.sub}`;
  let user = users[key];
  if (!user) {
    user = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email: key,
      name: profile.name || 'User',
      provider: profile.provider || 'oauth',
      avatarUrl: profile.picture || null,
      createdAt: Date.now(),
    };
    users[key] = user;
    saveUsers(users);
  }
  saveSession(user);
  return user;
}

// ── Decode Google JWT credential (id_token) ──────────────────────────────────
export function decodeGoogleCredential(credential) {
  try {
    const payload = JSON.parse(atob(credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return {
      name: payload.name || payload.given_name,
      email: payload.email,
      picture: payload.picture,
      sub: payload.sub,
      provider: 'google',
    };
  } catch {
    return { name: 'Google User', email: `google_${Date.now()}@gmail.com`, provider: 'google', sub: `g_${Date.now()}` };
  }
}

// ── Parse Apple sign-in response ─────────────────────────────────────────────
export function parseAppleResponse(res) {
  const email = res?.authorization?.id_token
    ? (() => { try { return JSON.parse(atob(res.authorization.id_token.split('.')[1])).email; } catch { return null; } })()
    : null;
  return {
    name: res?.user?.name?.firstName ? `${res.user.name.firstName} ${res.user.name.lastName || ''}`.trim() : 'Apple User',
    email: email || `apple_${Date.now()}@icloud.com`,
    provider: 'apple',
    sub: `a_${Date.now()}`,
  };
}

// ── Update profile ────────────────────────────────────────────────────────────
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

// ── Activity log ─────────────────────────────────────────────────────────────
export function logActivity(userId, action, detail = '') {
  if (!userId) return;
  const key = `${ACTIVITY_KEY}_${userId}`;
  let log;
  try { log = JSON.parse(localStorage.getItem(key) || '[]'); } catch { log = []; }
  log.unshift({ id: Date.now(), ts: Date.now(), action, detail });
  if (log.length > 50) log.length = 50;
  localStorage.setItem(key, JSON.stringify(log));
}

export function getActivity(userId) {
  if (!userId) return [];
  const key = `${ACTIVITY_KEY}_${userId}`;
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
