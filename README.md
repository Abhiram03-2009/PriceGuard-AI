# PriceGuard AI — Arbitrage Intelligence Platform

## Quick Start (React App)

1. **Install Node.js**: Ensure you have Node.js installed on your machine.
2. **Navigate to App Directory**: Open your terminal and change into the React app folder:
   ```bash
   cd priceguard-react-app
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Start the AI Server**:
   ```bash
   npm start
   ```
5. **Analyze**: The app will automatically open at `http://localhost:3000`. Go to the Dashboard, upload a dataset, and click **Run AI Analysis**.

## Features

- **Dual-Layer ML Engine**: Random Forest Regressor + Gradient Boosting Machine ensemble
- **Real-Time Analysis**: Processes any CSV dataset instantly in-browser using JS-based models
- **Dynamic Arbitrage Detection**: Flags events where resale margin > $12 (or 12% of floor price)
- **Risk Calculation**: Intelligently categorizes margin gaps as HIGH, MEDIUM, or LOW risk
- **Price Correction**: Auto-calculates corrected primary market prices
- **5 Comprehensive Tabs**: Dashboard, Analysis, Events Table, Insights, Model
- **Export**: Download filtered arbitrage CSV or the full processed dataset

## CSV Format

Upload any CSV with these core columns (extras are ignored):
```
event_id, title, venue, city, state, datetime, popularity, listing_count,
lowest_price, average_price, highest_price
```
*Note: Missing price columns are synthetically generated from pure demand signals if necessary.*

## ML Architecture (Updated)

- **Layer 1 (58%)**: Random Forest Regressor (28 trees, depth 7, bootstrap)
- **Layer 2 (42%)**: Gradient Boosting Machine (22 rounds, lr=0.11, residual correction)
- **Ensemble**: RF×0.58 + GBM×0.42 → Base Model
- **Latent Alpha Boosting**: Composite demand_score and temporal urgency augment the base fair price
- **Classifier**: Dynamic threshold logic ($12 min or 12%) → Arbitrage `HIGH/MEDIUM/LOW` Tier
- **Features Engineered**: demand_score, price_spread, volatility, supply_pressure, log_listings, urgency

## Output Columns (Downloaded CSV)

| Column | Description |
|--------|-------------|
| `lowest_price` | Current floor listing price |
| `predicted_price` | AI-predicted base fair market value |
| `corrected_price` | Recommended adjusted price to suppress arbitrage leakage |
| `arbitrage_margin` | Predicted − Floor (profit available to resellers) |
| `prevented_profit` | Resale profit eliminated by corrected price |
| `risk_score` | Scaled arbitrage risk score (0-100+) |
| `arbitrage_tier` | HIGH / MEDIUM / LOW (Based on Risk mapping) |
| `arbitrage` | 1 = flagged, 0 = safe |

## DECA / ICDC Competition Notes

- All ML runs **entirely client-side** (no Python backend or server fees required).
- Models retrain fresh on each uploaded dataset.
- Seed is date-based for daily reproducibility.
- Designed natively for SeatGeek output but generalizes to any standard CSV export.

## Updating the Code (Git Commands)

If you make further changes to the code and need to push them to your GitHub repository, run these commands in your terminal from the root folder (`PriceGuard AI Model`):

1. **Stage your changes:**
   ```bash
   git add .
   ```
2. **Commit your changes:**
   ```bash
   git commit -m "Describe what you updated here"
   ```
3. **Push to GitHub:**
   ```bash
   git push
   ```
