from unittest.mock import AsyncMock

try:
    import pytest
except ImportError:
    class _MockPytest:
        class mark:
            @staticmethod
            def anyio(func):
                return func

    pytest = _MockPytest()
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.agent.narrative import (
    build_fallback_narrative,
    generate_volunteer_care_narrative,
)
from app.agent.nim_client import (
    NIMClient,
    NIMClientError,
    _redact_secret,
    reset_daily_nim_counter,
)
from app.agent.prompts import build_user_prompt
from app.core.config import Settings
from app.main import app
from app.schemas.plan import VolunteerPlanRequest
from app.services.recommender import (
    calculate_volunteer_plan,
    get_site_by_id,
    load_species,
)

client = TestClient(app)


def test_nim_client_properties_and_configuration():
    # Unconfigured settings
    unconfigured_settings = Settings(_env_file=None, nvidia_api_key=None)
    nim = NIMClient(settings=unconfigured_settings)
    assert not nim.is_configured
    assert nim.base_url == "https://integrate.api.nvidia.com/v1"
    assert nim.model == "nvidia/nemotron-3-ultra-550b-a55b"

    # Configured settings
    configured_settings = Settings(
        nvidia_api_key=SecretStr("nvapi-test-key-12345"),
        nvidia_base_url="https://custom.nim.api/v1",
        nvidia_model="meta/llama-3.3-70b-instruct",
    )
    configured_nim = NIMClient(settings=configured_settings)
    assert configured_nim.is_configured
    assert configured_nim.base_url == "https://custom.nim.api/v1"
    assert configured_nim.model == "meta/llama-3.3-70b-instruct"


def test_build_user_prompt_formatting():
    prompt = build_user_prompt(
        site_name="Compact Sidewalk Strip",
        site_label="Sidewalk Strip",
        sunlight="full sun",
        overhead_power_lines=True,
        max_mature_height_meters=5.0,
        selected_species_count=2,
        total_cost_usd=21.0,
        projected_canopy_m2=6.8,
        species_details=[
            {
                "scientific_name": "Eugenia uniflora",
                "common_name_en": "Surinam Cherry",
                "common_name_pt": "Pitangueira",
                "growth_habit": "small_tree",
                "mature_height_meters": 5.0,
                "canopy_coverage_m2_at_year_3": 4.2,
                "ecological_role": "Attracts native pollinators and urban avifauna",
                "pollinators": ["Native stingless bees"],
                "seed_dispersers": ["Thrushes"],
            }
        ],
        consolidated_schedule={
            "initial_month": [
                {
                    "species": "Pitangueira",
                    "task": "Deep watering",
                    "frequency": "Twice weekly",
                    "notes": "Keep root collar clear",
                }
            ],
            "maintenance_quarterly": [],
            "annual": [],
        },
    )
    assert "Compact Sidewalk Strip" in prompt
    assert "Overhead Power Lines: Yes" in prompt
    assert "Surinam Cherry / Pitangueira" in prompt
    assert "$21.00 USD" in prompt


def test_deterministic_fallback_narrative_wire_safety():
    site_a = get_site_by_id("site-a-sidewalk-strip")
    species_catalog = {sp.species_id: sp for sp in load_species()}
    selected = [species_catalog["eugenia-uniflora"], species_catalog["calliandra-tweediei"]]

    plan = calculate_volunteer_plan(
        VolunteerPlanRequest(
            site_id="site-a-sidewalk-strip",
            selected_species_ids=["eugenia-uniflora", "calliandra-tweediei"],
        )
    )

    narrative = build_fallback_narrative(site_a, plan, selected)
    assert "Target 11.7" in narrative
    assert "Overhead Power-Line Safety" in narrative
    assert "Pitangueira" in narrative
    assert "Esponjinha-vermelha" in narrative
    assert f"${plan.total_seedling_cost_usd:.2f}" in narrative


@pytest.mark.anyio
async def test_generate_narrative_graceful_degradation_when_unconfigured():
    site_b = get_site_by_id("site-b-sunny-lot")
    plan = calculate_volunteer_plan(
        VolunteerPlanRequest(
            site_id="site-b-sunny-lot",
            selected_species_ids=["cecropia-pachystachya", "schinus-terebinthifolia"],
        )
    )

    narrative = await generate_volunteer_care_narrative(
        site=site_b,
        plan=plan,
        selected_species_ids=["cecropia-pachystachya", "schinus-terebinthifolia"],
        client=NIMClient(settings=Settings(_env_file=None, nvidia_api_key=None)),
    )
    assert "Community Planting & Care Guide" in narrative
    assert "Embaúba-branca" in narrative
    assert "Aroeira-pimenteira" in narrative


@pytest.mark.anyio
async def test_generate_narrative_with_nim_client_success():
    site = get_site_by_id("site-a-sidewalk-strip")
    plan = calculate_volunteer_plan(
        VolunteerPlanRequest(
            site_id="site-a-sidewalk-strip",
            selected_species_ids=["eugenia-uniflora"],
        )
    )

    mock_client = AsyncMock(spec=NIMClient)
    mock_client.is_configured = True
    mock_client.generate_completion.return_value = "### Community Care Guide Generated via NVIDIA NIM"

    narrative = await generate_volunteer_care_narrative(
        site=site,
        plan=plan,
        selected_species_ids=["eugenia-uniflora"],
        client=mock_client,
    )

    assert narrative == "### Community Care Guide Generated via NVIDIA NIM"
    mock_client.generate_completion.assert_awaited_once()


@pytest.mark.anyio
async def test_generate_narrative_nim_failure_falls_back():
    site = get_site_by_id("site-a-sidewalk-strip")
    plan = calculate_volunteer_plan(
        VolunteerPlanRequest(
            site_id="site-a-sidewalk-strip",
            selected_species_ids=["eugenia-uniflora"],
        )
    )

    mock_client = AsyncMock(spec=NIMClient)
    mock_client.is_configured = True
    mock_client.generate_completion.side_effect = NIMClientError("Timeout connecting to NIM")

    narrative = await generate_volunteer_care_narrative(
        site=site,
        plan=plan,
        selected_species_ids=["eugenia-uniflora"],
        client=mock_client,
    )

    # Must fall back gracefully rather than throwing exception
    assert "Community Planting & Care Guide" in narrative
    assert "Pitangueira" in narrative


def test_redact_secret_scrubs_nvapi_tokens():
    raw = "nvapi-secret-token-99999"
    leaked = f"Bearer {raw} failed with key nvapi-another-12345"
    scrubbed = _redact_secret(leaked, raw)
    assert raw not in scrubbed
    assert "nvapi-another-12345" not in scrubbed
    assert "nvapi-[REDACTED]" in scrubbed


@pytest.mark.anyio
async def test_nim_daily_call_cap_degrades_gracefully():
    reset_daily_nim_counter()
    capped_settings = Settings(
        _env_file=None,
        nvidia_api_key=SecretStr("nvapi-test-key-12345"),
        nim_daily_call_cap=0,
    )
    capped_client = NIMClient(settings=capped_settings)
    site = get_site_by_id("site-a-sidewalk-strip")
    plan = calculate_volunteer_plan(
        VolunteerPlanRequest(
            site_id="site-a-sidewalk-strip",
            selected_species_ids=["eugenia-uniflora"],
        )
    )
    narrative = await generate_volunteer_care_narrative(
        site=site,
        plan=plan,
        selected_species_ids=["eugenia-uniflora"],
        client=capped_client,
    )
    assert "Community Planting & Care Guide" in narrative
    reset_daily_nim_counter()


def test_endpoint_volunteer_plan_with_narrative(monkeypatch):
    monkeypatch.setattr(
        "app.agent.narrative.NIMClient",
        lambda: NIMClient(settings=Settings(_env_file=None, nvidia_api_key=None)),
    )
    payload = {
        "site_id": "site-a-sidewalk-strip",
        "selected_species_ids": [
            "eugenia-uniflora",
            "calliandra-tweediei",
        ],
    }
    response = client.post("/api/v1/volunteer-plan/narrative", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["site_id"] == "site-a-sidewalk-strip"
    assert data["selected_species_count"] == 2
    assert "care_narrative" in data
    assert data["care_narrative"] is not None
    assert "Community Planting & Care Guide" in data["care_narrative"]


def test_endpoint_volunteer_plan_query_param_narrative(monkeypatch):
    monkeypatch.setattr(
        "app.agent.narrative.NIMClient",
        lambda: NIMClient(settings=Settings(_env_file=None, nvidia_api_key=None)),
    )
    payload = {
        "site_id": "site-c-shaded-courtyard",
        "selected_species_ids": [
            "eugenia-uniflora",
            "salvia-splendens",
        ],
    }
    # Without param: care_narrative is None
    res_default = client.post("/api/v1/volunteer-plan", json=payload)
    assert res_default.status_code == 200
    assert res_default.json().get("care_narrative") is None

    # With param: care_narrative is populated
    res_narrative = client.post("/api/v1/volunteer-plan?include_narrative=true", json=payload)
    assert res_narrative.status_code == 200
    assert res_narrative.json().get("care_narrative") is not None
    assert "Community Planting & Care Guide" in res_narrative.json()["care_narrative"]
