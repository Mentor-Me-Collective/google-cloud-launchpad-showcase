#!/usr/bin/env python3
"""Run this from a machine with internet (the build sandbox could not reach api.weather.gov).
It answers the open questions: what zone covers Mott Haven, and what do heat alert `event`
strings look like. Paste the output into docs/04-data/weather-ingestion.md and DEC-03/DEC-06."""
import json, os, sys
import httpx

UA = os.getenv("NWS_USER_AGENT", "ClimateOps-Demo/0.1 (your-email@example.com)")
LAT, LON = 40.8090, -73.9230  # approx Mott Haven centroid (verify)
H = {"User-Agent": UA, "Accept": "application/geo+json"}
with httpx.Client(timeout=15) as c:
    pt = c.get(f"https://api.weather.gov/points/{LAT},{LON}", headers=H)
    print("points:", pt.status_code)
    if pt.status_code == 200:
        p = pt.json()["properties"]
        print(" office:", p.get("gridId"), "zone:", p.get("forecastZone"), "county:", p.get("county"))
        print(" forecastHourly:", p.get("forecastHourly"))
    al = c.get(f"https://api.weather.gov/alerts/active?point={LAT},{LON}", headers=H)
    print("alerts:", al.status_code, "count:", len(al.json().get("features", [])) if al.status_code == 200 else "-")
    for f in (al.json().get("features", []) if al.status_code == 200 else []):
        print(" -", f["properties"]["event"], "|", f["properties"].get("severity"), "|", f["properties"].get("expires"))
    ev = c.get("https://api.weather.gov/alerts/types", headers=H)
    if ev.status_code == 200:
        print("heat-ish event types:", [e for e in ev.json().get("eventTypes", []) if "Heat" in e])
