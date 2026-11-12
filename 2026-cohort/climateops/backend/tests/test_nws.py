import httpx

from app import nws


def feature(event="Extreme Heat Warning", **p):
    props = {"id": "urn:oid:123", "event": event, "severity": "Severe", "sent": "2026-07-01T10:00:00Z",
             "expires": "2026-07-02T10:00:00Z", "areaDesc": "Bronx", **p}
    return {"id": props["id"], "properties": props}


def client_for(handler):
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_normalizes_heat_and_ignores_other_events():
    def h(req):
        assert "ClimateOps" in req.headers["user-agent"]
        return httpx.Response(200, json={"features": [feature(), feature("Flood Watch", id="x2")]})
    r = nws.fetch_alerts_for_point(40.8, -73.9, "ClimateOps-Test/0.1 (a@b.c)", client_for(h))
    assert r.status == "ok" and [x["event"] for x in r.records] == ["Extreme Heat Warning"]
    assert r.records[0]["payload_hash"].startswith("sha256:") and r.records[0]["fixture_flag"] is None


def test_record_missing_issue_time_is_invalid():
    f = feature(sent=None)
    f["properties"]["effective"] = None
    assert nws.normalize_alert(f, "u") is None


def test_retries_then_fails_and_never_looks_like_no_hazard():
    calls = []
    def h(req):
        calls.append(1)
        return httpx.Response(429)
    r = nws.fetch_alerts_for_point(40.8, -73.9, "UA", client_for(h), retries=3, sleep=lambda s: None)
    assert r.status == "failed" and r.records == [] and len(calls) == 3


def test_recovers_after_transient_error():
    seq = [httpx.Response(503), httpx.Response(200, json={"features": [feature()]})]
    r = nws.fetch_alerts_for_point(40.8, -73.9, "UA", client_for(lambda req: seq.pop(0)), sleep=lambda s: None)
    assert r.status == "ok" and len(r.records) == 1


def test_freshness():
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    assert nws.freshness((now - timedelta(minutes=5)).isoformat(), 600) == "FRESH"
    assert nws.freshness((now - timedelta(minutes=30)).isoformat(), 600) == "STALE"
