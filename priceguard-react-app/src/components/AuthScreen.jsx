import React, { useState, useRef, useEffect, useCallback } from 'react';
import logo from '../logo.png';
import {
  registerEmail,
  verifyEmailAndCreateAccount,
  loginEmail,
  oauthSignIn,
  decodeGoogleCredential,
} from '../authService';

// Hardcoded Google OAuth Client ID — production ready
const GOOGLE_CLIENT_ID = '126112156480-oklsca75u1lfivpst0lnh0ddmu8sfu14.apps.googleusercontent.com';

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
    setPreviewUrl(URL.createObjectURL(file));
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
  const [verifyCode, setVerifyCode] = useState('');
  const [tfaCode, setTfaCode] = useState('');
  const [devCode, setDevCode] = useState('');
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
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => {
          setLoading(false);
          setError('');
          finishOAuth(decodeGoogleCredential(res.credential));
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 280,
          text: 'continue_with',
        });
      }
    };
    s.onerror = () => setError('Failed to load Google Sign-In. Check your connection.');
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
      const { code } = await registerEmail(email, password, name);
      setDevCode(code);
      setMode('verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await verifyEmailAndCreateAccount(verifyCode);
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
      const result = await loginEmail(email, password, mode === 'tfa' ? tfaCode : null);
      if (result.requiresTfa) {
        setDevCode(result.code);
        setMode('tfa');
        setLoading(false);
        return;
      }
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
            <p className="auth-legal">Secure authentication — Google OAuth or email with 2FA verification.</p>
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
              <button type="submit" className="auth-btn auth-submit" disabled={loading}>{loading ? 'Please wait…' : (isNew ? 'Send Verification Code' : 'Sign In')}</button>
            </form>
            <button type="button" className="auth-switch" onClick={() => { setIsNew(n => !n); setError(''); }}>{isNew ? 'Already have an account?' : 'Create new account'}</button>
          </div>
        )}

        {(mode === 'verify' || mode === 'tfa') && (
          <div className="auth-actions fade">
            <div className="auth-divider-label">{mode === 'verify' ? 'Verify Your Email' : 'Two-Factor Authentication'}</div>
            <p style={{ fontSize: '11px', color: 'var(--t2)', lineHeight: 1.5, marginBottom: '10px' }}>
              Enter the 6-digit code sent to your {mode === 'verify' ? 'email' : 'device'}.
            </p>
            {devCode && (
              <div className="auth-verify-hint">Verification code: <strong>{devCode}</strong></div>
            )}
            <form onSubmit={mode === 'verify' ? handleVerify : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" className="fi auth-input" placeholder="000000" maxLength={6} value={mode === 'verify' ? verifyCode : tfaCode}
                onChange={e => (mode === 'verify' ? setVerifyCode : setTfaCode)(e.target.value.replace(/\D/g, ''))} style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '18px' }} required />
              {error && <div className="auth-error">{error}</div>}
              <button type="submit" className="auth-btn auth-submit" disabled={loading}>Verify &amp; Continue</button>
            </form>
          </div>
        )}

        {mode === 'profile' && draft && (
          <ProfileSetupStep draft={draft} onComplete={p => { onAuth(p.id ? p : oauthSignIn(p)); }} />
        )}
      </div>
    </div>
  );
}
