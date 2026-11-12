from datetime import datetime, timedelta, timezone

from app.scoring import WEIGHTS, hazard_from_records, rank_facilities, score_facility

NOW = datetime(2026, 7, 1, 12, tzinfo=timezone.utc)
HAZ = {"status": "ok", "level": 1.0, "event": "Extreme Heat Warning", "alert_id": "X"}


def fac(fid, **st):
    base = {"as_of": (NOW - timedelta(hours=1)).isoformat(), "ac_status": "none", "vulnerable_level": "many",
            "people_on_site": 50, "staff_on_shift": 0, "staff_required": 2}
    base.update(st)
    return {"facility_id": fid, "status": base}


def test_weights_sum_to_100():
    assert sum(WEIGHTS.values()) == 100


def test_max_risk_scores_100():
    assert score_facility(fac("A"), HAZ, NOW)["score"] == 100.0


def test_deterministic_ranking_and_tiebreak():
    fs = [fac("B"), fac("A")]
    r1 = rank_facilities(fs, HAZ, NOW)
    r2 = rank_facilities(list(reversed(fs)), HAZ, NOW)
    assert [s["facility_id"] for s in r1] == [s["facility_id"] for s in r2] == ["A", "B"]


def test_unknown_is_not_scored_as_zero_and_is_flagged():
    s = score_facility(fac("A", ac_status="unknown"), HAZ, NOW)
    assert "unknown:no_working_ac" in s["data_quality_flags"]
    assert s["confidence"] == 0.8
    assert s["score"] == 100.0  # remaining known factors are all max; unknown did not drag it down


def test_stale_status_becomes_unconfirmed_not_good_news():
    old = fac("A", as_of=(NOW - timedelta(hours=30)).isoformat(), ac_status="working")
    s = score_facility(old, HAZ, NOW)
    assert "status_unconfirmed" in s["data_quality_flags"]
    assert s["factors"]["no_working_ac"]["known"] is False


def test_failed_weather_is_unknown_never_no_hazard():
    h = hazard_from_records([], fetch_ok=False, now=NOW)
    assert h["level"] is None and h["status"] == "unavailable"
    s = score_facility(fac("A"), h, NOW)
    assert "weather_unavailable" in s["data_quality_flags"]


def test_successful_empty_fetch_is_zero_hazard_and_expired_alert_ignored():
    assert hazard_from_records([], True, NOW)["level"] == 0.0
    exp = [{"id": "e", "event": "Heat Advisory", "expires": (NOW - timedelta(hours=1)).isoformat()}]
    assert hazard_from_records(exp, True, NOW)["level"] == 0.0
