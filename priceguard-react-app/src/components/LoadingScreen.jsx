import React, { useEffect, useMemo, useState } from 'react';

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
    // Step through loading messages every 900ms — total ~6.3s
    const stepTimers = LOADER_STEPS.map((_, idx) =>
      setTimeout(() => setStepIdx(idx), idx * 900)
    );
    // Zoom-out at 6.0s, finish at 6.9s
    const zoomTimer  = setTimeout(() => setIsZooming(true), 6000);
    const finishTimer = setTimeout(() => onFinished?.(), 6900);

    return () => {
      stepTimers.forEach(clearTimeout);
      clearTimeout(zoomTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinished]);

  return (
    <div className={`loading ${isZooming ? 'zoom-out' : ''}`}>
      {/* Animated background */}
      <div className="crypto-bg">
        <div className="crypto-grid" />
        <div className="market-scanline" />
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

      {/* Cyber Blue Bitcoin Coin — Y-axis only spin */}
      <div className={`coin-container ${isZooming ? 'coin-zoom' : ''}`}>
        <div className="coin coin-y-spin">
          <div className="coin-edge" />
          <div className="coin-side coin-front">
            <div className="coin-circuit" />
            <span className="coin-symbol">$</span>
          </div>
          <div className="coin-side coin-back">
            <div className="coin-circuit" />
            <span className="coin-symbol">PG</span>
          </div>
        </div>
      </div>

      {/* Brand */}
      <div className="load-title wordmark load-wordmark">
        <span className="wordmark-main">PriceGuard</span>
        <span className="wordmark-ai">AI</span>
      </div>

      <div className="load-sub">Market Protection Terminal</div>

      {/* Animated step text */}
      <div className="load-status load-step-text" key={stepIdx}>
        {LOADER_STEPS[stepIdx]}
      </div>

      {/* Progress bar — runs for ~6s */}
      <div className="load-bar-wrap">
        <div className="load-bar load-bar-long" />
      </div>
    </div>
  );
}
