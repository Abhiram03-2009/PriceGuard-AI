import React from 'react';
import logo from '../logo.png';

const TABS = [
  ['dashboard', 'Dashboard'],
  ['fetch',     '⬇ Fetch Data'],
  ['analysis',  'Analysis'],
  ['market',    'Market Analysis'],
  ['events',    'Events'],
  ['insights',  'Insights'],
  ['model',     'Model'],
];

export default function Navbar({ tab, setTab, results, dataMode }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const isSecure = dataMode === 'enterprise';

  return (
    <nav className={`navbar ${isSecure ? 'secure' : ''}`}>
      <div className="nav-brand">
        <div className="nav-logo-wrap" style={isSecure ? { borderColor: 'var(--p)' } : {}}>
          <img src={logo} alt="PriceGuard" />
          <div className="nav-logo-spin" style={isSecure ? { background: 'conic-gradient(transparent 0deg, rgba(255, 54, 104, 0.35) 50deg, transparent 100deg)' } : {}} />
        </div>
        <div>
          <div className="brand-name" style={isSecure ? { textShadow: '0 0 18px rgba(255, 54, 104, 0.4)' } : {}}>
            PriceGuard<span className="brand-ai" style={isSecure ? { color: '#ff8ca8', textShadow: '0 0 22px rgba(255, 54, 104, 0.6)' } : {}}>AI</span>
          </div>
          <div className="brand-sub">{isSecure ? 'Enterprise Protection Portal' : 'Ticket Arbitrage Intelligence'}</div>
        </div>
      </div>

      <div className="nav-tabs">
        {TABS.map(([id, lbl]) => (
          <button
            key={id}
            className={`nav-tab ${tab === id ? 'act' : ''} ${id === 'fetch' ? 'nav-tab-fetch' : ''} ${isSecure ? 'secure' : ''}`}
            onClick={() => setTab(id)}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="live-badge" style={isSecure ? { color: 'var(--p)' } : {}}>
        <div className="live-dot" style={isSecure ? { background: 'var(--p)' } : {}} />
        {isSecure ? 'SECURE' : (results ? `LIVE · ${today}` : 'READY')}
      </div>
    </nav>
  );
}
