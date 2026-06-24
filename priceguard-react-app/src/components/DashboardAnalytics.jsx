import React, { useState } from 'react';
import { ForecastChart, HBar, VBar, Donut, Pie } from './Charts';
import { dlCSV } from '../engine';

const SI = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return null;
  return <span style={{ marginLeft: 4, fontSize: 8 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
};

export default function DashboardAnalytics({
  results, rfTrees, gbRounds, gbLearningRate, dynThresholdMin, dynThresholdPercent,
  search, setSearch, filterTier, setFilter, sortCol, sortDir, doSort,
  page, setPage, tableData, pageData, expanded, onToggle,
}) {
  const [activeChart, setActiveChart] = useState('forecast');
  const PER = 10;

  if (!results) return null;

  const totalLeakage = results.arbEvents.reduce((s, d) => s + d.arbitrage_margin, 0);
  const avgFloor = results.processed.length
    ? results.processed.reduce((s, d) => s + d.lowest_price, 0) / results.processed.length
    : 0;
  const avgCorrected = results.processed.length
    ? results.processed.reduce((s, d) => s + d.corrected_price, 0) / results.processed.length
    : 0;
  const highRisk = results.arbEvents.filter(e => e.arbitrage_tier === 'HIGH').length;
  const medRisk  = results.arbEvents.filter(e => e.arbitrage_tier === 'MEDIUM').length;
  const lowRisk  = results.arbEvents.filter(e => e.arbitrage_tier === 'LOW').length;

  const CHART_TABS = [
    { id: 'forecast',   label: 'Forecast' },
    { id: 'features',   label: 'Features' },
    { id: 'leakage',    label: 'Leakage' },
    { id: 'risk',       label: 'Risk Mix' },
    { id: 'cities',     label: 'Cities' },
    { id: 'pricedist',  label: 'Price Dist' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── SECTION HEADER ── */}
      <div className="ios-card" style={{ overflow: 'hidden' }}>
        <div
          className="card-hd"
          style={{ padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}
          onClick={onToggle}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="card-title" style={{ fontSize: '11px' }}>
              📊 Full Analytics &amp; Audit Log
            </div>
            <span style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)' }}>
              {expanded ? '▲ collapse' : '▼ expand'}
            </span>
          </div>
          <button
            type="button"
            className="dl-btn"
            style={{ padding: '3px 8px', fontSize: '9px' }}
            onClick={e => { e.stopPropagation(); dlCSV(results.processed, 'priceguard_full_audit.csv'); }}
          >
            ↓ Full CSV
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* ── EXTENDED METRICS ROW ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {[
              { lbl: 'Avg Floor Price',   val: `$${avgFloor.toFixed(0)}`,      cl: 'blue',  sub: 'Market floor mean' },
              { lbl: 'Avg Fair Value',    val: `$${avgCorrected.toFixed(0)}`,   cl: 'green', sub: 'AI-corrected price' },
              { lbl: 'Total Leakage',     val: `$${totalLeakage.toFixed(0)}`,   cl: 'pink',  sub: 'Recoverable margin' },
              { lbl: 'High Risk Events',  val: highRisk,                         cl: 'amber', sub: 'Risk score > 55' },
              { lbl: 'Precision',         val: `${(results.precision * 100).toFixed(1)}%`, cl: 'cyan', sub: 'Flag accuracy' },
              { lbl: 'Recall',            val: `${(results.recall * 100).toFixed(1)}%`,    cl: 'blue', sub: 'Coverage' },
            ].map((m, i) => (
              <div key={i} className="stat-card" style={{ padding: '8px 10px' }}>
                <div className="slbl" style={{ fontSize: '8px' }}>{m.lbl}</div>
                <div className={`sval ${m.cl}`} style={{ fontSize: '17px' }}>{m.val}</div>
                <div className="ssub" style={{ fontSize: '9px' }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* ── MODEL CONFIG CARD ── */}
          <div className="ios-card">
            <div className="card-hd" style={{ padding: '8px 12px' }}>
              <div className="card-title" style={{ fontSize: '11px' }}>Ensemble Model Config</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Donut value={results.f1 * 100} color="#18a8ff" label="F1" size={44} />
                <Donut value={results.r2 * 100} color="#00d68f" label="R²" size={44} />
                <Donut value={results.arbRate * 100} color="#ff3668" label="Exp." size={44} />
              </div>
            </div>
            <div className="card-body" style={{ padding: '10px' }}>
              <div className="code-block" style={{ fontSize: '10px', padding: '10px', lineHeight: '1.7' }}>
                <span className="co-b">RF Regressor</span> · {rfTrees} trees · 58% weight<br />
                <span className="co-p">Gradient Boost</span> · {gbRounds} rounds · LR {gbLearningRate.toFixed(2)} · 42% weight<br />
                <span className="co-a">Threshold</span> · ≥${dynThresholdMin} AND ≥{(dynThresholdPercent * 100).toFixed(0)}% of floor<br />
                <span className="co-g">MAE ${results.mae.toFixed(2)}</span> · <span className="co-c">RMSE ${results.rmse.toFixed(2)}</span> · <span className="co-b">R² {(results.r2 * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* ── CHART SELECTOR ── */}
          <div className="ios-card">
            <div className="card-hd" style={{ padding: '8px 12px' }}>
              <div className="card-title" style={{ fontSize: '11px' }}>Charts</div>
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {CHART_TABS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveChart(c.id)}
                    style={{
                      padding: '3px 9px', borderRadius: '6px', fontSize: '9px',
                      fontFamily: 'var(--fm)', whiteSpace: 'nowrap', cursor: 'pointer',
                      background: activeChart === c.id ? 'rgba(24,168,255,0.14)' : 'transparent',
                      border: activeChart === c.id ? '1px solid var(--b)' : '1px solid var(--b1)',
                      color: activeChart === c.id ? 'var(--b)' : 'var(--t3)',
                    }}
                  >{c.label}</button>
                ))}
              </div>
            </div>
            <div className="card-body" style={{ padding: '10px' }}>
              {activeChart === 'forecast' && (
                <ForecastChart series={results.forecastSeries} />
              )}
              {activeChart === 'features' && (
                <HBar
                  labels={results.importances.map(i => i.feature)}
                  data={results.importances.map(i => +(i.importance * 100).toFixed(1))}
                  colors={results.importances.map((_, i) => `hsla(200,80%,55%,${0.22 + i * 0.08})`)}
                  height={180}
                />
              )}
              {activeChart === 'leakage' && (
                <VBar
                  labels={results.margDist.map(b => b.label)}
                  data={results.margDist.map(b => b.count)}
                  color="rgba(255,54,104,0.25)"
                  bc="var(--p)"
                  height={170}
                />
              )}
              {activeChart === 'risk' && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                  <Pie
                    labels={['High Risk', 'Medium Risk', 'Low Risk', 'No Risk']}
                    data={[highRisk, medRisk, lowRisk, results.totalEvents - results.arbEvents.length]}
                    colors={['#ff3668', '#f5a623', '#18a8ff', 'rgba(24,168,255,0.12)']}
                    height={220}
                  />
                </div>
              )}
              {activeChart === 'cities' && results.topCities.length > 0 && (
                <HBar
                  labels={results.topCities.map(c => c.city || 'Unknown')}
                  data={results.topCities.map(c => c.arb)}
                  colors={results.topCities.map(c => c.arb > 3 ? 'rgba(255,54,104,0.4)' : 'rgba(24,168,255,0.3)')}
                  height={180}
                />
              )}
              {activeChart === 'pricedist' && (
                <VBar
                  labels={results.bins.map(b => `$${b.min}`)}
                  data={results.bins.map(b => b.count)}
                  color="rgba(24,168,255,0.24)"
                  bc="#18a8ff"
                  height={170}
                />
              )}
            </div>
          </div>

          {/* ── FULL AUDIT LOG TABLE ── */}
          <div className="ios-card">
            <div className="card-hd" style={{ padding: '8px 12px' }}>
              <div className="card-title" style={{ fontSize: '11px' }}>Audit Log — {results.processed.length} Records</div>
              <button
                type="button"
                className="dl-btn"
                style={{ padding: '3px 8px', fontSize: '9px' }}
                onClick={() => dlCSV(results.processed, 'priceguard_full_audit.csv')}
              >
                ↓ CSV
              </button>
            </div>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--b1)' }}>
              <div className="filter-bar" style={{ gap: '6px' }}>
                <input
                  className="fi"
                  placeholder="Search event or city..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  style={{ flex: 1, fontSize: '11px', padding: '4px 8px' }}
                />
                <select className="fi" value={filterTier} onChange={e => { setFilter(e.target.value); setPage(1); }} style={{ fontSize: '11px', padding: '4px 8px' }}>
                  <option value="ALL">All Events</option>
                  <option value="ARB">Flagged Only</option>
                  <option value="HIGH">High Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                </select>
              </div>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    {[['title','Event'],['city','City'],['lowest_price','Floor $'],['corrected_price','Fair $'],['arbitrage_margin','Gap'],['risk_score','Risk'],['arbitrage_tier','Tier']].map(([col, lbl]) => (
                      <th key={col} onClick={() => doSort(col)} style={{ fontSize: '9px', padding: '5px 8px', cursor: 'pointer' }}>
                        {lbl}<SI col={col} sortCol={sortCol} sortDir={sortDir} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((d, i) => (
                    <tr key={i} className={d.arbitrage === 1 ? 'arb' : ''}>
                      <td style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '10.5px', padding: '5px 8px' }} title={d.title}>{d.title}</td>
                      <td style={{ fontSize: '10.5px', padding: '5px 8px' }}>{d.city || '—'}</td>
                      <td className="mono blue" style={{ fontSize: '10.5px', padding: '5px 8px' }}>${(d.lowest_price || 0).toFixed(0)}</td>
                      <td style={{ fontSize: '10.5px', padding: '5px 8px' }}>
                        <span className="price-tag" style={d.arbitrage === 1 ? { background: 'rgba(255,54,104,0.1)', color: 'var(--p)', borderColor: 'rgba(255,54,104,0.3)' } : {}}>
                          ${(d.corrected_price || 0).toFixed(0)}
                        </span>
                      </td>
                      <td className={d.arbitrage_margin > 0 ? 'mono pink' : 'mono'} style={{ fontSize: '10.5px', padding: '5px 8px' }}>
                        {d.arbitrage_margin > 0 ? `+$${d.arbitrage_margin.toFixed(0)}` : '—'}
                      </td>
                      <td style={{ padding: '5px 8px' }}>
                        <div className="prog-wrap" style={{ height: 3, width: 40 }}>
                          <div className="prog" style={{ width: `${Math.min(100, d.risk_score || 0)}%`, background: (d.risk_score || 0) > 55 ? 'var(--p)' : (d.risk_score || 0) > 27 ? 'var(--a)' : 'var(--b)' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--fm)', fontSize: '8px', color: 'var(--t3)' }}>{(d.risk_score || 0).toFixed(0)}</span>
                      </td>
                      <td style={{ padding: '5px 8px' }}>
                        <span className={`badge ${d.arbitrage_tier === 'HIGH' ? 'b-high' : d.arbitrage_tier === 'MEDIUM' ? 'b-med' : 'b-safe'}`}>
                          {d.arbitrage_tier || 'LOW'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pag" style={{ padding: '6px 12px' }}>
              <span className="pg-info" style={{ fontSize: '9px' }}>
                {tableData.length} events · Page {page} of {Math.max(1, Math.ceil(tableData.length / PER))}
              </span>
              <button className="pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ width: 22, height: 22 }}>◀</button>
              <button className="pg-btn" disabled={page >= Math.ceil(tableData.length / PER)} onClick={() => setPage(p => p + 1)} style={{ width: 22, height: 22 }}>▶</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
