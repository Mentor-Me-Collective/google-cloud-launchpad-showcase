from typing import List

from fastapi import APIRouter, HTTPException, Path, status

from app.schemas.plan import NativeSpecies
from app.services.recommender import SpeciesNotFoundError, get_species_by_id, load_species

router = APIRouter(tags=["species"])


@router.get("/species", response_model=List[NativeSpecies], status_code=status.HTTP_200_OK)
def list_species() -> List[NativeSpecies]:
    return load_species()


@router.get(
    "/species/{species_id}",
    response_model=NativeSpecies,
    status_code=status.HTTP_200_OK,
)
def retrieve_species(
    species_id: str = Path(..., min_length=1, max_length=64, pattern=r"^[a-z0-9-]+$"),
) -> NativeSpecies:
    try:
        return get_species_by_id(species_id)
    except SpeciesNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
