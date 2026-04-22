"""
PriceGuard AI — SeatGeek Data Extraction Script
Fetches events that have REAL price data (lowest_price populated).
Run daily to feed fresh data into the PriceGuard dashboard.

Usage:
    python extract_seatgeek.py
    python extract_seatgeek.py --all-events   # include events without prices too
"""
import requests
import pandas as pd
import time
import sys
from datetime import datetime

CLIENT_ID = "NTUxNzM5NjJ8MTc2NjkyNjQzNy4yMDE5MTAz"
BASE_URL = "https://api.seatgeek.com/2/events"

REQUIRE_PRICES = "--all-events" not in sys.argv
MAX_PAGES = 20 if REQUIRE_PRICES else 10

rows = []
total_priced = 0

print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting SeatGeek extraction...")
print(f"  Require prices: {REQUIRE_PRICES}")

# Try multiple event types to maximise priced events
for event_type in ["sports", "concert", "theater"]:
    page = 1
    print(f"\n  Fetching type={event_type}...")
    while page <= MAX_PAGES:
        params = {
            "client_id": CLIENT_ID,
            "type": event_type,
            "per_page": 100,
            "page": page,
            "listing_count.gt": 0,  # only events with active listings
        }
        try:
            r = requests.get(BASE_URL, params=params, timeout=10)
        except requests.exceptions.RequestException as e:
            print(f"  Network error: {e}")
            break

        if r.status_code != 200:
            print(f"  Request failed (status {r.status_code})")
            break

        events = r.json().get("events", [])
        if not events:
            break

        for e in events:
            stats = e.get("stats", {})
            lowest  = stats.get("lowest_price")
            average = stats.get("average_price")
            highest = stats.get("highest_price")
            if REQUIRE_PRICES and not lowest:
                continue
            total_priced += 1
            rows.append({
                "event_id":      e["id"],
                "title":         e["title"],
                "datetime":      e["datetime_local"],
                "venue":         e["venue"]["name"],
                "city":          e["venue"]["city"],
                "state":         e["venue"].get("state", ""),
                "country":       e["venue"].get("country", ""),
                "event_type":    event_type,
                "lowest_price":  lowest,
                "average_price": average,
                "highest_price": highest,
                "listing_count": stats.get("listing_count"),
                "popularity":    e["popularity"],
            })

        print(f"    Page {page}: {len(events)} events, {total_priced} with prices so far")
        page += 1
        time.sleep(0.4)

        if REQUIRE_PRICES and total_priced >= 300:
            print("  Reached 300 priced events, stopping")
            break

df = pd.DataFrame(rows).drop_duplicates(subset=["event_id"]) if rows else pd.DataFrame()

if df.empty:
    print("\n[WARN] No events found. Try --all-events flag.")
else:
    priced = df["lowest_price"].notna().sum()
    print(f"\n[DONE] {len(df)} events ({priced} with real prices)")

outfile = f"seatgeek_events_{datetime.now().strftime('%Y%m%d')}.csv"
df.to_csv(outfile, index=False)
print(f"[SAVED] {outfile} — upload this to the PriceGuard dashboard")
