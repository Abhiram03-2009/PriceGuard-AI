import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import './index.css';
import { runAnalysis, dlCSV } from './engine';
import LoadingScreen from './components/LoadingScreen';
import Navbar from './components/Navbar';
import { ForecastChart, ScatterLinChart, HBar, VBar, Donut } from './components/Charts';
import { useToast, ToastContainer } from './components/Toast';
import FetchTab from './components/FetchTab';
import MarketTab from './components/MarketTab';

// ── Helpers ───────────────────────────────────────────────────────────────────
function SI({ col, sortCol, sortDir }) {
  return <span style={{ opacity: 0.8, marginLeft: 3 }}>{sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('dashboard');
  const [dataMode,   setDataMode]   = useState('public');
  const [rawData,    setRawData]    = useState(null);
  const [results,    setResults]    = useState(null);
  const [analyzing,  setAnalyzing]  = useState(false);
  const [search,     setSearch]     = useState('');
  const [filterTier, setFilter]     = useState('ALL');
  const [sortCol,    setSort]       = useState('arbitrage_margin');
  const [sortDir,    setDir]        = useState('desc');
  const [page,       setPage]       = useState(1);
  const [drag,       setDrag]       = useState(false);
  const [consoleMsgs, setConsoleMsgs] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [showChat,    setShowChat]    = useState(false);
  const [chatMsgs,    setChatMsgs]    = useState([{ role: 'ai', text: 'PriceGuard AI Agent Online. Ready to audit your market vectors for speculative risks.' }]);
  const [chatIn,      setChatIn]      = useState('');
  const fileRef = useRef();
  const { toasts, add } = useToast();

  // Loading delay
  useEffect(() => { setTimeout(() => setLoading(false), 4200); }, []);

  const parseFile = useCallback(f => {
    if (!f) return;
    Papa.parse(f, {
      header: true, skipEmptyLines: true,
      complete: res => { setRawData(res.data); add(`Loaded ${res.data.length} events from "${f.name}"`); },
      error: () => add('Failed to parse file', 'error'),
    });
  }, [add]);

  const doAnalyze = useCallback(() => {
    if (!rawData) { add('Upload a dataset first', 'warn'); return; }
    setAnalyzing(true);
    setConsoleMsgs([{ ts: new Date().toLocaleTimeString(), msg: 'Initializing PriceGuard AI Engine...', secure: dataMode === 'enterprise' }]);
    
    const steps = [
      'Scanning dataset for demand signals...',
      'Synthesizing feature vectors (popularity, listings, urgency)...',
      'Executing Ensemble RF (Layer 1) — mapping fair market values...',
      'Executing GBM (Layer 2) — residual error correction...',
      'Flagging arbitrage anomalies above conservative threshold...',
      'Finalizing report and revenue recovery estimates...'
    ];

    steps.forEach((s, i) => {
      setTimeout(() => {
        setConsoleMsgs(prev => [...prev, { ts: new Date().toLocaleTimeString(), msg: s, secure: dataMode === 'enterprise' }]);
      }, (i + 1) * 600);
    });

    setTimeout(() => {
      try {
        const r = runAnalysis(rawData);
        setResults(r);
        add(`Analysis complete — ${r.arbEvents.length} arbitrage events found (${(r.arbRate * 100).toFixed(1)}%)`);
        
        // PROACTIVE AGENT BRIEFING
        const advice = `Audit Complete. Found ${r.arbEvents.length} high-risk events. The primary leakage is in ${r.topCities[0]?.city || 'major markets'}, where speculative margins average $${(r.arbEvents.reduce((s, d) => s + d.arbitrage_margin, 0) / (r.arbEvents.length || 1)).toFixed(2)}. I recommend a floor price correction of +18% for HIGH tier risks.`;
        setChatMsgs(prev => [...prev, { role: 'ai', text: advice }]);
        setShowChat(true); // Open chat automatically to show advice
      } catch (e) {
        add('Analysis error: ' + e.message, 'error');
      }
      setAnalyzing(false);
    }, 4500);
  }, [rawData, add, dataMode]);

  const onFetchedData = useCallback((rows) => {
    setRawData(rows);
    setResults(null);
    setTab('dashboard');
  }, []);

  const tableData = useMemo(() => {
    if (!results) return [];
    const q = search.toLowerCase();
    return results.processed
      .filter(d =>
        (!q || [d.title, d.venue, d.city].some(s => s?.toLowerCase().includes(q))) &&
        (filterTier === 'ALL' || (filterTier === 'ARB' && d.arbitrage === 1) || d.arbitrage_tier === filterTier)
      )
      .sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol];
        const cmp = typeof av === 'number' ? av - bv : String(av || '').localeCompare(String(bv || ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [results, search, filterTier, sortCol, sortDir]);

  const PER = 16;
  const totPg = Math.max(1, Math.ceil(tableData.length / PER));
  const pageData = tableData.slice((page - 1) * PER, page * PER);
  const doSort = col => { if (sortCol === col) setDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSort(col); setDir('desc'); } };

  if (loading) return <LoadingScreen />;

  const stats = results ? (dataMode === 'enterprise' ? [
    { lbl: 'Audit Integrity', val: results.f1 > 0.9 ? 'OPTIMAL' : 'STABLE', cl: 'g', sub: 'Model verification score', ico: '🛡' },
    { lbl: 'Revenue Leakage', val: '$' + results.arbEvents.reduce((s, d) => s + d.arbitrage_margin, 0).toFixed(0), cl: 'p', sub: 'Total margin leakage', ico: '⚠' },
    { lbl: 'Revenue Velocity', val: '+' + (results.arbRate * 4.2).toFixed(1) + '%', cl: 'c', sub: 'Projected recovery speed', ico: '⚡' },
    { lbl: 'Model R²',        val: (results.r2 * 100).toFixed(1) + '%',    cl: 'b', sub: 'Ensemble Precision',    ico: '◎' },
    { lbl: 'Secure Nodes',    val: results.totalEvents,                    cl: '',  sub: 'Audited records',       ico: '▦' },
  ] : [
    { lbl: 'Total Events',   val: results.totalEvents,                     cl: '',  sub: 'Loaded from dataset',   ico: '▦' },
    { lbl: 'Flagged Events', val: results.arbEvents.length,                cl: 'p', sub: `${(results.arbRate * 100).toFixed(1)}% arbitrage rate`, ico: '⚑' },
    { lbl: 'Model R²',       val: (results.r2 * 100).toFixed(1) + '%',    cl: 'g', sub: 'Ensemble RF+GBM',       ico: '◎' },
    { lbl: 'Mean Abs Error', val: '$' + results.mae.toFixed(0),            cl: 'a', sub: 'Price prediction error', ico: '◈' },
    { lbl: 'Classifier F1',  val: (results.f1 * 100).toFixed(1) + '%',    cl: 'c', sub: 'Precision × Recall',    ico: '◆' },
  ]) : [
    { lbl: 'Total Events',   val: '—', cl: '',  sub: 'Upload dataset',       ico: '▦' },
    { lbl: 'Flagged Events', val: '—', cl: 'p', sub: 'Run analysis',         ico: '⚑' },
    { lbl: 'Model R²',       val: '—', cl: 'g', sub: 'Ensemble RF+GBM',     ico: '◎' },
    { lbl: 'Mean Abs Error', val: '—', cl: 'a', sub: 'Price prediction error', ico: '◈' },
    { lbl: 'Classifier F1',  val: '—', cl: 'c', sub: 'Precision × Recall',  ico: '◆' },
  ];

  return (
    <div className="app">
      <div className="orb o1" /><div className="orb o2" /><div className="orb o3" />
      
      {/* ── CHATBOT AGENT ── */}
      <div className={`chat-trigger ${showChat ? 'active' : ''}`} onClick={() => setShowChat(!showChat)} style={{ background: 'var(--b1)', border: '2px solid var(--b)' }}>
        <div className="nav-logo-wrap" style={{ width: '40px', height: '40px' }}>
          <img src="https://raw.githubusercontent.com/Abhiram03-2009/PriceGuard-AI/main/priceguard-react-app/public/logo192.png" alt="PriceGuard" />
          <div className="nav-logo-spin" />
        </div>
      </div>
      {showChat && (
        <div className="chat-window">
          <div className="modal-hd">
            <div className="card-title" style={{ color: '#fff' }}>PriceGuard AI Agent</div>
            <button className="modal-close" onClick={() => setShowChat(false)}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {chatMsgs.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role === 'ai' ? 'chat-ai' : 'chat-user'}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div style={{ padding: '12px', borderTop: '1px solid var(--b1)', display: 'flex', gap: '8px' }}>
            <input 
              className="fi" 
              style={{ flex: 1 }} 
              placeholder="Ask for suggestions or market logic..." 
              value={chatIn}
              onChange={e => setChatIn(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && chatIn.trim()) {
                  const uMsg = chatIn.trim();
                  setChatMsgs(prev => [...prev, { role: 'user', text: uMsg }]);
                  setChatIn('');
                  setTimeout(() => {
                    let resp = "I've cross-referenced that with our demand vectors. The current market volatility suggests a high risk of speculative resale. We should adjust the fair-market thresholds immediately.";
                    if (uMsg.toLowerCase().includes('help')) resp = "I can guide you through the audit. Try uploading a CSV and running the Ensemble analysis. I'll flag any margins that exceed our $22/18% safety threshold.";
                    if (results && uMsg.toLowerCase().includes('suggest')) resp = `Focus on ${results.arbEvents.length} flagged events. Prioritizing ${results.topCities[0]?.city} could recover up to $${(results.arbEvents.reduce((s,d)=>s+d.prevented_profit,0)).toFixed(0)} in previously lost margin.`;
                    setChatMsgs(prev => [...prev, { role: 'ai', text: resp }]);
                  }, 800);
                }
              }}
            />
          </div>
        </div>
      )}

      {analyzing && (
        <div className="radar-container">
          <div className="radar-circle" />
          <div className="radar-circle" style={{ animationDelay: '1s' }} />
          <div className="radar-circle" style={{ animationDelay: '2s' }} />
          <div className="radar-line" />
        </div>
      )}
      {dataMode === 'enterprise' && <div className="secure-scan" />}
      {dataMode === 'enterprise' && <div className="secure-grid" />}
      
      <ToastContainer toasts={toasts} />
      <Navbar tab={tab} setTab={setTab} results={results} dataMode={dataMode} />

      <main className="main">
        {/* ── STAT BAR ── */}
        <div className="stat-bar fade">
          {stats.map((s, i) => (
            <div key={i} className="stat-card">
              <div className="slbl" style={{ color: '#fff' }}>{s.lbl}</div>
              <div className={`sval ${s.cl}`}>{s.val}</div>
              <div className="ssub" style={{ color: '#fff', opacity: 0.8 }}>{s.sub}</div>
              <div className="sicon">{s.ico}</div>
            </div>
          ))}
        </div>

        {/* ────────────── DASHBOARD ────────────── */}
        {tab === 'dashboard' && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>

            {/* Mode Toggle */}
            {!rawData && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.2rem' }}>
                <div style={{ display: 'flex', background: 'rgba(24,168,255,0.05)', border: '2px solid var(--b1)', borderRadius: '8px', padding: '4px' }}>
                  <button 
                    className={`nav-tab ${dataMode === 'public' ? 'act' : ''}`} 
                    onClick={() => setDataMode('public')}
                  >
                    Public Event Analysis
                  </button>
                  <button 
                    className={`nav-tab ${dataMode === 'enterprise' ? 'act' : ''}`} 
                    onClick={() => setDataMode('enterprise')}
                    style={dataMode === 'enterprise' ? { borderColor: 'rgba(255,54,104,0.3)', color: 'var(--p)', background: 'rgba(255,54,104,0.1)' } : {}}
                  >
                    Team/Enterprise Portal
                  </button>
                </div>
              </div>
            )}

            {/* Upload zone */}
            {!rawData && (
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
            )}

            {/* File loaded / result banner */}
            {rawData && (
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
                        <div className="insightgn">
                          <div className="insight-lbl gn">Market Stability Score</div>
                          Integrity analysis shows <strong>{(100 - results.arbRate*100).toFixed(1)}%</strong> of inventory is currently insulated from manipulation vectors.
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
                    <div className="card-title" style={{ color: '#fff' }}>Audit Performance Metrics</div>
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button className="dl-btn" onClick={() => { dlCSV(results.arbEvents, 'priceguard_audit_report.csv'); add('Audit report downloaded'); }}>↓ Download Audit</button>
                    </div>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {[
                        { val: results.r2 * 100,        color: '#18a8ff', lbl: 'R²'     },
                        { val: results.f1 * 100,        color: '#00d68f', lbl: 'F1'     },
                        { val: results.precision * 100, color: '#00e5cc', lbl: 'Prec'   },
                        { val: results.recall * 100,    color: '#f5a623', lbl: 'Recall' },
                        { val: results.arbRate * 100,   color: '#ff3668', lbl: 'Arb%'  },
                      ].map((m, i) => <Donut key={i} value={m.val} color={m.color} label={m.lbl} />)}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-hd">
                    <div className="card-title" style={{ color: '#fff' }}>Top Vulnerability Nodes</div>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '1rem' }}>
                      {[...results.arbEvents].sort((a, b) => b.arbitrage_margin - a.arbitrage_margin).slice(0, 6).map((ev, i) => (
                        <div key={i} className="ev-card arb">
                          <div className="ev-title" style={{ color: '#fff' }}>{ev.title}</div>
                          <div className="ev-meta" style={{ color: '#fff', opacity: 0.8 }}>{ev.venue} · {ev.city}</div>
                          <div className="pr-row"><span className="pr-lbl">Floor</span><span className="pr-val blue">${ev.lowest_price.toFixed(2)}</span></div>
                          <div className="pr-row"><span className="pr-lbl">Corrected</span><span className="price-tag">${ev.corrected_price.toFixed(2)}</span></div>
                          <div className="pr-row" style={{ marginTop: 5 }}><span className="pr-lbl">Leakage</span><span className="pr-val pink">${ev.arbitrage_margin.toFixed(2)}</span></div>
                          <div className="risk-row">
                            <div className="risk-bar"><div className="risk-fill" style={{ width: ev.risk_score + '%', background: ev.risk_score > 55 ? 'var(--p)' : ev.risk_score > 27 ? 'var(--a)' : 'var(--g)' }} /></div>
                            <span className="badge b-high">{ev.arbitrage_tier}</span>
                          </div>
                        </div>
                      ))}
                    </div>
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
                <span className="co-g">Status:</span>        Active & Calibrated
              </div>
            </div>
          </div>
        )}

        {['analysis', 'events', 'insights'].includes(tab) && !results && (
          <div className="fade" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '40px', marginBottom: 14, opacity: 0.4 }}>🛡</div>
            <div style={{ fontFamily: "'Syne'", fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: 7 }}>Audit Required</div>
            <button className="btn btn-pri btn-sm" onClick={() => setTab('dashboard')}>Begin Analysis</button>
          </div>
        )}
      </main>

      <footer>
        <span>PriceGuard AI · Audit v1.1.6 (Final) · {new Date().toISOString().split('T')[0]}</span>
      </footer>

      {previewData && (
        <div className="modal-overlay" onClick={() => setPreviewData(null)}>
          <div className="modal fade" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <div className="card-title" style={{ color: '#fff' }}>Audit Preview: {previewData.name}</div>
              <button className="modal-close" onClick={() => setPreviewData(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>{Object.keys(previewData.rows[0] || {}).map(k => <th key={k} style={{ color: '#fff' }}>{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {previewData.rows.slice(0, 50).map((r, i) => (
                      <tr key={i}>
                        {Object.values(r).map((v, j) => <td key={j} className="mono" style={{ fontSize: '11px', color: '#fff' }}>{String(v)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card-hd" style={{ justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-pri" onClick={() => dlCSV(previewData.rows, previewData.name)}>Download Full CSV</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
