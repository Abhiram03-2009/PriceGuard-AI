import React, { useState, useMemo } from 'react';

const CATEGORIES = ['All', 'Sports', 'Concerts', 'Market', 'Analytics'];

const NEWS_FEED = [
  {
    id: 1,
    category: 'Market',
    headline: 'Secondary Ticket Market Hits $15B Valuation as Demand Spikes',
    summary: 'Analysts report record secondary market volumes heading into summer, driven by sold-out stadium tours and playoff season overlap.',
    source: 'Bloomberg',
    sourceColor: '#f5a623',
    time: '2h ago',
    readTime: '3 min',
    sentiment: 'bullish',
    tags: ['Market', 'Volume'],
  },
  {
    id: 2,
    category: 'Sports',
    headline: 'NBA Playoff Ticket Prices Surge 34% Above Last Season Averages',
    summary: 'Conference finals matchups are producing historically high floor prices on secondary platforms, with SeatGeek and Ticketmaster both reporting demand peaks.',
    source: 'ESPN',
    sourceColor: '#ff3668',
    time: '4h ago',
    readTime: '4 min',
    sentiment: 'bullish',
    tags: ['NBA', 'Sports'],
  },
  {
    id: 3,
    category: 'Concerts',
    headline: 'Stadium Concert Arbitrage Window Closing as Platforms Tighten Resale Rules',
    summary: 'Ticketmaster and AXS introduce dynamic pricing guardrails that limit secondary markup to 30% above face value for select events.',
    source: 'Billboard',
    sourceColor: '#00d68f',
    time: '6h ago',
    readTime: '5 min',
    sentiment: 'neutral',
    tags: ['Concerts', 'Policy'],
  },
  {
    id: 4,
    category: 'Analytics',
    headline: 'ML Pricing Models Show 87% Accuracy in Predicting Resale Price Peaks',
    summary: 'A new study shows ensemble ML models outperform human pricing desks by 23% when predicting peak resale windows 7 days out.',
    source: 'MIT Review',
    sourceColor: '#18a8ff',
    time: '8h ago',
    readTime: '6 min',
    sentiment: 'bullish',
    tags: ['AI', 'Analytics'],
  },
  {
    id: 5,
    category: 'Market',
    headline: 'Vivid Seats Reports 22% Q2 Revenue Growth, Cites Demand Intelligence Tools',
    summary: 'Vivid Seats attributes strong quarterly performance to algorithmic pricing and real-time demand forecasting integrations launched in late Q1.',
    source: 'WSJ',
    sourceColor: '#8b5cf6',
    time: '12h ago',
    readTime: '4 min',
    sentiment: 'bullish',
    tags: ['Market', 'Revenue'],
  },
  {
    id: 6,
    category: 'Sports',
    headline: 'NFL Season Ticket Waitlists Generate Pre-Market Arbitrage Opportunities',
    summary: 'Analysis of NFL Season Ticket transfer markets reveals systematic underpricing in waitlist resales, creating high-confidence arbitrage signals.',
    source: 'Sports Business J.',
    sourceColor: '#f5a623',
    time: '1d ago',
    readTime: '5 min',
    sentiment: 'bullish',
    tags: ['NFL', 'Arbitrage'],
  },
  {
    id: 7,
    category: 'Analytics',
    headline: 'StubHub API Integration Unlocks Cross-Platform Price Arbitrage at Scale',
    summary: 'Institutional desks are now using multi-platform API aggregation to identify pricing inefficiencies across StubHub, SeatGeek, and AXS simultaneously.',
    source: 'TechCrunch',
    sourceColor: '#00e5cc',
    time: '1d ago',
    readTime: '3 min',
    sentiment: 'neutral',
    tags: ['API', 'StubHub'],
  },
  {
    id: 8,
    category: 'Concerts',
    headline: 'Taylor Swift Eras Tour Resale Data Reveals 5x Floor Price Multiplier Patterns',
    summary: 'Post-event analysis of the Eras Tour reveals consistent multiplier patterns that were detectable 14 days before events — a key ML training signal.',
    source: 'Pollstar',
    sourceColor: '#ff3668',
    time: '2d ago',
    readTime: '7 min',
    sentiment: 'bullish',
    tags: ['Concerts', 'Analysis'],
  },
];

const sentimentColors = { bullish: 'var(--g)', neutral: 'var(--a)', bearish: 'var(--p)' };
const sentimentLabels = { bullish: '▲ BULLISH', neutral: '● NEUTRAL', bearish: '▼ BEARISH' };

export default function NewsTab() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    if (activeCategory === 'All') return NEWS_FEED;
    return NEWS_FEED.filter(n => n.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="fade news-terminal" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header Hero */}
      <div className="market-hero">
        <div>
          <div className="market-eyebrow">Market Intelligence Feed</div>
          <h2 style={{ fontFamily: 'var(--fnav)', fontSize: '20px', color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 5px' }}>News Desk</h2>
          <p style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1.5 }}>Curated intelligence on ticket markets, arbitrage trends, and pricing analytics.</p>
        </div>
        <div className="market-hero-metrics">
          <span>{NEWS_FEED.filter(n => n.sentiment === 'bullish').length} Bullish</span>
          <span>{NEWS_FEED.length} Stories</span>
          <span style={{ color: 'var(--g)' }}>Live</span>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="btn btn-sm"
            style={{
              whiteSpace: 'nowrap',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '10px',
              fontFamily: 'var(--fm)',
              letterSpacing: '0.5px',
              background: activeCategory === cat ? 'rgba(24,168,255,0.15)' : 'transparent',
              border: activeCategory === cat ? '1px solid var(--b)' : '1px solid var(--b1)',
              color: activeCategory === cat ? 'var(--b)' : 'var(--t3)',
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Market Sentiment Summary Bar */}
      <div className="ios-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Market Sentiment</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {['bullish', 'neutral', 'bearish'].map(s => {
            const count = NEWS_FEED.filter(n => n.sentiment === s).length;
            return (
              <div key={s} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--fnav)', fontSize: '15px', color: sentimentColors[s], fontWeight: '700' }}>{count}</div>
                <div style={{ fontFamily: 'var(--fm)', fontSize: '8px', color: 'var(--t3)', textTransform: 'uppercase' }}>{s}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--g)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--g)' }}>LIVE FEED</span>
        </div>
      </div>

      {/* News Cards */}
      {filtered.map(article => (
        <div
          key={article.id}
          className="ios-card"
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s',
            border: expandedId === article.id ? '1px solid var(--b2)' : '1px solid var(--b1)',
            boxShadow: expandedId === article.id ? '0 0 18px rgba(24,168,255,0.08)' : 'none',
          }}
          onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
          role="article"
        >
          {/* Card Header */}
          <div style={{ padding: '12px 14px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'var(--fm)', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase',
                  letterSpacing: '0.8px', padding: '2px 6px', borderRadius: '4px',
                  background: 'rgba(24,168,255,0.08)', color: 'var(--b)', border: '1px solid var(--b1)',
                }}>{article.category}</span>
                <span style={{
                  fontFamily: 'var(--fm)', fontSize: '8px', fontWeight: '700',
                  color: sentimentColors[article.sentiment],
                }}>{sentimentLabels[article.sentiment]}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--fm)', fontSize: '8px', color: 'var(--t3)' }}>{article.time}</span>
                <span style={{
                  fontFamily: 'var(--fm)', fontSize: '7px', color: article.sourceColor,
                  border: `1px solid ${article.sourceColor}22`, padding: '1px 5px', borderRadius: '3px',
                  background: `${article.sourceColor}10`,
                }}>{article.source}</span>
              </div>
            </div>

            <h3 style={{
              fontSize: '13px', fontWeight: '700', color: 'var(--t1)',
              lineHeight: '1.35', margin: '0 0 6px', letterSpacing: '-0.01em',
            }}>
              {article.headline}
            </h3>

            {/* Tags */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {article.tags.map(tag => (
                <span key={tag} style={{
                  fontFamily: 'var(--fm)', fontSize: '8px', color: 'var(--t3)',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--b1)',
                  padding: '1px 5px', borderRadius: '3px',
                }}>#{tag}</span>
              ))}
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--fm)', fontSize: '8px', color: 'var(--t3)' }}>{article.readTime} read</span>
            </div>
          </div>

          {/* Expanded Summary */}
          {expandedId === article.id && (
            <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--b1)', marginTop: '2px', paddingTop: '10px' }}>
              <p style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: '1.65' }}>
                {article.summary}
              </p>
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)' }}>Source: {article.source}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '3px 9px', fontSize: '9px', borderRadius: '5px' }}
                  onClick={e => { e.stopPropagation(); }}
                >
                  Read Full Story →
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--t3)', fontSize: '12px' }}>
          No articles in this category yet.
        </div>
      )}
    </div>
  );
}
