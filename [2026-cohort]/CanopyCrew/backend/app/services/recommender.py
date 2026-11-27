import json
from functools import lru_cache
from typing import Dict, List

from pydantic import TypeAdapter

from app.core.config import get_settings
from app.schemas.plan import (
    CareTask,
    NativeSpecies,
    SiteArchetype,
    VolunteerPlanRequest,
    VolunteerPlanResponse,
)

MAX_WIRE_SAFE_HEIGHT_METERS = 5.0


class SiteNotFoundError(LookupError):
    """Raised when a requested site_id is not among the 3 verified São Paulo archetypes."""


class SpeciesNotFoundError(LookupError):
    """Raised when a requested species_id is not in the verified native Atlantic Forest catalog."""


class InvalidSpeciesSelectionError(ValueError):
    """Raised when selected species are unknown or violate site/wire-safety rules."""


@lru_cache
def load_sites() -> List[SiteArchetype]:
    """Load and validate the 3 São Paulo urban site archetypes from sites.json."""
    sites_path = get_settings().data_dir / "sites.json"
    raw_sites = json.loads(sites_path.read_text(encoding="utf-8"))
    return TypeAdapter(List[SiteArchetype]).validate_python(raw_sites)


@lru_cache
def load_species() -> List[NativeSpecies]:
    """Load and validate the 10 native Atlantic Forest species from species.json."""
    species_path = get_settings().data_dir / "species.json"
    raw_species = json.loads(species_path.read_text(encoding="utf-8"))
    return TypeAdapter(List[NativeSpecies]).validate_python(raw_species)


def get_site_by_id(site_id: str) -> SiteArchetype:
    """Return a single verified SiteArchetype or raise SiteNotFoundError."""
    for site in load_sites():
        if site.site_id == site_id:
            return site
    raise SiteNotFoundError(f"Unknown site archetype '{site_id}'.")


def get_species_by_id(species_id: str) -> NativeSpecies:
    """Return a single verified NativeSpecies or raise SpeciesNotFoundError."""
    for species in load_species():
        if species.species_id == species_id:
            return species
    raise SpeciesNotFoundError(f"Unknown native species '{species_id}'.")


def _satisfies_wire_safety(site: SiteArchetype, species: NativeSpecies) -> bool:
    """Hard municipal guardrail (Portaria SVMA nº 26/2024 & PMAU) for wired sites."""
    if not site.constraints.overhead_power_lines:
        return True
    return (
        species.physical_profile.sidewalk_wire_safe is True
        and species.physical_profile.mature_height_meters <= MAX_WIRE_SAFE_HEIGHT_METERS
    )


def get_recommendations(site_id: str) -> List[NativeSpecies]:
    """Deterministically filter verified native species for a São Paulo site archetype."""
    site = get_site_by_id(site_id)
    recommendations: List[NativeSpecies] = []

    for species in load_species():
        if not _satisfies_wire_safety(site, species):
            continue
        if site_id not in species.site_tolerances.suitable_site_ids:
            continue
        recommendations.append(species)

    return recommendations


def _format_care_entries(species: NativeSpecies, tasks: List[CareTask]) -> List[Dict[str, str]]:
    species_label = f"{species.botanical.common_name_pt} ({species.botanical.scientific_name})"
    return [
        {
            "species_id": species.species_id,
            "species": species_label,
            "task": item.task,
            "frequency": item.frequency,
            "notes": item.notes,
        }
        for item in tasks
    ]


def calculate_volunteer_plan(request: VolunteerPlanRequest) -> VolunteerPlanResponse:
    """Deterministically compute seedling cost, 3-year canopy area, and volunteer chores."""
    site = get_site_by_id(request.site_id)
    species_by_id = {sp.species_id: sp for sp in load_species()}

    selected_species: List[NativeSpecies] = []
    for species_id in request.selected_species_ids:
        species = species_by_id.get(species_id)
        if species is None:
            raise InvalidSpeciesSelectionError(
                f"Species '{species_id}' is not in the verified native Atlantic Forest catalog."
            )
        if not _satisfies_wire_safety(site, species):
            raise InvalidSpeciesSelectionError(
                f"Species '{species_id}' violates overhead power-line safety constraints for site '{site.site_id}'."
            )
        if site.site_id not in species.site_tolerances.suitable_site_ids:
            raise InvalidSpeciesSelectionError(
                f"Species '{species_id}' is not ecologically suitable for site '{site.site_id}'."
            )
        selected_species.append(species)

    total_seedling_cost_usd = round(
        sum(sp.estimates.unit_cost_usd for sp in selected_species),
        2,
    )
    projected_canopy_m2_year_3 = round(
        sum(sp.estimates.canopy_coverage_m2_at_year_3 for sp in selected_species),
        1,
    )

    consolidated_care_schedule: Dict[str, List[Dict[str, str]]] = {
        "initial_month": [],
        "maintenance_quarterly": [],
        "annual": [],
    }
    seen_species_ids: set[str] = set()
    for sp in selected_species:
        if sp.species_id in seen_species_ids:
            continue
        seen_species_ids.add(sp.species_id)
        consolidated_care_schedule["initial_month"].extend(
            _format_care_entries(sp, sp.volunteer_care_schedule.initial_month)
        )
        consolidated_care_schedule["maintenance_quarterly"].extend(
            _format_care_entries(sp, sp.volunteer_care_schedule.maintenance_quarterly)
        )
        consolidated_care_schedule["annual"].extend(
            _format_care_entries(sp, sp.volunteer_care_schedule.annual)
        )

    return VolunteerPlanResponse(
        site_id=site.site_id,
        total_seedling_cost_usd=total_seedling_cost_usd,
        projected_canopy_m2_year_3=projected_canopy_m2_year_3,
        selected_species_count=len(selected_species),
        consolidated_care_schedule=consolidated_care_schedule,
    )
