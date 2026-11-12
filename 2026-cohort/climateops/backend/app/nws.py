"""National Weather Service client + normaliser (docs/04-data/weather-ingestion.md).

Rules baked in:
 * Always send a descriptive User-Agent with contact info (NWS requires it).
 * Backoff on 429/5xx/timeouts. If every attempt fails the result is status='failed' --
   NEVER treat a failed or empty fetch as 'no hazard'.
 * Freshness: based on fetched_at vs 2x poll interval (TBD to validate).
 * Replay fixtures are labelled SIMULATED / NWS_REPLAY and never presented as live NWS output.

NOT VERIFIED from the team's environment: exact alert `event` strings for the Bronx zone. Run
`python scripts/probe_nws.py` from a machine with internet and confirm (open item DEC-03/DEC-06).
"""
from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx

from .scoring import HEAT_EVENT_LEVEL

NWS_BASE = "https://api.weather.gov"


@dataclass
class WeatherResult:
    status: str  # "ok" | "failed"
    source: str  # "NWS_LIVE" | "NWS_REPLAY" | "SIMULATED"
    fetched_at: str
    records: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_alert(feature: dict[str, Any], source_url: str, fixture: str | None = None) -> dict[str, Any] | None:
    """Return a normalised heat record, or None if not heat-related / malformed."""
    p = feature.get("properties") or {}
    event = p.get("event")
    if event not in HEAT_EVENT_LEVEL:
        return None
    # missing issue time => invalid record (weather-ingestion.md failure scenarios)
    if not (p.get("sent") or p.get("effective")) or not (feature.get("id") or p.get("id")):
        return None
    payload = json.dumps(feature, sort_keys=True, separators=(",", ":"))
    return {
        "id": p.get("id") or feature.get("id"),
        "event": event,
        "severity": p.get("severity"),
        "headline": p.get("headline"),
        "area_desc": p.get("areaDesc"),
        "sent": p.get("sent"),
        "effective": p.get("effective"),
        "expires": p.get("expires") or p.get("ends"),
        "source_url": source_url,
        "payload_hash": "sha256:" + hashlib.sha256(payload.encode()).hexdigest(),
        "fixture_flag": fixture,  # None for live data; "SIMULATED"/"NWS_REPLAY" for fixtures
    }


def fetch_alerts_for_point(
    lat: float, lon: float, user_agent: str, client: httpx.Client | None = None,
    retries: int = 3, backoff_s: float = 1.0, sleep=time.sleep,
) -> WeatherResult:
    url = f"{NWS_BASE}/alerts/active?point={lat:.4f},{lon:.4f}"
    headers = {"User-Agent": user_agent, "Accept": "application/geo+json"}
    own = client is None
    client = client or httpx.Client(timeout=10.0)
    last_err = "unknown"
    try:
        for attempt in range(retries):
            try:
                r = client.get(url, headers=headers)
                if r.status_code in (429, 500, 502, 503, 504):
                    last_err = f"HTTP {r.status_code}"
                    sleep(backoff_s * (2**attempt))
                    continue
                r.raise_for_status()
                feats = r.json().get("features", [])
                recs = [x for f in feats if (x := normalize_alert(f, url))]
                return WeatherResult("ok", "NWS_LIVE", now_iso(), recs)
            except (httpx.TimeoutException, httpx.TransportError) as e:
                last_err = type(e).__name__
                sleep(backoff_s * (2**attempt))
            except (httpx.HTTPStatusError, ValueError) as e:
                return WeatherResult("failed", "NWS_LIVE", now_iso(), [], f"{type(e).__name__}: {e}")
        return WeatherResult("failed", "NWS_LIVE", now_iso(), [], f"retries exhausted ({last_err})")
    finally:
        if own:
            client.close()


def load_replay(fixtures_dir: Path) -> WeatherResult:
    """Labelled replay fixture used for the demo (no live heat alerts exist in November)."""
    raw = json.loads((fixtures_dir / "replay_heat_alert.json").read_text())
    label = raw["fixture_label"]  # SIMULATED or NWS_REPLAY
    recs = []
    now = datetime.now(timezone.utc)
    for feat in raw["features"]:
        # fixture times are relative so the demo alert is always "current" (and still labelled)
        props = feat["properties"]
        if "sent_offset_h" in props:
            props["sent"] = props["effective"] = (now + timedelta(hours=props["sent_offset_h"])).isoformat()
            props["expires"] = (now + timedelta(hours=props["expires_offset_h"])).isoformat()
        rec = normalize_alert(feat, raw["source_note"], fixture=label)
        if rec:
            recs.append(rec)
    return WeatherResult("ok", label, now_iso(), recs)


def freshness(fetched_at: str, stale_after_seconds: int, now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    age = (now - datetime.fromisoformat(fetched_at)).total_seconds()
    return "FRESH" if age <= stale_after_seconds else "STALE"
