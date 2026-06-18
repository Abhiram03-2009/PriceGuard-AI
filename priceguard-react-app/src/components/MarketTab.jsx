import React, { useMemo } from 'react';
import { Donut, HBar, VBar } from './Charts';

const currency = value => `$${Number(value || 0).toFixed(0)}`;

export default function MarketTab({ results }) {
  const market = useMemo(() => {
    if (!results) return null;

    const processed = results.processed || [];
    const arbEvents = results.arbEvents || [];
    const totalGap = arbEvents.reduce((s, d) => s + (d.arbitrage_margin || 0), 0);
    const avgFloor = processed.reduce((s, d) => s + (d.lowest_price || 0), 0) / (processed.length || 1);
    const avgAudit = processed.reduce((s, d) => s + (d.corrected_price || 0), 0) / (processed.length || 1);
    const avgListing = processed.reduce((s, d) => s + (Number(d.listing_count) || 0), 0) / (processed.length || 1);
    const volatility = Math.min(99, Math.max(8, (results.rmse / Math.max(avgAudit, 1)) * 100));

    const top = [...processed]
      .sort((a, b) => (b.arbitrage_margin || 0) - (a.arbitrage_margin || 0))
      .slice(0, 6)
      .map(item => {
        const base = String(item.title || 'MARKET').replace(/[^A-Za-z0-9 ]/g, '').trim();
        const symbol = base.split(/\s+/).slice(0, 2).map(w => w[0]).join('').padEnd(3, 'X').slice(0, 4).toUpperCase();
        const spread = Math.max(0, item.corrected_price - item.lowest_price);
        const change = item.lowest_price ? (spread / item.lowest_price) * 100 : 0;
        return { ...item, symbol, spread, change };
      });

    const sectors = ['Sports', 'Concert', 'Theater', 'Family'].map(type => {
      const rows = processed.filter(d => String(d.event_type || '').toLowerCase().includes(type.toLowerCase()));
      return {
        label: type,
        count: rows.length,
        risk: rows.length ? rows.filter(d => d.arbitrage === 1).length / rows.length * 100 : 0,
      };
    }).filter(s => s.count > 0);

    return { processed, arbEvents, totalGap, avgFloor, avgAudit, avgListing, volatility, top, sectors };
  }, [results]);

  if (!market) {
    return (
      <div className="fade empty-market">
        <div className="market-empty-glyph" />
        <div className="empty-title">No Market Data</div>
        <div className="empty-copy">Run the AI Audit on the Dashboard to generate market intelligence.</div>
      </div>
    );
  }

  const sourceCards = [
    { code: 'SG', name: 'SeatGeek', status: 'Connected', tone: 'green', detail: `${market.processed.length} event rows` },
    { code: 'TM', name: 'Ticketmaster', status: 'Ready', tone: 'blue', detail: 'CSV/API mapping enabled' },
    { code: 'YF', name: 'Yahoo Finance', status: 'Watchlist', tone: 'cyan', detail: 'Ticker view modeled' },
    { code: 'BX', name: 'Broker Index', status: 'Derived', tone: 'amber', detail: 'Liquidity proxy active' },
  ];

  const sectorLabels = market.sectors.length ? market.sectors.map(s => s.label) : ['Ticket Market'];
  const sectorRisk = market.sectors.length ? market.sectors.map(s => +s.risk.toFixed(1)) : [+(results.arbRate * 100).toFixed(1)];

  return (
    <div className="fade market-terminal">
      <section className="market-hero">
        <div>
          <div className="market-eyebrow">Live Ticket Market</div>
          <h2>Pricing Desk</h2>
          <p>Cross-source arbitrage, liquidity pressure, and fair-value movement from the current audit.</p>
        </div>
        <div className="market-hero-metrics">
          <span>F1 {(results.f1 * 100).toFixed(0)}%</span>
          <span>R2 {(results.r2 * 100).toFixed(0)}%</span>
          <span>{market.arbEvents.length} flags</span>
        </div>
      </section>

      <div className="ticker-strip" aria-label="Current ticket market tickers">
        {market.top.map(item => (
          <div key={item.event_id || item.symbol} className="ticker-tile">
            <div>
              <span className="ticker-symbol">{item.symbol}</span>
              <span className="ticker-name">{item.city || 'Market'}</span>
            </div>
            <strong>{currency(item.corrected_price)}</strong>
            <span className={item.change > 0 ? 'ticker-up' : 'ticker-flat'}>
              {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      <div className="market-kpi-grid">
        <div className="market-kpi">
          <span>Fair Value</span>
          <strong>{currency(market.avgAudit)}</strong>
          <small>Average audit price</small>
        </div>
        <div className="market-kpi">
          <span>Floor Basis</span>
          <strong>{currency(market.avgFloor)}</strong>
          <small>Listed floor mean</small>
        </div>
        <div className="market-kpi danger">
          <span>Spread Gap</span>
          <strong>{currency(market.totalGap)}</strong>
          <small>Recoverable leakage</small>
        </div>
        <div className="market-kpi">
          <span>Liquidity</span>
          <strong>{market.avgListing.toFixed(1)}x</strong>
          <small>Avg listing depth</small>
        </div>
      </div>

      <div className="source-grid">
        {sourceCards.map(src => (
          <div key={src.code} className="source-card">
            <div className={`source-icon ${src.tone}`}>{src.code}</div>
            <div>
              <strong>{src.name}</strong>
              <span>{src.status}</span>
              <small>{src.detail}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="ios-card market-panel">
        <div className="card-hd">
          <div className="card-title">Market Vulnerability Index</div>
          <span className="mono panel-meta">terminal view</span>
        </div>
        <div className="card-body market-gauge-row">
          <Donut value={results.arbRate * 100} color="#18a8ff" label="Exposure" />
          <Donut value={market.volatility} color="#00e5cc" label="Volatility" />
          <Donut value={results.f1 * 100} color="#00d68f" label="Confidence" />
        </div>
      </div>

      <div className="ios-card market-panel">
        <div className="card-hd">
          <div className="card-title">Sector Risk Heatmap</div>
          <span className="mono panel-meta">risk by category</span>
        </div>
        <div className="card-body">
          <HBar
            labels={sectorLabels}
            data={sectorRisk}
            colors={sectorRisk.map(v => v > 30 ? 'rgba(255,54,104,0.42)' : 'rgba(24,168,255,0.30)')}
            height={150}
          />
        </div>
      </div>

      <div className="ios-card market-panel">
        <div className="card-hd">
          <div className="card-title">Current Ticket Market</div>
          <span className="mono panel-meta">highest spreads</span>
        </div>
        <div className="market-table">
          {market.top.map(item => (
            <div key={item.event_id || item.symbol} className="market-row">
              <div>
                <strong>{item.symbol}</strong>
                <span>{item.title}</span>
              </div>
              <div className="market-row-prices">
                <span>{currency(item.lowest_price)}</span>
                <strong>{currency(item.corrected_price)}</strong>
                <em>+{currency(item.spread)}</em>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ios-card market-panel">
        <div className="card-hd">
          <div className="card-title">Spread Distribution</div>
          <span className="mono panel-meta">Fidelity-style bar view</span>
        </div>
        <div className="card-body">
          <VBar
            labels={results.margDist.map(b => b.label)}
            data={results.margDist.map(b => b.count)}
            color="rgba(24, 168, 255, 0.24)"
            bc="#18a8ff"
            height={170}
          />
        </div>
      </div>
    </div>
  );
}
