"""Care narrative synthesis service with graceful deterministic degradation.

Owned by Laurine (AI Research / Lead).
Synthesizes accessible, English-language volunteer care narratives with Brazilian
Portuguese botanical grounding from already-validated site archetypes and
deterministic volunteer plans. Degrades gracefully to deterministic narrative
when NVIDIA_API_KEY is not configured or external NIM endpoints are unreachable.
"""

import logging
from typing import List, Optional

from app.agent.nim_client import NIMClient, NIMClientError
from app.agent.prompts import NIM_SYSTEM_PROMPT, build_user_prompt
from app.schemas.plan import NativeSpecies, SiteArchetype, VolunteerPlanResponse
from app.services.recommender import load_species

logger = logging.getLogger("canopycrew.agent.narrative")


def build_fallback_narrative(
    site: SiteArchetype,
    plan: VolunteerPlanResponse,
    species_list: List[NativeSpecies],
) -> str:
    """Deterministically compose a community volunteer planting guide in English.

    Used when NVIDIA NIM is offline, unconfigured, or in test environments.
    """
    wire_warning = ""
    if site.constraints.overhead_power_lines:
        wire_warning = (
            "\n> [!IMPORTANT]\n"
            "> **Overhead Power-Line Safety (Portaria SVMA nº 26/2024 & PMAU):**\n"
            f"> This site has overhead power lines. All {plan.selected_species_count} selected species "
            f"have a compact mature height (maximum {site.constraints.max_mature_height_meters} m) "
            "and non-invasive root systems, ensuring full safety for pedestrians and urban utility infrastructure.\n"
        )

    species_lines = []
    for sp in species_list:
        species_lines.append(
            f"- **{sp.botanical.common_name_en} / {sp.botanical.common_name_pt}** (*{sp.botanical.scientific_name}*)\n"
            f"  - **Height & Canopy:** {sp.physical_profile.mature_height_meters} m mature height | "
            f"Projected canopy: {sp.estimates.canopy_coverage_m2_at_year_3} m² (Year 3)\n"
            f"  - **Ecological Role:** {sp.ecological_interactions.ecological_role}\n"
            f"  - **Biodiversity Value:** Pollinated by {', '.join(sp.ecological_interactions.pollinators)}; "
            f"seeds dispersed by {', '.join(sp.ecological_interactions.seed_dispersers_avifauna)}."
        )
    species_section = "\n".join(species_lines)

    schedule = plan.consolidated_care_schedule
    initial_items = "\n".join(
        f"- **{t['species']}:** {t['task']} (*{t['frequency']}*). {t['notes']}"
        for t in schedule.get("initial_month", [])
    )
    quarterly_items = "\n".join(
        f"- **{t['species']}:** {t['task']} (*{t['frequency']}*). {t['notes']}"
        for t in schedule.get("maintenance_quarterly", [])
    )
    annual_items = "\n".join(
        f"- **{t['species']}:** {t['task']} (*{t['frequency']}*). {t['notes']}"
        for t in schedule.get("annual", [])
    )

    return f"""# 🌱 Community Planting & Care Guide — {site.name}

Welcome to the **CanopyCrew** community urban restoration action! This guide supports neighbors and local volunteers in planting and stewarding native seedlings, directly advancing **UN SDG 11 (Target 11.7: safe, inclusive, and accessible green public spaces in São Paulo)**.
{wire_warning}
---

## 📊 Community Plan Summary
- **Site Archetype:** {site.archetype_label} ({site.sunlight_exposure.replace('_', ' ')})
- **Total Selected Seedlings:** {plan.selected_species_count}
- **Estimated Seedling Cost:** ${plan.total_seedling_cost_usd:.2f} USD
- **Projected Year-3 Canopy:** {plan.projected_canopy_m2_year_3:.1f} m² of restored shade and cooling microclimate

---

## 🌿 Selected Native Atlantic Forest Species
Every species below is 100% native to the Atlantic Forest (*Mata Atlântica*), cataloged in BioSampa, and verified for São Paulo municipal planting:

{species_section}

---

## 🗓️ Community Volunteer Care Schedule

### 1. Initial Month (Critical Establishment Phase)
{initial_items or '- Regular soil moisture checks and root-collar mulch protection.'}

### 2. Quarterly Maintenance (Nutrition & Weed Control)
{quarterly_items or '- Organic compost top-dressing and clearing competing grasses around the basin.'}

### 3. Annual Care (Formative Pruning & Structural Inspection)
{annual_items or '- Annual structural and phytosanitary inspection aligned with PMAU guidelines.'}

---
*CanopyCrew — Advancing São Paulo urban biodiversity through botanical rigor and community stewardship.*"""


async def generate_volunteer_care_narrative(
    site: SiteArchetype,
    plan: VolunteerPlanResponse,
    selected_species_ids: Optional[List[str]] = None,
    client: Optional[NIMClient] = None,
) -> str:
    """Generate a care narrative using NVIDIA NIM with graceful deterministic fallback."""
    catalog = {sp.species_id: sp for sp in load_species()}
    target_ids = selected_species_ids or [
        t["species_id"] for t in plan.consolidated_care_schedule.get("initial_month", [])
    ]
    # Deduplicate while preserving order
    seen = set()
    distinct_ids = [sp_id for sp_id in target_ids if not (sp_id in seen or seen.add(sp_id))]
    species_list = [catalog[sp_id] for sp_id in distinct_ids if sp_id in catalog]

    nim_client = client or NIMClient()

    if not nim_client.is_configured:
        logger.info("NVIDIA NIM not configured (NVIDIA_API_KEY missing); returning deterministic care guide.")
        return build_fallback_narrative(site, plan, species_list)

    species_details = [
        {
            "scientific_name": sp.botanical.scientific_name,
            "common_name_en": sp.botanical.common_name_en,
            "common_name_pt": sp.botanical.common_name_pt,
            "growth_habit": sp.physical_profile.growth_habit,
            "mature_height_meters": sp.physical_profile.mature_height_meters,
            "canopy_coverage_m2_at_year_3": sp.estimates.canopy_coverage_m2_at_year_3,
            "ecological_role": sp.ecological_interactions.ecological_role,
            "pollinators": sp.ecological_interactions.pollinators,
            "seed_dispersers": sp.ecological_interactions.seed_dispersers_avifauna,
        }
        for sp in species_list
    ]

    user_prompt = build_user_prompt(
        site_name=site.name,
        site_label=site.archetype_label,
        sunlight=site.sunlight_exposure.replace("_", " "),
        overhead_power_lines=site.constraints.overhead_power_lines,
        max_mature_height_meters=site.constraints.max_mature_height_meters,
        selected_species_count=plan.selected_species_count,
        total_cost_usd=plan.total_seedling_cost_usd,
        projected_canopy_m2=plan.projected_canopy_m2_year_3,
        species_details=species_details,
        consolidated_schedule=plan.consolidated_care_schedule,
    )

    try:
        logger.info("Invoking NVIDIA NIM inference for site '%s'...", site.site_id)
        narrative = await nim_client.generate_completion(
            system_prompt=NIM_SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )
        return narrative
    except (NIMClientError, Exception) as exc:
        logger.warning(
            "NVIDIA NIM narrative generation failed (%s); falling back to deterministic guide.",
            exc,
        )
        return build_fallback_narrative(site, plan, species_list)
