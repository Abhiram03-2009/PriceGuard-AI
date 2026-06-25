import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import MarketTab from './components/MarketTab';
import FetchTab from './components/FetchTab';
import NewsTab from './components/NewsTab';
import PortfolioTab from './components/PortfolioTab';
import AuthScreen from './components/AuthScreen';
import DashboardAnalytics from './components/DashboardAnalytics';
import { ScatterLinChart } from './components/Charts';
import { runAnalysis, dlCSV } from './engine';
import { generateAdvisorReply, buildAuditSummary } from './advisor';
import { askLLM } from './llmService';
import { loadSession, clearSession, updateProfile, getActivity, logActivity } from './authService';
import LoadingScreen from './components/LoadingScreen';
import Navbar from './components/Navbar';
import BottomTabs from './components/BottomTabs';
import './index.css';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [dataMode, setDataMode] = useState('public');
  const [rawData, setRawData] = useState(null);
  const [results, setResults] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [consoleMsgs, setConsoleMsgs] = useState([]);
  const [search, setSearch] = useState('');
  const [filterTier, setFilter] = useState('ALL');
  const [sortCol, setSort] = useState('popularity');
  const [sortDir, setDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [toasts, setToasts] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [profileEditing, setProfileEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);
  const dashboardRef = useRef(null);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setUser(session);
      setAuthed(true);
    }
  }, []);

  // ML Tuning parameters (Hamburger Drawer)
  const [rfTrees, setRfTrees] = useState(40);
  const [gbRounds, setGbRounds] = useState(30);
  const [gbLearningRate, setGbLearningRate] = useState(0.1);
  const [dynThresholdPercent, setDynThresholdPercent] = useState(0.18);
  const [dynThresholdMin, setDynThresholdMin] = useState(22);

  // Chatbot State
  const [chatMsgs, setChatMsgs] = useState([
    { role: 'ai', text: 'Welcome to PriceGuard AI Advisor. Ask me anything — model accuracy, arbitrage exposure, pricing strategy, data sources, exports, or how to use the app. I\'ll give you a direct answer based on your data when available.' }
  ]);
  const [chatTyping, setChatTyping] = useState(false);
  const lastAiIntent = useRef(null);
  const chatScroll = useRef(null);

  // Theme Toggler
  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Scroll Chat to bottom on message updates
  useEffect(() => {
    if (chatScroll.current) {
      chatScroll.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMsgs, chatTyping, tab]);

  const add = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  const onFetchedData = (data) => {
    setRawData(data);
    setResults(null);
    if (user?.id) logActivity(user.id, 'Data loaded', `${data.length} records`);
    add(`Ingested ${data.length} records successfully!`);
  };

  const parseFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const rows = text.split('\n').map(r => r.split(','));
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const data = rows.slice(1).filter(r => r.length > 1).map(r => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = r[i]?.trim());
        return obj;
      });
      onFetchedData(data);
      setTab('dashboard'); // Auto-redirect to dashboard on CSV load
    };
    reader.readAsText(file);
  };

  const doAnalyze = () => {
    if (!rawData) return;
    setAnalyzing(true);
    setConsoleMsgs([]);
    const logs = [
      { msg: 'Accessing secure Arbitrage Intelligence node...', ts: '0.00s' },
      { msg: `Constructing Random Forest (${rfTrees} trees)...`, ts: '0.35s' },
      { msg: `Tuning Gradient Boosting (${gbRounds} rounds)...`, ts: '0.80s' },
      { msg: `Applying margin boundaries (min $${dynThresholdMin} / ${(dynThresholdPercent * 100).toFixed(0)}%)...`, ts: '1.45s', secure: true },
      { msg: 'Evaluating market variance and risk quotients...', ts: '2.20s' },
      { msg: 'Finalizing pricing correction vectors...', ts: '2.85s' }
    ];
    logs.forEach((l, i) => setTimeout(() => setConsoleMsgs(prev => [...prev, l]), i * 500));
    
    setTimeout(() => {
      const config = {
        rfTrees,
        gbRounds,
        gbLearningRate,
        dynThresholdMin,
        dynThresholdPercent
      };
      const res = runAnalysis(rawData, config);
      setResults(res);
      setAnalyzing(false);
      setAnalyticsExpanded(true);
      if (user?.id) logActivity(user.id, 'AI Audit completed', `${res.arbEvents.length} flagged / ${res.totalEvents} events`);
      add('Audit Complete: Yield optimization metrics generated.');
      
      setTimeout(() => {
        const advice = buildAuditSummary(res);
        if (advice) setChatMsgs(prev => [...prev, { role: 'ai', text: advice }]);
      }, 1000);
    }, 3000);
  };

  // Portfolio simulation re-pricing (Stabilize Action Desk)
  const handleStabilizeEvent = (eventId) => {
    if (!results) return;
    const item = results.processed.find(d => d.event_id === eventId);
    if (!item || item.arbitrage === 0) return;

    // Mutate floor price to corrected price in local results
    const updatedProcessed = results.processed.map(d => {
      if (d.event_id === eventId) {
        return {
          ...d,
          lowest_price: d.corrected_price, // Re-price event
          arbitrage: 0,                   // Neutralize arbitrage
          arbitrage_margin: 0,
          risk_score: 0,
          arbitrage_tier: 'LOW'
        };
      }
      return d;
    });

    const updatedArbEvents = updatedProcessed.filter(d => d.arbitrage === 1);
    const updatedArbRate = updatedProcessed.length ? updatedArbEvents.length / updatedProcessed.length : 0;
    
    setResults(prev => ({
      ...prev,
      processed: updatedProcessed,
      arbEvents: updatedArbEvents,
      arbRate: updatedArbRate,
    }));

    add(`Re-priced event: ${item.title?.slice(0, 16)}… stabilized at $${item.corrected_price?.toFixed(0)}`);
  };

  const tableData = useMemo(() => {
    if (!results) return [];
    return results.processed
      .filter(d => 
        (d.title?.toLowerCase().includes(search.toLowerCase()) || d.city?.toLowerCase().includes(search.toLowerCase())) &&
        (filterTier === 'ALL' || (filterTier === 'ARB' && d.arbitrage === 1) || d.arbitrage_tier === filterTier)
      )
      .sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol];
        const cmp = typeof av === 'number' ? av - bv : String(av || '').localeCompare(String(bv || ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [results, search, filterTier, sortCol, sortDir]);

  const PER = 10;
  const pageData = tableData.slice((page - 1) * PER, page * PER);
  const doSort = col => { if (sortCol === col) setDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSort(col); setDir('desc'); } };

  const sendQuery = useCallback(async (msgText) => {
    if (!msgText.trim() || chatTyping) return;
    setChatMsgs(prev => [...prev, { role: 'user', text: msgText }]);
    setChatTyping(true);

    const ctx = { results, rfTrees, gbRounds, gbLearningRate, dynThresholdMin, dynThresholdPercent, lastIntent: lastAiIntent.current };
    let reply = null;

    try {
      const llm = await askLLM(msgText, ctx, chatMsgs);
      if (llm?.text) reply = llm.text;
    } catch { /* local fallback */ }

    if (!reply) {
      const local = generateAdvisorReply(msgText, { ...ctx, lastIntent: lastAiIntent.current });
      if (local.intent) lastAiIntent.current = local.intent;
      reply = local.text;
    }

    setChatMsgs(prev => [...prev, { role: 'ai', text: reply }]);
    setChatTyping(false);
    if (user?.id) logActivity(user.id, 'Advisor query', msgText.slice(0, 40));
  }, [chatTyping, results, rfTrees, gbRounds, gbLearningRate, dynThresholdMin, dynThresholdPercent, chatMsgs, user]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    const input = e.target.elements.msg;
    const msgText = input.value.trim();
    if (!msgText) return;
    input.value = '';
    sendQuery(msgText);
  };

  const renderEmptyState = (tabTitle) => {
    const hasData = !!rawData;
    return (
      <div className="fade ios-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', margin: '1rem 0', border: '1px solid var(--b1)' }}>
        <div className="empty-state-glyph-wrap">
          <span className={`empty-state-glyph ${hasData ? 'audit' : 'data'}`} aria-hidden="true" />
        </div>
        <h3 style={{ fontFamily: "'Syne'", fontSize: '16px', fontWeight: '700', color: 'var(--t1)', marginBottom: '8px' }}>
          {hasData ? 'AI Audit Pending' : 'No Data Loaded'}
        </h3>
        <p style={{ color: 'var(--t3)', fontSize: '12px', lineHeight: '1.6', maxWidth: '300px', margin: '0 auto 20px' }}>
          {hasData 
            ? `To view ${tabTitle}, please run the Machine Learning AI Audit on the Dashboard.`
            : `To view ${tabTitle}, please fetch live ticket data or import a CSV file first.`}
        </p>
        <button 
          className="btn btn-pri" 
          onClick={() => {
            if (hasData) {
              setTab('dashboard');
            } else {
              setTab('fetch');
            }
          }}
          style={{ padding: '8px 18px' }}
        >
          {hasData ? 'Go to Dashboard' : 'Fetch Live Data'}
        </button>
      </div>
    );
  };

  if (loading) {
    return <LoadingScreen onFinished={() => setLoading(false)} />;
  }

  if (!authed) {
    return <AuthScreen onAuth={(userData) => { setUser(userData); setAuthed(true); }} />;
  }

  const activity = user?.id ? getActivity(user.id) : [];

  const saveProfile = () => {
    if (!user?.id || !editName.trim()) return;
    const updated = updateProfile(user.id, { name: editName.trim() });
    setUser(updated);
    setProfileEditing(false);
    add('Profile updated.');
  };

  const scrollToAnalytics = () => {
    setDrawerOpen(false);
    setTab('dashboard');
    setAnalyticsExpanded(true);
    setTimeout(() => dashboardRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
  };

  // Define metric values for the dashboard
  const stats = results ? (dataMode === 'enterprise' ? [
    { lbl: 'Audit Mode', val: 'OPTIMAL', cl: 'g', sub: `F1 Accuracy: ${(results.f1*100).toFixed(0)}%`, ico: 'AI' },
    { lbl: 'Revenue Leakage', val: '$' + results.arbEvents.reduce((s, d) => s + d.arbitrage_margin, 0).toFixed(0), cl: 'p', sub: `${results.arbEvents.length} flagged assets`, ico: '$' },
    { lbl: 'Speculation Rate', val: (results.arbRate * 100).toFixed(1) + '%', cl: 'c', sub: 'Nodes above tolerance', ico: '%' },
    { lbl: 'Mean Abs Error', val: '$' + results.mae.toFixed(1), cl: 'b', sub: 'Price projection variance', ico: 'MAE' },
  ] : [
    { lbl: 'Arbitrage Exposure', val: (results.arbRate * 100).toFixed(1) + '%', cl: 'p', sub: `${results.arbEvents.length} opportunities`, ico: 'IDX' },
    { lbl: 'Validation F1', val: (results.f1 * 100).toFixed(0) + '%', cl: 'g', sub: 'Prediction confidence', ico: 'F1' },
    { lbl: 'Total Margin Gap', val: '$' + results.arbEvents.reduce((s, d) => s + d.arbitrage_margin, 0).toFixed(0), cl: 'b', sub: 'Estimated lost yield', ico: '$' },
    { lbl: 'Scanned Records', val: results.totalEvents, cl: 'c', sub: 'Active database rows', ico: 'DB' },
  ]) : [];

  return (
    <div className={`app-shell`}>
      {/* Background orbs scaled for mobile shell */}
      <div className="orb o1" style={{ width: 300, height: 300, top: -100, left: -50 }} />
      <div className="orb o2" style={{ width: 250, height: 250, bottom: -50, right: -50 }} />
      {dataMode === 'enterprise' && <div className="secure-scan" />}
      {dataMode === 'enterprise' && <div className="secure-grid" />}

      {/* Sticky iOS Top Navbar */}
      <Navbar 
        onMenuClick={() => setDrawerOpen(true)}
        theme={theme}
        toggleTheme={toggleTheme}
        dataMode={dataMode}
      />

      {/* Hamburger Drawer — Command Center */}
      <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-title">Command Center</div>
          <button className="modal-close" onClick={() => setDrawerOpen(false)} style={{ fontSize: '20px' }}>&times;</button>
        </div>
        <div className="drawer-body">

          {/* ── PROFILE CARD ── */}
          {user && (
            <div className="drawer-profile-card">
              <div className="drawer-avatar">
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : <span className="drawer-avatar-initials">
                      {user.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) : '?'}
                    </span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--t1)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ fontFamily: 'var(--fm)', fontSize: '9.5px', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                <button type="button" className="profile-edit-link" onClick={() => { setEditName(user.name); setProfileEditing(true); setDrawerOpen(false); }}>
                  Edit Profile
                </button>
              </div>
            </div>
          )}

          {activity.length > 0 && (
            <div>
              <div className="drawer-section-title">Recent Activity</div>
              <div className="activity-feed">
                {activity.slice(0, 5).map(a => (
                  <div key={a.id} className="activity-item">
                    <div className="activity-action">{a.action}</div>
                    <div className="activity-detail">{a.detail}</div>
                    <div className="activity-ts">{new Date(a.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AI ANALYSIS CONTROLS ── */}
          <div>
            <div className="drawer-section-title">AI Analysis Settings</div>
            <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', marginBottom: '10px', lineHeight: '1.5' }}>
              These sliders tune how the AI finds price opportunities. Higher = more thorough but slower.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 600 }}>Analysis Depth</span>
                  <span className="mono blue">{rfTrees} trees</span>
                </label>
                <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', marginBottom: '4px' }}>
                  More trees = more accurate pricing, takes longer. Recommended: 40–60.
                </div>
                <input type="range" min="10" max="100" step="5" value={rfTrees}
                  onChange={e => setRfTrees(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--b)' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 600 }}>Refinement Passes</span>
                  <span className="mono pink">{gbRounds} rounds</span>
                </label>
                <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', marginBottom: '4px' }}>
                  How many times the AI self-corrects its price predictions. Recommended: 20–40.
                </div>
                <input type="range" min="10" max="100" step="5" value={gbRounds}
                  onChange={e => setGbRounds(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--p)' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 600 }}>Correction Speed</span>
                  <span className="mono amber">{gbLearningRate.toFixed(2)}</span>
                </label>
                <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', marginBottom: '4px' }}>
                  How aggressively the AI adjusts each pass. Lower = steadier. Keep between 0.05–0.20.
                </div>
                <input type="range" min="0.01" max="0.5" step="0.01" value={gbLearningRate}
                  onChange={e => setGbLearningRate(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--a)' }} />
              </div>
            </div>
          </div>

          {/* ── OPPORTUNITY SENSITIVITY ── */}
          <div>
            <div className="drawer-section-title">Opportunity Sensitivity</div>
            <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', marginBottom: '10px', lineHeight: '1.5' }}>
              Controls when a ticket is flagged as a price opportunity. Lower values catch more deals (but also more noise).
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 600 }}>Minimum Dollar Gap</span>
                  <span className="mono green">${dynThresholdMin}</span>
                </label>
                <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', marginBottom: '4px' }}>
                  Only flag tickets where the price gap is at least this many dollars. Increase to filter small deals.
                </div>
                <input type="range" min="5" max="100" step="5" value={dynThresholdMin}
                  onChange={e => setDynThresholdMin(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--g)' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 600 }}>Minimum % Upside</span>
                  <span className="mono cyan">{(dynThresholdPercent * 100).toFixed(0)}%</span>
                </label>
                <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)', marginBottom: '4px' }}>
                  Only flag tickets where the margin is at least this % above the floor price. 10–20% is typical.
                </div>
                <input type="range" min="0.05" max="0.50" step="0.01" value={dynThresholdPercent}
                  onChange={e => setDynThresholdPercent(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--c)' }} />
              </div>
            </div>
          </div>

          {/* ── DISPLAY ── */}
          <div>
            <div className="drawer-section-title">Display</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--b1)' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>Theme</div>
                <div style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--t3)' }}>Switch between dark and light mode</div>
              </div>
              <label className="toggle-wrap" onClick={toggleTheme}>
                <div className={`toggle ${theme === 'light' ? 'on' : ''}`}><div className="toggle-knob" /></div>
              </label>
            </div>
          </div>

          {/* ── ACTIONS ── */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="btn btn-pri"
              onClick={() => {
                setDrawerOpen(false);
                if (rawData) { doAnalyze(); setTab('dashboard'); }
              }}
              disabled={!rawData}
              style={{ width: '100%', padding: '11px 0', fontSize: '13px', fontWeight: '700' }}
            >
              ⚡ Apply &amp; Run Analysis
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', padding: '9px 0', fontSize: '11px' }}
              onClick={scrollToAnalytics}
              disabled={!results}
            >
              📊 Full Analytics on Dashboard
            </button>
            {results && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', padding: '9px 0', fontSize: '11px', color: 'var(--g)', borderColor: 'rgba(0,214,143,0.25)' }}
                onClick={() => { setDrawerOpen(false); dlCSV(results.processed, 'priceguard_corrected_prices.csv'); if (user?.id) logActivity(user.id, 'CSV exported', 'corrected prices'); }}
              >
                ↓ Download Corrected Prices CSV
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', padding: '9px 0', fontSize: '11px', borderColor: 'rgba(255,54,104,0.25)', color: 'var(--p)', marginTop: '4px' }}
              onClick={() => { setDrawerOpen(false); clearSession(); setAuthed(false); setUser(null); setRawData(null); setResults(null); }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main View Container */}
      <main className="main-ios">
        
        {/* ────────────── TAB: DASHBOARD ────────────── */}
        {tab === 'dashboard' && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Mode Switcher */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
              <div className="ios-card mode-switcher-card" style={{ padding: '3px', borderRadius: '8px', display: 'flex', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--b1)' }}>
                <button className={`nav-tab ${dataMode === 'public' ? 'act' : ''}`} onClick={() => setDataMode('public')} style={{ fontSize: '10px', padding: '4px 12px', border: 'none' }}>PUBLIC MODE</button>
                <button className={`nav-tab ${dataMode === 'enterprise' ? 'act' : ''} secure`} onClick={() => setDataMode('enterprise')} style={{ fontSize: '10px', padding: '4px 12px', border: 'none' }}>ENTERPRISE</button>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="stat-bar" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {results ? stats.map((s, i) => (
                <div key={i} className="stat-card" style={{ padding: '0.8rem' }}>
                  <div className="slbl" style={{ fontSize: '8.5px' }}>{s.lbl}</div>
                  <div className={`sval ${s.cl}`} style={{ fontSize: '20px' }}>{s.val}</div>
                  <div className="ssub" style={{ fontSize: '9.5px' }}>{s.sub}</div>
                  <div className="sicon" style={{ fontSize: '18px', right: '0.6rem' }}>{s.ico}</div>
                </div>
              )) : (
                [1,2,3,4].map(i => (
                  <div key={i} className="stat-card" style={{ opacity: 0.35, padding: '0.8rem' }}>
                    <div className="slbl" style={{ fontSize: '8.5px' }}>WAITING...</div>
                    <div className="sval">—</div>
                  </div>
                ))
              )}
            </div>

            {/* Ingestion Drop Zone */}
            {!rawData ? (
              <div 
                className={`upload-zone ${drag ? 'drag' : ''}`}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; f?.name.endsWith('.csv') ? parseFile(f) : add('CSV files only', 'error'); }}
                onClick={() => fileRef.current?.click()}
                style={{ padding: '2rem 1.5rem', borderWidth: '1.5px' }}
              >
                <div className="upload-icon" style={{ fontSize: '24px', marginBottom: '8px' }}>
                  <span className={`upload-glyph ${dataMode === 'enterprise' ? 'secure' : 'file'}`} aria-hidden="true" />
                </div>
                <div className="upload-title" style={{ fontSize: '13.5px' }}>
                  {dataMode === 'enterprise' ? 'Secure Market Data Ingestion' : 'Ingest Ticket Market CSV'}
                </div>
                <div className="upload-sub" style={{ fontSize: '10.5px', marginBottom: '12px' }}>
                  Drop csv or click to upload. SeatGeek, Ticketmaster, and other primary sources are supported.
                </div>
                <button className="btn btn-pri btn-sm" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                  Select File
                </button>
                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => parseFile(e.target.files[0])} />
              </div>
            ) : (
              <div className="ios-card" style={results ? { borderColor: 'rgba(0,214,143,0.3)', background: 'rgba(0,214,143,0.01)' } : {}}>
                <div className="card-hd" style={{ padding: '8px 12px' }}>
                  <div className="card-title" style={{ fontSize: '11px' }}>
                    {results ? `✓ Audit Resolved — ${results.totalEvents} Scanned` : `Dataset Ingested — ${rawData.length} Records`}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => { setRawData(null); setResults(null); }}>Clear</button>
                    <button className="analyze-btn btn-sm" onClick={doAnalyze} disabled={analyzing} style={{ padding: '4px 10px', fontSize: '10px' }}>
                      {analyzing ? 'Auditing...' : (results ? '↺ Re-audit' : '⚡ Run AI Audit')}
                    </button>
                  </div>
                </div>

                {analyzing && (
                  <div className="ai-console fade" style={{ margin: '8px', maxHeight: '110px', padding: '8px', fontSize: '10px' }}>
                    {consoleMsgs.map((m, i) => (
                      <div key={i} className="ai-line">
                        <span className="ai-ts">[{m.ts}]</span>
                        <span className={`ai-msg ${m.secure ? 'secure' : ''}`}>{m.msg}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!results && !analyzing && (
                  <div className="card-body" style={{ padding: '8px' }}>
                    <div className="tbl-wrap">
                      <table className="tbl">
                        <thead><tr>{['Event', 'City', 'Avg $'].map(h => <th key={h} style={{ fontSize: '8.5px', padding: '6px' }}>{h}</th>)}</tr></thead>
                        <tbody>
                          {rawData.slice(0, 4).map((r, i) => (
                            <tr key={i}>
                              <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '11px', padding: '6px' }}>{r.title || '—'}</td>
                              <td style={{ fontSize: '11px', padding: '6px' }}>{r.city || '—'}</td>
                              <td className="mono blue" style={{ fontSize: '11px', padding: '6px' }}>{r.average_price ? `$${parseFloat(r.average_price).toFixed(0)}` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Stabilize Action Desk (Interactive Simulator) */}
            {results && results.arbEvents.length > 0 && (
              <div className="ios-card" style={{ borderColor: 'var(--b1)' }}>
                <div className="card-hd" style={{ padding: '8px 12px' }}>
                  <div className="card-title" style={{ fontSize: '11px' }}>Quick Stabilize Actions</div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button className="dl-btn" style={{ padding: '3px 8px', fontSize: '9px' }} onClick={() => dlCSV(results.processed, 'priceguard_corrected_prices.csv')}>
                      ↓ CSV
                    </button>
                    <span className="mono" style={{ fontSize: '8px', color: 'var(--t3)' }}>speculator mitigations</span>
                  </div>
                </div>
                <div className="card-body" style={{ padding: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {results.arbEvents.slice(0, 3).map((item) => (
                      <div key={item.event_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(24, 168, 255, 0.04)', borderRadius: '8px', border: '1px solid var(--b1)' }}>
                        <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                          <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--t1)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '9px', color: 'var(--t3)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <span>Floor: ${item.lowest_price?.toFixed(0)}</span>
                            <span style={{ color: 'var(--p)' }}>Gap: +${item.arbitrage_margin?.toFixed(0)}</span>
                          </div>
                        </div>
                        <button 
                          className="btn btn-pri btn-sm" 
                          style={{ padding: '3px 8px', fontSize: '10px', background: 'var(--b1)', color: 'var(--b)' }}
                          onClick={() => handleStabilizeEvent(item.event_id)}
                        >
                          Reprice
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Regression Chart & Briefing */}
            {results && (
              <>
                <div ref={dashboardRef}>
                  <DashboardAnalytics
                    results={results}
                    rfTrees={rfTrees}
                    gbRounds={gbRounds}
                    gbLearningRate={gbLearningRate}
                    dynThresholdMin={dynThresholdMin}
                    dynThresholdPercent={dynThresholdPercent}
                    search={search}
                    setSearch={setSearch}
                    filterTier={filterTier}
                    setFilter={setFilter}
                    sortCol={sortCol}
                    sortDir={sortDir}
                    doSort={doSort}
                    page={page}
                    setPage={setPage}
                    tableData={tableData}
                    pageData={pageData}
                    expanded={analyticsExpanded}
                    onToggle={() => setAnalyticsExpanded(e => !e)}
                  />
                </div>

                <div className="ios-card">
                  <div className="card-hd" style={{ padding: '8px 12px' }}><div className="card-title" style={{ fontSize: '11px' }}>Price vs Popularity Snapshot</div></div>
                  <div className="card-body" style={{ padding: '10px' }}>
                    <ScatterLinChart popVals={results.popVals} priceVals={results.priceVals} linModel={results.linModel} processed={results.processed} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ────────────── TAB: FETCH LIVE DATA ────────────── */}
        {tab === 'fetch' && (
          <FetchTab onDataLoaded={onFetchedData} add={add} setTab={setTab} />
        )}

        {/* ────────────── TAB: MARKETS ────────────── */}
        {tab === 'market' && (
          results ? <MarketTab results={results} /> : renderEmptyState('Market Spotlights')
        )}

        {/* ────────────── TAB: NEWS ────────────── */}
        {tab === 'news' && <NewsTab />}

        {/* ────────────── TAB: PORTFOLIO ────────────── */}
        {tab === 'portfolio' && <PortfolioTab results={results} />}

        {/* ────────────── TAB: CHAT ────────────── */}
        {tab === 'chat' && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 170px)' }}>
            <div className="ios-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid var(--b1)' }}>
              {/* Header */}
              <div className="card-hd" style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: results ? 'var(--g)' : 'var(--a)' }} />
                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--t1)' }}>PRICEGUARD ADVISOR</div>
                </div>
                <span className="mono" style={{ fontSize: '8px', color: 'var(--t3)' }}>
                  {results ? 'ACTIVE MEMORY NODE' : 'GENERAL EXPLANATION NODE'}
                </span>
              </div>
              
              {/* Warning banner if results are missing */}
              {!results && (
                <div style={{ padding: '8px 12px 0 12px' }}>
                  <div className="chat-warning-banner" style={{ margin: 0 }}>
                    ⚠️ <strong>Offline Mode</strong>: Analysis is not completed. You can ask general ML questions, but run an AI Audit on the Dashboard to activate inventory insights.
                  </div>
                </div>
              )}

              {/* Chat Thread */}
              <div className="chat-thread-bg" style={{ flex: 1, overflowY: 'auto', padding: '12px', background: 'rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {chatMsgs.map((m, i) => (
                  <div key={i} className={`chat-bubble-row ${m.role === 'ai' ? 'ai' : 'user'}`}>
                    <div className="chat-avatar">
                      {m.role === 'ai' ? '🤖' : '👤'}
                    </div>
                    <div className={`chat-msg ${m.role === 'ai' ? 'chat-ai' : 'chat-user'}`} style={{ margin: 0 }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatTyping && (
                  <div className="chat-bubble-row ai">
                    <div className="chat-avatar">🤖</div>
                    <div className="chat-msg chat-ai chat-typing" style={{ margin: 0 }}>
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={chatScroll} />
              </div>

              {/* Suggestion Chips */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 10px', borderTop: '1px solid var(--b1)', background: 'rgba(0,0,0,0.01)', scrollbarWidth: 'none' }}>
                {[
                  { label: '📊 Metrics',     text: 'What are the model accuracy metrics?' },
                  { label: '🛡️ RF Model',    text: 'How does the Random Forest work?' },
                  { label: '📈 Arbitrage',   text: 'How many flagged arbitrage opportunities?' },
                  { label: '📍 Hotspots',    text: 'Which cities have the highest arbitrage risk?' },
                  { label: '💡 Strategy',    text: 'What pricing actions do you recommend?' },
                  { label: '🚀 Get Started', text: 'How do I get started with PriceGuard?' },
                  { label: '💾 Export',      text: 'How do I download the corrected prices CSV?' },
                  { label: '🏦 Arbitrage?',  text: 'What is ticket price arbitrage?' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendQuery(chip.text)}
                    className="btn btn-ghost btn-sm"
                    style={{ whiteSpace: 'nowrap', borderRadius: '20px', padding: '4px 10px', fontSize: '10px' }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleChatSubmit} style={{ padding: '8px', borderTop: '1px solid var(--b1)', display: 'flex', gap: 6, background: 'var(--bg1)' }}>
                <input 
                  name="msg" 
                  className="fi ios-chat-input" 
                  placeholder="Ask anything about PriceGuard, arbitrage, pricing, AI..."
                  style={{ flex: 1, height: '38px', borderRadius: '8px', border: '1px solid var(--b1)' }} 
                  autoComplete="off" 
                />
                <button type="submit" className="btn btn-pri" disabled={chatTyping} style={{ padding: '0 14px', height: '38px', borderRadius: '8px' }}>
                  Send
                </button>
              </form>
            </div>
          </div>
        )}


      </main>

      {/* ── Edit Profile Modal ── */}
      {profileEditing && (
        <>
          <div className="drawer-overlay open" onClick={() => setProfileEditing(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 9999, width: 'min(340px, 90vw)',
            background: 'var(--bg1)', border: '1px solid var(--b1)', borderRadius: '16px',
            padding: '24px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ fontFamily: 'var(--fh)', fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>Edit Profile</div>
              <button type="button" onClick={() => setProfileEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); saveProfile(); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--t2)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Display Name</label>
                <input
                  className="fi"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Your name"
                  style={{ width: '100%', fontSize: '13px', padding: '9px 12px' }}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--t2)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Email</label>
                <input
                  className="fi"
                  value={user?.email || ''}
                  readOnly
                  style={{ width: '100%', fontSize: '12px', padding: '9px 12px', opacity: 0.5 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--t2)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Account Provider</label>
                <div style={{ fontSize: '12px', color: 'var(--t3)', fontFamily: 'var(--fm)', padding: '9px 12px', background: 'rgba(24,168,255,0.06)', borderRadius: '8px', border: '1px solid var(--b1)' }}>
                  {user?.provider || 'email'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: '4px' }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, padding: '9px 0' }} onClick={() => setProfileEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-pri" style={{ flex: 1, padding: '9px 0' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Floating toasts */}
      <div className="toasts">
        {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}
      </div>

      {/* Dataset preview removed — CSV opens in new browser tab via exportCSV */}

      {/* iOS Bottom Navigation Bar */}
      <BottomTabs tab={tab} setTab={setTab} />

      {/* iOS Footer */}
      <footer style={{ padding: '10px 16px', fontSize: '8px', borderBottom: 'none' }}>
        <div style={{ color: 'var(--t3)' }}>&copy; 2026 ARBITRAGE INTELLIGENCE.</div>
        <div style={{ display: 'flex', gap: '8px', color: 'var(--t3)' }}>
          {user && <span style={{ color: 'var(--b)' }}>{user.name}</span>}
          <span>v12.0-iOS</span>
          <span style={{ color: 'var(--g)' }}>ONLINE</span>
        </div>
      </footer>
    </div>
  );
}
