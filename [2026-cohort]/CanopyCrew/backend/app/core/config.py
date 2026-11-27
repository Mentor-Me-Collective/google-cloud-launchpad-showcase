import json
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    """Application configuration loaded strictly from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application metadata
    app_name: str = "CanopyCrew API"
    app_version: str = "0.1.0"
    app_env: str = Field(
        default="development",
        validation_alias=AliasChoices("APP_ENV", "ENVIRONMENT"),
    )
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Server bind defaults (Cloud Run injects PORT=8080; local .env uses API_PORT=8000)
    api_host: str = "127.0.0.1"
    api_port: int = Field(
        default=8000,
        validation_alias=AliasChoices("PORT", "API_PORT"),
    )

    # Data directory for deterministic static JSON datasets (sites.json, species.json)
    data_dir: Path = BACKEND_DIR / "data"

    # CORS: explicitly allow Vite local dev and production Firebase Hosting domains
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://canopycrew-sp-mvp.web.app",
            "https://canopycrew-sp-mvp.firebaseapp.com",
        ]
    )
    cors_origin_regex: str = r"^https://canopycrew-[a-z0-9-]+(\.[a-z0-9-]+)*\.run\.app$"

    # Optional NVIDIA NIM integration (injected via Google Secret Manager in production)
    nvidia_api_key: SecretStr | None = None
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "nvidia/nemotron-3-ultra-550b-a55b"
    nim_daily_call_cap: int = Field(default=100, ge=0)

    @property
    def has_nvidia_api_key(self) -> bool:
        """Safely check whether a non-empty NVIDIA_API_KEY is configured without exposing it."""
        return (
            self.nvidia_api_key is not None
            and bool(self.nvidia_api_key.get_secret_value().strip())
        )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                parsed = json.loads(stripped)
                origins = [str(origin).strip() for origin in parsed if str(origin).strip()]
            else:
                origins = [origin.strip() for origin in stripped.split(",") if origin.strip()]
        else:
            origins = list(value)

        if "http://localhost:5173" not in origins:
            origins.insert(0, "http://localhost:5173")
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
