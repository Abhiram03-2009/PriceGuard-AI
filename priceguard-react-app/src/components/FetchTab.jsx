import React, { useState, useRef, useCallback } from 'react';

const SEATGEEK_API = 'https://api.seatgeek.com/2/events';

const PLATFORM_OPTIONS = [
  {
    id: 'seatgeek',
    name: 'SeatGeek',
    code: 'SG',
    color: '#00d68f',
    bg: 'rgba(0,214,143,0.09)',
    description: 'Real-time secondary market data',
    apiNote: 'Live API — public key available free',
    available: true,
  },
  {
    id: 'ticketmaster',
    name: 'Ticketmaster',
    code: 'TM',
    color: '#18a8ff',
    bg: 'rgba(24,168,255,0.09)',
    description: 'Primary & secondary inventory',
    apiNote: 'Requires Ticketmaster Developer API key',
    available: false,
  },
  {
    id: 'stubhub',
    name: 'StubHub',
    code: 'SH',
    color: '#f5a623',
    bg: 'rgba(245,166,35,0.09)',
    description: "World's largest ticket marketplace",
    apiNote: 'Requires StubHub Partner API key',
    available: false,
  },
  {
    id: 'vividseats',
    name: 'Vivid Seats',
    code: 'VS',
    color: '#00e5cc',
    bg: 'rgba(0,229,204,0.09)',
    description: 'Secondary market pricing & trends',
    apiNote: 'Requires Vivid Seats Publisher API key',
    available: false,
  },
  {
    id: 'axs',
    name: 'AXS',
    code: 'AX',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.09)',
    description: 'Premium venue direct integrations',
    apiNote: 'Requires AXS Partner Portal access',
    available: false,
  },
];

const EVENT_TYPES = [
  { value: 'sports',  label: 'Sports'  },
  { value: 'concert', label: 'Concerts'},
  { value: 'theater', label: 'Theater' },
  { value: 'comedy',  label: 'Comedy'  },
  { value: 'family',  label: 'Family'  },
  { value: '',        label: 'All Types'},
];

const SPORTS_TAXONOMY = [
  { value: '',                  label: 'All Sports'       },
  { value: 'nba',               label: 'NBA Basketball'   },
  { value: 'nfl',               label: 'NFL Football'     },
  { value: 'mlb',               label: 'MLB Baseball'     },
  { value: 'nhl',               label: 'NHL Hockey'       },
  { value: 'mls',               label: 'MLS Soccer'       },
  { value: 'ncaa_football',     label: 'NCAA Football'    },
  { value: 'ncaa_basketball',   label: 'NCAA Basketball'  },
  { value: 'boxing_mma',        label: 'Boxing / MMA'     },
  { value: 'horse_racing',      label: 'Horse Racing'     },
  { value: 'motorsports',       label: 'Motorsports'      },
];

export default function FetchTab({ onDataLoaded, add, setPreviewData, setTab }) {
  const [activePlatform, setActivePlatform] = useState('seatgeek');
  const [clientId,       setClientId]       = useState('NTUxNzM5NjJ8MTc2NjkyNjQzNy4yMDE5MTAz');
  const [eventType,      setEventType]      = useState('sports');
  const [sportSub,       setSportSub]       = useState('');
  const [maxPages,       setMaxPages]       = useState(10);
  const [requirePrices,  setRequirePrices]  = useState(false);
  const [cityFilter,     setCityFilter]     = useState('');
  const [stateFilter,    setStateFilter]    = useState('');
  const [fetching,       setFetching]       = useState(false);
  const [log,            setLog]            = useState([]);
  const [fetchedRows,    setFetchedRows]    = useState([]);
  const [progress,       setProgress]       = useState(0);
  const abortRef = useRef(false);
  const logRef   = useRef(null);

  const appendLog = useCallback((msg, cls = '') => {
    setLog(l => [...l, { msg, cls, id: Date.now() + Math.random() }]);
    setTimeout(() => logRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 30);
  }, []);

  const doFetch = useCallback(async () => {
    if (!clientId.trim()) { add('Enter your SeatGeek Client ID', 'warn'); return; }
    setFetching(true);
    setLog([]);
    setFetchedRows([]);
    setProgress(0);
    abortRef.current = false;

    const rows = [];
    let page = 1;
    let pricedCount = 0;
    const maxP = Math.max(1, Math.min(50, maxPages));

    appendLog(`▶ Starting SeatGeek pull — type: ${eventType || 'all'}, pages: ${maxP}`, 'green');
    appendLog(`  Client ID: ${clientId.slice(0, 12)}…`, 'muted');
    if (requirePrices) appendLog('  Filter: events with real prices only', 'muted');

    while (page <= maxP && !abortRef.current) {
      const params = new URLSearchParams({
        client_id: clientId.trim(),
        per_page: '100',
        page: String(page),
      });
      if (eventType)          params.set('type', eventType);
      if (sportSub)           params.set('taxonomies.name', sportSub);
      if (cityFilter.trim())  params.set('venue.city', cityFilter.trim());
      if (stateFilter.trim()) params.set('venue.state', stateFilter.trim().toUpperCase());

      const url = `${SEATGEEK_API}?${params}`;
      appendLog(`  Page ${page}/${maxP} — fetching…`, 'muted');

      let data;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          const txt = await res.text();
          appendLog(`  ✗ HTTP ${res.status}: ${txt.slice(0, 120)}`, 'red');
          if (res.status === 401) appendLog('  Check your Client ID', 'red');
          break;
        }
        data = await res.json();
      } catch (err) {
        appendLog(`  ✗ Network error: ${err.message}`, 'red');
        appendLog('  (CORS: SeatGeek allows browser requests. If blocked, run extract_seatgeek.py locally)', 'muted');
        break;
      }

      const events = data.events || [];
      if (!events.length) { appendLog(`  No more events on page ${page}`, 'muted'); break; }

      let pageAdded = 0;
      for (const e of events) {
        const stats   = e.stats || {};
        const lowest  = stats.lowest_price  ?? null;
        const average = stats.average_price ?? null;
        const highest = stats.highest_price ?? null;
        const listing = stats.listing_count ?? null;

        if (requirePrices && !lowest) continue;
        if (lowest) pricedCount++;
        pageAdded++;

        rows.push({
          event_id:      e.id,
          title:         e.title,
          datetime:      e.datetime_local,
          venue:         e.venue?.name ?? '',
          city:          e.venue?.city  ?? '',
          state:         e.venue?.state ?? '',
          country:       e.venue?.country ?? '',
          event_type:    e.type ?? eventType,
          lowest_price:  lowest,
          average_price: average,
          highest_price: highest,
          listing_count: listing,
          popularity:    e.popularity ?? 0,
        });
      }

      const pct = Math.round((page / maxP) * 100);
      setProgress(pct);
      appendLog(`  ✓ Page ${page}: ${events.length} events, ${pageAdded} kept (${pricedCount} with prices total)`, 'green');
      page++;
      await new Promise(r => setTimeout(r, 350));
    }

    if (abortRef.current) {
      appendLog('⏹ Fetch stopped by user', 'amber');
    } else {
      appendLog(`\n✓ Done — ${rows.length} total events, ${pricedCount} with real prices`, 'green');
    }

    setFetchedRows(rows);
    setFetching(false);
    setProgress(100);
    if (rows.length > 0) add(`Fetched ${rows.length} events (${pricedCount} priced) from SeatGeek`);
  }, [clientId, eventType, sportSub, maxPages, requirePrices, cityFilter, stateFilter, add, appendLog]);

  const doStop       = () => { abortRef.current = true; };
  const doLoadIntoApp = () => {
    if (!fetchedRows.length) { add('Fetch data first', 'warn'); return; }
    onDataLoaded(fetchedRows);
    if (setTab) setTab('dashboard');
    add(`Loaded ${fetchedRows.length} events! Redirected to Dashboard to run AI Analysis.`);
  };
  const pricedCount = fetchedRows.filter(r => r.lowest_price).length;

  return (
    <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Platform Selector */}
      <div className="ios-card" style={{ padding: '12px' }}>
        <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
          Select Data Platform
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PLATFORM_OPTIONS.map(p => (
            <button
              key={p.id}
              onClick={() => p.available && setActivePlatform(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '10px',
                border: activePlatform === p.id ? `1px solid ${p.color}` : '1px solid var(--b1)',
                background: activePlatform === p.id ? p.bg : 'var(--bg3)',
                cursor: p.available ? 'pointer' : 'default',
                opacity: p.available ? 1 : 0.5,
                transition: 'all 0.18s',
                textAlign: 'left', width: '100%',
              }}
              aria-label={`Select ${p.name}`}
              disabled={!p.available}
            >
              {/* Platform badge */}
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--fnav)', fontSize: '11px', fontWeight: '900',
                color: p.color, background: p.bg, border: `1px solid ${p.color}33`,
              }}>{p.code}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t1)' }}>{p.name}</span>
                  {!p.available && (
                    <span style={{ fontFamily: 'var(--fm)', fontSize: '8px', color: 'var(--a)', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', padding: '1px 5px', borderRadius: '3px' }}>
                      Coming Soon
                    </span>
                  )}
                  {activePlatform === p.id && p.available && (
                    <span style={{ fontFamily: 'var(--fm)', fontSize: '8px', color: p.color, background: `${p.color}15`, padding: '1px 5px', borderRadius: '3px' }}>
                      Active
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--t3)' }}>{p.description}</div>
                <div style={{ fontFamily: 'var(--fm)', fontSize: '8.5px', color: 'var(--t3)', marginTop: '2px' }}>{p.apiNote}</div>
              </div>

              {p.available && activePlatform === p.id && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--g)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* SeatGeek Config (only shown when SG is active) */}
      {activePlatform === 'seatgeek' && (
        <div className="card">
          <div className="card-hd">
            <div className="card-title">SeatGeek Live Data Pull</div>
            <span className="mono" style={{ fontSize: '9px', color: 'var(--t3)' }}>api.seatgeek.com</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>

              {/* Client ID */}
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="fetch-label">SeatGeek Client ID</div>
                <input
                  className="fi"
                  style={{ width: '100%', fontFamily: 'var(--fm)', fontSize: '12px' }}
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder="Paste your client_id here…"
                  spellCheck={false}
                />
                <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: 5, fontFamily: 'var(--fm)' }}>
                  Get yours free at{' '}
                  <a href="https://seatgeek.com/account/develop" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--b)', textDecoration: 'underline' }}>
                    SeatGeek Public API
                  </a>
                </div>
              </div>

              {/* Event Type */}
              <div>
                <div className="fetch-label">Event Type</div>
                <select className="fi" style={{ width: '100%' }} value={eventType} onChange={e => setEventType(e.target.value)}>
                  {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Sport sub-type */}
              <div>
                <div className="fetch-label">Sport <span style={{ color: 'var(--t3)' }}>(sports only)</span></div>
                <select className="fi" style={{ width: '100%' }} value={sportSub} onChange={e => setSportSub(e.target.value)} disabled={eventType !== 'sports'}>
                  {SPORTS_TAXONOMY.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Pages */}
              <div>
                <div className="fetch-label">Pages <span style={{ color: 'var(--t3)' }}>(100/page)</span></div>
                <input className="fi" style={{ width: '100%' }} type="number" min={1} max={50} value={maxPages} onChange={e => setMaxPages(Number(e.target.value))} />
              </div>

              {/* City */}
              <div>
                <div className="fetch-label">City <span style={{ color: 'var(--t3)' }}>(optional)</span></div>
                <input className="fi" style={{ width: '100%' }} value={cityFilter} onChange={e => setCityFilter(e.target.value)} placeholder="e.g. New York" />
              </div>

              {/* State */}
              <div>
                <div className="fetch-label">State <span style={{ color: 'var(--t3)' }}>(optional)</span></div>
                <select className="fi" style={{ width: '100%' }} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
                  <option value="">Select a state</option>
                  {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Priced toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label className="toggle-wrap">
                  <input type="checkbox" checked={requirePrices} onChange={e => setRequirePrices(e.target.checked)} style={{ display: 'none' }} />
                  <div className={`toggle ${requirePrices ? 'on' : ''}`}><div className="toggle-knob" /></div>
                </label>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--t1)', fontWeight: 600 }}>Priced events only</div>
                  <div style={{ fontSize: '10px', color: 'var(--t3)', fontFamily: 'var(--fm)' }}>Skip events without listing prices</div>
                </div>
              </div>

            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {!fetching
                ? <button className="analyze-btn" onClick={doFetch}>⬇ Pull from SeatGeek</button>
                : <button className="analyze-btn" style={{ background: 'rgba(255,54,104,0.15)', borderColor: 'var(--p)', color: 'var(--p)' }} onClick={doStop}>⏹ Stop</button>
              }
              {fetchedRows.length > 0 && !fetching && (
                <>
                  <button className="dl-btn" onClick={() => setPreviewData({ name: 'SeatGeek_Fetch.csv', rows: fetchedRows })}>↓ Preview &amp; Download ({fetchedRows.length})</button>
                  <button className="dl-btn bl" onClick={doLoadIntoApp}>⚡ Load Dashboard</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress + Log */}
      {(fetching || log.length > 0) && (
        <div className="card">
          <div className="card-hd">
            <div className="card-title">Fetch Log</div>
            {fetching && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="spinner" />
                <span className="mono" style={{ fontSize: '10px', color: 'var(--t3)' }}>{progress}%</span>
              </div>
            )}
          </div>
          {fetching && (
            <div style={{ padding: '0 1.2rem' }}>
              <div className="prog-wrap" style={{ height: 3, margin: '8px 0' }}>
                <div className="prog" style={{ width: progress + '%', background: 'linear-gradient(90deg,var(--bd),var(--b))' }} />
              </div>
            </div>
          )}
          <div ref={logRef} style={{ padding: '1rem 1.35rem', fontFamily: 'var(--fm)', fontSize: '11.5px', lineHeight: 1.9, maxHeight: 280, overflowY: 'auto', background: 'rgba(0,0,0,0.25)' }}>
            {log.map(l => (
              <div key={l.id} style={{ color: l.cls === 'green' ? 'var(--g)' : l.cls === 'red' ? 'var(--p)' : l.cls === 'amber' ? 'var(--a)' : 'var(--t3)' }}>{l.msg}</div>
            ))}
            {fetching && <span style={{ color: 'var(--b)', animation: 'pulse 1s infinite' }}>▋</span>}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {fetchedRows.length > 0 && !fetching && (
        <div className="card">
          <div className="card-hd">
            <div className="card-title">Fetch Results</div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button className="dl-btn" onClick={() => setPreviewData({ name: 'SeatGeek_Fetch.csv', rows: fetchedRows })}>↓ Preview &amp; Download</button>
              <button className="dl-btn bl" onClick={doLoadIntoApp}>⚡ Load Dashboard</button>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.2rem' }}>
              {[
                { lbl: 'Total Events',   val: fetchedRows.length,                                                              cl: 'blue'  },
                { lbl: 'With Prices',    val: pricedCount,                                                                     cl: 'green' },
                { lbl: 'No Prices',      val: fetchedRows.length - pricedCount,                                                cl: 'amber' },
                { lbl: 'Price Coverage', val: fetchedRows.length ? (pricedCount / fetchedRows.length * 100).toFixed(0) + '%' : '—', cl: 'cyan'  },
              ].map((m, i) => (
                <div key={i} style={{ background: 'rgba(24,168,255,0.04)', border: '1px solid var(--b1)', borderRadius: 8, padding: '10px 13px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Syne'", fontSize: '22px', fontWeight: 700, color: `var(--${m.cl})` }}>{m.val}</div>
                  <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{m.lbl}</div>
                </div>
              ))}
            </div>

            <div className="sec-lbl">Preview (first 8 rows)</div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr>
                  <th>Event</th><th>Venue</th><th>City</th>
                  <th>Floor $</th><th>Avg $</th><th>High $</th>
                  <th>Listings</th><th>Popularity</th>
                </tr></thead>
                <tbody>
                  {fetchedRows.slice(0, 8).map((r, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.title}>{r.title}</td>
                      <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.venue}</td>
                      <td className="mono" style={{ fontSize: '11px' }}>{r.city}, {r.state}</td>
                      <td className="mono" style={{ color: r.lowest_price ? 'var(--b)' : 'var(--t3)' }}>{r.lowest_price ? '$' + Number(r.lowest_price).toFixed(0) : '—'}</td>
                      <td className="mono" style={{ color: r.average_price ? 'var(--a)' : 'var(--t3)' }}>{r.average_price ? '$' + Number(r.average_price).toFixed(0) : '—'}</td>
                      <td className="mono" style={{ color: 'var(--t2)' }}>{r.highest_price ? '$' + Number(r.highest_price).toFixed(0) : '—'}</td>
                      <td className="mono">{r.listing_count ?? '—'}</td>
                      <td className="mono blue">{Number(r.popularity).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {fetchedRows.length > 8 && (
              <div style={{ fontFamily: 'var(--fm)', fontSize: '10px', color: 'var(--t3)', marginTop: 7 }}>
                +{fetchedRows.length - 8} more rows in download
              </div>
            )}

            {pricedCount === 0 && (
              <div className="insight warn" style={{ marginTop: '1rem' }}>
                <div className="insight-lbl warn">No Price Data Returned</div>
                SeatGeek only returns prices for events with active secondary market listings. Try fetching concerts or NBA/NFL events — those typically have better coverage. The ML engine will synthesize prices from popularity if real prices are missing.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
