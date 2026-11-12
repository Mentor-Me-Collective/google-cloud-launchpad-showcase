"""Settings from environment. Secrets are read here and nowhere else; never log them."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # repo root


def _bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    demo_mode: bool = field(default_factory=lambda: _bool("DEMO_MODE", True))
    store_backend: str = field(default_factory=lambda: os.getenv("STORE_BACKEND", "memory"))
    google_project: str = field(default_factory=lambda: os.getenv("GOOGLE_CLOUD_PROJECT", ""))
    nvidia_api_key: str = field(default_factory=lambda: os.getenv("NVIDIA_API_KEY", ""))
    nvidia_model_id: str = field(
        default_factory=lambda: os.getenv("NVIDIA_MODEL_ID", "nvidia/nemotron-3.5-bolt-e4b")
    )
    nvidia_vision_model_id: str = field(
        default_factory=lambda: os.getenv("NVIDIA_VISION_MODEL_ID", "meta/llama-3.2-90b-vision-instruct")
    )
    nvidia_base_url: str = field(
        default_factory=lambda: os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    )
    nws_user_agent: str = field(
        default_factory=lambda: os.getenv("NWS_USER_AGENT", "ClimateOps-Demo/0.1 (set-contact-email)")
    )
    alert_poll_minutes: int = field(default_factory=lambda: int(os.getenv("ALERT_POLL_MINUTES", "5")))
    forecast_poll_minutes: int = field(default_factory=lambda: int(os.getenv("FORECAST_POLL_MINUTES", "30")))
    storage_bucket: str = field(default_factory=lambda: os.getenv("STORAGE_BUCKET", ""))
    cloud_run_service: str = field(default_factory=lambda: os.getenv("K_SERVICE", ""))  # set by Cloud Run itself
    ingest_token: str = field(default_factory=lambda: os.getenv("INGEST_TOKEN", ""))
    fixtures_dir: Path = field(default_factory=lambda: Path(os.getenv("FIXTURES_DIR", str(ROOT / "data" / "fixtures"))))

    @property
    def nvidia_ready(self) -> bool:
        placeholder = {"", "SET_VIA_SECRET_MANAGER_NOT_GIT", "TBD"}
        return self.nvidia_api_key not in placeholder and self.nvidia_model_id not in placeholder

    @property
    def stale_after_seconds(self) -> int:
        # data-model/weather-ingestion.md: start with twice the expected schedule (TBD, validate).
        return self.alert_poll_minutes * 60 * 2


def get_settings() -> Settings:
    return Settings()
