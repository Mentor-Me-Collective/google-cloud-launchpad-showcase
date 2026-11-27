from typing import List

from fastapi import APIRouter, HTTPException, Path, status

from app.schemas.plan import SiteArchetype
from app.services.recommender import SiteNotFoundError, get_site_by_id, load_sites

router = APIRouter(tags=["sites"])


@router.get("/sites", response_model=List[SiteArchetype], status_code=status.HTTP_200_OK)
def list_sites() -> List[SiteArchetype]:
    return load_sites()


@router.get(
    "/sites/{site_id}",
    response_model=SiteArchetype,
    status_code=status.HTTP_200_OK,
)
def retrieve_site(
    site_id: str = Path(..., min_length=1, max_length=64, pattern=r"^[a-z0-9-]+$"),
) -> SiteArchetype:
    try:
        return get_site_by_id(site_id)
    except SiteNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
