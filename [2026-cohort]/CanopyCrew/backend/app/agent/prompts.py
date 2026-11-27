"""Prompt templates and personas for NVIDIA NIM care narrative synthesis.

Owned by Laurine (AI Research / Lead).
Strictly grounded in UN SDG 11.7, São Paulo municipal botanical compliance
(Portaria SVMA nº 26/2024, BioSampa 5ª Edição, PMAU), and wire-safety invariants.
"""

from typing import Any, Dict, List

NIM_SYSTEM_PROMPT = """You are the CanopyCrew Community Ecological Restoration Guide (UN SDG 11: Sustainable Cities and Communities — Target 11.7).
Your mission is to synthesize encouraging, practical, and accessible community planting and volunteer care guides for urban rewilding sites in São Paulo, Brazil.

ECOLOGICAL AND LEGAL INVARIANTS:
1. Strict Botanical Compliance: Rely exclusively on the native Atlantic Forest (Mata Atlântica) species provided by the deterministic backend. Never suggest or introduce exotic or invasive species (e.g., Ficus microcarpa, Ligustrum lucidum, Eucalyptus).
2. Overhead Power-Line Safety (Portaria SVMA nº 26/2024 & PMAU): If the site has overhead power lines, clearly highlight why every selected species has a compact mature height (<= 5.0 m) and non-invasive roots that are safe beneath utility distribution wires.
3. Mathematical Precision: Never alter, recalculate, or contradict the deterministic seedling cost (USD) or projected Year-3 canopy coverage (m²) computed by the Python backend.
4. Welcoming English Narrative with Local Grounding: Write in clear, warm, and accessible English for community volunteers, referencing each species by its English name, Brazilian Portuguese common name, and scientific name.
5. Guide Structure:
   - Welcome & Community Mission (UN SDG 11.7 in São Paulo)
   - Site Safety & Growing Conditions (overhead power-line clearance and soil care)
   - Native Species & Urban Biodiversity Highlights (native pollinators and seed-dispersing birds)
   - Volunteer Care Roadmap (Initial Establishment Month, Quarterly Maintenance, and Annual Care)
"""


def build_user_prompt(
    site_name: str,
    site_label: str,
    sunlight: str,
    overhead_power_lines: bool,
    max_mature_height_meters: float,
    selected_species_count: int,
    total_cost_usd: float,
    projected_canopy_m2: float,
    species_details: List[Dict[str, Any]],
    consolidated_schedule: Dict[str, List[Dict[str, str]]],
) -> str:
    """Format validated site context and deterministic totals into user prompt for NIM."""
    species_summary_lines: List[str] = []
    for sp in species_details:
        common_en = sp.get("common_name_en")
        name_prefix = (
            f"{common_en} / {sp['common_name_pt']}"
            if common_en
            else sp["common_name_pt"]
        )
        species_summary_lines.append(
            f"- {name_prefix} ({sp['scientific_name']}): "
            f"Growth habit {sp['growth_habit']} ({sp['mature_height_meters']} m), "
            f"Year-3 canopy: {sp['canopy_coverage_m2_at_year_3']} m², "
            f"Ecological role: {sp['ecological_role']}, "
            f"Pollinators: {', '.join(sp['pollinators'])}, "
            f"Seed-dispersing birds: {', '.join(sp['seed_dispersers'])}"
        )
    species_block = "\n".join(species_summary_lines)

    initial_tasks = "\n".join(
        f"  * {t['species']}: {t['task']} ({t['frequency']}) - {t['notes']}"
        for t in consolidated_schedule.get("initial_month", [])
    )
    quarterly_tasks = "\n".join(
        f"  * {t['species']}: {t['task']} ({t['frequency']}) - {t['notes']}"
        for t in consolidated_schedule.get("maintenance_quarterly", [])
    )
    annual_tasks = "\n".join(
        f"  * {t['species']}: {t['task']} ({t['frequency']}) - {t['notes']}"
        for t in consolidated_schedule.get("annual", [])
    )

    wire_note = (
        "CRITICAL SAFETY NOTE: This site has overhead power lines. All selected species have been "
        f"deterministically verified as wire-safe (maximum mature height <= {max_mature_height_meters} m) "
        "in compliance with Portaria SVMA nº 26/2024 and PMAU."
        if overhead_power_lines
        else "Site is clear of low-hanging overhead power lines."
    )

    return f"""Write a Community Volunteer Care & Planting Guide in English for the following validated planting plan:

SITE CONTEXT:
- Archetype: {site_label} ({site_name})
- Sunlight Exposure: {sunlight}
- Overhead Power Lines: {'Yes' if overhead_power_lines else 'No'}
- Safety Note: {wire_note}

DETERMINISTIC PLAN TOTALS:
- Selected Native Seedlings: {selected_species_count}
- Total Estimated Seedling Cost: ${total_cost_usd:.2f} USD
- Projected Canopy Coverage (Year 3): {projected_canopy_m2:.1f} m²

SELECTED NATIVE ATLANTIC FOREST SPECIES:
{species_block}

CONSOLIDATED VOLUNTEER MAINTENANCE SCHEDULE:
Initial Month:
{initial_tasks or '  * No specific tasks registered.'}

Quarterly Maintenance:
{quarterly_tasks or '  * No specific tasks registered.'}

Annual Care:
{annual_tasks or '  * No specific tasks registered.'}

Please generate a welcoming, practical, and well-structured Markdown care narrative in English to guide local volunteers."""
