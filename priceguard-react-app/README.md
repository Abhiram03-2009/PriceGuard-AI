# PriceGuard AI — React App

## Quick Start (React Dev Mode)

```bash
npm install
npm start
```
Opens at http://localhost:3000 with hot-reload. Edit any file in `src/` and the browser updates instantly.

## Build Standalone HTML

```bash
npm run build
```
This produces an optimized build in `build/`. For a single-file HTML you can share/deploy without a server, use the included `standalone.html` in `public/` — it already has everything bundled including the logo.

## Project Structure

```
src/
├── index.js              # React entry point
├── index.css             # All styles (edit here for visual changes)
├── App.jsx               # Main app — tabs, state, table, all pages
├── engine.js             # ML engine: RF, GBM, OLS, forecast (pure JS)
└── components/
    ├── LoadingScreen.jsx  # Boot screen with typewriter animation
    ├── Navbar.jsx         # Top nav with logo + tabs
    ├── Charts.jsx         # All Chart.js chart components
    └── Toast.jsx          # Toast notifications

public/
├── index.html            # HTML shell for React
├── logo.png              # PriceGuard shield logo
├── standalone.html       # ← Single-file version (open directly in browser)
└── seatgeek_events10.csv # Sample dataset
```

## Key Edit Points

| What you want to change | File | What to edit |
|------------------------|------|--------------|
| Colors / fonts | `src/index.css` | CSS variables at top `:root { }` |
| Loading screen text | `src/components/LoadingScreen.jsx` | `LINES` array |
| Typewriter lines (standalone) | `standalone.html` | `.tw-1 / .tw-2 / .tw-3` div text |
| Navbar links | `src/components/Navbar.jsx` | `TABS` array |
| ML thresholds | `src/engine.js` | `THR` constant (currently 18) |
| Chart colors | `src/components/Charts.jsx` | `borderColor` / `backgroundColor` per dataset |
| Dashboard layout | `src/App.jsx` | Each `tab === 'dashboard'` block |
| Analysis charts | `src/App.jsx` | `tab === 'analysis'` block |
| Add a new tab | `src/components/Navbar.jsx` + `src/App.jsx` | Add to `TABS`, add render block |

## ML Architecture

- **Layer 1 (58%)**: Random Forest Regressor — 28 trees, depth 7, bootstrap
- **Layer 2 (42%)**: Gradient Boosting Machine — 22 rounds, lr=0.11
- **Ensemble**: RF×0.58 + GBM×0.42 → predicted fair price
- **Classifier**: Binarizes at $18 margin threshold
- **Forecast**: Exponential smoothing + trend component (7 days ahead)
- **OLS**: Linear regression for popularity→price trendline + R²
- **Seed**: Date-based (YYYYMMDD) for daily reproducibility

## Supported CSV Columns

```
event_id, title, venue, city, state, datetime,
popularity, listing_count,
lowest_price, average_price, highest_price
```

Missing price columns are synthetically generated from popularity + listing demand signals.
