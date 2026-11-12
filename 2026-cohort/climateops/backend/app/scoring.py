"""Deterministic priority score (ADR-004). PURE: same inputs -> same output. No model involvement.

DRAFT weights from the kickoff deck (Kseniya owns finalising; change RULE_VERSION when you do):
heat 30 / vulnerable users 25 / no working AC 20 / people on site 15 / low staffing 10.

Unknown handling: an unknown factor is NOT scored as zero. It is dropped, the remaining weights are
renormalised, a data_quality_flag is recorded, and `confidence` shows how much weight was known.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

RULE_VERSION = "draft-0.1"
WEIGHTS = {
    "heat": 30,
    "vulnerable_users": 25,
    "no_working_ac": 20,
    "people_on_site": 15,
    "low_staffing": 10,
}
# NWS event -> 0..1 severity. DRAFT mapping; confirm with Kseniya/Justin.
HEAT_EVENT_LEVEL = {
    "Extreme Heat Warning": 1.0,
    "Excessive Heat Warning": 1.0,
    "Heat Advisory": 0.7,
    "Extreme Heat Watch": 0.5,
    "Excessive Heat Watch": 0.5,
}
STATUS_MAX_AGE = timedelta(hours=24)  # deck: status older than a day = "unconfirmed"
PEOPLE_CAP = 50  # people_on_site at/above this counts as 1.0 (DRAFT)
LEVELS = {"none": 0.0, "some": 0.5, "many": 1.0}
AC = {"working": 0.0, "partial": 0.5, "none": 1.0, "broken": 1.0}


def _parse(ts: str | None) -> datetime | None:
    if not ts:
        return None
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def hazard_from_records(records: list[dict[str, Any]], fetch_ok: bool, now: datetime) -> dict[str, Any]:
    """Collapse weather records into one hazard input. A failed/stale fetch is UNKNOWN, never 'no hazard'."""
    if not fetch_ok:
        return {"status": "unavailable", "level": None, "event": None, "alert_id": None}
    best: dict[str, Any] | None = None
    for r in records:
        exp = _parse(r.get("expires"))
        if exp is not None and exp < now:
            continue
        lvl = HEAT_EVENT_LEVEL.get(r.get("event", ""))
        if lvl is None:
            continue
        if best is None or lvl > best["level"]:
            best = {"status": "ok", "level": lvl, "event": r["event"], "alert_id": r["id"]}
    return best or {"status": "ok", "level": 0.0, "event": None, "alert_id": None}


def _factor_values(facility: dict[str, Any], hazard: dict[str, Any], now: datetime) -> tuple[dict, list[str]]:
    flags: list[str] = []
    st = dict(facility.get("status") or {})
    as_of = _parse(st.get("as_of"))
    if as_of is None or now - as_of > STATUS_MAX_AGE:
        flags.append("status_unconfirmed")
        st = {}  # stale/undated status is treated as unknown, not as good news
    v: dict[str, float | None] = {}
    v["heat"] = hazard.get("level")
    if v["heat"] is None:
        flags.append("weather_unavailable")
    v["vulnerable_users"] = LEVELS.get(st.get("vulnerable_level", ""))
    v["no_working_ac"] = AC.get(st.get("ac_status", ""))
    p = st.get("people_on_site")
    v["people_on_site"] = None if p is None else min(max(p, 0) / PEOPLE_CAP, 1.0)
    req, on = st.get("staff_required"), st.get("staff_on_shift")
    v["low_staffing"] = None if (req in (None, 0) or on is None) else 1.0 - min(on / req, 1.0)
    for name, val in v.items():
        if val is None and name != "heat":
            flags.append(f"unknown:{name}")
    return v, flags


def score_facility(facility: dict[str, Any], hazard: dict[str, Any], now: datetime) -> dict[str, Any]:
    values, flags = _factor_values(facility, hazard, now)
    known = {k: v for k, v in values.items() if v is not None}
    known_w = sum(WEIGHTS[k] for k in known)
    total = sum(WEIGHTS.values())
    score = 0.0 if known_w == 0 else sum(WEIGHTS[k] * v for k, v in known.items()) / known_w * 100
    return {
        "facility_id": facility["facility_id"],
        "name": facility.get("name", facility["facility_id"]),
        "address": facility.get("address", ""),
        "rule_version": RULE_VERSION,
        "score": round(score, 1),
        "confidence": round(known_w / total, 2),
        "factors": {
            k: {"value": values[k], "weight": WEIGHTS[k], "known": values[k] is not None} for k in WEIGHTS
        },
        "data_quality_flags": sorted(flags),
    }


def rank_facilities(
    facilities: list[dict[str, Any]], hazard: dict[str, Any], now: datetime | None = None
) -> list[dict[str, Any]]:
    now = now or datetime.now(timezone.utc)
    snaps = [score_facility(f, hazard, now) for f in facilities]
    # tie-break on facility_id so ordering is fully deterministic (test T-009)
    snaps.sort(key=lambda s: (-s["score"], s["facility_id"]))
    for i, s in enumerate(snaps, 1):
        s["rank"] = i
    return snaps
