import React from 'react';
import logo from '../logo.png';

export default function Navbar({ onMenuClick, theme, toggleTheme, dataMode }) {
  const isSecure = dataMode === 'enterprise';

  return (
    <header className={`ios-header ${isSecure ? 'secure' : ''}`}>
      <button
        className="ios-header-action-btn"
        onClick={onMenuClick}
        aria-label="Open command center"
        id="btn-command-center"
      >
        <span className="nav-menu-glyph" aria-hidden="true" />
      </button>

      <div className="ios-header-brand">
        <img src={logo} alt="PriceGuard AI Logo" className="ios-header-logo" />
        <div className="ios-header-title wordmark nav-wordmark">
          <span className="nav-wm-price">Price</span><span className="nav-wm-guard">Guard</span>
          <span className="nav-wm-ai">&nbsp;AI</span>
        </div>
      </div>

      <button
        className="ios-header-action-btn"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        id="btn-theme-toggle"
      >
        <span className={`theme-glyph ${theme === 'dark' ? 'theme-light' : 'theme-dark'}`} aria-hidden="true" />
      </button>
    </header>
  );
}
