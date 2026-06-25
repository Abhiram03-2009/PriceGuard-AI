import React, { useState, useRef, useCallback } from 'react';
import { fetchPlatform, PLATFORMS } from '../platformFetch';
import { exportCSV } from '../exportUtils';

const PLATFORM_OPTIONS = Object.values(PLATFORMS).map(p => ({
  ...p,
  bg: `${p.color}18`,
  description: p.id === 'seatgeek' ? 'Real-time secondary market data'
    : p.id === 'ticketmaster' ? 'Primary & secondary inventory'
    : p.id === 'stubhub' ? "World's largest ticket marketplace"
    : p.id === 'vividseats' ? 'Secondary market pricing & trends'
    : 'Premium venue direct integrations',
  apiNote: p.id === 'ticketmaster' ? 'Enter Ticketmaster Developer API key below'
    : p.id === 'seatgeek' ? 'Enter your SeatGeek Client ID below'
    : 'Coming soon — partner API required',
}));

const EVENT_TYPES = [
  { value: 'sports', label: 'Sports' }, { value: 'concert', label: 'Concerts' },
  { value: 'theater', label: 'Theater' }, { value: 'comedy', label: 'Comedy' },
  { value: 'family', label: 'Family' }, { value: '', label: 'All Types' },
];

const SPORTS_TAXONOMY = [
  { value: '', label: 'All Sports' }, { value: 'nba', label: 'NBA' }, { value: 'nfl', label: 'NFL' },
  { value: 'mlb', label: 'MLB' }, { value: 'nhl', label: 'NHL' }, { value: 'mls', label: 'MLS' },
  { value: 'ncaa_football', label: 'NCAA Football' }, { value: 'ncaa_basketball', label: 'NCAA BB' },
  { value: 'boxing_mma', label: 'Boxing/MMA' },
];

export default function FetchTab({ onDataLoaded, add, setTab }) {
  const [activePlatform, setActivePlatform] = useState('seatgeek');
  const [seatgeekId, setSeatgeekId] = useState('');
  const [tmKey, setTmKey] = useState('');
  const [eventType, setEventType] = useState('sports');
  const [sportSub, setSportSub] = useState('');
  const [maxPages, setMaxPages] = useState(10);
  const [requirePrices] = useState(false);
  const [cityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [fetching, setFetching] = useState(false);
  const [log, setLog] = useState([]);
  const [fetchedRows, setFetchedRows] = useState([]);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);
  const logRef = useRef(null);

  const appendLog = useCallback((msg, cls = '') => {
    setLog(l => [...l, { msg, cls, id: Date.now() + Math.random() }]);
    setTimeout(() => logRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 30);
  }, []);

  const doFetch = useCallback(async () => {
    setFetching(true);
    setLog([]);
    setFetchedRows([]);
    setProgress(0);
    abortRef.current = false;

    try {
      const { rows, pricedCount } = await fetchPlatform(activePlatform, {
        keys: { seatgeek: seatgeekId, ticketmaster: tmKey },
        eventType, sportSub, cityFilter, stateFilter, maxPages, requirePrices,
        onLog: appendLog, onProgress: setProgress, abortRef,
      });
      setFetchedRows(rows);
      if (rows.length) add(`Fetched ${rows.length} events (${pricedCount} priced) from ${PLATFORMS[activePlatform]?.name}`);
    } catch (err) {
      appendLog(`✗ ${err.message}`, 'red');
    }
    setFetching(false);
    setProgress(100);
  }, [activePlatform, seatgeekId, tmKey, eventType, sportSub, maxPages, requirePrices, cityFilter, stateFilter, add, appendLog]);

  const doStop = () => { abortRef.current = true; };
  const doLoadIntoApp = () => {
    if (!fetchedRows.length) { add('Fetch data first', 'warn'); return; }
    onDataLoaded(fetchedRows);
    if (setTab) setTab('dashboard');
    add(`Loaded ${fetchedRows.length} events — run AI Audit on Dashboard.`);
  };
  const pricedCount = fetchedRows.filter(r => r.lowest_price).length;
  const plat = PLATFORM_OPTIONS.find(p => p.id === activePlatform);
  const isLive = plat?.available;

  return (
    <div className="fade fetch-terminal" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="ios-card fetch-platform-card" style={{ padding: '12px' }}>
        <div className="fetch-section-label">AI Data Platforms</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PLATFORM_OPTIONS.map(p => (
            <button key={p.id} type="button" onClick={() => setActivePlatform(p.id)} className={`fetch-platform-btn ${activePlatform === p.id ? 'active' : ''}`}
              style={{ borderColor: activePlatform === p.id ? p.color : undefined, background: activePlatform === p.id ? p.bg : undefined, opacity: p.available ? 1 : 0.55 }}>
              <div className="fetch-platform-code" style={{ color: p.color, borderColor: `${p.color}33`, background: p.bg }}>{p.code}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)' }}>{p.name}</span>
                  {!p.available && (
                    <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--a)', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '4px', padding: '1px 5px', letterSpacing: '0.5px' }}>COMING SOON</span>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--t3)' }}>{p.description}</div>
              </div>
              {activePlatform === p.id && p.available && <div className="fetch-live-dot" />}
            </button>
          ))}
        </div>
      </div>

      {!isLive ? (
        <div className="ios-card" style={{ padding: '24px 20px', textAlign: 'center', borderColor: 'rgba(245,166,35,0.25)', background: 'rgba(245,166,35,0.03)' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>🚧</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--a)', marginBottom: '6px' }}>{plat?.name} — Coming Soon</div>
          <div style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1.6, maxWidth: '280px', margin: '0 auto 14px' }}>
            {plat?.name} requires a partner-tier API agreement. This integration is in development.
            <br />In the meantime, export data from {plat?.name} as a CSV and upload it on the Dashboard.
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActivePlatform('seatgeek')} style={{ fontSize: '11px' }}>← Use SeatGeek instead</button>
        </div>
      ) : (
        <div className="card">
          <div className="card-hd">
            <div className="card-title">{plat?.name} Live Data Pull</div>
            <span className="mono" style={{ fontSize: '9px', color: 'var(--t3)' }}>{plat?.apiNote}</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              {activePlatform !== 'ticketmaster' ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="fetch-label">SeatGeek Client ID</div>
                  <div style={{ fontSize: '9.5px', color: 'var(--t3)', marginBottom: '4px' }}>
                    Get yours free at <a href="https://seatgeek.com/account/develop" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--b)' }}>seatgeek.com/account/develop</a>
                  </div>
                  <input className="fi" style={{ width: '100%', fontFamily: 'var(--fm)', fontSize: '12px' }} value={seatgeekId} onChange={e => setSeatgeekId(e.target.value)} placeholder="Paste your SeatGeek Client ID here" spellCheck={false} />
                </div>
              ) : (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="fetch-label">Ticketmaster API Key</div>
                  <div style={{ fontSize: '9.5px', color: 'var(--t3)', marginBottom: '4px' }}>
                    Get yours free at <a href="https://developer.ticketmaster.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--b)' }}>developer.ticketmaster.com</a>
                  </div>
                  <input className="fi" style={{ width: '100%', fontFamily: 'var(--fm)', fontSize: '12px' }} value={tmKey} onChange={e => setTmKey(e.target.value)} placeholder="Paste your Ticketmaster API key here" spellCheck={false} />
                </div>
              )}
              <div>
                <div className="fetch-label">Event Type</div>
                <select className="fi" style={{ width: '100%' }} value={eventType} onChange={e => setEventType(e.target.value)}>
                  {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <div className="fetch-label">Sport</div>
                <select className="fi" style={{ width: '100%' }} value={sportSub} onChange={e => setSportSub(e.target.value)} disabled={eventType !== 'sports'}>
                  {SPORTS_TAXONOMY.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <div className="fetch-label">Pages</div>
                <input className="fi" type="number" min={1} max={50} value={maxPages} onChange={e => setMaxPages(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div>
                <div className="fetch-label">State</div>
                <select className="fi" style={{ width: '100%' }} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
                  <option value="">Any</option>
                  {['NY','CA','TX','FL','PA','IL','GA','MA','WA','CO'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {!fetching
                ? <button type="button" className="analyze-btn" onClick={doFetch}>⬇ Pull from {plat?.name}</button>
                : <button type="button" className="analyze-btn" style={{ background: 'rgba(255,54,104,0.15)', borderColor: 'var(--p)', color: 'var(--p)' }} onClick={doStop}>⏹ Stop</button>}
              {fetchedRows.length > 0 && !fetching && (
                <>
                  <button type="button" className="dl-btn" onClick={() => exportCSV(fetchedRows, `${plat?.name}_Fetch.csv`, Object.keys(fetchedRows[0] || {}))}>↓ Export CSV</button>
                  <button type="button" className="dl-btn bl" onClick={doLoadIntoApp}>⚡ Load Dashboard</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {(fetching || log.length > 0) && (
        <div className="card">
          <div className="card-hd"><div className="card-title">Fetch Log</div>{fetching && <span className="mono" style={{ fontSize: '10px' }}>{progress}%</span>}</div>
          <div ref={logRef} className="fetch-log-panel">
            {log.map(l => <div key={l.id} className={`fetch-log-line ${l.cls}`}>{l.msg}</div>)}
          </div>
        </div>
      )}

      {fetchedRows.length > 0 && !fetching && (
        <div className="card">
          <div className="card-hd">
            <div className="card-title">{fetchedRows.length} Events ({pricedCount} priced)</div>
            <button type="button" className="dl-btn bl" onClick={doLoadIntoApp}>⚡ Load Dashboard</button>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Event</th><th>City</th><th>Floor</th><th>Platform</th></tr></thead>
              <tbody>
                {fetchedRows.slice(0, 6).map((r, i) => (
                  <tr key={i}>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</td>
                    <td>{r.city}</td>
                    <td className="mono blue">{r.lowest_price ? `$${Number(r.lowest_price).toFixed(0)}` : '—'}</td>
                    <td className="mono" style={{ fontSize: '9px' }}>{r.source_platform}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
