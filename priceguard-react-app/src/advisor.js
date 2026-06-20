/**
 * On-device PriceGuard AI Advisor — intent routing + open-ended reply synthesis.
 * Runs fully in the browser; no external API required.
 */

const TRAINING_DATA = [
  { intent: 'GREETING', examples: ['hello', 'hi', 'hey', 'who are you', 'how does this work', 'help me', 'start', 'good morning', 'assistant', 'chatbot', 'what can you do', 'tell me about yourself', 'what is priceguard', 'priceguard', 'about', 'intro', 'overview', 'what do you know'] },
  { intent: 'EXPLAIN_RF', examples: ['random forest', 'forest', 'trees', 'bagging', 'how does random forest work', 'explain random forest', 'what is random forest', 'decision tree', 'split', 'bootstrap', 'ensemble tree', 'tree model', 'rf', 'how many trees', 'analysis depth', 'depth'] },
  { intent: 'EXPLAIN_GBM', examples: ['gradient boosting', 'gbm', 'boosting', 'learning rate', 'rounds', 'how does gbm work', 'explain gradient boosting', 'what is gradient boosting', 'boosting rounds', 'xgboost', 'refinement', 'correction speed', 'boosted trees', 'sequential', 'residual', 'refinement passes'] },
  { intent: 'EXPLAIN_ML', examples: ['machine learning', 'ml', 'ai model', 'how does the ai work', 'how does the model work', 'what algorithm', 'neural network', 'deep learning', 'train', 'trained', 'prediction model', 'how are prices predicted', 'model architecture', 'ensemble', 'weighted ensemble', 'how is it calculated'] },
  { intent: 'GET_METRICS', examples: ['mae', 'r2', 'f1', 'accuracy', 'error', 'validation', 'performance', 'metrics', 'confidence', 'precision', 'recall', 'rmse', 'mean absolute error', 'r-squared', 'r squared', 'how accurate', 'score', 'results', 'how well', 'model score', 'prediction accuracy'] },
  { intent: 'GET_ARBITRAGE', examples: ['arbitrage', 'flagged', 'exposure', 'leakage', 'margin', 'gap', 'yield', 'speculation', 'opportunities', 'profit', 'saved', 'leak', 'how many flagged', 'overpriced', 'underpriced', 'price gap', 'spread', 'detected', 'flags', 'flagged events'] },
  { intent: 'HOTSPOTS', examples: ['city', 'cities', 'hotspot', 'hotspots', 'location', 'locations', 'where is the risk', 'regional', 'zones', 'highest speculation', 'top city', 'where', 'geographic', 'market', 'state', 'venue', 'area', 'region', 'local', 'which city', 'most risky'] },
  { intent: 'GET_ADVICE', examples: ['advice', 'suggest', 'recommendation', 'recommend', 'how to fix', 'reprice', 'strategy', 'mitigate', 'action', 'stabilize', 'pricing recommendations', 'what should i do', 'fix prices', 'how to improve', 'next steps', 'optimize', 'what do you recommend', 'best approach', 'reduce leakage', 'prevent', 'solution'] },
  { intent: 'EXPLAIN_ARBITRAGE', examples: ['what is arbitrage', 'define arbitrage', 'arbitrage meaning', 'what does arbitrage mean', 'ticket arbitrage', 'price arbitrage', 'market inefficiency', 'price discrepancy', 'secondary market', 'resale', 'scalping', 'ticket scalping', 'price manipulation'] },
  { intent: 'EXPLAIN_THRESHOLD', examples: ['threshold', 'cutoff', 'sensitivity', 'minimum margin', 'minimum dollar', 'how is flagging done', 'flagging logic', 'detection logic', 'how do you decide', 'what counts as arbitrage', 'criteria', 'rules', 'parameters', 'opportunity sensitivity', 'minimum upside', 'percent upside', 'dollar gap'] },
  { intent: 'DATA_SOURCES', examples: ['seatgeek', 'ticketmaster', 'stubhub', 'vivid seats', 'axs', 'data source', 'where does data come from', 'which platform', 'api', 'data provider', 'platform', 'ticket platform', 'marketplace', 'live data', 'fetch', 'pull data', 'connect'] },
  { intent: 'CSV_EXPORT', examples: ['download', 'export', 'csv', 'save', 'file', 'report', 'spreadsheet', 'download results', 'export data', 'get report', 'save results', 'download csv', 'corrected prices', 'audit results', 'output file'] },
  { intent: 'PORTFOLIO', examples: ['portfolio', 'positions', 'holdings', 'my tickets', 'profit loss', 'pnl', 'p&l', 'return', 'investment', 'bought', 'sold', 'held', 'open positions', 'track', 'how much did i make', 'gains', 'losses', 'performance'] },
  { intent: 'NEWS', examples: ['news', 'latest', 'market news', 'recent', 'updates', 'what is happening', 'trending', 'current events', 'headlines', 'feed', 'stories', 'articles', 'market update', 'industry news'] },
  { intent: 'HOW_TO_USE', examples: ['how to use', 'get started', 'tutorial', 'steps', 'guide', 'walkthrough', 'how do i', 'instructions', 'first time', 'beginner', 'what do i do first', 'how to analyze', 'how to run', 'where do i start', 'workflow'] },
];

const KEYWORD_OVERRIDES = {
  GREETING: ['hello', 'hi ', 'hey ', 'who are you', 'what can you do', 'help me', 'what is priceguard'],
  EXPLAIN_RF: ['random forest', ' rf ', 'decision tree', 'bagging', 'bootstrap tree'],
  EXPLAIN_GBM: ['gradient boost', 'gbm', 'xgboost', 'learning rate', 'refinement passes'],
  EXPLAIN_ML: ['machine learning', 'how does the ai', 'how does the model', 'neural network', 'deep learning', 'prediction model'],
  GET_METRICS: ['f1 score', 'r-squared', 'r2 score', 'mean absolute error', 'rmse', 'how accurate', 'model accuracy'],
  GET_ARBITRAGE: ['how many flagged', 'arbitrage exposure', 'price gap', 'margin gap', 'how many opportunities'],
  HOTSPOTS: ['which city', 'what city', 'where is the risk', 'top city', 'most risky city'],
  GET_ADVICE: ['what should i do', 'how do i fix', 'recommend', 'next steps', 'what action'],
  EXPLAIN_ARBITRAGE: ['what is arbitrage', 'define arbitrage', 'scalping', 'ticket scalping', 'price discrepancy'],
  EXPLAIN_THRESHOLD: ['threshold', 'flagging criteria', 'detection logic', 'minimum margin', 'what counts as'],
  DATA_SOURCES: ['seatgeek', 'ticketmaster', 'stubhub', 'vivid seats', 'axs', 'data source', 'which platform'],
  CSV_EXPORT: ['download csv', 'export csv', 'download results', 'save results', 'get report', 'corrected prices'],
  PORTFOLIO: ['portfolio', 'my positions', 'profit loss', 'p&l', 'open positions'],
  NEWS: ['news tab', 'market news', 'latest news', 'recent headlines'],
  HOW_TO_USE: ['how to use', 'get started', 'first time', 'where do i start', 'walkthrough'],
};

const TOPIC_SIGNALS = {
  metrics: ['metric', 'accuracy', 'f1', 'mae', 'rmse', 'r2', 'r-squared', 'precision', 'recall', 'error', 'score', 'accurate', 'performance', 'validation'],
  arbitrage: ['arbitrage', 'flagged', 'exposure', 'leakage', 'margin', 'gap', 'opportunity', 'overpriced', 'speculation', 'leak'],
  hotspots: ['city', 'cities', 'hotspot', 'location', 'region', 'geographic', 'where', 'market', 'venue'],
  model: ['model', 'ai', 'machine learning', 'random forest', 'gradient', 'algorithm', 'ensemble', 'predict', 'forest', 'boost'],
  advice: ['should i', 'recommend', 'advice', 'strategy', 'fix', 'reprice', 'next step', 'what do i', 'how to improve', 'optimize'],
  export: ['download', 'export', 'csv', 'save', 'report'],
  data: ['seatgeek', 'ticketmaster', 'fetch', 'data source', 'platform', 'api', 'upload', 'csv'],
  portfolio: ['portfolio', 'position', 'pnl', 'profit', 'loss', 'holding'],
  news: ['news', 'headline', 'trend', 'market update'],
  threshold: ['threshold', 'sensitivity', 'flag', 'criteria', 'minimum'],
  workflow: ['start', 'begin', 'tutorial', 'how do i use', 'get started', 'workflow', 'first time'],
};

const tokenize = (t) =>
  t.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1);

export function classifyIntent(text) {
  const lower = text.toLowerCase();

  for (const [intent, keywords] of Object.entries(KEYWORD_OVERRIDES)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return { intent, confidence: 0.95, method: 'keyword' };
    }
  }

  const tokens = tokenize(text);
  if (tokens.length === 0) return { intent: 'GREETING', confidence: 0.5, method: 'fallback', lowConfidence: true };

  const inputVec = {};
  tokens.forEach(w => { inputVec[w] = (inputVec[w] || 0) + 1; });

  let bestIntent = null;
  let bestScore = -1;

  TRAINING_DATA.forEach(item => {
    const targetVec = {};
    item.examples.forEach(ex => {
      tokenize(ex).forEach(w => { targetVec[w] = (targetVec[w] || 0) + 1; });
    });
    let dot = 0, inNorm = 0, tNorm = 0;
    Object.keys(inputVec).forEach(w => { inNorm += inputVec[w] ** 2; });
    Object.keys(targetVec).forEach(w => {
      tNorm += targetVec[w] ** 2;
      if (inputVec[w]) dot += inputVec[w] * targetVec[w];
    });
    const sim = inNorm > 0 && tNorm > 0 ? dot / (Math.sqrt(inNorm) * Math.sqrt(tNorm)) : 0;
    if (sim > bestScore) { bestScore = sim; bestIntent = item.intent; }
  });

  const confidence = Math.min(0.99, 0.15 + bestScore * 0.85);
  return {
    intent: bestIntent || 'GREETING',
    confidence,
    lowConfidence: bestScore < 0.08,
    method: 'cosine',
  };
}

function detectTopics(text) {
  const lower = text.toLowerCase();
  const hits = [];
  for (const [topic, signals] of Object.entries(TOPIC_SIGNALS)) {
    const score = signals.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
    if (score > 0) hits.push({ topic, score });
  }
  return hits.sort((a, b) => b.score - a.score).map(h => h.topic);
}

function findMentionedCity(text, results) {
  if (!results?.topCities?.length) return null;
  const lower = text.toLowerCase();
  return results.topCities.find(c => lower.includes(c.city?.toLowerCase())) || null;
}

function findMentionedEvent(text, results) {
  if (!results?.processed?.length) return null;
  const lower = text.toLowerCase();
  return results.processed.find(d => d.title && lower.includes(d.title.toLowerCase().slice(0, 12))) || null;
}

function isFollowUp(text) {
  const lower = text.toLowerCase().trim();
  return /^(tell me more|more detail|explain more|go on|continue|elaborate|why\??|how so\??|and\??|ok(ay)?\??)$/.test(lower)
    || lower.includes('tell me more') || lower.includes('can you explain');
}

function isOffTopic(text) {
  const lower = text.toLowerCase();
  const offTopic = ['weather', 'recipe', 'joke', 'poem', 'who won', 'football score', 'bitcoin', 'crypto', 'homework', 'math problem'];
  const onTopic = ['ticket', 'price', 'arbitrage', 'event', 'seat', 'concert', 'sport', 'venue', 'priceguard', 'audit', 'model', 'portfolio', 'market'];
  if (onTopic.some(k => lower.includes(k))) return false;
  return offTopic.some(k => lower.includes(k));
}

function fmtMoney(n) {
  return `$${Number(n || 0).toFixed(0)}`;
}

function auditSnapshot(results) {
  if (!results) return null;
  const totalLeakage = results.arbEvents.reduce((s, d) => s + d.arbitrage_margin, 0);
  const avgMargin = results.arbEvents.length ? totalLeakage / results.arbEvents.length : 0;
  const avgFloor = results.processed.length
    ? results.processed.reduce((s, d) => s + d.lowest_price, 0) / results.processed.length
    : 0;
  const avgCorrected = results.processed.length
    ? results.processed.reduce((s, d) => s + d.corrected_price, 0) / results.processed.length
    : 0;
  return { totalLeakage, avgMargin, avgFloor, avgCorrected };
}

function replyForIntent(intent, msgText, ctx) {
  const { results, rfTrees, gbRounds, gbLearningRate, dynThresholdMin, dynThresholdPercent } = ctx;
  const snap = auditSnapshot(results);

  switch (intent) {
    case 'GREETING':
      return results
        ? `Hi — I'm your PriceGuard advisor. You currently have an active audit on ${results.totalEvents} events with ${results.arbEvents.length} flagged for arbitrage. Ask me anything: model accuracy, pricing strategy, geographic risk, exports, or how the AI works.`
        : `Hi — I'm your PriceGuard advisor. I can walk you through arbitrage detection, explain the AI models, help with pricing strategy, and guide you through the app. Fetch data on the Data tab and run an AI Audit when you're ready for personalized insights.`;

    case 'EXPLAIN_RF':
      return `Random Forest is the primary engine here — ${rfTrees} decision trees each study a random slice of your ticket data and vote on fair value. Averaging those votes smooths out individual errors, which is why it's weighted at 58% of the final prediction. It's especially strong at structural patterns, like how high-popularity events in major cities tend to settle into predictable floor prices.`;

    case 'EXPLAIN_GBM':
      return `Gradient Boosting runs ${gbRounds} sequential correction rounds at a learning rate of ${gbLearningRate.toFixed(2)}. Each round focuses on the previous round's mistakes rather than starting fresh, which makes it excellent for fine-tuning volatile markets — think last-minute listing surges before a sold-out show. It carries 42% of the ensemble weight.`;

    case 'EXPLAIN_ML':
      return results
        ? `PriceGuard runs a weighted ensemble entirely on your device — no server calls. Random Forest (${rfTrees} trees, 58%) builds a stable baseline, Gradient Boosting (${gbRounds} rounds, 42%) refines residuals, and a second pass estimates fair demand value. Events get flagged when floor price vs. fair value exceeds $${dynThresholdMin} and ${(dynThresholdPercent * 100).toFixed(0)}%. On your current audit: F1 ${(results.f1 * 100).toFixed(1)}%, R² ${(results.r2 * 100).toFixed(1)}%, MAE ${fmtMoney(results.mae)}.`
        : `The pipeline is: ingest ticket data → engineer features (demand, volatility, supply pressure) → Random Forest baseline → Gradient Boosting refinement → fair-value comparison → threshold flagging. Everything runs locally in your browser. Run an audit and I can interpret your live metrics.`;

    case 'GET_METRICS':
      if (!results) {
        return `MAE tracks average dollar error, RMSE penalizes big misses more, R² shows how much price variance the model explains, and F1 balances precision vs. recall on arbitrage flags. Run an AI Audit on the Dashboard and I'll interpret your actual numbers.`;
      }
      return `On your current dataset, F1 is ${(results.f1 * 100).toFixed(1)}% (${results.f1 > 0.75 ? 'strong — most flags are genuine opportunities' : 'moderate — you may want to tune sensitivity in Command Center'}). R² is ${(results.r2 * 100).toFixed(1)}%, meaning the model explains most price variance here. MAE is ${fmtMoney(results.mae)} per event, RMSE is ${fmtMoney(results.rmse)}. Precision ${(results.precision * 100).toFixed(1)}% / Recall ${(results.recall * 100).toFixed(1)}% across ${results.totalEvents} scanned records.`;

    case 'GET_ARBITRAGE':
      if (!results) {
        return `Arbitrage detection compares each listing's floor price against the AI fair-value estimate. When the gap clears both $${dynThresholdMin} and ${(dynThresholdPercent * 100).toFixed(0)}% of floor price, the event is flagged. Fetch data and run an AI Audit to see your exposure.`;
      }
      return `${results.arbEvents.length} of ${results.totalEvents} events are flagged (${(results.arbRate * 100).toFixed(1)}% exposure), representing ${fmtMoney(snap.totalLeakage)} in recoverable margin — about ${fmtMoney(snap.avgMargin)} per flagged event on average. ${results.arbEvents.filter(e => e.arbitrage_tier === 'HIGH').length} are high-risk. ${results.topCities[0]?.city ? `The biggest cluster is in ${results.topCities[0].city}.` : ''} Use Quick Stabilize Actions on the Dashboard to reprice the top offenders.`;

    case 'HOTSPOTS': {
      if (!results) return `Once you run an audit, I'll rank cities by flagged-event concentration so you can see where secondary demand is outpacing fair value. Check the Markets tab for the visual heatmap too.`;
      const top = results.topCities.slice(0, 5);
      if (!top.length) return `No geographic clustering stood out in this dataset. That usually means risk is spread evenly rather than concentrated in one market.`;
      const lines = top.map((c, i) => `${i + 1}. ${c.city} — ${c.arb} flagged of ${c.count} (${c.count ? ((c.arb / c.count) * 100).toFixed(0) : 0}%)`).join('\n');
      return `Here's where risk concentrates:\n${lines}\n\n${top[0].city} leads with ${top[0].arb} flagged events — worth prioritizing repricing there first.`;
    }

    case 'GET_ADVICE':
      if (!results) {
        return `General playbook: pull live data (SeatGeek works great), run the AI Audit, reprice flagged events via Quick Stabilize, export corrected prices from Command Center, and re-audit every few days as events approach. I can get much more specific once you have audit results loaded.`;
      }
      return `Based on your audit, I'd prioritize repricing the top ${Math.min(3, results.arbEvents.length)} flagged events (avg adjustment ~${fmtMoney(snap.avgMargin)}). Focus ${results.topCities[0]?.city || 'your highest-risk market'} first, export corrected prices from Command Center, and consider raising the minimum dollar gap from $${dynThresholdMin} if you're seeing noise. Total recoverable leakage: ${fmtMoney(snap.totalLeakage)}. Re-audit in 48–72 hours as listings shift.`;

    case 'EXPLAIN_ARBITRAGE':
      return results
        ? `Ticket arbitrage is when resale/floor prices diverge meaningfully from fair market value — either a profit opportunity or revenue leakage for primary sellers. PriceGuard flags gaps above $${dynThresholdMin} and ${(dynThresholdPercent * 100).toFixed(0)}%. In your data: ${results.arbEvents.length} events, ${fmtMoney(snap.totalLeakage)} total exposure.`
        : `Ticket arbitrage happens when floor prices sit well below what the market would actually pay — often after sellouts, cross-platform gaps, or bulk speculator activity. PriceGuard compares AI fair value against listed floor prices and flags material gaps.`;

    case 'EXPLAIN_THRESHOLD':
      return `Flagging requires both conditions: at least $${dynThresholdMin} absolute gap AND at least ${(dynThresholdPercent * 100).toFixed(0)}% of floor price. Example: $100 floor vs $130 fair value = $30 (30%) — flagged at current settings. Tune both sliders in Command Center → Opportunity Sensitivity. Lower = more flags, higher = stricter.`;

    case 'DATA_SOURCES':
      return `SeatGeek is live today — pull real-time sports, concerts, theater, and comedy data from the Data tab with your Client ID. CSV upload works with any platform export. Ticketmaster, StubHub, Vivid Seats, and AXS integrations are on the roadmap and will connect the same audit pipeline once API keys are configured.`;

    case 'CSV_EXPORT':
      return results
        ? `Two exports are ready: Command Center → Download Corrected Prices (fair-value repricing for your inventory system), or the Full Analytics audit log from the hamburger menu with floor, predicted, corrected, margin, and risk tier per event. Both are standard CSV for Excel or Google Sheets.`
        : `After an audit, export corrected prices from Command Center or the full audit log from Analytics. Both download as CSV. Run an AI Audit first to generate them.`;

    case 'PORTFOLIO':
      return `The Portfolio tab tracks positions across platforms with cost basis, current value, P&L, days-to-event urgency, and monthly performance charts. ${results ? 'Your active audit cross-references arbitrage signals against holdings.' : 'Run an audit to sync live arbitrage flags with your positions.'}`;

    case 'NEWS':
      return `The News tab curates ticket-market intelligence — pricing trends, playoff dynamics, concert arbitrage patterns, platform policy changes, and ML pricing research. Stories are tagged Bullish, Neutral, or Bearish. Filter by Sports, Concerts, Market, or Analytics.`;

    case 'HOW_TO_USE':
      return `Quick start: (1) Data tab → pull SeatGeek or upload CSV → Load Dashboard. (2) Dashboard → Run AI Audit (~3 sec on-device). (3) Review KPIs and Quick Stabilize Actions. (4) Markets tab for sector analytics. (5) Command Center → export corrected prices. I'm here on the Advisor tab for any questions along the way.`;

    default:
      return null;
  }
}

function composeOpenReply(msgText, ctx) {
  const { results, lastIntent } = ctx;
  const lower = msgText.toLowerCase();
  const topics = detectTopics(msgText);
  const snap = auditSnapshot(results);
  const parts = [];

  if (isFollowUp(msgText) && lastIntent) {
    const followUp = replyForIntent(lastIntent, msgText, ctx);
    if (followUp) return `Sure — expanding on that:\n\n${followUp}`;
  }

  if (isOffTopic(msgText)) {
    return `I'm specialized in ticket pricing, arbitrage detection, and PriceGuard's AI audit workflow — I can't help with that particular topic. But if you have questions about your listings, model accuracy, geographic risk, or pricing strategy, I'm happy to dig in.${results ? ` Your current audit has ${results.arbEvents.length} flagged events if you want a summary.` : ''}`;
  }

  const city = findMentionedCity(msgText, results);
  if (city) {
    parts.push(`${city.city} shows ${city.arb} flagged events out of ${city.count} total (${city.count ? ((city.arb / city.count) * 100).toFixed(0) : 0}% rate)${city.arb >= (results?.topCities?.[0]?.arb || 0) ? ' — that is among your highest-risk markets' : ''}.`);
  }

  const event = findMentionedEvent(msgText, results);
  if (event) {
    parts.push(`For "${event.title?.slice(0, 40)}": floor ${fmtMoney(event.lowest_price)}, corrected fair value ${fmtMoney(event.corrected_price)}${event.arbitrage ? `, gap ${fmtMoney(event.arbitrage_margin)} (${event.arbitrage_tier} risk)` : ', currently not flagged'}.`);
  }

  if (topics.includes('metrics') && results) {
    parts.push(`Model accuracy on this audit: F1 ${(results.f1 * 100).toFixed(1)}%, R² ${(results.r2 * 100).toFixed(1)}%, MAE ${fmtMoney(results.mae)}.`);
  }
  if (topics.includes('arbitrage') && results) {
    parts.push(`Arbitrage exposure is ${(results.arbRate * 100).toFixed(1)}% (${results.arbEvents.length} events, ${fmtMoney(snap.totalLeakage)} total gap).`);
  }
  if (topics.includes('hotspots') && results && !city) {
    parts.push(`Top risk market: ${results.topCities[0]?.city || 'N/A'} with ${results.topCities[0]?.arb || 0} flagged listings.`);
  }
  if (topics.includes('advice') && results) {
    parts.push(`I'd start by repricing flagged events (~${fmtMoney(snap.avgMargin)} avg adjustment) and exporting corrected prices from Command Center.`);
  }
  if (topics.includes('model')) {
    parts.push(`The AI uses a 58/42 Random Forest + Gradient Boosting ensemble, running fully on-device.`);
  }
  if (topics.includes('export')) {
    parts.push(`Download corrected prices or the full audit log as CSV from Command Center after an audit completes.`);
  }
  if (topics.includes('data')) {
    parts.push(`Live SeatGeek data is available now on the Data tab; CSV upload works with any platform.`);
  }
  if (topics.includes('threshold')) {
    parts.push(`Current flag thresholds: $${ctx.dynThresholdMin} minimum gap and ${(ctx.dynThresholdPercent * 100).toFixed(0)}% of floor price — both must be exceeded.`);
  }
  if (topics.includes('workflow') && !results) {
    parts.push(`Start on the Data tab, load records, then run AI Audit on the Dashboard.`);
  }

  if (parts.length > 0) {
    const opener = lower.includes('?') ? `Here's what I can tell you:` : `Got it — here's the relevant breakdown:`;
    return `${opener}\n\n${parts.join('\n\n')}`;
  }

  if (lower.includes('thank')) {
    return `You're welcome! Let me know if you want to dig into metrics, arbitrage exposure, or pricing strategy.${results ? ` Your audit is still active with ${results.arbEvents.length} flagged events.` : ''}`;
  }

  if (lower.includes('price') || lower.includes('cost') || lower.includes('ticket')) {
    return results
      ? `Across your audit, average floor price is ${fmtMoney(snap.avgFloor)} vs. AI-corrected fair value of ${fmtMoney(snap.avgCorrected)} — a ${(results.arbRate * 100).toFixed(1)}% arbitrage rate on ${results.totalEvents} events. Want me to break down a specific city, event, or metric?`
      : `Once you load ticket data and run the AI Audit, I can compare floor prices, fair values, and margin gaps for every event. Head to the Data tab to get started.`;
  }

  if (/\b(yes|yeah|yep|sure|ok)\b/.test(lower) && results) {
    return `Your audit summary: ${results.arbEvents.length} flagged events, ${fmtMoney(snap.totalLeakage)} recoverable margin, F1 ${(results.f1 * 100).toFixed(0)}%. Top market is ${results.topCities[0]?.city || 'spread evenly'}. What would you like to explore — metrics, hotspots, or recommended actions?`;
  }

  return results
    ? `I understand you're asking about "${msgText.slice(0, 50)}${msgText.length > 50 ? '…' : ''}". From your active audit: ${(results.arbRate * 100).toFixed(1)}% arbitrage exposure, ${results.arbEvents.length} flagged events, top market ${results.topCities[0]?.city || 'N/A'}, ~${fmtMoney(snap.avgMargin)} avg gap per flag. Ask me about accuracy, strategy, exports, or how the models work — I'll give you a direct answer.`
    : `I can help with arbitrage detection, AI model explanations, pricing strategy, data sources, exports, and navigating PriceGuard. Try a specific question like "how accurate is the model?" or "what should I reprice first?" — or fetch data and run an audit for personalized numbers.`;
}

/**
 * Generate a natural-language advisor reply for any user message.
 */
export function generateAdvisorReply(msgText, ctx) {
  const trimmed = msgText.trim();
  if (!trimmed) return { text: '', intent: null, confidence: 0 };

  const classification = classifyIntent(trimmed);
  const topics = detectTopics(trimmed);

  // Compound questions: merge answers when multiple distinct topics detected
  if (topics.length >= 2) {
    const intentMap = {
      metrics: 'GET_METRICS',
      arbitrage: 'GET_ARBITRAGE',
      hotspots: 'HOTSPOTS',
      model: 'EXPLAIN_ML',
      advice: 'GET_ADVICE',
      export: 'CSV_EXPORT',
      data: 'DATA_SOURCES',
      portfolio: 'PORTFOLIO',
      news: 'NEWS',
      threshold: 'EXPLAIN_THRESHOLD',
      workflow: 'HOW_TO_USE',
    };
    const segments = topics.slice(0, 3).map(t => replyForIntent(intentMap[t], trimmed, ctx)).filter(Boolean);
    if (segments.length >= 2) {
      return {
        text: segments.join('\n\n'),
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }
  }

  const primary = replyForIntent(classification.intent, trimmed, ctx);
  if (primary && !classification.lowConfidence) {
    return { text: primary, intent: classification.intent, confidence: classification.confidence };
  }

  const open = composeOpenReply(trimmed, { ...ctx, lastIntent: classification.intent });
  return {
    text: open,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}

export async function generateAdvisorReplyAsync(msgText, ctx) {
  // Optional LLM-backed reply: when REACT_APP_OPENAI_API_KEY is provided at build time
  // the client will attempt a direct call to OpenAI. This is gated — if no key is present
  // the function falls back to the on-device advisor. NOTE: embedding API keys in
  // client builds is not recommended for production; prefer a backend proxy with
  // secrets stored in CI/GH Actions.
  try {
    const key = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_OPENAI_API_KEY) || (typeof window !== 'undefined' && window.__OPENAI_API_KEY__);
    if (!key) return generateAdvisorReply(msgText, ctx);

    const system = `You are PriceGuard AI — a concise assistant specialized in ticket pricing, arbitrage detection, and audit analytics. When data context is provided, reference concrete numbers briefly. Keep answers short (<= 250 words).`;

    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: `Context: ${JSON.stringify({ totalEvents: ctx?.results?.totalEvents, arbRate: ctx?.results?.arbRate, topCities: ctx?.results?.topCities?.slice(0,3) || [] })}` },
      { role: 'user', content: msgText }
    ];

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 400 })
    });

    if (!resp.ok) throw new Error(`LLM error ${resp.status}`);
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content;
    if (text) return { text, intent: null, confidence: 0.9 };
  } catch (e) {
    // Silent fallback to on-device advisor on any error
    // eslint-disable-next-line no-console
    console.warn('LLM assist failed — falling back to on-device advisor', e?.message || e);
  }
  return generateAdvisorReply(msgText, ctx);
}

export function buildAuditSummary(res) {
  if (!res) return null;
  if (!res.arbEvents?.length) {
    return `Audit complete. ${res.totalEvents} events scanned — no arbitrage flags at current sensitivity. Your pricing looks aligned with fair value.`;
  }
  const totalLeakage = res.arbEvents.reduce((s, d) => s + d.arbitrage_margin, 0);
  const avgCorr = totalLeakage / res.arbEvents.length;
  const topCity = res.topCities[0]?.city || 'top markets';
  return `Audit complete — ${res.arbEvents.length} arbitrage opportunit${res.arbEvents.length === 1 ? 'y' : 'ies'} found across ${res.totalEvents} events. Peak speculation in ${topCity}. Average repricing adjustment of ${fmtMoney(avgCorr)} would recover ${fmtMoney(totalLeakage)} in margin leakage. Ask me for details on any event, city, or metric.`;
}
