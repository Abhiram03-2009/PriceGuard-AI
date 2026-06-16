import React from 'react';
import logo from '../logo.png';

export default function Navbar({ onMenuClick, theme, toggleTheme, dataMode }) {
  const isSecure = dataMode === 'enterprise';

  return (
    <header className={`ios-header ${isSecure ? 'secure' : ''}`}>
      {/* Left Action: Hamburger Menu */}
      <button 
        className="ios-header-action-btn" 
        onClick={onMenuClick}
        aria-label="Open settings"
        id="btn-hamburger"
      >
        ☰
      </button>

      {/* Center Logo + Brand Title */}
      <div className="ios-header-brand">
        <img src={logo} alt="PriceGuard AI Logo" className="ios-header-logo" />
        <div className="ios-header-title">
          PriceGuard <span>AI</span>
        </div>
      </div>

      {/* Right Action: Light/Dark Mode Switch */}
      <button 
        className="ios-header-action-btn" 
        onClick={toggleTheme}
        aria-label="Toggle theme"
        id="btn-theme-toggle"
        style={{ fontSize: '16px' }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  );
}
