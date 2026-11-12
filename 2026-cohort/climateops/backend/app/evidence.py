"""Evidence bundle (grounding-policy.md input policy). Immutable once hashed."""
from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical_hash(obj: Any) -> str:
    s = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return "sha256:" + hashlib.sha256(s.encode()).hexdigest()


def build_bundle(
    *, tenant_id: str, fetched_at: str, weather_source: str, weather_records: list[dict],
    weather_status: str, facilities: list[dict], snapshots: list[dict], playbook: dict,
) -> dict[str, Any]:
    facility_facts = [
        {
            "source_id": f"FAC:{f['facility_id']}",
            "facility_id": f["facility_id"],
            "name": f["name"],
            "provenance": f.get("provenance", "UNKNOWN"),
            "status": f.get("status"),
        }
        for f in facilities
    ]
    allowed = (
        [r["id"] for r in weather_records]
        + [x["source_id"] for x in facility_facts]
        + list(playbook["sources"].keys())
    )
    assumptions = [
        "Facilities are verified NYC public community infrastructure in Mott Haven / Melrose (Bronx Community District 1)."
    ]
    if weather_source != "NWS_LIVE":
        assumptions.append(f"Weather hazard alert is sourced from NWS OKX archives for Zone NYZ073 ({weather_source}).")
    if weather_status != "ok":
        assumptions.append("Weather fetch failed: hazard level is UNKNOWN, not 'no hazard'.")
    body = {
        "tenant_id": tenant_id,
        "fetched_at": fetched_at,
        "weather_source": weather_source,
        "weather_records": weather_records,
        "facility_facts": facility_facts,
        "priority_snapshot": snapshots,
        "task_library": [
            {k: t[k] for k in ("id", "tier", "title", "source_ids")} for t in playbook["tasks"]
        ],
        "explicit_demo_assumptions": assumptions,
        "permitted_source_ids": sorted(set(allowed)),
    }
    body["bundle_id"] = "EB-" + canonical_hash(body)[7:19]
    return body
