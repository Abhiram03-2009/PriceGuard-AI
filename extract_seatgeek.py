"""
PriceGuard AI — SeatGeek Data Extraction Script
Run this daily to pull fresh event data for analysis
"""
import requests
import pandas as pd
import time
from datetime import datetime

CLIENT_ID = "NTUxNzM5NjJ8MTc2NjkyNjQzNy4yMDE5MTAz"
BASE_URL = "https://api.seatgeek.com/2/events"

rows = []
page = 1

print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting SeatGeek extraction...")

while page <= 10:
    params = {
        "client_id": CLIENT_ID,
        "type": "sports",
        "per_page": 100,
        "page": page
    }
    r = requests.get(BASE_URL, params=params)
    if r.status_code != 200:
        print(f"Request failed: {r.text}")
        break
    data = r.json()
    if "events" not in data:
        break
    for e in data["events"]:
        stats = e.get("stats", {})
        rows.append({
            "event_id": e["id"],
            "title": e["title"],
            "datetime": e["datetime_local"],
            "venue": e["venue"]["name"],
            "city": e["venue"]["city"],
            "state": e["venue"]["state"],
            "lowest_price": stats.get("lowest_price"),
            "average_price": stats.get("average_price"),
            "highest_price": stats.get("highest_price"),
            "listing_count": stats.get("listing_count"),
            "popularity": e["popularity"]
        })
    print(f"  Page {page}: {len(data['events'])} events")
    page += 1
    time.sleep(0.3)

df = pd.DataFrame(rows)
outfile = f"seatgeek_events_{datetime.now().strftime('%Y%m%d')}.csv"
df.to_csv(outfile, index=False)
print(f"[DONE] Saved {len(df)} events → {outfile}")
