// ─── PriceGuard AI — Platform Fetch Layer ────────────────────────────────────
// Implements live data pulls for SeatGeek and Ticketmaster (free public endpoints).
// StubHub, Vivid Seats, and AXS map to CSV-upload guidance since they require
// partner-tier API agreements.

export const PLATFORMS = {
  seatgeek: {
    id: 'seatgeek',
    name: 'SeatGeek',
    code: 'SG',
    color: '#00d68f',
    available: true,
  },
  ticketmaster: {
    id: 'ticketmaster',
    name: 'Ticketmaster',
    code: 'TM',
    color: '#18a8ff',
    available: true, // free Discovery API key from developer.ticketmaster.com
  },
  stubhub: {
    id: 'stubhub',
    name: 'StubHub',
    code: 'SH',
    color: '#f5a623',
    available: false,
  },
  vividseats: {
    id: 'vividseats',
    name: 'Vivid Seats',
    code: 'VS',
    color: '#00e5cc',
    available: false,
  },
  axs: {
    id: 'axs',
    name: 'AXS',
    code: 'AX',
    color: '#8b5cf6',
    available: false,
  },
};

// ── SeatGeek ─────────────────────────────────────────────────────────────────
async function fetchSeatGeek({ keys, eventType, sportSub, cityFilter, stateFilter, maxPages, requirePrices, onLog, onProgress, abortRef }) {
  const clientId = keys.seatgeek?.trim();
  if (!clientId) throw new Error('Enter your SeatGeek Client ID first.');

  const rows = [];
  let pricedCount = 0;
  const maxP = Math.max(1, Math.min(50, maxPages));
  onLog?.(`▶ SeatGeek pull — type: ${eventType || 'all'}, pages: ${maxP}`, 'green');

  for (let page = 1; page <= maxP; page++) {
    if (abortRef?.current) { onLog?.('⏹ Stopped by user', 'amber'); break; }

    const params = new URLSearchParams({ client_id: clientId, per_page: '100', page: String(page) });
    if (eventType)          params.set('type', eventType);
    if (sportSub)           params.set('taxonomies.name', sportSub);
    if (cityFilter?.trim()) params.set('venue.city', cityFilter.trim());
    if (stateFilter?.trim()) params.set('venue.state', stateFilter.trim().toUpperCase());

    onLog?.(`  Page ${page}/${maxP}…`, 'muted');
    let data;
    try {
      const res = await fetch(`https://api.seatgeek.com/2/events?${params}`);
      if (!res.ok) {
        const txt = await res.text();
        onLog?.(`  ✗ HTTP ${res.status}: ${txt.slice(0, 100)}`, 'red');
        if (res.status === 401) onLog?.('  Check your Client ID at seatgeek.com/account/develop', 'red');
        break;
      }
      data = await res.json();
    } catch (err) {
      onLog?.(`  ✗ Network error: ${err.message}`, 'red');
      break;
    }

    const events = data.events || [];
    if (!events.length) { onLog?.(`  No more events.`, 'muted'); break; }

    let added = 0;
    for (const e of events) {
      const stats = e.stats || {};
      const lowest  = stats.lowest_price  ?? null;
      const average = stats.average_price ?? null;
      const highest = stats.highest_price ?? null;
      if (requirePrices && !lowest) continue;
      if (lowest) pricedCount++;
      added++;
      rows.push({
        event_id: String(e.id),
        title: e.title,
        datetime: e.datetime_local,
        venue: e.venue?.name ?? '',
        city: e.venue?.city ?? '',
        state: e.venue?.state ?? '',
        country: e.venue?.country ?? '',
        event_type: e.type ?? eventType,
        lowest_price: lowest,
        average_price: average,
        highest_price: highest,
        listing_count: stats.listing_count ?? null,
        popularity: e.popularity ?? 0,
        source_platform: 'SeatGeek',
      });
    }
    onProgress?.(Math.round((page / maxP) * 100));
    onLog?.(`  ✓ Page ${page}: ${events.length} events, ${added} kept`, 'green');
    await new Promise(r => setTimeout(r, 300));
  }

  onLog?.(`\n✓ Done — ${rows.length} events, ${pricedCount} with prices`, 'green');
  return { rows, pricedCount };
}

// ── Ticketmaster Discovery API ────────────────────────────────────────────────
const TM_CLASSIFICATION_MAP = {
  sports:  '0',
  concert: 'KZFzniwnSyZfZ7v7nJ',
  theater: 'KZFzniwnSyZfZ7v7na',
  comedy:  'KZFzniwnSyZfZ7v7nb',
  family:  'KZFzniwnSyZfZ7v7nE',
};

async function fetchTicketmaster({ keys, eventType, stateFilter, maxPages, onLog, onProgress, abortRef }) {
  const apiKey = keys.ticketmaster?.trim();
  if (!apiKey) throw new Error('Enter your Ticketmaster API key. Get a free one at developer.ticketmaster.com.');

  const rows = [];
  let pricedCount = 0;
  const maxP = Math.max(1, Math.min(50, maxPages));
  onLog?.(`▶ Ticketmaster Discovery pull — pages: ${maxP}`, 'green');

  for (let page = 0; page < maxP; page++) {
    if (abortRef?.current) { onLog?.('⏹ Stopped', 'amber'); break; }

    const params = new URLSearchParams({ apikey: apiKey, size: '100', page: String(page), sort: 'relevance,desc' });
    if (eventType && TM_CLASSIFICATION_MAP[eventType]) params.set('classificationId', TM_CLASSIFICATION_MAP[eventType]);
    if (stateFilter?.trim()) params.set('stateCode', stateFilter.trim().toUpperCase());

    onLog?.(`  Page ${page + 1}/${maxP}…`, 'muted');
    let data;
    try {
      const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
      if (!res.ok) {
        const txt = await res.text();
        onLog?.(`  ✗ HTTP ${res.status}: ${txt.slice(0, 140)}`, 'red');
        if (res.status === 401) onLog?.('  Check your API key at developer.ticketmaster.com', 'red');
        break;
      }
      data = await res.json();
    } catch (err) {
      onLog?.(`  ✗ Network error: ${err.message}`, 'red');
      break;
    }

    const events = data._embedded?.events || [];
    if (!events.length) { onLog?.(`  No more events.`, 'muted'); break; }

    let added = 0;
    for (const e of events) {
      const venue  = e._embedded?.venues?.[0] || {};
      const prices = e.priceRanges || [];
      const lowest  = prices.length ? prices.reduce((m, p) => Math.min(m, p.min || Infinity), Infinity) : null;
      const highest = prices.length ? prices.reduce((m, p) => Math.max(m, p.max || 0), 0) : null;
      const average = lowest && highest ? (lowest + highest) / 2 : null;
      const realLowest  = isFinite(lowest)  ? lowest  : null;
      const realHighest = highest > 0       ? highest : null;
      if (realLowest) pricedCount++;
      added++;
      rows.push({
        event_id: e.id,
        title: e.name,
        datetime: e.dates?.start?.localDate ? `${e.dates.start.localDate}T${e.dates.start.localTime || '00:00:00'}` : '',
        venue: venue.name ?? '',
        city:  venue.city?.name ?? '',
        state: venue.state?.stateCode ?? '',
        country: venue.country?.countryCode ?? '',
        event_type: eventType || e.classifications?.[0]?.segment?.name || '',
        lowest_price:  realLowest,
        average_price: average,
        highest_price: realHighest,
        listing_count: null,
        popularity: (e.score || 0) / 100,
        source_platform: 'Ticketmaster',
      });
    }

    onProgress?.(Math.round(((page + 1) / maxP) * 100));
    onLog?.(`  ✓ Page ${page + 1}: ${events.length} events, ${added} added`, 'green');
    await new Promise(r => setTimeout(r, 250));
  }

  onLog?.(`\n✓ Done — ${rows.length} events, ${pricedCount} with prices`, 'green');
  return { rows, pricedCount };
}

// ── Main dispatch ─────────────────────────────────────────────────────────────
export async function fetchPlatform(platformId, opts) {
  switch (platformId) {
    case 'seatgeek':     return fetchSeatGeek(opts);
    case 'ticketmaster': return fetchTicketmaster(opts);
    default: {
      opts.onLog?.(`${PLATFORMS[platformId]?.name || platformId} requires a partner API key. Export data from their platform as CSV and upload it here.`, 'amber');
      return { rows: [], pricedCount: 0 };
    }
  }
}
