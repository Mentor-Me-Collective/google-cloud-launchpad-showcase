from fastapi import APIRouter, status

router = APIRouter(tags=["health"])


@router.get("/", status_code=status.HTTP_200_OK)
def root() -> dict[str, str]:
    return {
        "message": "Welcome to CanopyCrew API 🌱",
    }


@router.get("/health", status_code=status.HTTP_200_OK)
@router.get("/api/v1/health", status_code=status.HTTP_200_OK)
def health() -> dict[str, str]:
    return {
        "status": "healthy",
        "app": "CanopyCrew API",
    }

