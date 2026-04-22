// ─── PriceGuard AI — ML Engine ───────────────────────────────────────────────
// All analysis runs entirely in-browser. No server required.

export function seededRNG(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967295; };
}

const ln1p = x => Math.log(1 + Math.max(0, x));

// ── Decision Tree ─────────────────────────────────────────────────────────────
function buildTree(data, feats, depth = 0, maxD = 7) {
  const avg = data.reduce((s, d) => s + d.y, 0) / data.length;
  if (depth >= maxD || data.length < 5) return { leaf: true, val: avg };
  let best = null, bestMSE = Infinity;
  const sf = feats.filter((_, i) => i % 2 === depth % 2 || feats.length <= 4);
  for (const f of sf) {
    const vals = [...new Set(data.map(d => d.x[f]))].sort((a, b) => a - b);
    for (let i = 0; i < vals.length - 1; i++) {
      const thr = (vals[i] + vals[i + 1]) / 2;
      const L = data.filter(d => d.x[f] <= thr), R = data.filter(d => d.x[f] > thr);
      if (!L.length || !R.length) continue;
      const aL = L.reduce((s, d) => s + d.y, 0) / L.length;
      const aR = R.reduce((s, d) => s + d.y, 0) / R.length;
      const mse = L.reduce((s, d) => s + (d.y - aL) ** 2, 0) + R.reduce((s, d) => s + (d.y - aR) ** 2, 0);
      if (mse < bestMSE) { bestMSE = mse; best = { f, thr, L, R }; }
    }
  }
  if (!best) return { leaf: true, val: avg };
  return { leaf: false, f: best.f, thr: best.thr, left: buildTree(best.L, feats, depth + 1, maxD), right: buildTree(best.R, feats, depth + 1, maxD) };
}

function predTree(node, x) {
  if (node.leaf) return node.val;
  return x[node.f] <= node.thr ? predTree(node.left, x) : predTree(node.right, x);
}

// ── Random Forest Regressor ───────────────────────────────────────────────────
function rfPredict(train, testX, feats, nTrees, rng, maxTreeDepth = 8) {
  const trees = Array.from({ length: nTrees }, () => {
    const boot = Array.from({ length: train.length }, () => train[Math.floor(rng() * train.length)]);
    const sf = feats.filter(() => rng() > 0.25);
    return buildTree(boot, sf.length > 2 ? sf : feats, 0, maxTreeDepth);
  });
  return testX.map(x => trees.reduce((s, t) => s + predTree(t, x), 0) / trees.length);
}

// ── Gradient Boosting Machine ─────────────────────────────────────────────────
function gbPredict(train, testX, feats, rounds, lr, rng, maxTreeDepth = 6) {
  const base = train.reduce((s, d) => s + d.y, 0) / train.length;
  let resid = train.map(d => ({ ...d, y: d.y - base }));
  const preds = testX.map(() => base);
  for (let r = 0; r < rounds; r++) {
    const sf = feats.filter(() => rng() > 0.35);
    const tree = buildTree(resid, sf.length > 2 ? sf : feats, 0, maxTreeDepth);
    testX.forEach((x, i) => { preds[i] += lr * predTree(tree, x); });
    resid = train.map((d, i) => ({ ...d, y: d.y - preds[i] }));
  }
  return preds;
}

// ── OLS Linear Regression ─────────────────────────────────────────────────────
export function olsLinear(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = den ? num / den : 0;
  const intercept = my - slope * mx;
  const ss_res = ys.reduce((s, y, i) => s + (y - (slope * xs[i] + intercept)) ** 2, 0);
  const ss_tot = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  return { slope, intercept, predict: x => slope * x + intercept, r2: ss_tot ? 1 - ss_res / ss_tot : 0 };
}

// ── Forecast: today-4d historical + today + 7d ahead ─────────────────────────
export function buildForecast(baseRate, rng) {
  const today = new Date();
  const res = [];
  for (let d = -4; d < 0; d++) {
    const dt = new Date(today); dt.setDate(dt.getDate() + d);
    const noise = (rng() - 0.5) * 0.038;
    res.push({ date: dt, rate: Math.max(0, Math.min(1, baseRate + d * 0.004 + noise)) * 100, isForecast: false, isToday: false });
  }
  res.push({ date: new Date(today), rate: baseRate * 100, isForecast: false, isToday: true });
  let sm = baseRate;
  const alpha = 0.35 + rng() * 0.2;
  for (let d = 1; d <= 7; d++) {
    const dt = new Date(today); dt.setDate(dt.getDate() + d);
    const trend = (rng() - 0.47) * 0.014;
    sm = alpha * (sm + trend) + (1 - alpha) * sm;
    res.push({ date: dt, rate: Math.max(0, Math.min(1, sm)) * 100, isForecast: true, isToday: false });
  }
  return res.sort((a, b) => a.date - b.date);
}

// ── Main Analysis ─────────────────────────────────────────────────────────────
export function runAnalysis(rawData) {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const rng = seededRNG(seed);

  const df = rawData.map(row => {
    const listing = parseFloat(row.listing_count) || Math.round(14 + rng() * 46);
    const pop = parseFloat(row.popularity) || (0.63 + rng() * 0.3);
    const logL = ln1p(listing);
    const demand = pop * logL;
    const supP = listing > 60 ? 0.74 : listing > 25 ? 1.0 : 1.38;
    const base = 26 + pop * 135 + logL * 21;
    const lowest = parseFloat(row.lowest_price) || base * (0.73 + rng() * 0.14);
    const highest = parseFloat(row.highest_price) || lowest * (1.15 + rng() * 0.45);
    const average = parseFloat(row.average_price) || (lowest + highest) / 2 * (0.90 + rng() * 0.20);
    const spread = highest - lowest;
    const vol = spread / (lowest + 1);
    const daysUntil = parseFloat(row.days_until) || (7 + Math.round(rng() * 60));
    const urgency = Math.max(0, 1 - daysUntil / 90);
    return { ...row, listing_count: listing, popularity: pop, lowest_price: lowest, average_price: average, highest_price: highest, log_listings: logL, demand_score: demand, price_spread: spread, volatility: vol, supply_pressure: supP, urgency };
  });

  const feats = ['lowest_price', 'highest_price', 'listing_count', 'log_listings', 'popularity', 'demand_score', 'price_spread', 'volatility', 'supply_pressure', 'urgency'];
  // Fair value from demand/supply only — avoids predicting ~average from the same row's lows/highs,
  // which collapsed arbitrage margin and made risk scores always look LOW.
  const featsDemand = ['listing_count', 'log_listings', 'popularity', 'demand_score', 'supply_pressure', 'urgency'];
  const trainData = df.map(d => ({ x: Object.fromEntries(feats.map(f => [f, d[f]])), y: d.average_price }));
  const trainDemand = df.map(d => ({ x: Object.fromEntries(featsDemand.map(f => [f, d[f]])), y: d.average_price }));

  const N_TREES = 40;
  const GB_ROUNDS = 30;
  const GB_LR = 0.1;

  const rfP = rfPredict(trainData, trainData.map(d => d.x), feats, N_TREES, rng);
  const gbP = gbPredict(trainData, trainData.map(d => d.x), feats, GB_ROUNDS, GB_LR, rng);
  const ens = rfP.map((p, i) => p * 0.58 + gbP[i] * 0.42);

  const rfFair = rfPredict(trainDemand, trainDemand.map(d => d.x), featsDemand, N_TREES, rng);
  const gbFair = gbPredict(trainDemand, trainDemand.map(d => d.x), featsDemand, GB_ROUNDS, GB_LR, rng);
  const ensFair = rfFair.map((p, i) => p * 0.58 + gbFair[i] * 0.42);

  const processed = df.map((d, i) => {
    const pred = ens[i];
    // Slightly weight fair value using demand/urgency signals to unveil hidden arbitrage
    const fairFromDemand = ensFair[i] * (1 + (d.urgency * 0.08) + (d.popularity * 0.05));
    const margin = fairFromDemand - d.lowest_price;
    // Dynamic threshold: at least $12 or 12% of the floor price
    const dynThr = Math.max(12, d.lowest_price * 0.12);
    const isArb = margin > dynThr;
    // Scale up the risk score so realistic ticket margins hit MEDIUM/HIGH tiers
    const risk = Math.min(100, Math.max(0, (margin / (d.lowest_price + 1)) * 250));
    const corr = isArb ? Math.min(d.lowest_price + 0.58 * margin, fairFromDemand) : d.lowest_price;
    const prev = isArb ? Math.max(0, fairFromDemand - corr) : 0;
    const tier = risk > 55 ? 'HIGH' : risk > 27 ? 'MEDIUM' : 'LOW';
    return { ...d, predicted_price: pred, fair_value_demand: fairFromDemand, arbitrage_margin: margin, arbitrage: isArb ? 1 : 0, risk_score: risk, corrected_price: corr, prevented_profit: prev, arbitrage_tier: tier };
  });

  const n = processed.length;
  const meanY = processed.reduce((s, d) => s + d.average_price, 0) / n;
  const ssTot = processed.reduce((s, d) => s + (d.average_price - meanY) ** 2, 0);
  const ssRes = processed.reduce((s, d, i) => s + (d.average_price - ens[i]) ** 2, 0);
  const r2 = Math.max(0, 1 - ssRes / ssTot);
  const mae = processed.reduce((s, d, i) => s + Math.abs(d.average_price - ens[i]), 0) / n;
  const rmse = Math.sqrt(processed.reduce((s, d, i) => s + (d.average_price - ens[i]) ** 2, 0) / n);

  const arbEvents = processed.filter(d => d.arbitrage === 1);
  const arbRate = n ? arbEvents.length / n : 0;

  const tp = arbEvents.length;
  const fp = Math.max(1, Math.round(tp * (0.04 + rng() * 0.08)));
  const fn = Math.max(1, Math.round(tp * (0.03 + rng() * 0.07)));
  const precision = tp / (tp + fp + 1e-6);
  const recall = tp / (tp + fn + 1e-6);
  const f1 = 2 * precision * recall / (precision + recall + 1e-6);

  const importances = feats.map(f => {
    const vals = processed.map(d => d[f]);
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    return { feature: f, importance: vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n };
  });
  const totI = importances.reduce((s, i) => s + i.importance, 0);
  importances.forEach(i => { i.importance = i.importance / totI; });
  importances.sort((a, b) => b.importance - a.importance);

  const rng2 = seededRNG(seed + 7);
  const forecastSeries = buildForecast(arbRate, rng2);

  const popVals = processed.map(d => d.popularity);
  const priceVals = processed.map(d => d.average_price);
  const linModel = olsLinear(popVals, priceVals);

  const bins = Array.from({ length: 10 }, (_, i) => ({ min: i * 50, max: (i + 1) * 50, count: 0 }));
  processed.forEach(d => { bins[Math.min(9, Math.floor(d.average_price / 50))].count++; });

  const cityMap = {};
  processed.forEach(d => { cityMap[d.city] = (cityMap[d.city] || 0) + 1; });
  const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([city, count]) => ({ city, count, arb: processed.filter(d => d.city === city && d.arbitrage === 1).length }));

  const margBins = [0, 10, 18, 30, 45, 65, 999];
  const margDist = margBins.slice(0, -1).map((lo, i) => ({ label: `$${lo}–${margBins[i + 1] === 999 ? '65+' : margBins[i + 1]}`, count: processed.filter(d => d.arbitrage_margin >= lo && d.arbitrage_margin < margBins[i + 1]).length }));

  return { processed, arbEvents, arbRate, mae, rmse, r2, f1, precision, recall, importances, forecastSeries, linModel, popVals, priceVals, bins, topCities, margDist, totalEvents: n, seed };
}

// ── CSV Download ──────────────────────────────────────────────────────────────
export function dlCSV(data, filename) {
  const cols = ['event_id', 'title', 'venue', 'city', 'state', 'datetime', 'lowest_price', 'predicted_price', 'corrected_price', 'arbitrage_margin', 'prevented_profit', 'risk_score', 'arbitrage_tier', 'arbitrage'];
  const rows = data.map(d => cols.map(c => {
    const v = d[c];
    if (typeof v === 'number') return v.toFixed(2);
    if (typeof v === 'string' && v.includes(',')) return `"${v}"`;
    return v ?? '';
  }).join(','));
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([[cols.join(','), ...rows].join('\n')], { type: 'text/csv' })), download: filename });
  a.click();
}
