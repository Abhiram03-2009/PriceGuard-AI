import React from 'react';
import logo from '../logo.png';

const TABS = [
  ['dashboard', 'Dashboard'],
  ['fetch',     '⬇ Fetch Data'],
  ['analysis',  'Analysis'],
  ['events',    'Events'],
  ['insights',  'Insights'],
  ['model',     'Model'],
];

export default function Navbar({ tab, setTab, results }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <div className="nav-logo-wrap">
          <img src={logo} alt="PriceGuard" />
          <div className="nav-logo-spin" />
        </div>
        <div>
          <div className="brand-name">PriceGuard<span className="brand-ai">AI</span></div>
          <div className="brand-sub">Ticket Arbitrage Intelligence</div>
        </div>
      </div>

      <div className="nav-tabs">
        {TABS.map(([id, lbl]) => (
          <button
            key={id}
            className={`nav-tab ${tab === id ? 'act' : ''} ${id === 'fetch' ? 'nav-tab-fetch' : ''}`}
            onClick={() => setTab(id)}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="live-badge">
        <div className="live-dot" />
        {results ? `LIVE · ${today}` : 'READY'}
      </div>
    </nav>
  );
}
