from typing import List

from fastapi import APIRouter, HTTPException, Query, status

from app.agent import generate_volunteer_care_narrative
from app.schemas.plan import (
    NativeSpecies,
    VolunteerPlanRequest,
    VolunteerPlanResponse,
)
from app.services.recommender import (
    InvalidSpeciesSelectionError,
    SiteNotFoundError,
    calculate_volunteer_plan,
    get_recommendations,
    get_site_by_id,
)

router = APIRouter(tags=["plans"])


@router.get(
    "/recommendations",
    response_model=List[NativeSpecies],
    status_code=status.HTTP_200_OK,
)
def recommend_species(
    site_id: str = Query(
        ...,
        min_length=1,
        max_length=64,
        pattern=r"^[a-z0-9-]+$",
        description="Verified São Paulo site_id",
    ),
) -> List[NativeSpecies]:
    try:
        return get_recommendations(site_id)
    except SiteNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post(
    "/volunteer-plan",
    response_model=VolunteerPlanResponse,
    status_code=status.HTTP_200_OK,
)
async def create_volunteer_plan(
    payload: VolunteerPlanRequest,
    include_narrative: bool = Query(
        default=False,
        description="Whether to generate an AI care narrative using NVIDIA NIM",
    ),
) -> VolunteerPlanResponse:
    try:
        plan = calculate_volunteer_plan(payload)
        if include_narrative:
            site = get_site_by_id(payload.site_id)
            plan.care_narrative = await generate_volunteer_care_narrative(
                site=site,
                plan=plan,
                selected_species_ids=payload.selected_species_ids,
            )
        return plan
    except SiteNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except InvalidSpeciesSelectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post(
    "/volunteer-plan/narrative",
    response_model=VolunteerPlanResponse,
    status_code=status.HTTP_200_OK,
)
async def create_volunteer_plan_with_narrative(
    payload: VolunteerPlanRequest,
) -> VolunteerPlanResponse:
    """Calculate deterministic plan and synthesize volunteer care narrative with NVIDIA NIM."""
    try:
        site = get_site_by_id(payload.site_id)
        plan = calculate_volunteer_plan(payload)
        plan.care_narrative = await generate_volunteer_care_narrative(
            site=site,
            plan=plan,
            selected_species_ids=payload.selected_species_ids,
        )
        return plan
    except SiteNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except InvalidSpeciesSelectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
