import copy
from datetime import datetime, timezone

import pytest

from app import grounding
from app.evidence import build_bundle
from app.scoring import hazard_from_records, rank_facilities
from helpers import FakeLLM, make_bundle


def test_valid_output_passes():
    b = make_bundle()
    out = grounding.generate_brief(b, FakeLLM(b))
    assert out["model_metadata"]["used_fallback"] is False
    assert out["content"]["facility_actions"]


def test_unknown_source_id_rejected_and_falls_back():
    b = make_bundle()
    out = grounding.generate_brief(b, FakeLLM(b, mutate=lambda o: o["claims"][0].update(source_ids=["SRC-MADE-UP"])))
    assert out["model_metadata"]["used_fallback"] is True
    assert "not in bundle" in out["model_metadata"]["fallback_reason"]


def test_claim_without_source_rejected():
    b = make_bundle()
    out = grounding.generate_brief(b, FakeLLM(b, mutate=lambda o: o["claims"][0].update(source_ids=[])))
    assert out["model_metadata"]["used_fallback"]


def test_unsupported_alert_name_rejected():
    b = make_bundle(weather=False)
    out = grounding.generate_brief(b, FakeLLM(b, mutate=lambda o: o.update(summary="An Extreme Heat Warning is active.")))
    assert out["model_metadata"]["used_fallback"]


def test_model_claiming_approval_rejected():
    b = make_bundle()
    out = grounding.generate_brief(b, FakeLLM(b, mutate=lambda o: o.update(summary="Plan approved and assigned.")))
    assert out["model_metadata"]["used_fallback"]


def test_missing_uncertainties_rejected():
    b = make_bundle()
    out = grounding.generate_brief(b, FakeLLM(b, mutate=lambda o: o.update(uncertainties=[])))
    assert out["model_metadata"]["used_fallback"]


def test_model_exception_falls_back():
    b = make_bundle()
    out = grounding.generate_brief(b, FakeLLM(b, raises=RuntimeError("timeout")))
    assert out["model_metadata"]["used_fallback"] and "RuntimeError" in out["model_metadata"]["fallback_reason"]


def test_no_model_configured_gives_valid_fallback_that_itself_validates():
    b = make_bundle()
    out = grounding.generate_brief(b, None)
    assert out["model_metadata"]["fallback_reason"] == "model_not_configured"
    grounding.validate(copy.deepcopy(out["content"]), b)  # the template must satisfy its own contract


def test_fallback_when_no_weather_still_valid():
    b = make_bundle(weather=False)
    out = grounding.generate_brief(b, None)
    grounding.validate(copy.deepcopy(out["content"]), b)
