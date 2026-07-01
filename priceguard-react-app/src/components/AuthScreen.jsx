import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import logo from '../logo.png';
import {
  registerEmail,
  loginEmail,
  oauthSignIn,
  decodeGoogleCredential,
  parseNativeGoogleResult,
  parseNativeAppleResult,
} from '../authService';

// Google OAuth Client ID from environment variable or fallback
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '126112156480-oklsca75u1lfivpst0lnh0ddmu8sfu14.apps.googleusercontent.com';
// iOS-type OAuth Client ID (native Google Sign-In SDK, not the web GSI client above)
const GOOGLE_IOS_CLIENT_ID = process.env.REACT_APP_GOOGLE_IOS_CLIENT_ID || '126112156480-k1jpteivubnofqlk32299fs7geh28nfg.apps.googleusercontent.com';
const IS_NATIVE = Capacitor.isNativePlatform();

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 384 512" aria-hidden="true" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76-19.7C63.3 141 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

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

  // Native iOS: initialize the native Google + Apple Sign-In SDKs instead of the web GSI script
  useEffect(() => {
    if (!IS_NATIVE) return;
    SocialLogin.initialize({
      google: { iOSClientId: GOOGLE_IOS_CLIENT_ID, mode: 'online' },
      apple: { clientId: 'com.priceguard.ai' },
    }).catch((err) => {
      console.error('[SocialLogin] Native init error:', err);
      setError('Sign-in failed to load. Please try email sign-in instead.');
    });
  }, []);

  const handleNativeGoogleSignIn = async () => {
    setError('');
    try {
      const res = await SocialLogin.login({ provider: 'google', options: {} });
      finishOAuth(parseNativeGoogleResult(res));
    } catch (err) {
      console.error('[Google] Native sign-in error:', err);
      setError('Google Sign-In failed. Please try again or use email.');
    }
  };

  const handleNativeAppleSignIn = async () => {
    setError('');
    try {
      const res = await SocialLogin.login({ provider: 'apple', options: { scopes: ['email', 'name'] } });
      finishOAuth(parseNativeAppleResult(res));
    } catch (err) {
      console.error('[Apple] Native sign-in error:', err);
      setError('Apple Sign-In failed. Please try again or use email.');
    }
  };

  // Load Google Identity Services and render official button (web only)
  useEffect(() => {
    if (IS_NATIVE) return;
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

            {/* Google Sign-In — native SDK button on iOS, official GSI-rendered button on web */}
            {IS_NATIVE ? (
              <button type="button" className="auth-btn auth-google" onClick={handleNativeGoogleSignIn} disabled={loading}>
                <GoogleLogo /> Continue with Google
              </button>
            ) : (
              <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }} />
            )}

            {/* Apple Sign-In — native SDK button, iOS only (required alongside Google per App Store guideline 4.8) */}
            {IS_NATIVE && (
              <button type="button" className="auth-btn auth-apple" onClick={handleNativeAppleSignIn} disabled={loading} style={{ marginTop: '10px' }}>
                <AppleLogo /> Continue with Apple
              </button>
            )}

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
