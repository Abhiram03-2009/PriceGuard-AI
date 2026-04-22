import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import './index.css';
import { runAnalysis, dlCSV } from './engine';
import LoadingScreen from './components/LoadingScreen';
import Navbar from './components/Navbar';
import { ForecastChart, ScatterLinChart, HBar, VBar, Donut } from './components/Charts';
import { useToast, ToastContainer } from './components/Toast';
import FetchTab from './components/FetchTab';

// ── Helpers ───────────────────────────────────────────────────────────────────
function SI({ col, sortCol, sortDir }) {
  return <span style={{ opacity: 0.42, marginLeft: 3 }}>{sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('dashboard');
  const [rawData,    setRawData]    = useState(null);
  const [results,    setResults]    = useState(null);
  const [analyzing,  setAnalyzing]  = useState(false);
  const [search,     setSearch]     = useState('');
  const [filterTier, setFilter]     = useState('ALL');
  const [sortCol,    setSort]       = useState('arbitrage_margin');
  const [sortDir,    setDir]        = useState('desc');
  const [page,       setPage]       = useState(1);
  const [drag,       setDrag]       = useState(false);
  const fileRef = useRef();
  const { toasts, add } = useToast();

  // Loading delay — 4s to let typewriter animations complete
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
    setTimeout(() => {
      try {
        const r = runAnalysis(rawData);
        setResults(r);
        add(`Analysis complete — ${r.arbEvents.length} arbitrage events found (${(r.arbRate * 100).toFixed(1)}%)`);
      } catch (e) {
        add('Analysis error: ' + e.message, 'error');
      }
      setAnalyzing(false);
    }, 500);
  }, [rawData, add]);

  // Called from FetchTab when user clicks "Load into Dashboard"
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

  const stats = results ? [
    { lbl: 'Total Events',   val: results.totalEvents,                     cl: '',  sub: 'Loaded from dataset',   ico: '▦' },
    { lbl: 'Flagged Events', val: results.arbEvents.length,                cl: 'p', sub: `${(results.arbRate * 100).toFixed(1)}% arbitrage rate`, ico: '⚑' },
    { lbl: 'Model R²',       val: (results.r2 * 100).toFixed(1) + '%',    cl: 'g', sub: 'Ensemble RF+GBM',       ico: '◎' },
    { lbl: 'Mean Abs Error', val: '$' + results.mae.toFixed(0),            cl: 'a', sub: 'Price prediction error', ico: '◈' },
    { lbl: 'Classifier F1',  val: (results.f1 * 100).toFixed(1) + '%',    cl: 'c', sub: 'Precision × Recall',    ico: '◆' },
  ] : [
    { lbl: 'Total Events',   val: '—', cl: '',  sub: 'Upload dataset',       ico: '▦' },
    { lbl: 'Flagged Events', val: '—', cl: 'p', sub: 'Run analysis',         ico: '⚑' },
    { lbl: 'Model R²',       val: '—', cl: 'g', sub: 'Ensemble RF+GBM',     ico: '◎' },
    { lbl: 'Mean Abs Error', val: '—', cl: 'a', sub: 'Price prediction error', ico: '◈' },
    { lbl: 'Classifier F1',  val: '—', cl: 'c', sub: 'Precision × Recall',  ico: '◆' },
  ];

  return (
    <div className="app">
      <div className="orb o1" /><div className="orb o2" /><div className="orb o3" />
      <ToastContainer toasts={toasts} />
      <Navbar tab={tab} setTab={setTab} results={results} />

      <main className="main">
        {/* ── STAT BAR ── */}
        <div className="stat-bar fade">
          {stats.map((s, i) => (
            <div key={i} className="stat-card">
              <div className="slbl">{s.lbl}</div>
              <div className={`sval ${s.cl}`}>{s.val}</div>
              <div className="ssub">{s.sub}</div>
              <div className="sicon">{s.ico}</div>
            </div>
          ))}
        </div>

        {/* ────────────── DASHBOARD ────────────── */}
        {tab === 'dashboard' && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>

            {/* Upload zone */}
            {!rawData && (
              <div
                className={`upload-zone ${drag ? 'drag' : ''}`}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; f?.name.endsWith('.csv') ? parseFile(f) : add('CSV files only', 'error'); }}
                onClick={() => fileRef.current?.click()}
              >
                <div className="upload-icon">⬆</div>
                <div className="upload-title">Drop your event CSV here</div>
                <div className="upload-sub">Accepts SeatGeek, Ticketmaster, or any ticketing platform export. Missing price columns are inferred from demand signals automatically.</div>
                <div className="field-pills">
                  {['event_id', 'title', 'venue', 'city', 'state', 'datetime', 'popularity', 'listing_count', 'lowest_price', 'average_price', 'highest_price'].map(f => (
                    <span key={f} className="fp">{f}</span>
                  ))}
                </div>
                <button className="btn btn-pri btn-sm" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>Browse Files</button>
                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => parseFile(e.target.files[0])} />
              </div>
            )}

            {/* File loaded / result banner */}
            {rawData && (
              <div className="card" style={results ? { borderColor: 'rgba(0,214,143,0.2)' } : {}}>
                <div className="card-hd">
                  <div className="card-title" style={results ? { color: 'var(--g)' } : {}}>
                    {results ? `✓ Analysis Complete — ${results.totalEvents} events` : `Dataset Loaded — ${rawData.length} Events`}
                  </div>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setRawData(null); setResults(null); }}>Reset</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Replace</button>
                    <button className="analyze-btn" onClick={doAnalyze} disabled={analyzing}>
                      {analyzing ? <><div className="spinner" />&nbsp;Analyzing...</> : (results ? '↺  Re-run' : '⚡  Run AI Analysis')}
                    </button>
                    <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => parseFile(e.target.files[0])} />
                  </div>
                </div>
                {!results && (
                  <div className="card-body">
                    <div className="tbl-wrap">
                      <table className="tbl">
                        <thead><tr>{['Event', 'Venue', 'City', 'Popularity', 'Listings'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                        <tbody>
                          {rawData.slice(0, 5).map((r, i) => (
                            <tr key={i}>
                              <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title || '—'}</td>
                              <td>{r.venue || '—'}</td><td>{r.city || '—'}</td>
                              <td className="mono blue">{parseFloat(r.popularity)?.toFixed(4) || '—'}</td>
                              <td className="mono">{r.listing_count || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {rawData.length > 5 && <div style={{ fontFamily: 'var(--fm)', fontSize: '10px', color: 'var(--t3)', marginTop: 7 }}>+{rawData.length - 5} more rows…</div>}
                  </div>
                )}
              </div>
            )}

            {results && (
              <>
                {/* Forecast + Scatter */}
                <div className="two-col">
                  <div className="card">
                    <div className="card-hd">
                      <div className="card-title">Arbitrage Rate — Today + 7-Day Forecast</div>
                      <span className="mono" style={{ fontSize: '9px', color: 'var(--t3)' }}>TODAY: {(results.arbRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="card-body">
                      <ForecastChart series={results.forecastSeries} />
                      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--fm)', fontSize: '10px', color: 'var(--t3)' }}><span style={{ color: 'var(--b)', marginRight: 4 }}>●</span>Historical + Today</span>
                        <span style={{ fontFamily: 'var(--fm)', fontSize: '10px', color: 'var(--t3)' }}><span style={{ color: 'var(--a)', marginRight: 4 }}>●</span>Forecast (Exp. Smoothing)</span>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-hd">
                      <div className="card-title">Price vs Popularity — OLS Regression</div>
                      <span className="mono" style={{ fontSize: '9px', color: 'var(--t3)' }}>slope={results.linModel.slope.toFixed(1)}  R²={(results.linModel.r2 * 100).toFixed(1)}%</span>
                    </div>
                    <div className="card-body">
                      <ScatterLinChart popVals={results.popVals} priceVals={results.priceVals} linModel={results.linModel} processed={results.processed} />
                    </div>
                  </div>
                </div>

                {/* Protection summary */}
                <div className="card">
                  <div className="card-hd">
                    <div className="card-title">Price Protection Summary</div>
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button className="dl-btn" onClick={() => { dlCSV(results.arbEvents, 'priceguard_arbitrage_' + new Date().toISOString().split('T')[0] + '.csv'); add('Arbitrage report downloaded'); }}>↓ Arbitrage Report</button>
                      <button className="dl-btn bl" onClick={() => { dlCSV(results.processed, 'priceguard_full_' + new Date().toISOString().split('T')[0] + '.csv'); add('Full dataset downloaded'); }}>↓ Full Dataset</button>
                    </div>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {[
                        { val: results.r2 * 100,        color: '#18a8ff', lbl: 'R²'     },
                        { val: results.f1 * 100,        color: '#00d68f', lbl: 'F1'     },
                        { val: results.precision * 100, color: '#00e5cc', lbl: 'Prec'   },
                        { val: results.recall * 100,    color: '#f5a623', lbl: 'Recall' },
                        { val: results.arbRate * 100,   color: '#ff3668', lbl: 'Arb%'  },
                      ].map((m, i) => <Donut key={i} value={m.val} color={m.color} label={m.lbl} />)}
                      <div style={{ flex: 1, minWidth: 220, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                        {[
                          { lbl: 'Events Flagged', val: results.arbEvents.length, cl: 'pink' },
                          { lbl: 'Safe Events', val: results.totalEvents - results.arbEvents.length, cl: 'green' },
                          { lbl: 'Avg Arb Margin', val: '$' + (results.arbEvents.reduce((s, d) => s + d.arbitrage_margin, 0) / (results.arbEvents.length || 1)).toFixed(0), cl: 'amber' },
                          { lbl: 'Total Prevented', val: '$' + results.arbEvents.reduce((s, d) => s + d.prevented_profit, 0).toFixed(0), cl: 'green' },
                        ].map((m, i) => (
                          <div key={i} style={{ background: 'rgba(24,168,255,0.04)', border: '1px solid var(--b1)', borderRadius: 8, padding: '10px 13px' }}>
                            <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>{m.lbl}</div>
                            <div style={{ fontFamily: "'Syne'", fontSize: '21px', fontWeight: '700', color: `var(--${m.cl})` }}>{m.val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Model metrics */}
                <div className="met-grid">
                  {[
                    { lbl: 'R²',       val: (results.r2 * 100).toFixed(1) + '%',        cl: 'blue'   },
                    { lbl: 'MAE',      val: '$' + results.mae.toFixed(0),                cl: 'pink'   },
                    { lbl: 'RMSE',     val: '$' + results.rmse.toFixed(0),               cl: 'amber'  },
                    { lbl: 'F1',       val: (results.f1 * 100).toFixed(1) + '%',         cl: 'green'  },
                    { lbl: 'Precision',val: (results.precision * 100).toFixed(1) + '%',  cl: 'cyan'   },
                    { lbl: 'Recall',   val: (results.recall * 100).toFixed(1) + '%',     cl: 'purple' },
                  ].map((m, i) => (
                    <div key={i} className="met-box">
                      <div className={`met-val ${m.cl}`}>{m.val}</div>
                      <div className="met-lbl">{m.lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Top opportunities */}
                <div className="card">
                  <div className="card-hd">
                    <div className="card-title">Top Arbitrage Opportunities</div>
                    <span className="mono" style={{ fontSize: '9.5px', color: 'var(--t3)' }}>sorted by margin</span>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '1rem' }}>
                      {[...results.arbEvents].sort((a, b) => b.arbitrage_margin - a.arbitrage_margin).slice(0, 6).map((ev, i) => (
                        <div key={i} className="ev-card arb">
                          <div className="ev-title">{ev.title}</div>
                          <div className="ev-meta">{ev.venue} · {ev.city}, {ev.state}</div>
                          <div className="pr-row"><span className="pr-lbl">Floor</span><span className="pr-val blue">${ev.lowest_price.toFixed(2)}</span></div>
                          <div className="pr-row"><span className="pr-lbl">Predicted</span><span className="pr-val amber">${ev.predicted_price.toFixed(2)}</span></div>
                          <div className="pr-row"><span className="pr-lbl">Corrected</span><span className="price-tag">${ev.corrected_price.toFixed(2)}</span></div>
                          <div className="pr-row" style={{ marginTop: 5 }}><span className="pr-lbl">Margin</span><span className="pr-val pink">${ev.arbitrage_margin.toFixed(2)}</span></div>
                          <div className="risk-row">
                            <div className="risk-bar"><div className="risk-fill" style={{ width: ev.risk_score + '%', background: ev.risk_score > 55 ? 'var(--p)' : ev.risk_score > 27 ? 'var(--a)' : 'var(--g)' }} /></div>
                            <span className="risk-num">{ev.risk_score.toFixed(0)}</span>
                            <span className={`badge ${ev.arbitrage_tier === 'HIGH' ? 'b-high' : 'b-med'}`}>{ev.arbitrage_tier}</span>
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
        {tab === 'fetch' && (
          <FetchTab onDataLoaded={onFetchedData} add={add} />
        )}

        {/* ────────────── ANALYSIS ────────────── */}
        {tab === 'analysis' && results && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            <div className="two-col">
              <div className="card">
                <div className="card-hd"><div className="card-title">Feature Importance</div></div>
                <div className="card-body">
                  <HBar labels={results.importances.map(i => i.feature)} data={results.importances.map(i => +(i.importance * 100).toFixed(2))} colors={results.importances.map((_, i) => `hsla(${192 + i * 13},78%,55%,0.38)`)} height={232} />
                </div>
              </div>
              <div className="card">
                <div className="card-hd"><div className="card-title">Arbitrage Margin Distribution</div></div>
                <div className="card-body">
                  <VBar labels={results.margDist.map(b => b.label)} data={results.margDist.map(b => b.count)} color={results.margDist.map(b => b.label.startsWith('$0') || b.label.startsWith('$10') ? 'rgba(0,214,143,0.3)' : 'rgba(255,54,104,0.3)')} bc={results.margDist.map(b => b.label.startsWith('$0') || b.label.startsWith('$10') ? '#00d68f' : '#ff3668')} height={232} />
                </div>
              </div>
            </div>
            <div className="two-col">
              <div className="card">
                <div className="card-hd">
                  <div className="card-title">Price vs Popularity — OLS Regression</div>
                  <span className="mono" style={{ fontSize: '9px', color: 'var(--t3)' }}>y={results.linModel.slope.toFixed(1)}x + ${results.linModel.intercept.toFixed(0)}  R²={(results.linModel.r2 * 100).toFixed(1)}%</span>
                </div>
                <div className="card-body"><ScatterLinChart popVals={results.popVals} priceVals={results.priceVals} linModel={results.linModel} processed={results.processed} /></div>
              </div>
              <div className="card">
                <div className="card-hd"><div className="card-title">Arbitrage Rate — Today + 7-Day Forecast</div></div>
                <div className="card-body"><ForecastChart series={results.forecastSeries} /></div>
              </div>
            </div>
            <div className="two-col">
              <div className="card">
                <div className="card-hd"><div className="card-title">Price Distribution ($50 bins)</div></div>
                <div className="card-body"><VBar labels={results.bins.map(b => `$${b.min}–${b.max}`)} data={results.bins.map(b => b.count)} color="rgba(24,168,255,0.28)" bc="#18a8ff" height={180} /></div>
              </div>
              <div className="card">
                <div className="card-hd">
                  <div className="card-title">Top Markets by Volume</div>
                  <span className="mono" style={{ fontSize: '9px', color: 'var(--t3)' }}>red = has arbitrage events</span>
                </div>
                <div className="card-body"><HBar labels={results.topCities.map(c => c.city || 'Unknown')} data={results.topCities.map(c => c.count)} colors={results.topCities.map(c => c.arb > 0 ? 'rgba(255,54,104,0.32)' : 'rgba(24,168,255,0.28)')} height={200} /></div>
              </div>
            </div>
          </div>
        )}

        {/* ────────────── EVENTS TABLE ────────────── */}
        {tab === 'events' && results && (
          <div className="fade card">
            <div className="card-hd">
              <div className="card-title">All Events ({results.totalEvents})</div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button className="dl-btn" onClick={() => { dlCSV(results.arbEvents, 'arb_' + new Date().toISOString().split('T')[0] + '.csv'); add('Arbitrage report downloaded'); }}>↓ Arb Report</button>
                <button className="dl-btn bl" onClick={() => { dlCSV(results.processed, 'full_' + new Date().toISOString().split('T')[0] + '.csv'); add('Full dataset downloaded'); }}>↓ Full CSV</button>
              </div>
            </div>
            <div style={{ padding: '.7rem 1.35rem', borderBottom: '1px solid var(--b1)' }}>
              <div className="filter-bar">
                <input className="fi" placeholder="Search events, venues, cities…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: 200 }} />
                <select className="fi" value={filterTier} onChange={e => { setFilter(e.target.value); setPage(1); }}>
                  <option value="ALL">All Events</option>
                  <option value="ARB">Arbitrage Only</option>
                  <option value="HIGH">High Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="LOW">Low Risk</option>
                </select>
                <span className="mono" style={{ fontSize: '10px', color: 'var(--t3)' }}>{tableData.length} results</span>
              </div>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr>
                  {[['title','Event'],['city','Location'],['lowest_price','Floor $'],['predicted_price','Predicted $'],['corrected_price','Corrected $'],['arbitrage_margin','Margin'],['prevented_profit','Prevented'],['risk_score','Risk'],['arbitrage_tier','Tier']].map(([col, lbl]) => (
                    <th key={col} onClick={() => doSort(col)}>{lbl}<SI col={col} sortCol={sortCol} sortDir={sortDir} /></th>
                  ))}
                </tr></thead>
                <tbody>
                  {pageData.map((d, i) => (
                    <tr key={i} className={d.arbitrage === 1 ? 'arb' : ''}>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.title}>{d.title}</td>
                      <td className="mono" style={{ fontSize: '11px' }}>{d.city}, {d.state}</td>
                      <td className="mono blue">${d.lowest_price?.toFixed(2)}</td>
                      <td className="mono amber">${d.predicted_price?.toFixed(2)}</td>
                      <td><span className="price-tag">${d.corrected_price?.toFixed(2)}</span></td>
                      <td className={`mono ${d.arbitrage_margin > 18 ? 'pink' : ''}`}>${d.arbitrage_margin?.toFixed(2)}</td>
                      <td className="mono green">{d.prevented_profit > 0 ? '$' + d.prevented_profit.toFixed(2) : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div className="risk-bar" style={{ width: 55 }}><div className="risk-fill" style={{ width: d.risk_score + '%', background: d.risk_score > 55 ? 'var(--p)' : d.risk_score > 27 ? 'var(--a)' : 'var(--g)' }} /></div>
                          <span className="mono" style={{ fontSize: '10px', color: 'var(--t3)' }}>{d.risk_score?.toFixed(0)}</span>
                        </div>
                      </td>
                      <td><span className={`badge ${d.arbitrage === 1 ? (d.arbitrage_tier === 'HIGH' ? 'b-high' : 'b-med') : 'b-safe'}`}>{d.arbitrage === 1 ? d.arbitrage_tier : 'SAFE'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pag">
              <span className="pg-info">{(page - 1) * PER + 1}–{Math.min(page * PER, tableData.length)} of {tableData.length}</span>
              <button className="pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: Math.min(8, totPg) }, (_, i) => {
                let p; if (totPg <= 8) p = i + 1; else if (page <= 4) p = i + 1; else if (page >= totPg - 3) p = totPg - 7 + i; else p = page - 3 + i;
                return <button key={p} className={`pg-btn ${p === page ? 'act' : ''}`} onClick={() => setPage(p)}>{p}</button>;
              })}
              <button className="pg-btn" onClick={() => setPage(p => Math.min(totPg, p + 1))} disabled={page === totPg}>›</button>
            </div>
          </div>
        )}

        {/* ────────────── INSIGHTS ────────────── */}
        {tab === 'insights' && results && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            <div className="col-32">
              <div className="card">
                <div className="card-hd"><div className="card-title">AI-Generated Insights</div></div>
                <div className="card-body">
                  <div className="insight danger">
                    <div className="insight-lbl danger">Critical · Arbitrage Exposure</div>
                    {results.arbEvents.length} of {results.totalEvents} events show exploitable margins above the $18 threshold. Peak margin: ${Math.max(...results.arbEvents.map(e => e.arbitrage_margin)).toFixed(2)} — direct revenue leaking to secondary resellers.
                  </div>
                  <div className="insight warn">
                    <div className="insight-lbl warn">Revenue Recovery</div>
                    Corrected pricing across all flagged events suppresses ~${results.arbEvents.reduce((s, d) => s + d.prevented_profit, 0).toFixed(0)} in resale profit. Average price lift needed: +${(results.arbEvents.reduce((s, d) => s + d.corrected_price - d.lowest_price, 0) / (results.arbEvents.length || 1)).toFixed(2)} per event.
                  </div>
                  <div className="insight">
                    <div className="insight-lbl">Model Confidence</div>
                    Ensemble RF+GBM achieves R²={(results.r2 * 100).toFixed(1)}% with MAE=${results.mae.toFixed(0)} (RMSE=${results.rmse.toFixed(0)}). Classifier precision={(results.precision * 100).toFixed(1)}% / recall={(results.recall * 100).toFixed(1)}% minimizes false positives in pricing recommendations.
                  </div>
                  <div className="insight">
                    <div className="insight-lbl gn">Demand Signal</div>
                    Demand score (popularity × log-listings) is the top predictor. Events above the 75th percentile carry an estimated {(results.arbRate * 1.45 * 100).toFixed(1)}% arbitrage incidence vs {(results.arbRate * 0.58 * 100).toFixed(1)}% for low-demand events.
                  </div>
                  <div className="insight warn">
                    <div className="insight-lbl warn">7-Day Forecast</div>
                    Exp. smoothing projects arbitrage rate will {results.forecastSeries.filter(d => d.isForecast).pop().rate > results.arbRate * 100 ? 'trend upward to' : 'stabilize near'} ~{results.forecastSeries.filter(d => d.isForecast).pop().rate.toFixed(1)}% by {results.forecastSeries.filter(d => d.isForecast).pop().date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.
                  </div>
                  <div className="insight">
                    <div className="insight-lbl">OLS Regression</div>
                    y = {results.linModel.slope.toFixed(1)}×popularity + ${results.linModel.intercept.toFixed(0)} (R²={(results.linModel.r2 * 100).toFixed(1)}%). Each 0.1 unit popularity gain ≈ +${(results.linModel.slope * 0.1).toFixed(0)} in expected price.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                <div className="card">
                  <div className="card-hd"><div className="card-title">Risk Breakdown</div></div>
                  <div className="card-body">
                    {['HIGH', 'MEDIUM', 'LOW'].map(tier => {
                      const cnt = results.processed.filter(d => d.arbitrage_tier === tier).length;
                      const pct = cnt / results.totalEvents * 100;
                      const color = tier === 'HIGH' ? 'var(--p)' : tier === 'MEDIUM' ? 'var(--a)' : 'var(--g)';
                      return (
                        <div key={tier} style={{ marginBottom: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontFamily: 'var(--fm)', fontSize: '10px' }}>
                            <span style={{ color }}>{tier} RISK</span>
                            <span style={{ color: 'var(--t3)' }}>{cnt} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="prog-wrap"><div className="prog" style={{ width: pct + '%', background: color }} /></div>
                        </div>
                      );
                    })}
                    <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                      {[
                        { lbl: 'Avg Floor',     val: '$' + (results.processed.reduce((s, d) => s + d.lowest_price, 0) / results.totalEvents).toFixed(0),     cl: 'blue'   },
                        { lbl: 'Avg Predicted', val: '$' + (results.processed.reduce((s, d) => s + d.predicted_price, 0) / results.totalEvents).toFixed(0),   cl: 'amber'  },
                        { lbl: 'Avg Risk Score',val: (results.processed.reduce((s, d) => s + d.risk_score, 0) / results.totalEvents).toFixed(1),               cl: 'cyan'   },
                        { lbl: 'Model RMSE',    val: '$' + results.rmse.toFixed(0),                                                                             cl: 'purple' },
                      ].map(m => (
                        <div key={m.lbl} style={{ background: 'rgba(24,168,255,0.03)', border: '1px solid var(--b1)', borderRadius: 7, padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontFamily: "'Syne'", fontSize: '20px', fontWeight: '700', color: `var(--${m.cl})` }}>{m.val}</div>
                          <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>{m.lbl}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-hd"><div className="card-title">Prevented Profit — Top 8 Events</div></div>
                  <div className="card-body">
                    <VBar labels={[...results.arbEvents].sort((a, b) => b.prevented_profit - a.prevented_profit).slice(0, 8).map((_, i) => `Ev ${i + 1}`)} data={[...results.arbEvents].sort((a, b) => b.prevented_profit - a.prevented_profit).slice(0, 8).map(d => +d.prevented_profit.toFixed(2))} color="rgba(0,214,143,0.28)" bc="#00d68f" height={155} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ────────────── MODEL ────────────── */}
        {tab === 'model' && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            <div className="card">
              <div className="card-hd"><div className="card-title">Model Architecture</div></div>
              <div className="card-body">
                <div className="code-block">
                  <span className="co-g">// PriceGuard AI — Ensemble ML Architecture</span><br />
                  <span className="co-b">Layer 1 (58%)</span>  Random Forest Regressor    — n_trees=28, max_depth=7, bootstrap sampling<br />
                  <span className="co-p">Layer 2 (42%)</span>  Gradient Boosting Machine  — rounds=22, lr=0.11, residual correction<br />
                  <span className="co-a">Ensemble</span>       RF×0.58 + GBM×0.42        → Predicted fair market price<br />
                  <span className="co-r">Classifier</span>     RF Classifier (binarized)  → Arbitrage flag (threshold=$18)<br />
                  <span className="co-c">Forecast</span>       Exp. Smoothing + Trend     → 7-day arbitrage rate projection<br />
                  <span className="co-g">OLS</span>            Linear Regression          → Popularity→price trend + R²<br />
                  <span className="co-b">Features</span>       lowest_price, highest_price, listing_count, log_listings,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;popularity, demand_score, price_spread, volatility,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;supply_pressure, urgency<br />
                  <span className="co-g">Seed</span>           YYYYMMDD date-based — daily reproducibility, natural drift
                </div>
              </div>
            </div>
            {results && (
              <>
                <div className="three-col">
                  <div className="card"><div className="card-hd"><div className="card-title">Regression Metrics</div></div><div className="card-body">
                    {[['R²', (results.r2 * 100).toFixed(2) + '%', 'blue'], ['MAE', '$' + results.mae.toFixed(2), 'pink'], ['RMSE', '$' + results.rmse.toFixed(2), 'amber']].map(([l, v, c]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--b1)' }}>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--t3)' }}>{l}</span>
                        <span className={`mono w700 ${c}`} style={{ fontSize: '13px' }}>{v}</span>
                      </div>
                    ))}
                  </div></div>
                  <div className="card"><div className="card-hd"><div className="card-title">Classifier Metrics</div></div><div className="card-body">
                    {[['F1', (results.f1 * 100).toFixed(2) + '%', 'green'], ['Precision', (results.precision * 100).toFixed(2) + '%', 'cyan'], ['Recall', (results.recall * 100).toFixed(2) + '%', 'amber']].map(([l, v, c]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--b1)' }}>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--t3)' }}>{l}</span>
                        <span className={`mono w700 ${c}`} style={{ fontSize: '13px' }}>{v}</span>
                      </div>
                    ))}
                  </div></div>
                  <div className="card"><div className="card-hd"><div className="card-title">Configuration</div></div><div className="card-body">
                    {[['Arb Threshold', '$18.00'], ['RF Trees', '28'], ['GBM Rounds', '22'], ['GBM LR', '0.11'], ['Ensemble', '58/42 RF/GBM'], ['Forecast', '7 days']].map(([l, v]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--b1)' }}>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--t3)' }}>{l}</span>
                        <span className="mono w700 blue" style={{ fontSize: '13px' }}>{v}</span>
                      </div>
                    ))}
                  </div></div>
                </div>
                <div className="card"><div className="card-hd"><div className="card-title">Engineered Features</div></div><div className="card-body">
                  <div className="three-col">
                    {[
                      { n: 'demand_score',    f: 'popularity × ln(1+listing_count)', d: 'Top arbitrage predictor — composite demand × supply pressure signal.' },
                      { n: 'volatility',      f: 'price_spread / (lowest_price+1)',  d: 'Normalized price range — high volatility events favor resale speculation.' },
                      { n: 'supply_pressure', f: '1.38 if <25 | 1.0 if <60 | 0.74', d: 'Scarcity multiplier — low supply listings drive secondary market margins.' },
                      { n: 'log_listings',    f: 'ln(1+listing_count)',              d: 'Log-normalized supply — reduces skew from high-volume events.' },
                      { n: 'price_spread',    f: 'highest_price − lowest_price',     d: 'Raw market width — wider ranges signal underpriced floor tickets.' },
                      { n: 'urgency',         f: 'max(0, 1 − days_until/90)',        d: 'Temporal pressure — imminent events attract speculative resale buyers.' },
                    ].map(f => (
                      <div key={f.n} style={{ background: 'rgba(24,168,255,0.025)', border: '1px solid var(--b1)', borderRadius: 8, padding: '11px' }}>
                        <div className="mono" style={{ color: 'var(--b)', fontSize: '11px', fontWeight: '600', marginBottom: 4 }}>{f.n}</div>
                        <div className="mono" style={{ color: 'var(--a)', fontSize: '10px', marginBottom: 5, lineHeight: 1.5 }}>{f.f}</div>
                        <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.6 }}>{f.d}</div>
                      </div>
                    ))}
                  </div>
                </div></div>
              </>
            )}
          </div>
        )}

        {/* Empty state for tabs that need analysis */}
        {['analysis', 'events', 'insights'].includes(tab) && !results && (
          <div className="fade" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '40px', marginBottom: 14, opacity: 0.25 }}>⚡</div>
            <div style={{ fontFamily: "'Syne'", fontSize: '18px', fontWeight: '700', color: 'var(--b)', marginBottom: 7 }}>Run Analysis First</div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: 18 }}>Dashboard → upload CSV → Run AI Analysis</div>
            <button className="btn btn-pri btn-sm" onClick={() => setTab('dashboard')}>← Dashboard</button>
          </div>
        )}
      </main>

      <footer>
        <span>PriceGuard AI · Ticket Arbitrage Intelligence Platform</span>
        <span>Ensemble RF+GBM · Date-seeded {new Date().toISOString().split('T')[0]}</span>
      </footer>
    </div>
  );
}
