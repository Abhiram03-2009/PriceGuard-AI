require('dotenv').config();
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const { saveUser, insertAudit } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || `http://localhost:${PORT}`;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_URL);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

function renderHtml(content) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>PriceGuard Backend</title><style>body{margin:0;font-family:system-ui, sans-serif;background:#060a18;color:#f7fafc;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center}h1{margin-bottom:.5rem}p{margin:.75rem 0;font-size:1rem}</style></head><body><div><h1>PriceGuard Auth</h1>${content}</div></body></html>`;
}

function renderPopupSuccess(profile, provider) {
  const payload = JSON.stringify({ type: 'PRICEGUARD_AUTH', provider, profile });
  const targetOrigin = FRONTEND_URL || '*';
  return renderHtml(`<p>Sign-in complete. Close this window to return to the app.</p><script>try { window.opener?.postMessage(${payload}, ${JSON.stringify(targetOrigin)}); } catch (e) { /* ignore */ } window.close();</script>`);
}

function buildAppleClientSecret() {
  const { APPLE_TEAM_ID, APPLE_CLIENT_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } = process.env;
  if (!APPLE_TEAM_ID || !APPLE_CLIENT_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) return null;
  const privateKey = APPLE_PRIVATE_KEY.replace(/\r/g, '').replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iss: APPLE_TEAM_ID,
      iat: now,
      exp: now + 15777000,
      aud: 'https://appleid.apple.com',
      sub: APPLE_CLIENT_ID,
    },
    privateKey,
    { algorithm: 'ES256', keyid: APPLE_KEY_ID }
  );
}

function parseJwt(token) {
  try {
    const payload = token.split('.')[1];
    const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
    return JSON.parse(Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch (error) {
    return null;
  }
}

app.get('/', (req, res) => {
  res.send(renderHtml('<p>PriceGuard backend is running.</p>'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', backend: 'PriceGuard', time: new Date().toISOString() });
});

app.get('/auth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).send(renderHtml('<p>Google OAuth is not configured.</p>'));
  const redirectUri = `${SERVER_BASE_URL.replace(/\/$/, '')}/auth/google/callback`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('state', Math.random().toString(36).slice(2));
  res.redirect(url.toString());
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send(renderHtml('<p>Missing Google authorization code.</p>'));

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${SERVER_BASE_URL.replace(/\/$/, '')}/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return res.status(500).send(renderHtml(`<p>Google token exchange failed.</p><pre>${errorText}</pre>`));
    }

    const tokenData = await tokenResponse.json();
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userResponse.json();
    const profile = {
      name: userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim() || userInfo.email,
      email: userInfo.email || '',
      avatarUrl: userInfo.picture || '',
      providerId: userInfo.sub || userInfo.email,
    };
    const userId = await saveUser({ provider: 'google', ...profile });
    await insertAudit(userId, 'google_sign_in', `Signed in as ${profile.email}`);
    res.send(renderPopupSuccess(profile, 'google'));
  } catch (error) {
    res.status(500).send(renderHtml(`<p>Google callback failed.</p><pre>${String(error)}</pre>`));
  }
});

app.get('/auth/apple', (req, res) => {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) return res.status(500).send(renderHtml('<p>Apple OAuth is not configured.</p>'));
  const redirectUri = `${SERVER_BASE_URL.replace(/\/$/, '')}/auth/apple/callback`;
  const url = new URL('https://appleid.apple.com/auth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'name email');
  url.searchParams.set('response_mode', 'form_post');
  url.searchParams.set('state', Math.random().toString(36).slice(2));
  res.redirect(url.toString());
});

app.all('/auth/apple/callback', async (req, res) => {
  try {
    const code = req.body.code || req.query.code;
    if (!code) return res.status(400).send(renderHtml('<p>Missing Apple authorization code.</p>'));

    const clientSecret = buildAppleClientSecret();
    if (!clientSecret) return res.status(500).send(renderHtml('<p>Apple client secret is not configured.</p>'));

    const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID || '',
        client_secret: clientSecret,
        code: String(code),
        grant_type: 'authorization_code',
        redirect_uri: `${SERVER_BASE_URL.replace(/\/$/, '')}/auth/apple/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return res.status(500).send(renderHtml(`<p>Apple token exchange failed.</p><pre>${errorText}</pre>`));
    }

    const tokenData = await tokenResponse.json();
    const idToken = tokenData.id_token;
    const claims = idToken ? parseJwt(idToken) : {};
    let name = claims?.email || 'Apple User';
    if (req.body.user) {
      try {
        const appleUser = JSON.parse(req.body.user);
        const first = appleUser.name?.firstName || '';
        const last = appleUser.name?.lastName || '';
        name = `${first} ${last}`.trim() || name;
      } catch (e) {
        // ignore invalid JSON
      }
    }

    const profile = {
      name,
      email: claims?.email || '',
      avatarUrl: '',
      providerId: claims?.sub || claims?.email,
    };
    const userId = await saveUser({ provider: 'apple', ...profile });
    await insertAudit(userId, 'apple_sign_in', `Signed in as ${profile.email || profile.name}`);
    res.send(renderPopupSuccess(profile, 'apple'));
  } catch (error) {
    res.status(500).send(renderHtml(`<p>Apple callback failed.</p><pre>${String(error)}</pre>`));
  }
});

app.post('/api/openai', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key is not configured.' });
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PriceGuard backend listening on ${PORT}`);
});
