# PriceGuard AI — Arbitrage Intelligence Platform

## Quick Start

1. Open `index.html` in any modern web browser (Chrome, Firefox, Edge)
2. Go to the **Dashboard** tab
3. Upload your SeatGeek / Ticketmaster CSV file (drag & drop or click Browse)
4. Click **⚡ Run AI Analysis**
5. Explore results across tabs, download reports

## Features

- **Dual-Layer ML Engine**: Random Forest Regressor + Gradient Boosting Machine ensemble
- **Real-Time Analysis**: Processes any CSV dataset instantly in-browser
- **Arbitrage Detection**: Flags events where resale margin > $18
- **Price Correction**: Auto-calculates corrected primary market prices
- **5 Dashboard Tabs**: Dashboard, Analysis, Events Table, Insights, Model
- **Export**: Download arbitrage report CSV or full dataset CSV
- **Date-Seeded**: Reproducible daily results with natural day-to-day variation

## CSV Format

Upload any CSV with these columns (extras are ignored):
```
event_id, title, venue, city, state, datetime, popularity, listing_count,
lowest_price, average_price, highest_price
```
Missing price columns are synthetically generated from demand signals.

## ML Architecture

- **Layer 1**: Random Forest Regressor (25 trees, depth 6, bootstrap)
- **Layer 2**: Gradient Boosting Machine (20 rounds, lr=0.12, residual correction)
- **Ensemble**: RF×0.60 + GBM×0.40 → Predicted fair market price
- **Classifier**: RF Classifier → Binary arbitrage flag ($18 threshold)
- **Features**: lowest_price, highest_price, listing_count, log_listings, popularity, demand_score, price_spread, volatility, supply_pressure

## Output Columns (Downloaded CSV)

| Column | Description |
|--------|-------------|
| lowest_price | Current floor listing price |
| predicted_price | AI-predicted fair market value |
| corrected_price | Recommended adjusted price to suppress arbitrage |
| arbitrage_margin | Predicted − Floor (profit available to resellers) |
| prevented_profit | Resale profit eliminated by corrected price |
| risk_score | 0–100 arbitrage risk score |
| arbitrage_tier | HIGH / MEDIUM / LOW |
| arbitrage | 1 = flagged, 0 = safe |

## DECA / ICDC Competition Notes

- All ML runs entirely in-browser (no server required)
- Models retrain fresh on each uploaded dataset
- Seed is date-based for daily reproducibility
- Designed for SeatGeek API output but generalizes to any ticketing platform
