import React, { useEffect, useState } from 'react';
import logo from '../logo.png';

const PARTICLES = ['BTC', 'ETH', 'SOL', '$', 'XRP', 'ADA', 'DOT', 'LTC', 'ARB', 'USD'];
const LOADER_STEPS = [
  'INITIALIZING PRICEGUARD AI ENSEMBLE SYSTEM...',
  'CONNECTING SEATGEEK DATA STREAM NODES...',
  'ESTABLISHING ENSEMBLE REGRESSION NETWORKS...',
  'OPTIMIZING ARBITRAGE EXPOSURE TOLERANCE...',
  'TICKET ENGINE ONLINE. DEPLOYING DASHBOARD...'
];

export default function LoadingScreen({ onFinished }) {
  const [isZooming, setIsZooming] = useState(false);
  const [particles, setParticles] = useState([]);
  const [loadingText, setLoadingText] = useState(LOADER_STEPS[0]);

  useEffect(() => {
    // Generate random particles floating up
    const list = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      text: PARTICLES[Math.floor(Math.random() * PARTICLES.length)],
      left: Math.random() * 92 + 4,
      delay: Math.random() * 5,
      size: Math.random() * 8 + 10,
      duration: Math.random() * 5 + 6,
    }));
    setParticles(list);

    // Rotate through loader steps
    const stepTimers = LOADER_STEPS.map((text, idx) => {
      return setTimeout(() => {
        setLoadingText(text);
      }, idx * 750);
    });

    // Zoom-in effect starts 750ms before unmounting
    const zoomTimer = setTimeout(() => setIsZooming(true), 3200);
    const finishTimer = setTimeout(() => {
      if (onFinished) onFinished();
    }, 3950);

    return () => {
      stepTimers.forEach(clearTimeout);
      clearTimeout(zoomTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinished]);

  return (
    <div className={`loading ${isZooming ? 'zoom-out' : ''}`}>
      {/* Crypto Animated Background */}
      <div className="crypto-bg">
        <div className="crypto-grid" />
        {particles.map(p => (
          <div
            key={p.id}
            className="crypto-particle"
            style={{
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              fontSize: `${p.size}px`,
              animationDuration: `${p.duration}s`,
            }}
          >
            {p.text}
          </div>
        ))}
      </div>

      {/* Large Spinning Coin */}
      <div className="coin-container" style={{ transform: isZooming ? 'scale(2.5) translateZ(100px)' : 'none', transition: 'transform 0.8s cubic-bezier(0.1, 0.8, 0.25, 1)' }}>
        <div className="coin">
          {/* Front of coin */}
          <div className="coin-side coin-front">
            <img src={logo} alt="PriceGuard AI Logo" />
          </div>
          {/* Back of coin */}
          <div className="coin-side coin-back">
            <img src={logo} alt="PriceGuard AI Logo" />
          </div>
        </div>
      </div>

      <div className="load-title" style={{ fontSize: '20px', color: 'var(--b)', letterSpacing: '4px', fontWeight: '800', fontFamily: 'var(--fh)', textShadow: '0 0 10px rgba(24,168,255,0.3)' }}>
        PriceGuard <span style={{ color: 'var(--t1)' }}>AI</span>
      </div>

      <div className="load-sub" style={{ fontSize: '9px', color: 'var(--t3)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px', fontFamily: 'var(--fm)' }}>
        Arbitrage Intelligence Platform
      </div>

      <div className="load-status" style={{ marginTop: '30px', fontFamily: 'var(--fm)', color: 'var(--t2)', fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase', height: '14px', textAlign: 'center' }}>
        {loadingText}
      </div>

      <div className="load-bar-wrap" style={{ marginTop: '15px' }}>
        <div className="load-bar" style={{ animationDuration: '3.2s' }} />
      </div>
    </div>
  );
}
