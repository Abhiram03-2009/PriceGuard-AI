import React, { useState, useRef } from 'react';
import logo from '../logo.png';

// ── Simulates OAuth popup flow. With REACT_APP_AUTH_PROXY_URL configured,
// this opens the backend proxy route and listens for a secure postMessage.
// When no backend proxy is available, it falls back to the demo-style mock flow.
function simulateOAuthPopup(provider) {
  return new Promise((resolve, reject) => {
    const width = 500, height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top  = window.screenY + (window.outerHeight - height) / 2;

    const authProxyUrl = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_AUTH_PROXY_URL) || (typeof window !== 'undefined' && window.__AUTH_PROXY_URL__);
    const googleClient = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_GOOGLE_CLIENT_ID) || (typeof window !== 'undefined' && window.__GOOGLE_CLIENT_ID__);
    const appleClient = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_APPLE_CLIENT_ID) || (typeof window !== 'undefined' && window.__APPLE_CLIENT_ID__);

    const providerUrls = {
      google: authProxyUrl
        ? `${authProxyUrl.replace(/\/$/, '')}/auth/google`
        : googleClient
          ? `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=${encodeURIComponent(googleClient)}&redirect_uri=${encodeURIComponent(window.location.origin + '/oauth2callback')}&scope=email%20profile&prompt=select_account`
          : `https://accounts.google.com/o/oauth2/auth?response_type=token&client_id=demo&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=email%20profile`,
      apple: authProxyUrl
        ? `${authProxyUrl.replace(/\/$/, '')}/auth/apple`
        : appleClient
          ? `https://appleid.apple.com/auth/authorize?response_type=code&client_id=${encodeURIComponent(appleClient)}&redirect_uri=${encodeURIComponent(window.location.origin + '/apple_callback')}&scope=name%20email&response_mode=form_post`
          : `https://appleid.apple.com/auth/authorize?response_type=code&client_id=com.priceguard.ai&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=name%20email`,
    };

    const popup = window.open(
      providerUrls[provider],
      `${provider}_oauth`,
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!popup || popup.closed) {
      setTimeout(() => resolve(buildMockProfile(provider)), 1200);
      return;
    }

    let resolved = false;
    let targetOrigin = window.location.origin;
    if (authProxyUrl) {
      try { targetOrigin = new URL(authProxyUrl).origin; } catch (e) { targetOrigin = '*'; }
    }

    const cleanup = () => {
      clearInterval(interval);
      clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
    };

    const onMessage = (event) => {
      if (!event.data || event.data.type !== 'PRICEGUARD_AUTH' || event.data.provider !== provider) return;
      if (targetOrigin !== '*' && event.origin !== targetOrigin) return;
      if (resolved) return;
      resolved = true;
      cleanup();
      try { popup.close(); } catch (e) { /* ignore */ }
      resolve({ ...event.data.profile, provider });
    };

    window.addEventListener('message', onMessage);

    const interval = setInterval(() => {
      try {
        if (popup.closed) {
          cleanup();
          if (!resolved) {
            resolved = true;
            reject(new Error('Popup closed by user'));
          }
        }
      } catch (e) { /* cross-origin access — ignore */ }
    }, 400);

    const timeout = setTimeout(() => {
      if (resolved) return;
      cleanup();
      if (authProxyUrl) {
        reject(new Error('Sign-in timed out. Please try again.'));
      } else {
        try { popup.close(); } catch (e) { /* ignore */ }
        resolve(buildMockProfile(provider));
      }
    }, authProxyUrl ? 20000 : 2500);
  });
}

function buildMockProfile(provider) {
  if (provider === 'google') return { name: 'Google User', email: 'you@gmail.com',  provider: 'google', avatar: null };
  if (provider === 'apple')  return { name: 'Apple User',  email: 'you@icloud.com', provider: 'apple',  avatar: null };
  return { name: 'User', email: '', provider, avatar: null };
}

// ── Tiny avatar helpers ───────────────────────────────────────────────────────
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── ProfileSetupStep ──────────────────────────────────────────────────────────
function ProfileSetupStep({ draft, onComplete }) {
  const [displayName, setDisplayName] = useState(draft.name || '');
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [avatarFile, setAvatarFile]   = useState(null);
  const [error, setError]             = useState('');
  const fileRef = useRef(null);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!displayName.trim()) { setError('Please enter your name.'); return; }
    onComplete({ ...draft, name: displayName.trim(), avatarUrl: previewUrl, avatarFile });
  };

  return (
    <div className="auth-actions fade">
      <div className="auth-divider-label" style={{ marginBottom: '16px' }}>Set up your profile</div>

      {/* Avatar picker */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="avatar-picker"
          aria-label="Upload profile photo"
        >
          {previewUrl
            ? <img src={previewUrl} alt="Profile" className="avatar-img" />
            : <span className="avatar-initials">{initials(displayName || draft.name)}</span>
          }
          <div className="avatar-edit-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
        <span style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.5px' }}>
          Tap to upload a photo
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="auth-field">
          <label className="auth-field-label">Display Name</label>
          <input
            type="text"
            className="fi auth-input"
            placeholder="Your full name"
            value={displayName}
            onChange={e => { setDisplayName(e.target.value); setError(''); }}
            autoComplete="name"
            required
          />
        </div>
        <div className="auth-field">
          <label className="auth-field-label">Email</label>
          <input
            type="email"
            className="fi auth-input"
            value={draft.email}
            readOnly
            style={{ opacity: 0.6 }}
          />
        </div>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="auth-btn auth-submit">
          Complete Setup →
        </button>
      </form>
    </div>
  );
}

// ── Main AuthScreen ───────────────────────────────────────────────────────────
export default function AuthScreen({ onAuth }) {
  const [mode, setMode]       = useState('landing'); // landing | email | profile
  const [draft, setDraft]     = useState(null);
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [isNew, setIsNew]     = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // OAuth provider flow
  const handleOAuth = async (provider) => {
    setLoading(true);
    setError('');
    try {
      const profile = await simulateOAuthPopup(provider);
      setDraft(profile);
      setMode('profile');
    } catch (err) {
      setError(err.message === 'Popup closed by user' ? 'Sign-in was cancelled.' : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Email/password flow
  const handleEmail = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const profile = { name, email: email.trim(), provider: 'email', avatar: null };
      setDraft(profile);
      setMode('profile');
    }, 1000);
  };

  // Profile setup complete → enter app
  const handleProfileComplete = (profile) => {
    onAuth(profile);
  };

  return (
    <div className="auth-screen">
      <div className="crypto-bg">
        <div className="crypto-grid" />
        <div className="market-scanline" />
      </div>

      <div className="auth-shell">
        {/* Logo + Wordmark */}
        <div className="auth-brand">
          <div className="auth-logo-wrap">
            <img src={logo} alt="PriceGuard AI" className="auth-logo" />
            <div className="auth-logo-ring" />
          </div>
          <div className="auth-wordmark">
            <span className="auth-wm-price">Price</span><span className="auth-wm-guard">Guard</span>
            <span className="auth-wm-ai">&nbsp;AI</span>
          </div>
          <div className="auth-tagline">Market Protection Terminal</div>
        </div>

        {/* ── LANDING ── */}
        {mode === 'landing' && (
          <div className="auth-actions fade">
            <div className="auth-divider-label">Sign in to continue</div>

            <button className="auth-btn auth-apple" onClick={() => handleOAuth('apple')} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              {loading ? 'Opening Apple Sign In…' : 'Continue with Apple'}
            </button>

            <button className="auth-btn auth-google" onClick={() => handleOAuth('google')} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Opening Google Sign In…' : 'Continue with Google'}
            </button>

            {error && <div className="auth-error">{error}</div>}

            <div className="auth-or">
              <span /><span className="auth-or-text">or</span><span />
            </div>

            <button className="auth-btn auth-email" onClick={() => setMode('email')} disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Sign in with Email
            </button>

            <p className="auth-legal">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
          </div>
        )}

        {/* ── EMAIL ── */}
        {mode === 'email' && (
          <div className="auth-actions fade">
            <button className="auth-back" onClick={() => { setMode('landing'); setError(''); }}>← Back</button>
            <div className="auth-divider-label">{isNew ? 'Create Account' : 'Sign In'}</div>

            <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="auth-field">
                <label className="auth-field-label">Email Address</label>
                <input type="email" className="fi auth-input" placeholder="you@example.com" value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }} autoComplete="email" required />
              </div>
              <div className="auth-field">
                <label className="auth-field-label">Password</label>
                <input type="password" className="fi auth-input"
                  placeholder={isNew ? 'Create a password (6+ chars)' : 'Your password'}
                  value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  autoComplete={isNew ? 'new-password' : 'current-password'} required />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button type="submit" className="auth-btn auth-submit" disabled={loading}>
                {loading ? 'Please wait…' : (isNew ? 'Create Account' : 'Sign In')}
              </button>
            </form>

            <button className="auth-switch" onClick={() => { setIsNew(n => !n); setError(''); }}>
              {isNew ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        )}

        {/* ── PROFILE SETUP ── */}
        {mode === 'profile' && draft && (
          <ProfileSetupStep draft={draft} onComplete={handleProfileComplete} />
        )}
      </div>
    </div>
  );
}
