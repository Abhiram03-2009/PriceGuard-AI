import React, { useState, useRef, useCallback } from 'react';

const SEATGEEK_PROXY = 'https://api.seatgeek.com/2/events';

const EVENT_TYPES = [
  { value: 'sports',    label: 'Sports' },
  { value: 'concert',   label: 'Concerts' },
  { value: 'theater',   label: 'Theater' },
  { value: 'comedy',    label: 'Comedy' },
  { value: 'family',    label: 'Family' },
  { value: '',          label: 'All Types' },
];

const SPORTS_TAXONOMY = [
  { value: '',                    label: 'All Sports' },
  { value: 'nba',                 label: 'NBA Basketball' },
  { value: 'nfl',                 label: 'NFL Football' },
  { value: 'mlb',                 label: 'MLB Baseball' },
  { value: 'nhl',                 label: 'NHL Hockey' },
  { value: 'mls',                 label: 'MLS Soccer' },
  { value: 'ncaa_football',       label: 'NCAA Football' },
  { value: 'ncaa_basketball',     label: 'NCAA Basketball' },
  { value: 'boxing_mma',          label: 'Boxing / MMA' },
  { value: 'horse_racing',        label: 'Horse Racing' },
  { value: 'motorsports',         label: 'Motorsports' },
];

function dlCSVRaw(rows, filename) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const lines = [
    cols.join(','),
    ...rows.map(r => cols.map(c => {
      const v = r[c];
      if (v === null || v === undefined) return '';
      if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) return `"${v.replace(/"/g, '""')}"`;
      return String(v);
    }).join(','))
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function FetchTab({ onDataLoaded, add }) {
  const [clientId,    setClientId]    = useState('NTUxNzM5NjJ8MTc2NjkyNjQzNy4yMDE5MTAz');
  const [eventType,   setEventType]   = useState('sports');
  const [sportSub,    setSportSub]    = useState('');
  const [maxPages,    setMaxPages]    = useState(10);
  const [requirePrices, setRequirePrices] = useState(false);
  const [cityFilter,  setCityFilter]  = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [fetching,    setFetching]    = useState(false);
  const [log,         setLog]         = useState([]);
  const [fetchedRows, setFetchedRows] = useState([]);
  const [progress,    setProgress]    = useState(0);
  const [totalPages,  setTotalPages]  = useState(0);
  const abortRef = useRef(false);
  const logRef = useRef(null);

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
    setTotalPages(maxP);

    appendLog(`▶ Starting SeatGeek pull — type: ${eventType || 'all'}, pages: ${maxP}`, 'green');
    appendLog(`  Client ID: ${clientId.slice(0, 12)}…`, 'muted');
    if (requirePrices) appendLog('  Filter: events with real prices only', 'muted');

    while (page <= maxP && !abortRef.current) {
      const params = new URLSearchParams({
        client_id: clientId.trim(),
        per_page: '100',
        page: String(page),
      });
      if (eventType)   params.set('type', eventType);
      if (sportSub)    params.set('taxonomies.name', sportSub);
      if (cityFilter.trim())  params.set('venue.city', cityFilter.trim());
      if (stateFilter.trim()) params.set('venue.state', stateFilter.trim().toUpperCase());

      const url = `${SEATGEEK_PROXY}?${params}`;
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
        appendLog('  (CORS note: SeatGeek API allows browser requests — if blocked, run extract_seatgeek.py locally)', 'muted');
        break;
      }

      const events = data.events || [];
      if (!events.length) {
        appendLog(`  No more events on page ${page}`, 'muted');
        break;
      }

      let pageAdded = 0;
      for (const e of events) {
        const stats = e.stats || {};
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
          city:          e.venue?.city ?? '',
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

      // slight delay to be kind to the API
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

    if (rows.length > 0) {
      add(`Fetched ${rows.length} events (${pricedCount} priced) from SeatGeek`);
    }
  }, [clientId, eventType, sportSub, maxPages, requirePrices, cityFilter, stateFilter, add, appendLog]);

  const doStop = () => { abortRef.current = true; };

  const doDownload = () => {
    if (!fetchedRows.length) return;
    const date = new Date().toISOString().split('T')[0];
    dlCSVRaw(fetchedRows, `seatgeek_${eventType || 'all'}_${date}.csv`);
    add('CSV downloaded');
  };

  const doLoadIntoApp = () => {
    if (!fetchedRows.length) { add('Fetch data first', 'warn'); return; }
    onDataLoaded(fetchedRows);
    add(`Loaded ${fetchedRows.length} events into dashboard — run AI Analysis to proceed`);
  };

  const pricedCount = fetchedRows.filter(r => r.lowest_price).length;

  return (
    <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>

      {/* ── CONFIG CARD ── */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">SeatGeek Live Data Pull</div>
          <span className="mono" style={{ fontSize: '9px', color: 'var(--t3)' }}>
            Fetches directly from api.seatgeek.com
          </span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.2rem', marginBottom: '1.2rem' }}>

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
                Get yours free at{" "}
<span style={{ color: 'var(--b)' }}>
  <a
    href="https://seatgeek.com/account/develop?msockid=283d79dc12ce6da01fbc6d7c13c96cbc"
    target="_blank"
    rel="noopener noreferrer"
    style={{ color: 'inherit', textDecoration: 'underline' }}
  >
    SeatGeek Public API
  </a>
</span>
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
              <div className="fetch-label">Pages <span style={{ color: 'var(--t3)' }}>(100 events/page)</span></div>
              <input
                className="fi"
                style={{ width: '100%' }}
                type="number"
                min={1}
                max={50}
                value={maxPages}
                onChange={e => setMaxPages(Number(e.target.value))}
              />
            </div>

            {/* City filter */}
            <div>
              <div className="fetch-label">
                City <span style={{ color: 'var(--t3)' }}>(optional)</span>
              </div>
              <input
                className="fi"
                style={{ width: '100%' }}
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                placeholder="e.g. New York"
              />
            </div>

            {/* State filter */}
            <div>
              <div className="fetch-label">
                State <span style={{ color: 'var(--t3)' }}>(optional)</span>
              </div>
              <select
                className="fi"
                style={{ width: '100%' }}
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value)}
              >
                <option value="">Select a state</option>
                {[
                  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
                  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
                  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
                  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
                  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
                ].map(state => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Require prices toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label className="toggle-wrap">
                <input type="checkbox" checked={requirePrices} onChange={e => setRequirePrices(e.target.checked)} style={{ display: 'none' }} />
                <div className={`toggle ${requirePrices ? 'on' : ''}`}>
                  <div className="toggle-knob" />
                </div>
              </label>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--t1)', fontWeight: 600 }}>Priced events only</div>
                <div style={{ fontSize: '10px', color: 'var(--t3)', fontFamily: 'var(--fm)' }}>Skip events with no listing prices</div>
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!fetching
              ? <button className="analyze-btn" onClick={doFetch}>⬇ Pull from SeatGeek</button>
              : <button className="analyze-btn" style={{ background: 'rgba(255,54,104,0.15)', borderColor: 'var(--p)', color: 'var(--p)' }} onClick={doStop}>⏹ Stop</button>
            }
            {fetchedRows.length > 0 && !fetching && (
              <>
                <button className="dl-btn" onClick={doDownload}>↓ Download CSV ({fetchedRows.length} rows)</button>
                <button className="dl-btn bl" onClick={doLoadIntoApp}>⚡ Load into Dashboard</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── PROGRESS + LOG ── */}
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
          <div
            ref={logRef}
            style={{
              padding: '1rem 1.35rem', fontFamily: 'var(--fm)', fontSize: '11.5px', lineHeight: 1.9,
              maxHeight: 280, overflowY: 'auto', background: 'rgba(0,0,0,0.25)',
            }}
          >
            {log.map(l => (
              <div key={l.id} style={{ color: l.cls === 'green' ? 'var(--g)' : l.cls === 'red' ? 'var(--p)' : l.cls === 'amber' ? 'var(--a)' : 'var(--t3)' }}>
                {l.msg}
              </div>
            ))}
            {fetching && <span style={{ color: 'var(--b)', animation: 'pulse 1s infinite' }}>▋</span>}
          </div>
        </div>
      )}

      {/* ── RESULTS SUMMARY ── */}
      {fetchedRows.length > 0 && !fetching && (
        <div className="card">
          <div className="card-hd">
            <div className="card-title">Fetch Results</div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button className="dl-btn" onClick={doDownload}>↓ Download CSV</button>
              <button className="dl-btn bl" onClick={doLoadIntoApp}>⚡ Load into Dashboard → Run Analysis</button>
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

            {/* Preview table */}
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
                      <td className="mono" style={{ color: r.lowest_price ? 'var(--b)' : 'var(--t3)' }}>
                        {r.lowest_price ? '$' + Number(r.lowest_price).toFixed(0) : '—'}
                      </td>
                      <td className="mono" style={{ color: r.average_price ? 'var(--a)' : 'var(--t3)' }}>
                        {r.average_price ? '$' + Number(r.average_price).toFixed(0) : '—'}
                      </td>
                      <td className="mono" style={{ color: 'var(--t2)' }}>
                        {r.highest_price ? '$' + Number(r.highest_price).toFixed(0) : '—'}
                      </td>
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
                SeatGeek only returns prices for events with active secondary market listings. Try fetching concerts or NBA/NFL events — those typically have more coverage. The ML engine will synthesize prices from popularity if real prices are missing.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
