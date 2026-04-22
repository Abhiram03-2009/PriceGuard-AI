import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

const TT = {
  bg: '#050f1c',
  bc: 'rgba(24,168,255,0.28)',
  tc: '#18a8ff',
  dc: 'rgba(178,215,255,0.7)',
  ff: "'IBM Plex Mono'",
};
const AX = { tc: 'rgba(138,185,225,0.42)', gc: 'rgba(24,168,255,0.055)' };

function useChart(canvasRef, build, deps) {
  const inst = useRef();
  useEffect(() => {
    if (!canvasRef.current) return;
    inst.current?.destroy();
    inst.current = build(canvasRef.current.getContext('2d'));
    return () => inst.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ── Forecast: historical + 7-day ahead ───────────────────────────────────────
export function ForecastChart({ series }) {
  const ref = useRef();
  useChart(ref, ctx => {
    const labels = series.map(d => d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const todayIdx = series.findIndex(d => d.isToday);
    const hist = series.map((d, i) => i <= todayIdx ? d.rate : null);
    const fore = series.map((d, i) => {
      if (i === todayIdx) return d.rate;
      return d.isForecast ? d.rate : null;
    });
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Historical',
            data: hist,
            borderColor: '#18a8ff',
            backgroundColor: 'rgba(24,168,255,0.065)',
            tension: 0.4, fill: true,
            pointBackgroundColor: '#18a8ff',
            pointRadius: series.map(d => d.isToday ? 7 : 3),
            pointHoverRadius: 6, borderWidth: 2.2, spanGaps: false,
          },
          {
            label: '7-Day Forecast',
            data: fore,
            borderColor: '#f5a623',
            backgroundColor: 'rgba(245,166,35,0.055)',
            tension: 0.4, fill: true,
            pointBackgroundColor: '#f5a623',
            pointRadius: 4, pointHoverRadius: 6, borderWidth: 2.2,
            borderDash: [5, 4], spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: 'rgba(178,215,255,0.6)', font: { family: TT.ff, size: 10 }, boxWidth: 12 } },
          tooltip: {
            backgroundColor: TT.bg, borderColor: TT.bc, borderWidth: 1,
            titleColor: TT.tc, bodyColor: TT.dc,
            titleFont: { family: TT.ff, size: 10 }, bodyFont: { family: TT.ff, size: 10 },
            callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.y?.toFixed(2)}%` },
          },
        },
        scales: {
          x: { ticks: { color: AX.tc, font: { family: TT.ff, size: 9 }, maxRotation: 40 }, grid: { color: AX.gc } },
          y: { ticks: { color: AX.tc, font: { family: TT.ff, size: 9 }, callback: v => v.toFixed(1) + '%' }, grid: { color: AX.gc } },
        },
      },
    });
  }, [series]);
  return <div className="chart-wrap" style={{ height: 200 }}><canvas ref={ref} /></div>;
}

// ── Scatter + OLS Regression line ─────────────────────────────────────────────
export function ScatterLinChart({ popVals, priceVals, linModel, processed }) {
  const ref = useRef();
  useChart(ref, ctx => {
    const arbPts  = processed.filter(d => d.arbitrage === 1).map(d => ({ x: +d.popularity.toFixed(4), y: +d.average_price.toFixed(2) }));
    const safePts = processed.filter(d => d.arbitrage === 0).map(d => ({ x: +d.popularity.toFixed(4), y: +d.average_price.toFixed(2) }));
    const minP = Math.min(...popVals), maxP = Math.max(...popVals);
    const reg = [
      { x: +minP.toFixed(4), y: +linModel.predict(minP).toFixed(2) },
      { x: +maxP.toFixed(4), y: +linModel.predict(maxP).toFixed(2) },
    ];
    return new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          { label: 'Safe',      data: safePts, backgroundColor: 'rgba(24,168,255,0.22)', borderColor: 'rgba(24,168,255,0.48)', pointRadius: 4, pointHoverRadius: 6 },
          { label: 'Arbitrage', data: arbPts,  backgroundColor: 'rgba(255,54,104,0.28)', borderColor: 'rgba(255,54,104,0.68)', pointRadius: 4.5, pointHoverRadius: 6 },
          { label: `OLS Trend  R²=${(linModel.r2 * 100).toFixed(1)}%`, data: reg, type: 'line', borderColor: 'rgba(245,166,35,0.85)', borderWidth: 2.2, pointRadius: 0, fill: false, tension: 0 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: 'rgba(178,215,255,0.6)', font: { family: TT.ff, size: 10 }, boxWidth: 12 } },
          tooltip: {
            backgroundColor: TT.bg, borderColor: TT.bc, borderWidth: 1,
            titleColor: TT.tc, bodyColor: TT.dc,
            titleFont: { family: TT.ff, size: 10 }, bodyFont: { family: TT.ff, size: 10 },
            callbacks: { label: c => ` Pop:${c.parsed.x?.toFixed(3)}  Price:$${c.parsed.y?.toFixed(0)}` },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Popularity', color: 'rgba(138,185,225,0.5)', font: { family: TT.ff, size: 9 } },
            ticks: { color: AX.tc, font: { family: TT.ff, size: 9 } }, grid: { color: AX.gc },
          },
          y: {
            title: { display: true, text: 'Avg Price ($)', color: 'rgba(138,185,225,0.5)', font: { family: TT.ff, size: 9 } },
            ticks: { color: AX.tc, font: { family: TT.ff, size: 9 }, callback: v => '$' + v }, grid: { color: AX.gc },
          },
        },
      },
    });
  }, [processed]);
  return <div className="chart-wrap" style={{ height: 210 }}><canvas ref={ref} /></div>;
}

// ── Horizontal Bar ────────────────────────────────────────────────────────────
export function HBar({ labels, data, colors, height = 200 }) {
  const ref = useRef();
  useChart(ref, ctx => new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors || 'rgba(24,168,255,0.24)',
        borderColor: Array.isArray(colors) ? colors.map(c => c.replace(/[\d.]+\)$/, '0.8)')) : 'rgba(24,168,255,0.7)',
        borderWidth: 1.4, borderRadius: 3,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { backgroundColor: TT.bg, borderColor: TT.bc, borderWidth: 1, titleColor: TT.tc, bodyColor: TT.dc, titleFont: { family: TT.ff, size: 10 }, bodyFont: { family: TT.ff, size: 10 } } },
      scales: {
        x: { ticks: { color: AX.tc, font: { family: TT.ff, size: 9 } }, grid: { color: AX.gc } },
        y: { ticks: { color: AX.tc, font: { family: TT.ff, size: 9 } }, grid: { display: false } },
      },
    },
  }), [data]);
  return <div className="chart-wrap" style={{ height }}><canvas ref={ref} /></div>;
}

// ── Vertical Bar ──────────────────────────────────────────────────────────────
export function VBar({ labels, data, color = 'rgba(24,168,255,0.3)', bc = '#18a8ff', height = 180 }) {
  const ref = useRef();
  useChart(ref, ctx => new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: color, borderColor: bc, borderWidth: 1.4, borderRadius: 3 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: TT.bg, borderColor: TT.bc, borderWidth: 1, titleColor: TT.tc, bodyColor: TT.dc } },
      scales: {
        x: { ticks: { color: AX.tc, font: { family: TT.ff, size: 9 } }, grid: { display: false } },
        y: { ticks: { color: AX.tc, font: { family: TT.ff, size: 9 } }, grid: { color: AX.gc } },
      },
    },
  }), [data]);
  return <div className="chart-wrap" style={{ height }}><canvas ref={ref} /></div>;
}

// ── Donut ─────────────────────────────────────────────────────────────────────
export function Donut({ value, color = '#18a8ff', label, size = 76 }) {
  const ref = useRef();
  useChart(ref, ctx => new Chart(ctx, {
    type: 'doughnut',
    data: { datasets: [{ data: [value, Math.max(0, 100 - value)], backgroundColor: [color, 'rgba(24,168,255,0.06)'], borderWidth: 0, borderRadius: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '73%', plugins: { legend: { display: false }, tooltip: { enabled: false } } },
  }), [value, color]);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <canvas ref={ref} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontFamily: "'Syne'", fontSize: size > 70 ? '14px' : '12px', fontWeight: '700', color, lineHeight: 1 }}>{value.toFixed(0)}%</span>
        {label && <span style={{ fontSize: '8px', color: 'var(--t3)', marginTop: 1 }}>{label}</span>}
      </div>
    </div>
  );
}
