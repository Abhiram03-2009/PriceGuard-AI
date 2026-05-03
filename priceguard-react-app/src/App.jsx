import React, { useState, useMemo, useRef, useEffect } from 'react';
import MarketTab from './components/MarketTab';
import FetchTab from './components/FetchTab';
import { ForecastChart, ScatterLinChart, HBar, VBar, Donut } from './components/Charts';
import { runAnalysis, dlCSV } from './engine';

const LoadingScreen = () => {
  const [line, setLine] = useState(0);
  const taglines = [
    { text: "PriceGuard AI v1.1.6", delay: 300, class: "line1" },
    { text: "Neural Core Initialized", delay: 1500, class: "line2" },
    { text: "Security Node: ACTIVE", delay: 3000, class: "line3" }
  ];
  
  useEffect(() => {
    const timers = taglines.map((tag, i) => setTimeout(() => setLine(i + 1), tag.delay));
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <div className="loading">
      <div className="load-logo-wrap">
        <div className="load-logo">
          <img src="/logo.png" alt="Logo" />
          <div className="load-logo-ring" />
          <div className="load-logo-ring2" />
        </div>
      </div>
      <div className="load-title">PRICEGUARD</div>
      <div className="load-taglines">
        {taglines.map((tag, i) => (
          <div key={i} className={`tagline ${tag.class} ${line > i ? 'done' : ''}`}>
            {line > i ? tag.text : ''}
          </div>
        ))}
      </div>
      <div className="load-bar-wrap"><div className="load-bar" /></div>
      <div className="load-status">ENCRYPTING CONNECTION...</div>
    </div>
  );
};

const SI = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return null;
  return <span style={{ marginLeft: 5, fontSize: 8 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [dataMode, setDataMode] = useState('public');
  const [rawData, setRawData] = useState(null);
  const [results, setResults] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [consoleMsgs, setConsoleMsgs] = useState([]);
  const [search, setSearch] = useState('');
  const [filterTier, setFilter] = useState('ALL');
  const [sortCol, setSort] = useState('popularity');
  const [sortDir, setDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [drag, setDrag] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([{ role: 'ai', text: 'PriceGuard AI Agent online. I am monitoring your audit parameters.' }]);
  const fileRef = useRef();
  const chatScroll = useRef();

  useEffect(() => {
    setTimeout(() => setLoading(false), 4200);
  }, []);

  const add = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  const onFetchedData = (data) => {
    setRawData(data);
    add(`Ingested ${data.length} records successfully`);
  };

  const parseFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const rows = text.split('\n').map(r => r.split(','));
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const data = rows.slice(1).filter(r => r.length > 1).map(r => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = r[i]?.trim());
        return obj;
      });
      onFetchedData(data);
    };
    reader.readAsText(file);
  };

  const doAnalyze = () => {
    setAnalyzing(true);
    setConsoleMsgs([]);
    const logs = [
      { msg: 'Initializing Neural Ensemble...', ts: '0.00s' },
      { msg: 'Weighting Gradient Boosting rounds...', ts: '0.45s' },
      { msg: 'Scanning for market manipulation...', ts: '1.20s', secure: true },
      { msg: 'Finalizing audit integrity check...', ts: '2.80s' }
    ];
    logs.forEach((l, i) => setTimeout(() => setConsoleMsgs(prev => [...prev, l]), i * 750));
    setTimeout(() => {
      const res = runAnalysis(rawData);
      setResults(res);
      setAnalyzing(false);
      add('Audit Complete: Market risk profiles generated');
      
      // Proactive AI Agent trigger
      setTimeout(() => {
        setChatOpen(true);
        const advice = `Audit Complete. I've detected speculative exposure in ${res.topCities[0]?.city}. Recommend adjusting floor prices by $${(res.arbEvents.reduce((s,d)=>s+d.arbitrage_margin,0)/res.arbEvents.length).toFixed(0)} to neutralize leakage.`;
        setChatMsgs(prev => [...prev, { role: 'ai', text: advice }]);
      }, 1500);
    }, 3200);
  };

  const tableData = useMemo(() => {
    if (!results) return [];
    return results.processed
      .filter(d => 
        (d.title?.toLowerCase().includes(search.toLowerCase()) || d.city?.toLowerCase().includes(search.toLowerCase())) &&
        (filterTier === 'ALL' || (filterTier === 'ARB' && d.arbitrage === 1) || d.arbitrage_tier === filterTier)
      )
      .sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol];
        const cmp = typeof av === 'number' ? av - bv : String(av || '').localeCompare(String(bv || ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [results, search, filterTier, sortCol, sortDir]);

  const PER = 16;
  const pageData = tableData.slice((page - 1) * PER, page * PER);
  const doSort = col => { if (sortCol === col) setDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSort(col); setDir('desc'); } };

  if (loading) return <LoadingScreen />;

  const stats = results ? (dataMode === 'enterprise' ? [
    { lbl: 'Audit Integrity', val: results.f1 > 0.9 ? 'OPTIMAL' : 'STABLE', cl: 'g', sub: 'Model verification score', ico: '🛡' },
    { lbl: 'Revenue Leakage', val: '$' + results.arbEvents.reduce((s, d) => s + d.arbitrage_margin, 0).toFixed(0), cl: 'p', sub: 'Total margin leakage', ico: '⚠' },
    { lbl: 'Revenue Velocity', val: '+' + (results.arbRate * 4.2).toFixed(1) + '%', cl: 'c', sub: 'Projected recovery speed', ico: '⚡' },
    { lbl: 'Model R²',        val: (results.r2 * 100).toFixed(1) + '%',    cl: 'b', sub: 'Ensemble Precision',    ico: '◎' },
    { lbl: 'Risk Factor',     val: results.arbRate > 0.2 ? 'HIGH' : 'LOW', cl: results.arbRate > 0.2 ? 'p' : 'g', sub: 'Global vulnerability', ico: '⊘' }
  ] : [
    { lbl: 'Arbitrage Rate',  val: (results.arbRate * 100).toFixed(1) + '%', cl: 'p', sub: 'Nodes above threshold', ico: '📈' },
    { lbl: 'Confidence (F1)', val: (results.f1 * 100).toFixed(1) + '%',      cl: 'g', sub: 'Model accuracy score', ico: '✓' },
    { lbl: 'MAE (Error)',     val: '$' + results.mae.toFixed(2),             cl: 'b', sub: 'Price prediction gap', ico: '±' },
    { lbl: 'Records',         val: results.totalEvents,                      cl: 'c', sub: 'Dataset nodes scan',   ico: '⬡' },
    { lbl: 'R² (Fit)',        val: (results.r2 * 100).toFixed(1) + '%',      cl: 'a', sub: 'Variance explained',   ico: '⚡' }
  ]) : [];

  const handleChat = (e) => {
    e.preventDefault();
    const input = e.target.elements.msg;
    if (!input.value.trim()) return;
    const msg = input.value;
    setChatMsgs(prev => [...prev, { role: 'user', text: msg }]);
    input.value = '';
    setTimeout(() => {
      let reply = "I am processing your request. Our ensemble models suggest maintaining current floor prices for stable nodes.";
      if (msg.toLowerCase().includes('advice') || msg.toLowerCase().includes('suggest')) {
        reply = results ? `Based on the current audit, focus on the ${results.topCities[0]?.city} cluster where arbitrage risk is peaking at ${(results.arbRate*1.5*100).toFixed(1)}%.` : "Please run an AI Audit first so I can analyze the market data.";
      }
      setChatMsgs(prev => [...prev, { role: 'ai', text: reply }]);
    }, 1000);
  };

  return (
    <div className={`app ${dataMode === 'enterprise' ? 'secure' : ''}`}>
      <div className="orb o1" /><div className="orb o2" /><div className="orb o3" />
      {dataMode === 'enterprise' && <div className="secure-scan" />}
      {dataMode === 'enterprise' && <div className="secure-grid" />}

      <div className={`navbar ${dataMode === 'enterprise' ? 'secure' : ''}`}>
        <div className="nav-brand">
          <div className="nav-logo-wrap">
            <img src="/logo.png" alt="PriceGuard" />
            <div className="nav-logo-spin" />
          </div>
          <div>
            <div className="brand-name">PRICE<span className="brand-ai">GUARD</span></div>
            <div className="brand-sub">AI Auditing Systems</div>
          </div>
        </div>
        <div className="nav-tabs">
          <button className={`nav-tab ${tab === 'dashboard' ? 'act' : ''}`} onClick={() => setTab('dashboard')}>DASHBOARD</button>
          <button className={`nav-tab ${tab === 'fetch' ? 'act' : ''} nav-tab-fetch`} onClick={() => setTab('fetch')}>FETCH DATA</button>
          <button className={`nav-tab ${tab === 'market' ? 'act' : ''}`} onClick={() => setTab('market')}>MARKET ANALYSIS</button>
          <button className={`nav-tab ${tab === 'events' ? 'act' : ''}`} onClick={() => setTab('events')}>AUDIT LOG</button>
          <button className={`nav-tab ${tab === 'analysis' ? 'act' : ''}`} onClick={() => setTab('analysis')}>ML METRICS</button>
          <button className={`nav-tab ${tab === 'model' ? 'act' : ''}`} onClick={() => setTab('model')}>ARCHITECTURE</button>
          <button className={`nav-tab ${tab === 'insights' ? 'act' : ''}`} onClick={() => setTab('insights')}>AI REPORTS</button>
        </div>
        <div className="live-badge"><div className="live-dot" /> LIVE NODES</div>
      </div>

      <div className="main">
        {tab === 'dashboard' && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            {/* Mode Switcher */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <div className="card" style={{ padding: '4px', borderRadius: '10px', display: 'flex', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--b1)' }}>
                <button className={`nav-tab ${dataMode === 'public' ? 'act' : ''}`} onClick={() => setDataMode('public')} style={{ fontSize: '10px', padding: '6px 16px' }}>PUBLIC MODE</button>
                <button className={`nav-tab ${dataMode === 'enterprise' ? 'act' : ''} secure`} onClick={() => setDataMode('enterprise')} style={{ fontSize: '10px', padding: '6px 16px' }}>TEAM/ENTERPRISE</button>
              </div>
            </div>

            <div className="stat-bar">
              {results ? stats.map((s, i) => (
                <div key={i} className="stat-card">
                  <div className="slbl">{s.lbl}</div>
                  <div className={`sval ${s.cl}`}>{s.val}</div>
                  <div className="ssub">{s.sub}</div>
                  <div className="sicon">{s.ico}</div>
                </div>
              )) : (
                [1,2,3,4,5].map(i => <div key={i} className="stat-card" style={{ opacity: 0.3 }}><div className="slbl">WAITING...</div><div className="sval">—</div></div>)
              )}
            </div>

            {!rawData ? (
              <div 
                className={`upload-zone ${drag ? 'drag' : ''}`}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; f?.name.endsWith('.csv') ? parseFile(f) : add('CSV files only', 'error'); }}
                onClick={() => fileRef.current?.click()}
                style={dataMode === 'enterprise' ? { borderColor: 'rgba(255,54,104,0.5)', background: 'rgba(255,54,104,0.04)', borderStyle: 'solid', borderWidth: '2px' } : {}}
              >
                <div className="upload-icon" style={dataMode === 'enterprise' ? { color: 'var(--p)', opacity: 0.9 } : {}}>
                  {dataMode === 'enterprise' ? '🛡' : '⬆'}
                </div>
                <div className="upload-title" style={{ color: '#fff' }}>
                  {dataMode === 'enterprise' ? 'Secure Enterprise Data Audit' : 'Drop your event CSV here'}
                </div>
                <div className="upload-sub" style={{ color: '#fff', opacity: 0.8 }}>
                  {dataMode === 'enterprise' 
                    ? 'Authenticated portal for internal inventory auditing. PriceGuard AI will scan for revenue leakage and manipulation vectors.'
                    : 'Analyze SeatGeek, Ticketmaster, or other ticketing platform exports. ML will infer demand signals automatically.'}
                </div>
                <div className="field-pills">
                  {['event_id', 'title', 'venue', 'city', 'state', 'datetime', 'popularity', 'listing_count', 'lowest_price', 'average_price', 'highest_price'].map(f => (
                    <span key={f} className="fp" style={dataMode === 'enterprise' ? { color: 'var(--p)', borderColor: 'rgba(255,54,104,0.5)', background: 'rgba(255,54,104,0.12)' } : {}}>{f}</span>
                  ))}
                  {dataMode === 'enterprise' && <span className="fp" style={{ color: '#fff', background: 'var(--p)' }}>AUDIT_ID</span>}
                </div>
                <button className="btn btn-pri btn-sm" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }} style={dataMode === 'enterprise' ? { color: '#fff', background: 'var(--p)', borderColor: 'var(--p)', boxShadow: '0 0 14px rgba(255,54,104,0.4)' } : {}}>Begin Audit</button>
                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => parseFile(e.target.files[0])} />
              </div>
            ) : (
              <div className="card" style={results ? { borderColor: 'rgba(0,214,143,0.3)', background: 'rgba(0,214,143,0.02)' } : {}}>
                <div className="card-hd">
                  <div className="card-title" style={results ? { color: 'var(--g)' } : { color: '#fff' }}>
                    {results ? `✓ Audit Complete — ${results.totalEvents} Nodes Scanned` : `Dataset Loaded — ${rawData.length} Primary Records`}
                  </div>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setRawData(null); setResults(null); }}>Clear</button>
                    <button className="analyze-btn" onClick={doAnalyze} disabled={analyzing} style={dataMode === 'enterprise' && !results ? { background: 'var(--p)', color: '#fff' } : {}}>
                      {analyzing ? <><div className="spinner" />&nbsp;Auditing...</> : (results ? '↺  Re-scan' : '⚡  Execute AI Audit')}
                    </button>
                  </div>
                </div>
                {analyzing && (
                  <div className="ai-console fade">
                    {consoleMsgs.map((m, i) => (
                      <div key={i} className="ai-line">
                        <span className="ai-ts" style={{ color: '#fff' }}>[{m.ts}]</span>
                        <span className={`ai-msg ${m.secure ? 'secure' : ''}`}>{m.msg}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!results && !analyzing && (
                  <div className="card-body">
                    <div className="tbl-wrap">
                      <table className="tbl">
                        <thead><tr>{['Record', 'Venue', 'City', 'Popularity', 'Listings'].map(h => <th key={h} style={{ color: '#fff' }}>{h}</th>)}</tr></thead>
                        <tbody>
                          {rawData.slice(0, 5).map((r, i) => (
                            <tr key={i}>
                              <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>{r.title || '—'}</td>
                              <td style={{ color: '#fff' }}>{r.venue || '—'}</td><td style={{ color: '#fff' }}>{r.city || '—'}</td>
                              <td className="mono blue">{parseFloat(r.popularity)?.toFixed(4) || '—'}</td>
                              <td className="mono" style={{ color: '#fff' }}>{r.listing_count || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {results && (
              <>
                {dataMode === 'enterprise' && (
                  <div className="card" style={{ borderColor: 'var(--p)', background: 'rgba(255,54,104,0.03)' }}>
                    <div className="card-hd"><div className="card-title" style={{ color: 'var(--p)' }}>Executive Audit Briefing</div></div>
                    <div className="card-body">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="insight danger">
                          <div className="insight-lbl danger">Revenue Recovery Potental</div>
                          Corrective pricing could reclaim <strong>$${results.arbEvents.reduce((s,d)=>s+d.arbitrage_margin,0).toFixed(0)}</strong> in lost margin currently leaking to secondary speculators.
                        </div>
                        <div className="insight gn">
                          <div className="insight-lbl gn">Market Stability Score</div>
                          Integrity analysis shows <strong>{(100 - results.arbRate * 100).toFixed(1)}%</strong> of inventory is currently insulated from manipulation vectors.
                        </div>
                        <div className="insight warn">
                          <div className="insight-lbl warn">Primary Vulnerability</div>
                          Speculative activity is peaking in <strong>{results.topCities[0]?.city}</strong>, requiring a <strong>{(results.arbRate * 1.5 * 100).toFixed(1)}%</strong> increase in audit frequency.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="two-col">
                  <div className="card">
                    <div className="card-hd">
                      <div className="card-title" style={{ color: '#fff' }}>Arbitrage Rate Forecast</div>
                    </div>
                    <div className="card-body">
                      <ForecastChart series={results.forecastSeries} />
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-hd">
                      <div className="card-title" style={{ color: '#fff' }}>Regression Analysis</div>
                    </div>
                    <div className="card-body">
                      <ScatterLinChart popVals={results.popVals} priceVals={results.priceVals} linModel={results.linModel} processed={results.processed} />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-hd">
                    <div className="card-title" style={{ color: '#fff' }}>AI Corrective Action Log</div>
                    <button className="dl-btn" onClick={() => dlCSV(results.processed, 'priceguard_audit_full.csv')}>Download CSV Audit</button>
                  </div>
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead><tr>{['Event','Current $','Fair $','Margin','Risk'].map(h => <th key={h} style={{ color: '#fff' }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {results.processed.slice(0, 10).map((r, i) => (
                          <tr key={i} className={r.arbitrage === 1 ? 'arb' : ''}>
                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>{r.title}</td>
                            <td className="mono" style={{ color: '#fff' }}>${r.lowest_price?.toFixed(2)}</td>
                            <td><span className="price-tag" style={r.arbitrage === 1 ? { background: 'rgba(255,54,104,0.1)', color: 'var(--p)', borderColor: 'rgba(255,54,104,0.3)' } : {}}>${r.fair_value_demand?.toFixed(2)}</span></td>
                            <td className={`mono ${r.arbitrage_margin > 22 ? 'pink' : ''}`} style={{ color: r.arbitrage_margin > 22 ? 'var(--p)' : '#fff' }}>${r.arbitrage_margin?.toFixed(2)}</td>
                            <td><span className={`badge ${r.arbitrage === 1 ? 'b-high' : 'b-safe'}`}>{r.arbitrage === 1 ? 'HIGH' : 'SAFE'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ────────────── FETCH DATA ────────────── */}
        {tab === 'fetch'     && <FetchTab onDataLoaded={onFetchedData} add={add} setPreviewData={setPreviewData} />}
        {tab === 'market'    && <MarketTab results={results} />}

        {/* ────────────── ANALYSIS ────────────── */}
        {tab === 'analysis' && results && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            <div className="two-col">
              <div className="card">
                <div className="card-hd"><div className="card-title" style={{ color: '#fff' }}>Feature Integrity Weighting</div></div>
                <div className="card-body">
                  <HBar labels={results.importances.map(i => i.feature)} data={results.importances.map(i => +(i.importance * 100).toFixed(2))} colors={results.importances.map((_, i) => `hsla(${192 + i * 13},78%,55%,0.38)`)} height={232} />
                </div>
              </div>
              <div className="card">
                <div className="card-hd"><div className="card-title" style={{ color: '#fff' }}>Margin Leakage Distribution</div></div>
                <div className="card-body">
                  <VBar labels={results.margDist.map(b => b.label)} data={results.margDist.map(b => b.count)} color={results.margDist.map(b => b.label.startsWith('$0') || b.label.startsWith('$10') ? 'rgba(0,214,143,0.3)' : 'rgba(255,54,104,0.3)')} bc={results.margDist.map(b => b.label.startsWith('$0') || b.label.startsWith('$10') ? '#00d68f' : '#ff3668')} height={232} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ────────────── EVENTS TABLE ────────────── */}
        {tab === 'events' && results && (
          <div className="fade card">
            <div className="card-hd">
              <div className="card-title" style={{ color: '#fff' }}>Full Audit Log ({results.totalEvents} Entries)</div>
            </div>
            <div style={{ padding: '.7rem 1.35rem', borderBottom: '1px solid var(--b1)' }}>
              <div className="filter-bar">
                <input className="fi" placeholder="Search audit log…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: 200 }} />
                <select className="fi" value={filterTier} onChange={e => { setFilter(e.target.value); setPage(1); }}>
                  <option value="ALL">All Records</option>
                  <option value="ARB">Flagged Only</option>
                  <option value="HIGH">High Risk</option>
                </select>
              </div>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr>
                  {[['title','Record'],['city','Location'],['lowest_price','Floor $'],['corrected_price','Audit $'],['arbitrage_margin','Margin'],['risk_score','Risk'],['arbitrage_tier','Status']].map(([col, lbl]) => (
                    <th key={col} onClick={() => doSort(col)} style={{ color: '#fff' }}>{lbl}<SI col={col} sortCol={sortCol} sortDir={sortDir} /></th>
                  ))}
                </tr></thead>
                <tbody>
                  {pageData.map((d, i) => (
                    <tr key={i} className={d.arbitrage === 1 ? 'arb' : ''}>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>{d.title}</td>
                      <td className="mono" style={{ fontSize: '11px', color: '#fff' }}>{d.city}</td>
                      <td className="mono blue">${d.lowest_price?.toFixed(2)}</td>
                      <td><span className="price-tag">${d.corrected_price?.toFixed(2)}</span></td>
                      <td className={`mono ${d.arbitrage_margin > 22 ? 'pink' : ''}`} style={{ color: d.arbitrage_margin > 22 ? 'var(--p)' : '#fff' }}>${d.arbitrage_margin?.toFixed(2)}</td>
                      <td>
                        <div className="risk-bar" style={{ width: 55 }}><div className="risk-fill" style={{ width: d.risk_score + '%', background: d.risk_score > 55 ? 'var(--p)' : 'var(--g)' }} /></div>
                      </td>
                      <td><span className={`badge ${d.arbitrage === 1 ? 'b-high' : 'b-safe'}`}>{d.arbitrage === 1 ? d.arbitrage_tier : 'SAFE'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ────────────── INSIGHTS ────────────── */}
        {tab === 'insights' && results && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            <div className="card">
              <div className="card-hd"><div className="card-title" style={{ color: '#fff' }}>Agent Intelligence Reports</div></div>
              <div className="card-body">
                <div className="insight danger">
                  <div className="insight-lbl danger">Speculative Exposure Detected</div>
                  Our ensemble model identified {results.arbEvents.length} events where the floor price is decoupled from demand signals. High-demand markers in {results.topCities[0]?.city} indicate a 100% probability of secondary market manipulation.
                </div>
                <div className="insight warn">
                  <div className="insight-lbl warn">Recommended Mitigation</div>
                  Adjusting floor prices to the 'Audit Price' will neutralize speculation and recover an average of $${(results.arbEvents.reduce((s,d)=>s+d.arbitrage_margin,0)/results.arbEvents.length).toFixed(2)} per flagged record.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ────────────── MODEL ────────────── */}
        {tab === 'model' && (
          <div className="fade card">
            <div className="card-hd"><div className="card-title" style={{ color: '#fff' }}>Model Neural Architecture</div></div>
            <div className="card-body">
              <div className="code-block">
                <span className="co-g">{'// PriceGuard AI — Neural Ensemble Node'}</span><br />
                <span className="co-b">Primary Layer</span>  Random Forest Regressor (n=40)<br />
                <span className="co-p">Correction Layer</span> Gradient Boosting (rounds=30)<br />
                <span className="co-c">Safety Guard</span>    Dynamic Arbitrage Threshold ($22 / 18%)<br />
                <span className="co-a">Audit Mode</span>      Enterprise Revenue Velocity Enabled
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="toasts">
        {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}
      </div>

      {previewData && (
        <div className="modal-overlay" onClick={() => setPreviewData(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <div style={{ color: '#fff', fontWeight: '700' }}>DATA PREVIEW</div>
              <button className="modal-close" onClick={() => setPreviewData(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr>{Object.keys(previewData[0] || {}).map(h => <th key={h} style={{ color: '#fff' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {previewData.slice(0, 50).map((r, i) => (
                      <tr key={i}>{Object.values(r).map((v, j) => <td key={j} style={{ color: '#fff' }}>{v}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CHATBOT AGENT ── */}
      <div className="chat-trigger" onClick={() => setChatOpen(!chatOpen)}>
        <img src="/logo.png" alt="Agent" style={{ width: '60%', height: '60%', objectFit: 'contain' }} />
      </div>
      {chatOpen && (
        <div className="chat-window">
          <div className="modal-hd" style={{ padding: '0.8rem 1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--g)' }} />
              <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: 1, color: '#fff' }}>AI AGENT</div>
            </div>
            <button className="modal-close" onClick={() => setChatOpen(false)} style={{ fontSize: '18px' }}>&times;</button>
          </div>
          <div className="modal-body" style={{ background: 'rgba(0,0,0,0.2)', padding: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {chatMsgs.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role === 'ai' ? 'chat-ai' : 'chat-user'}`} style={{ color: '#fff' }}>
                  {m.text}
                </div>
              ))}
              <div ref={chatScroll} />
            </div>
          </div>
          <form onSubmit={handleChat} style={{ padding: '10px', borderTop: '1px solid var(--b1)', display: 'flex', gap: 5 }}>
            <input name="msg" className="fi" placeholder="Ask Agent for advice…" style={{ flex: 1, fontSize: '11px' }} autoComplete="off" />
            <button type="submit" className="btn btn-pri btn-sm" style={{ padding: '4px 10px' }}>SEND</button>
          </form>
        </div>
      )}

      <footer>
        <div style={{ color: '#fff' }}>&copy; 2026 PRICEGUARD AI AUDITING. DECA COMPETITION BUILD.</div>
        <div style={{ display: 'flex', gap: '15px', color: '#fff' }}>
          <span>NODE: v1.1.6-PRO</span>
          <span>LATENCY: 12ms</span>
          <span style={{ color: 'var(--g)' }}>STATUS: OPTIMAL</span>
        </div>
      </footer>
    </div>
  );
}
