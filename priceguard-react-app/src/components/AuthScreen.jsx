import React, { useState } from 'react';
import logo from '../logo.png';

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('landing'); // landing | email
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmail = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const name = email.split('@')[0];
      onAuth({ name, email, provider: 'email' });
    }, 1200);
  };

  const handleGoogle = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onAuth({ name: 'Google User', email: 'user@gmail.com', provider: 'google' });
    }, 900);
  };

  const handleApple = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onAuth({ name: 'Apple User', email: 'user@icloud.com', provider: 'apple' });
    }, 900);
  };

  return (
    <div className="auth-screen">
      {/* Background */}
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
            <span className="auth-wm-main">PriceGuard</span>
            <span className="auth-wm-ai">AI</span>
          </div>
          <div className="auth-tagline">Market Protection Terminal</div>
        </div>

        {mode === 'landing' && (
          <div className="auth-actions fade">
            <div className="auth-divider-label">Sign in to continue</div>

            {/* Apple Sign In */}
            <button className="auth-btn auth-apple" onClick={handleApple} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              {loading ? 'Signing in…' : 'Continue with Apple'}
            </button>

            {/* Google Sign In */}
            <button className="auth-btn auth-google" onClick={handleGoogle} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Signing in…' : 'Continue with Google'}
            </button>

            <div className="auth-or">
              <span />
              <span className="auth-or-text">or</span>
              <span />
            </div>

            <button className="auth-btn auth-email" onClick={() => setMode('email')} disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Sign in with Email
            </button>

            <p className="auth-legal">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        )}

        {mode === 'email' && (
          <div className="auth-actions fade">
            <button className="auth-back" onClick={() => { setMode('landing'); setError(''); }}>
              ← Back
            </button>
            <div className="auth-divider-label">{isNew ? 'Create Account' : 'Sign In'}</div>

            <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="auth-field">
                <label className="auth-field-label">Email Address</label>
                <input
                  type="email"
                  className="fi auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-field-label">Password</label>
                <input
                  type="password"
                  className="fi auth-input"
                  placeholder={isNew ? 'Create a password (6+ chars)' : 'Your password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  autoComplete={isNew ? 'new-password' : 'current-password'}
                  required
                />
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
      </div>
    </div>
  );
}
