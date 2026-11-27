from typing import Annotated, Dict, List, Literal

from pydantic import BaseModel, ConfigDict, Field

CatalogSlugStr = Annotated[str, Field(min_length=1, max_length=64, pattern=r"^[a-z0-9-]+$")]


class SiteConstraints(BaseModel):
    model_config = ConfigDict(extra="forbid")

    max_width_meters: float | None = Field(default=None, gt=0)
    min_area_m2: float = Field(gt=0)
    max_area_m2: float = Field(gt=0)
    overhead_power_lines: bool
    max_mature_height_meters: float = Field(gt=0)
    impervious_surroundings: bool
    soil_compaction_level: Literal["low", "moderate", "high"]


class SiteRequirements(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sidewalk_wire_safe: bool
    non_invasive_roots: bool
    low_lux_tolerance: bool = False
    pioneer_priority: bool = False
    avifauna_support_priority: bool = False
    municipal_reference: str = Field(min_length=1)


class SiteArchetype(BaseModel):
    model_config = ConfigDict(extra="forbid")

    site_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    archetype_label: str = Field(min_length=1)
    description: str = Field(min_length=1)
    typical_dimensions: str = Field(min_length=1)
    sunlight_exposure: Literal["full_sun", "partial_shade", "partial_to_full_shade"]
    constraints: SiteConstraints
    requirements: SiteRequirements
    ecological_goals: List[str] = Field(min_length=1)


class BotanicalInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scientific_name: str = Field(min_length=1)
    common_name_pt: str = Field(min_length=1)
    common_name_en: str = Field(min_length=1)
    family: str = Field(min_length=1)
    biome_origin: str = Field(min_length=1)
    municipal_compliance: List[str] = Field(min_length=1)
    successional_group: Literal[
        "pioneer",
        "early_secondary",
        "late_secondary",
        "understory_herbaceous",
    ]


class PhysicalProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    growth_habit: Literal[
        "small_tree",
        "medium_tree",
        "large_pioneer_tree",
        "woody_shrub",
        "rosette_bromeliad",
        "perennial_subshrub",
    ]
    mature_height_meters: float = Field(gt=0)
    canopy_spread_meters: float = Field(gt=0)
    root_system: Literal[
        "non_aggressive_pivoting",
        "fibrous_contained",
        "fasciculate_shallow",
        "extensive_structural",
    ]
    sidewalk_wire_safe: bool


class SiteTolerances(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sunlight: List[
        Literal["full_sun", "partial_shade", "full_shade", "partial_to_full_shade"]
    ] = Field(min_length=1)
    low_lux_tolerant: bool
    drought_tolerant: bool
    compacted_soil_tolerant: bool
    suitable_site_ids: List[str] = Field(min_length=1)


class EcologicalInteractions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pollinators: List[str] = Field(min_length=1)
    seed_dispersers_avifauna: List[str] = Field(min_length=1)
    ecological_role: str = Field(min_length=1)


class CostEstimates(BaseModel):
    model_config = ConfigDict(extra="forbid")

    growth_rate_cm_per_year: int = Field(gt=0)
    canopy_coverage_m2_at_year_3: float = Field(gt=0)
    unit_cost_usd: float = Field(gt=0)


class CareTask(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task: str = Field(min_length=1)
    frequency: str = Field(min_length=1)
    notes: str = Field(min_length=1)


class CareSchedule(BaseModel):
    model_config = ConfigDict(extra="forbid")

    initial_month: List[CareTask] = Field(min_length=1)
    maintenance_quarterly: List[CareTask] = Field(min_length=1)
    annual: List[CareTask] = Field(min_length=1)


class NativeSpecies(BaseModel):
    model_config = ConfigDict(extra="forbid")

    species_id: str = Field(min_length=1)
    botanical: BotanicalInfo
    physical_profile: PhysicalProfile
    site_tolerances: SiteTolerances
    ecological_interactions: EcologicalInteractions
    estimates: CostEstimates
    volunteer_care_schedule: CareSchedule


class VolunteerPlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    site_id: str = Field(
        ...,
        min_length=1,
        max_length=64,
        pattern=r"^[a-z0-9-]+$",
        description="Site archetype ID",
        examples=["site-a-sidewalk-strip"],
    )
    selected_species_ids: List[CatalogSlugStr] = Field(
        ...,
        min_length=1,
        max_length=10,
        description="List of selected native species IDs",
    )
    volunteer_name: str | None = Field(
        default=None,
        max_length=100,
        description="Optional volunteer identifier or name",
    )


class VolunteerPlanResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    site_id: str
    total_seedling_cost_usd: float
    projected_canopy_m2_year_3: float
    selected_species_count: int
    consolidated_care_schedule: Dict[str, List[Dict[str, str]]]
    care_narrative: str | None = None
