import React from 'react';

export default function BottomTabs({ tab, setTab }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'fetch',     label: 'Fetch Data', icon: '⬇' },
    { id: 'market',    label: 'Markets',    icon: '📈' },
    { id: 'chat',      label: 'AI Advisor', icon: '🤖' },
    { id: 'more',      label: 'More',       icon: '⚙️' },
  ];

  return (
    <div className="ios-tab-bar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`ios-tab-item ${tab === t.id ? 'active' : ''}`}
          onClick={() => setTab(t.id)}
        >
          <span className="ios-tab-icon">{t.icon}</span>
          <span className="ios-tab-label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
