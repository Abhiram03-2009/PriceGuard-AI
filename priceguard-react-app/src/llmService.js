// ─── PriceGuard AI — LLM Service ─────────────────────────────────────────────
// Uses OpenAI-compatible API if REACT_APP_OPENAI_KEY is set.
// Falls back gracefully to the local advisor if not configured.

const OPENAI_KEY = process.env.REACT_APP_OPENAI_KEY || '';
const OPENAI_MODEL = process.env.REACT_APP_OPENAI_MODEL || 'gpt-3.5-turbo';

function buildSystemPrompt(ctx) {
  const { results, rfTrees, gbRounds, gbLearningRate, dynThresholdMin, dynThresholdPercent } = ctx;
  let dataContext = 'No audit data is currently loaded.';
  if (results) {
    const leakage = results.arbEvents.reduce((s, d) => s + d.arbitrage_margin, 0);
    dataContext = `Active audit — ${results.totalEvents} events scanned. ` +
      `Arbitrage rate: ${(results.arbRate * 100).toFixed(1)}%. ` +
      `${results.arbEvents.length} opportunities flagged. ` +
      `Total margin gap: $${leakage.toFixed(0)}. ` +
      `F1: ${(results.f1 * 100).toFixed(1)}%, R²: ${(results.r2 * 100).toFixed(1)}%, MAE: $${results.mae.toFixed(2)}, RMSE: $${results.rmse.toFixed(2)}. ` +
      `Top hotspot: ${results.topCities[0]?.city || 'N/A'} with ${results.topCities[0]?.arb || 0} flags. ` +
      `Model: Random Forest (${rfTrees} trees, 58% weight) + Gradient Boosting (${gbRounds} rounds, LR=${gbLearningRate}, 42% weight). ` +
      `Threshold: min $${dynThresholdMin} or ${(dynThresholdPercent * 100).toFixed(0)}% of floor price.`;
  }
  return `You are the PriceGuard AI Advisor, an expert assistant for a professional ticket price arbitrage intelligence platform. You help users understand ML model results, arbitrage opportunities, pricing strategy, and how to use the app.

Current data context:
${dataContext}

Guidelines:
- Be concise, professional, and data-driven. Reference specific numbers from the context when available.
- For ML questions: explain Random Forest and Gradient Boosting in plain English, referencing the actual configured parameters.
- For pricing questions: give specific, actionable advice using the current audit numbers.
- For app usage questions: give clear step-by-step instructions.
- Never make up numbers not present in the context.
- Format responses with clear structure. Use bullet points for lists. Keep responses under 200 words unless the question requires detail.`;
}

export async function askLLM(message, ctx, chatHistory = []) {
  if (!OPENAI_KEY) return null; // graceful fallback to local advisor

  const systemPrompt = buildSystemPrompt(ctx);
  const messages = [
    { role: 'system', content: systemPrompt },
    // Include recent chat history for context (last 6 messages)
    ...chatHistory.slice(-6).map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text,
    })),
    { role: 'user', content: message },
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        max_tokens: 350,
        temperature: 0.65,
      }),
    });

    if (!response.ok) {
      console.warn('[LLM] API error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    return text ? { text } : null;
  } catch (err) {
    console.warn('[LLM] Request failed, falling back to local advisor:', err.message);
    return null;
  }
}
