import React, { useEffect, useMemo, useState } from 'react';
import logo from '../logo.png';

const PARTICLES = ['BTC', 'ETH', 'SOL', 'USD', 'CME', 'NYSE', 'ASK', 'BID', 'VOL', 'YLD', 'ARB', 'IDX'];
const LOADER_STEPS = [
  'Booting market intelligence core…',
  'Syncing ticket liquidity streams…',
  'Calibrating spread and floor models…',
  'Loading ensemble arbitrage engine…',
  'Validating price tolerance bands…',
  'Running risk classification layer…',
  'Opening PriceGuard terminal…',
];

export default function LoadingScreen({ onFinished }) {
  const [isZooming, setIsZooming] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const particles = useMemo(() => (
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      text: PARTICLES[i % PARTICLES.length],
      left: ((i * 31) % 90) + 5,
      delay: (i % 9) * 0.38,
      size: 10 + (i % 5) * 2,
      duration: 8 + (i % 7),
    }))
  ), []);

  useEffect(() => {
    const stepTimers = LOADER_STEPS.map((_, idx) =>
      setTimeout(() => setStepIdx(idx), idx * 900)
    );
    const zoomTimer   = setTimeout(() => setIsZooming(true), 6000);
    const finishTimer = setTimeout(() => onFinished?.(), 6900);

    return () => {
      stepTimers.forEach(clearTimeout);
      clearTimeout(zoomTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinished]);

  return (
    <div className={`loading ${isZooming ? 'zoom-out' : ''}`}>
      <div className="crypto-bg">
        <div className="crypto-grid" />
        <div className="market-scanline" />
        {particles.map(p => (
          <div key={p.id} className="crypto-particle" style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, fontSize: `${p.size}px`, animationDuration: `${p.duration}s` }}>
            {p.text}
          </div>
        ))}
      </div>

      {/* Cyber Blue coin — Y-axis only, real logo on back face */}
      <div className={`coin-container ${isZooming ? 'coin-zoom' : ''}`}>
        <div className="coin coin-y-spin">
          <div className="coin-edge" />
          <div className="coin-side coin-front">
            <div className="coin-circuit" />
            <span className="coin-symbol">$</span>
          </div>
          <div className="coin-side coin-back">
            <div className="coin-circuit" />
            {/* Real app logo on back face */}
            <img src={logo} alt="PriceGuard AI" className="coin-logo-img" />
          </div>
        </div>
      </div>

      <div className="load-title wordmark load-wordmark">
        <span className="load-wm-price">Price</span><span className="load-wm-guard">Guard</span>
        <span className="wordmark-ai">&nbsp;AI</span>
      </div>

      <div className="load-sub">Market Protection Terminal</div>

      <div className="load-status load-step-text" key={stepIdx}>
        {LOADER_STEPS[stepIdx]}
      </div>

      <div className="load-bar-wrap">
        <div className="load-bar load-bar-long" />
      </div>
    </div>
  );
}
