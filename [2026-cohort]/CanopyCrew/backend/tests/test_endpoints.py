from fastapi.testclient import TestClient

from app.main import app
from app.services.recommender import load_species

client = TestClient(app)


def test_get_sites_returns_all_three() -> None:
    response = client.get("/api/v1/sites")
    assert response.status_code == 200

    sites = response.json()
    assert len(sites) == 3
    site_ids = [site["site_id"] for site in sites]
    assert site_ids == [
        "site-a-sidewalk-strip",
        "site-b-sunny-lot",
        "site-c-shaded-courtyard",
    ]


def test_get_single_site_and_404() -> None:
    ok_response = client.get("/api/v1/sites/site-a-sidewalk-strip")
    assert ok_response.status_code == 200
    site_a = ok_response.json()
    assert site_a["constraints"]["overhead_power_lines"] is True
    assert site_a["constraints"]["max_mature_height_meters"] == 5.0
    assert site_a["requirements"]["sidewalk_wire_safe"] is True

    not_found = client.get("/api/v1/sites/site-z-rooftop")
    assert not_found.status_code == 404


def test_species_seed_catalog_integrity() -> None:
    catalog = load_species()
    assert len(catalog) == 10

    forbidden_genera = ("ficus", "ligustrum", "eucalyptus")
    for sp in catalog:
        sci_lower = sp.botanical.scientific_name.lower()
        assert not any(banned in sci_lower for banned in forbidden_genera)


def test_get_species_returns_all_ten() -> None:
    response = client.get("/api/v1/species")
    assert response.status_code == 200

    species_list = response.json()
    assert len(species_list) == 10

    forbidden_genera = ("ficus", "ligustrum", "eucalyptus")
    for sp in species_list:
        sci_lower = sp["botanical"]["scientific_name"].lower()
        assert not any(banned in sci_lower for banned in forbidden_genera)


def test_get_single_species_and_404() -> None:
    ok_response = client.get("/api/v1/species/eugenia-uniflora")
    assert ok_response.status_code == 200
    pitanga = ok_response.json()
    assert pitanga["botanical"]["scientific_name"] == "Eugenia uniflora"
    assert pitanga["physical_profile"]["sidewalk_wire_safe"] is True
    assert pitanga["physical_profile"]["mature_height_meters"] <= 5.0

    not_found = client.get("/api/v1/species/ficus-microcarpa")
    assert not_found.status_code == 404


def test_recommendations_enforces_wire_safety_for_site_a() -> None:
    response = client.get(
        "/api/v1/recommendations",
        params={"site_id": "site-a-sidewalk-strip"},
    )
    assert response.status_code == 200

    species_list = response.json()
    assert len(species_list) == 5

    returned_ids = {sp["species_id"] for sp in species_list}
    assert returned_ids == {
        "eugenia-uniflora",
        "calliandra-tweediei",
        "psidium-cattleianum",
        "bromelia-antiacantha",
        "salvia-splendens",
    }

    for sp in species_list:
        assert sp["physical_profile"]["sidewalk_wire_safe"] is True
        assert sp["physical_profile"]["mature_height_meters"] <= 5.0
        assert "site-a-sidewalk-strip" in sp["site_tolerances"]["suitable_site_ids"]


def test_recommendations_site_b_contains_pioneers() -> None:
    response = client.get(
        "/api/v1/recommendations",
        params={"site_id": "site-b-sunny-lot"},
    )
    assert response.status_code == 200

    species_list = response.json()
    returned_ids = {sp["species_id"] for sp in species_list}
    assert {
        "cecropia-pachystachya",
        "schinus-terebinthifolia",
        "pleroma-mutabile",
    }.issubset(returned_ids)


def test_recommendations_site_c_shaded_courtyard() -> None:
    response = client.get(
        "/api/v1/recommendations",
        params={"site_id": "site-c-shaded-courtyard"},
    )
    assert response.status_code == 200
    returned_ids = {sp["species_id"] for sp in response.json()}
    assert returned_ids == {
        "eugenia-uniflora",
        "pleroma-mutabile",
        "campomanesia-phaea",
        "myrcia-glabra",
        "salvia-splendens",
    }


def test_recommendations_invalid_site_raises_404() -> None:
    response = client.get(
        "/api/v1/recommendations",
        params={"site_id": "nonexistent-site"},
    )
    assert response.status_code == 404


def test_volunteer_plan_calculation() -> None:
    # eugenia-uniflora ($12.50, 4.2 m²) + calliandra-tweediei ($8.50, 2.6 m²) + salvia-splendens ($4.50, 0.8 m²)
    payload = {
        "site_id": "site-a-sidewalk-strip",
        "selected_species_ids": [
            "eugenia-uniflora",
            "calliandra-tweediei",
            "salvia-splendens",
        ],
    }
    response = client.post("/api/v1/volunteer-plan", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["site_id"] == "site-a-sidewalk-strip"
    assert data["selected_species_count"] == 3
    assert data["total_seedling_cost_usd"] == 25.5
    assert data["projected_canopy_m2_year_3"] == 7.6

    schedule = data["consolidated_care_schedule"]
    assert set(schedule.keys()) == {
        "initial_month",
        "maintenance_quarterly",
        "annual",
    }
    assert len(schedule["initial_month"]) >= 3
    assert len(schedule["maintenance_quarterly"]) == 3
    assert len(schedule["annual"]) == 3


def test_volunteer_plan_invalid_species_raises_400() -> None:
    # Unknown / invasive species must raise 400
    unknown_response = client.post(
        "/api/v1/volunteer-plan",
        json={
            "site_id": "site-b-sunny-lot",
            "selected_species_ids": ["ficus-microcarpa"],
        },
    )
    assert unknown_response.status_code == 400

    # Tall wire-unsafe pioneer (cecropia-pachystachya, 10.0m) on wired sidewalk strip must also raise 400
    wire_unsafe_response = client.post(
        "/api/v1/volunteer-plan",
        json={
            "site_id": "site-a-sidewalk-strip",
            "selected_species_ids": ["cecropia-pachystachya"],
        },
    )
    assert wire_unsafe_response.status_code == 400


def test_volunteer_plan_empty_species_list_raises_422() -> None:
    response = client.post(
        "/api/v1/volunteer-plan",
        json={
            "site_id": "site-a-sidewalk-strip",
            "selected_species_ids": [],
        },
    )
    assert response.status_code == 422


def test_volunteer_plan_exceeding_max_length_raises_422() -> None:
    response = client.post(
        "/api/v1/volunteer-plan",
        json={
            "site_id": "x" * 65,
            "selected_species_ids": ["eugenia-uniflora"],
        },
    )
    assert response.status_code == 422


