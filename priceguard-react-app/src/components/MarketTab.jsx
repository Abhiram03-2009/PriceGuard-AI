import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { Bar, Pie, Scatter } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

export default function MarketTab({ results }) {
  if (!results) {
    return (
      <div className="card fade">
        <div className="card-body" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '40px', marginBottom: '1rem' }}>📊</div>
          <div className="card-title">Market Analysis Unavailable</div>
          <div style={{ color: 'var(--t3)', maxWidth: '400px', margin: '0 auto', marginTop: '0.5rem' }}>
            Please upload a dataset and run AI Analysis to unlock deep market insights and arbitrage heatmaps.
          </div>
        </div>
      </div>
    );
  }

  // Aggregate by city for a heatmap-like bar chart
  const cityMap = {};
  results.arbEvents.forEach(e => {
    cityMap[e.city] = (cityMap[e.city] || 0) + 1;
  });
  const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const cityData = {
    labels: topCities.map(c => c[0]),
    datasets: [{
      label: 'Arbitrage Frequency',
      data: topCities.map(c => c[1]),
      backgroundColor: 'rgba(24, 168, 255, 0.5)',
      borderColor: 'var(--b)',
      borderWidth: 1,
    }]
  };

  const riskScore = (results.arbRate * 100).toFixed(1);

  return (
    <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="market-grid">
        <div className="market-box">
          <div className="card-title">Geographic Arbitrage Clusters</div>
          <div style={{ marginTop: '1.5rem', height: '300px' }}>
            <Bar data={cityData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>

        <div className="market-box" style={{ textAlign: 'center' }}>
          <div className="card-title">Market Risk Index</div>
          <div style={{ fontSize: '48px', fontWeight: 800, color: riskScore > 10 ? 'var(--p)' : 'var(--g)', marginTop: '2rem' }}>
            {riskScore}<span style={{ fontSize: '20px' }}>%</span>
          </div>
          <div className="sec-lbl" style={{ justifyContent: 'center', marginTop: '0.5rem' }}>Overall Arbitrage Density</div>
          <div className="risk-meter">
            <div 
              className="risk-meter-fill" 
              style={{ 
                width: `${riskScore}%`, 
                background: `linear-gradient(90deg, var(--g), var(--a), var(--p))`,
                boxShadow: `0 0 15px ${riskScore > 10 ? 'var(--p)' : 'var(--g)'}`
              }} 
            />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1.6 }}>
            {riskScore > 10 
              ? "HIGH RISK: Significant secondary market manipulation detected across multiple nodes." 
              : "STABLE: Market pricing aligns with fair value projections."}
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-hd"><div className="card-title">Market Liquidity vs Margin</div></div>
          <div className="card-body">
            <Scatter 
              data={{
                datasets: [{
                  label: 'Event Nodes',
                  data: results.arbEvents.map(e => ({ x: e.popularity, y: e.arbitrage_margin })),
                  backgroundColor: 'rgba(0, 229, 204, 0.6)'
                }]
              }}
              options={{
                scales: {
                  x: { title: { display: true, text: 'Market Demand (Popularity)', color: '#fff' } },
                  y: { title: { display: true, text: 'Arbitrage Margin ($)', color: '#fff' } }
                }
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-hd"><div className="card-title">Ensemble Decision Weights</div></div>
          <div className="card-body">
             <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Pie 
                 data={{
                   labels: ['Demand Vectors', 'Supply Scarcity', 'Price Outliers', 'Historical Trend'],
                   datasets: [{
                     data: [35, 25, 25, 15],
                     backgroundColor: ['var(--b)', 'var(--p)', 'var(--g)', 'var(--a)'],
                     borderWidth: 0
                   }]
                 }}
               />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
