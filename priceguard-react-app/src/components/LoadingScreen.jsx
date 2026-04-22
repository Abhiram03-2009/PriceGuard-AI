import React, { useEffect, useState } from 'react';
import logo from '../logo.png';

// Each line animates in sequence, typed out character by character
const LINES = [
  { text: 'Arbitrage Intelligence.', delay: 0.3, cls: 'line1' },
  { text: 'Your powerful tool to detect arbitrage and prevent secondary market resale.', delay: 1.5, cls: 'line2' },
  { text: 'Real-time pricing intelligence. Corrected before it costs you.', delay: 3.1, cls: 'line3' },
];

export default function LoadingScreen() {
  const [barDone, setBarDone] = useState(false);

  useEffect(() => {
    // bar animation is 3.8s
    const t = setTimeout(() => setBarDone(true), 3800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="loading">
      <div className="load-logo-wrap">
        <div className="load-logo">
          <img src={logo} alt="PriceGuard AI" />
          <div className="load-logo-ring2" />
          <div className="load-logo-ring" />
        </div>
      </div>

      <div className="load-title">PriceGuard AI</div>

      <div className="load-taglines">
        {LINES.map((line, i) => (
          <span
            key={i}
            className={`tagline ${line.cls}`}
            style={{ animationDelay: `${line.delay}s` }}
          >
            {line.text}
          </span>
        ))}
      </div>

      <div className="load-bar-wrap">
        <div className="load-bar" />
      </div>
      <div className="load-status">
        {barDone ? 'READY' : 'INITIALIZING ENGINE...'}
      </div>
    </div>
  );
}
