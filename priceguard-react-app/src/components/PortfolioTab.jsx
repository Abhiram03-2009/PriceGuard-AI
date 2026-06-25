import React, { useState, useMemo } from 'react';
import { VBar, Donut } from './Charts';

const PLATFORMS = [
  { id: 'seatgeek',     name: 'SeatGeek',     code: 'SG', color: '#00d68f', bg: 'rgba(0,214,143,0.09)' },
  { id: 'ticketmaster', name: 'Ticketmaster', code: 'TM', color: '#18a8ff', bg: 'rgba(24,168,255,0.09)' },
  { id: 'stubhub',      name: 'StubHub',      code: 'SH', color: '#f5a623', bg: 'rgba(245,166,35,0.09)' },
  { id: 'vivid',        name: 'Vivid Seats',  code: 'VS', color: '#00e5cc', bg: 'rgba(0,229,204,0.09)' },
  { id: 'axs',          name: 'AXS',          code: 'AX', color: '#8b5cf6', bg: 'rgba(139,92,246,0.09)' },
];

// Simulate a portfolio of ticket positions
const MOCK_POSITIONS = [
  { id: 1, event: 'NBA Finals Game 7', platform: 'seatgeek',     category: 'Sports',   qty: 2, costBasis: 380, currentValue: 510, status: 'held',   days: 4  },
  { id: 2, event: 'Taylor Swift Eras',  platform: 'ticketmaster', category: 'Concerts', qty: 1, costBasis: 200, currentValue: 520, status: 'held',   days: 18 },
  { id: 3, event: 'UFC 310',            platform: 'stubhub',      category: 'Sports',   qty: 2, costBasis: 290, currentValue: 275, status: 'held',   days: 8  },
  { id: 4, event: 'Drake OVO Fest',     platform: 'vivid',        category: 'Concerts', qty: 2, costBasis: 175, currentValue: 310, status: 'sold',   days: 0  },
  { id: 5, event: 'Super Bowl LX',      platform: 'axs',          category: 'Sports',   qty: 2, costBasis: 1800, currentValue: 3400, status: 'held', days: 35 },
  { id: 6, event: 'Beyoncé Renaissance', platform: 'seatgeek',   category: 'Concerts', qty: 1, costBasis: 310, currentValue: 290, status: 'held',   days: 22 },
];


export default function PortfolioTab({ results }) {
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  const positions = useMemo(() => {
    if (selectedPlatform === 'all') return MOCK_POSITIONS;
    return MOCK_POSITIONS.filter(p => p.platform === selectedPlatform);
  }, [selectedPlatform]);

  const totals = useMemo(() => {
    const cost  = positions.reduce((s, p) => s + p.costBasis * p.qty, 0);
    const value = positions.reduce((s, p) => s + p.currentValue * p.qty, 0);
    const pnl   = value - cost;
    const pnlPct = cost ? (pnl / cost) * 100 : 0;
    return { cost, value, pnl, pnlPct };
  }, [positions]);

  const monthlyPnl = [820, -310, 1420, 940, 2100, 1680];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  return (
    <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Header */}
      <div className="market-hero">
        <div>
          <div className="market-eyebrow">Arbitrage Portfolio</div>
          <h2 style={{ fontFamily: 'var(--fnav)', fontSize: '20px', color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 5px' }}>Portfolio Desk</h2>
          <p style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1.5, maxWidth: '240px' }}>Track positions across multiple ticket platforms with real-time P&L.</p>
        </div>
        <div className="market-hero-metrics">
          <span style={{ color: totals.pnl >= 0 ? 'var(--g)' : 'var(--p)' }}>
            {totals.pnl >= 0 ? '+' : ''}${totals.pnl.toFixed(0)}
          </span>
          <span>{positions.filter(p => p.status === 'held').length} Open</span>
          <span>{positions.filter(p => p.status === 'sold').length} Closed</span>
        </div>
      </div>

      {/* P&L Summary Cards */}
      <div className="market-kpi-grid">
        <div className="market-kpi">
          <span>Total Value</span>
          <strong style={{ color: 'var(--b)', fontSize: '20px', fontFamily: 'var(--fnav)' }}>${totals.value.toLocaleString()}</strong>
          <small>Portfolio market value</small>
        </div>
        <div className="market-kpi">
          <span>Cost Basis</span>
          <strong style={{ color: 'var(--t1)', fontSize: '20px', fontFamily: 'var(--fnav)' }}>${totals.cost.toLocaleString()}</strong>
          <small>Total invested capital</small>
        </div>
        <div className={`market-kpi ${totals.pnl < 0 ? 'danger' : ''}`}>
          <span>Net P&L</span>
          <strong style={{ color: totals.pnl >= 0 ? 'var(--g)' : 'var(--p)', fontSize: '20px', fontFamily: 'var(--fnav)' }}>
            {totals.pnl >= 0 ? '+' : ''}${totals.pnl.toLocaleString()}
          </strong>
          <small>Unrealized gain/loss</small>
        </div>
        <div className="market-kpi">
          <span>Return</span>
          <strong style={{ color: totals.pnlPct >= 0 ? 'var(--g)' : 'var(--p)', fontSize: '20px', fontFamily: 'var(--fnav)' }}>
            {totals.pnlPct >= 0 ? '+' : ''}{totals.pnlPct.toFixed(1)}%
          </strong>
          <small>Overall performance</small>
        </div>
      </div>

      {/* Platform Filter */}
      <div className="ios-card" style={{ padding: '10px 12px' }}>
        <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Filter by Platform</div>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button
            onClick={() => setSelectedPlatform('all')}
            style={{
              padding: '5px 12px', borderRadius: '6px', fontSize: '10px', fontFamily: 'var(--fm)',
              cursor: 'pointer', border: selectedPlatform === 'all' ? '1px solid var(--b)' : '1px solid var(--b1)',
              background: selectedPlatform === 'all' ? 'rgba(24,168,255,0.12)' : 'transparent',
              color: selectedPlatform === 'all' ? 'var(--b)' : 'var(--t3)', whiteSpace: 'nowrap',
            }}
          >All Platforms</button>
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlatform(p.id)}
              style={{
                padding: '5px 10px', borderRadius: '6px', fontSize: '10px', fontFamily: 'var(--fm)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                border: selectedPlatform === p.id ? `1px solid ${p.color}` : '1px solid var(--b1)',
                background: selectedPlatform === p.id ? p.bg : 'transparent',
                color: selectedPlatform === p.id ? p.color : 'var(--t3)', whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontFamily: 'var(--fnav)', fontSize: '9px', fontWeight: '900' }}>{p.code}</span>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Positions Table */}
      <div className="ios-card market-panel">
        <div className="card-hd" style={{ padding: '8px 12px' }}>
          <div className="card-title" style={{ fontSize: '11px' }}>Open Positions</div>
          <span className="mono" style={{ fontSize: '8px', color: 'var(--t3)' }}>{positions.filter(p => p.status === 'held').length} active</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {positions.map(pos => {
            const platform = PLATFORMS.find(p => p.id === pos.platform);
            const totalCost = pos.costBasis * pos.qty;
            const totalValue = pos.currentValue * pos.qty;
            const pnl = totalValue - totalCost;
            const pnlPct = totalCost ? (pnl / totalCost) * 100 : 0;
            const isUp = pnl >= 0;
            return (
              <div key={pos.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto',
                gap: '8px', padding: '10px 12px',
                borderBottom: '1px solid rgba(24,168,255,0.07)',
                opacity: pos.status === 'sold' ? 0.6 : 1,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{
                      fontFamily: 'var(--fnav)', fontSize: '9px', fontWeight: '900',
                      color: platform?.color, background: platform?.bg,
                      border: `1px solid ${platform?.color}33`, padding: '1px 5px', borderRadius: '4px',
                    }}>{platform?.code}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t1)' }}>{pos.event}</span>
                    {pos.status === 'sold' && (
                      <span style={{ fontFamily: 'var(--fm)', fontSize: '8px', color: 'var(--t3)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px' }}>CLOSED</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)' }}>
                    <span>Qty: {pos.qty}</span>
                    <span>Basis: ${pos.costBasis}</span>
                    <span>Current: ${pos.currentValue}</span>
                    {pos.status === 'held' && pos.days > 0 && <span>{pos.days}d to event</span>}
                    <span style={{
                      padding: '1px 5px', borderRadius: '3px',
                      background: 'rgba(24,168,255,0.06)', color: 'var(--b)',
                    }}>{pos.category}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--fnav)', fontSize: '14px', color: isUp ? 'var(--g)' : 'var(--p)', fontWeight: '700' }}>
                    {isUp ? '+' : ''}${pnl.toFixed(0)}
                  </div>
                  <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: isUp ? 'var(--g)' : 'var(--p)' }}>
                    {isUp ? '+' : ''}{pnlPct.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gauges Row */}
      <div className="ios-card market-panel">
        <div className="card-hd" style={{ padding: '8px 12px' }}>
          <div className="card-title" style={{ fontSize: '11px' }}>Portfolio Health</div>
          <span className="mono" style={{ fontSize: '8px', color: 'var(--t3)' }}>risk metrics</span>
        </div>
        <div className="card-body" style={{ padding: '10px', display: 'flex', justifyContent: 'space-around', gap: '10px' }}>
          <Donut value={Math.min(99, Math.max(10, (totals.pnlPct + 10) * 3))} color="#00d68f" label="Health" size={72} />
          <Donut value={65} color="#18a8ff" label="Diversify" size={72} />
          <Donut value={82} color="#f5a623" label="Liquidity" size={72} />
        </div>
      </div>

      {/* Monthly P&L Bar */}
      <div className="ios-card market-panel">
        <div className="card-hd" style={{ padding: '8px 12px' }}>
          <div className="card-title" style={{ fontSize: '11px' }}>Monthly P&amp;L</div>
          <span className="mono" style={{ fontSize: '8px', color: 'var(--t3)' }}>2026 YTD</span>
        </div>
        <div className="card-body" style={{ padding: '10px' }}>
          <VBar
            labels={monthLabels}
            data={monthlyPnl}
            color={monthlyPnl.map(v => v >= 0 ? 'rgba(0,214,143,0.28)' : 'rgba(255,54,104,0.28)')}
            bc={monthlyPnl.map(v => v >= 0 ? '#00d68f' : '#ff3668')}
            height={150}
          />
        </div>
      </div>

      {/* Platform Source Cards */}
      <div className="ios-card market-panel">
        <div className="card-hd" style={{ padding: '8px 12px' }}>
          <div className="card-title" style={{ fontSize: '11px' }}>Platform Integrations</div>
        </div>
        <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {PLATFORMS.map(p => {
            const isLive = p.id === 'seatgeek' || p.id === 'ticketmaster';
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '9px',
                border: `1px solid ${isLive ? p.color + '44' : 'var(--b1)'}`,
                borderRadius: '8px', background: isLive ? p.bg : 'rgba(255,255,255,0.01)',
                opacity: isLive ? 1 : 0.5,
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--fnav)', fontSize: '11px', fontWeight: '900',
                  color: p.color, background: p.bg, border: `1px solid ${p.color}33`,
                  flexShrink: 0,
                }}>{p.code}</div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t1)' }}>{p.name}</div>
                  {isLive
                    ? <div style={{ fontFamily: 'var(--fm)', fontSize: '8px', color: 'var(--g)' }}>● Connected</div>
                    : <div style={{ fontFamily: 'var(--fm)', fontSize: '8px', color: 'var(--a)' }}>○ Coming Soon</div>
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Integration note */}
      {!results && (
        <div className="insight warn" style={{ margin: 0, fontSize: '11px' }}>
          <div className="insight-lbl warn">AI Pricing Inactive</div>
          Run an AI Audit on the Dashboard to sync live arbitrage signals with your portfolio positions.
        </div>
      )}

      {results && (
        <div className="insight gn" style={{ margin: 0, fontSize: '11px' }}>
          <div className="insight-lbl gn">AI Sync Active</div>
          Portfolio positions are cross-referenced with the current AI audit. {results.arbEvents.length} opportunities detected — consider reallocating capital toward high-margin positions.
        </div>
      )}
    </div>
  );
}
