import React, { useState, useRef, useEffect, useCallback } from 'react';
import logo from '../logo.png';
import {
  registerEmail,
  loginEmail,
  oauthSignIn,
  decodeGoogleCredential,
} from '../authService';

// Google OAuth Client ID from environment variable or fallback
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '126112156480-oklsca75u1lfivpst0lnh0ddmu8sfu14.apps.googleusercontent.com';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function ProfileSetupStep({ draft, onComplete }) {
  const [displayName, setDisplayName] = useState(draft.name || '');
  const [previewUrl, setPreviewUrl] = useState(draft.avatarUrl || null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file?.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    
    // Convert to base64 for persistent storage
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="auth-actions fade">
      <div className="auth-divider-label" style={{ marginBottom: '16px' }}>Set up your profile</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <button type="button" onClick={() => fileRef.current?.click()} className="avatar-picker" aria-label="Upload profile photo">
          {previewUrl ? <img src={previewUrl} alt="Profile" className="avatar-img" /> : <span className="avatar-initials">{initials(displayName || draft.name)}</span>}
          <div className="avatar-edit-badge">✎</div>
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
      </div>
      <form onSubmit={e => { e.preventDefault(); if (!displayName.trim()) { setError('Enter your name.'); return; } onComplete({ ...draft, name: displayName.trim(), avatarUrl: previewUrl }); }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="auth-field">
          <label className="auth-field-label">Display Name</label>
          <input type="text" className="fi auth-input" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
        </div>
        <div className="auth-field">
          <label className="auth-field-label">Email</label>
          <input type="email" className="fi auth-input" value={draft.email} readOnly style={{ opacity: 0.6 }} />
        </div>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="auth-btn auth-submit">Complete Setup →</button>
      </form>
    </div>
  );
}

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('landing');
  const [draft, setDraft] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);
  const googleScriptLoaded = useRef(false);

  const finishOAuth = useCallback((profile) => {
    setDraft(profile);
    setMode('profile');
  }, []);

  // Load Google Identity Services and render official button
  useEffect(() => {
    if (googleScriptLoaded.current) return;
    googleScriptLoaded.current = true;

    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => {
      console.log('[Google] Script loaded');
      if (!window.google?.accounts?.id) {
        console.error('[Google] window.google.accounts.id not available');
        setError('Google Sign-In failed to load. Please try email sign-in instead.');
        return;
      }
      console.log('[Google] Initializing with client ID:', GOOGLE_CLIENT_ID);
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => {
          console.log('[Google] Callback received');
          setLoading(false);
          setError('');
          try {
            finishOAuth(decodeGoogleCredential(res.credential));
          } catch (err) {
            console.error('[Google] OAuth error:', err);
            setError('Google Sign-In failed. Please try again or use email.');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      if (googleBtnRef.current) {
        console.log('[Google] Rendering button');
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 280,
          text: 'continue_with',
        });
      } else {
        console.warn('[Google] Button ref not available');
      }
    };
    s.onerror = () => {
      console.error('[Google] Script load error');
      setError('Failed to load Google Sign-In. Check your connection.');
    };
    document.head.appendChild(s);
    return () => { /* script stays loaded */ };
  }, [finishOAuth]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !name.trim()) { setError('Fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const user = await registerEmail(email, password, name);
      setDraft(user);
      setMode('profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await loginEmail(email, password);
      setDraft(result.user);
      setMode('profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="crypto-bg"><div className="crypto-grid" /><div className="market-scanline" /></div>
      <div className="auth-shell">
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

        {mode === 'landing' && (
          <div className="auth-actions fade">
            <div className="auth-divider-label">Sign in to continue</div>

            {/* Google Sign-In — official rendered button */}
            <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }} />

            {error && <div className="auth-error">{error}</div>}
            <div className="auth-or"><span /><span className="auth-or-text">or</span><span /></div>
            <button type="button" className="auth-btn auth-email" onClick={() => setMode('email')} disabled={loading}>Sign in with Email</button>
            <p className="auth-legal">Secure authentication — Google OAuth or email.</p>
          </div>
        )}

        {mode === 'email' && (
          <div className="auth-actions fade">
            <button type="button" className="auth-back" onClick={() => { setMode('landing'); setError(''); }}>← Back</button>
            <div className="auth-divider-label">{isNew ? 'Create Account' : 'Sign In'}</div>
            <form onSubmit={isNew ? handleRegister : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {isNew && (
                <div className="auth-field">
                  <label className="auth-field-label">Full Name</label>
                  <input type="text" className="fi auth-input" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}
              <div className="auth-field">
                <label className="auth-field-label">Email</label>
                <input type="email" className="fi auth-input" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="auth-field">
                <label className="auth-field-label">Password</label>
                <input type="password" className="fi auth-input" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button type="submit" className="auth-btn auth-submit" disabled={loading}>{loading ? 'Please wait…' : (isNew ? 'Create Account' : 'Sign In')}</button>
            </form>
            <button type="button" className="auth-switch" onClick={() => { setIsNew(n => !n); setError(''); }}>{isNew ? 'Already have an account?' : 'Create new account'}</button>
          </div>
        )}

        {mode === 'profile' && draft && (
          <ProfileSetupStep draft={draft} onComplete={p => { onAuth(p.id ? p : oauthSignIn(p)); }} />
        )}
      </div>
    </div>
  );
}
