#!/usr/bin/env python3
"""Convert Kseniya's facilities spreadsheet into data/fixtures/demo_orgs.json format.
Reads: data/sample_facilities/climateops_facilities (1).xlsx
Writes: data/fixtures/demo_orgs.json
"""
import json
import os
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("Installing openpyxl...")
    os.system(f"{sys.executable} -m pip install openpyxl")
    import openpyxl

ROOT = Path(__file__).resolve().parents[1]
EXCEL_PATH = ROOT / "data" / "sample_facilities" / "climateops_facilities (1).xlsx"
OUTPUT_JSON = ROOT / "data" / "fixtures" / "demo_orgs.json"

wb = openpyxl.load_workbook(str(EXCEL_PATH))
ws = wb["climateops_facilities"]
rows = list(ws.iter_rows(values_only=True))
header = rows[0]

facilities = []
for r in rows[1:]:
    d = dict(zip(header, r))
    neighborhood = d.get("neighborhood") or "Mott Haven"
    tenant_id = "demo-a" if "mott" in neighborhood.lower() else "demo-b"

    # Map AC operational status
    ac_working = str(d.get("ac_working_today") or "").strip().upper()
    if ac_working == "Y":
        ac_status = "working"
    elif ac_working == "N":
        ac_status = "none"
    else:
        ac_status = "unknown"

    # Map Vulnerable population served
    serves_vuln = str(d.get("serves_vulnerable") or "").strip().upper()
    if serves_vuln == "Y":
        vulnerable_level = "many"
    elif serves_vuln == "N":
        vulnerable_level = "none"
    else:
        vulnerable_level = "some"

    people = int(d.get("occupancy_today") or 0)
    staff_on = int(d.get("staff_on_shift") or 1)

    # Estimate required staffing baseline based on building typology
    ftype = (d.get("facility_type") or "").lower()
    if "school" in ftype:
        staff_req = max(staff_on, int(people / 15)) or 40
    elif "older adult" in ftype:
        staff_req = 3
    elif "community" in ftype:
        staff_req = 4
    elif "rec" in ftype:
        staff_req = 6
    else:
        staff_req = 4

    provenance = "PUBLIC_VERIFIED" if d.get("record_type") == "REAL" else "DEMO_SYNTHETIC"

    fac = {
        "facility_id": d.get("public_facility_id"),
        "tenant_id": tenant_id,
        "name": d.get("name"),
        "address": d.get("address") or "",
        "lat": round(float(d.get("latitude") or 40.81), 6),
        "lon": round(float(d.get("longitude") or -73.92), 6),
        "provenance": provenance,
        "source_url": d.get("source_url") or "",
        "status": {
            "as_of_hours_ago": 1,
            "ac_status": ac_status,
            "vulnerable_level": vulnerable_level,
            "people_on_site": people,
            "staff_on_shift": staff_on,
            "staff_required": staff_req,
        },
    }
    facilities.append(fac)

payload = {
    "tenants": [
        {
            "tenant_id": "demo-a",
            "name": "South Bronx Community Resilience Network",
            "district": "Bronx Community District 1 (Mott Haven)",
            "default_staff_id": "staff_demo_a1",
        },
        {
            "tenant_id": "demo-b",
            "name": "Melrose Community Operations",
            "district": "Bronx Community District 1 (Melrose)",
            "default_staff_id": "staff_demo_b1",
        },
    ],
    "facilities": facilities,
}

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2)

print(f"Successfully converted {len(facilities)} facilities into {OUTPUT_JSON}")
