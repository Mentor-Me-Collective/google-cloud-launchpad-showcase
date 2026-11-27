from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app

client = TestClient(app)


def test_root_endpoint() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to CanopyCrew API 🌱"}


def test_health_endpoints() -> None:
    for path in ("/health", "/api/v1/health"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.json() == {
            "status": "healthy",
            "app": "CanopyCrew API",
        }
        assert response.headers.get("x-content-type-options") == "nosniff"
        assert response.headers.get("x-frame-options") == "DENY"
        assert response.headers.get("strict-transport-security") == "max-age=31536000; includeSubDomains"
        assert response.headers.get("x-xss-protection") == "1; mode=block"
        assert response.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
        assert response.headers.get("cache-control") == "no-store"


def test_cors_allows_firebase_hosting_origins() -> None:
    for origin in (
        "https://canopycrew-sp-mvp.web.app",
        "https://canopycrew-sp-mvp.firebaseapp.com",
    ):
        response = client.options(
            "/health",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == origin


def test_cors_rejects_hostile_cloud_run_origin() -> None:
    response = client.options(
        "/health",
        headers={
            "Origin": "https://evil-test.run.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in response.headers


def test_cors_allows_localhost_vite_origin() -> None:
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_allows_cloud_run_domain() -> None:
    cloud_run_origin = "https://canopycrew-frontend-abc123-rj.a.run.app"
    response = client.options(
        "/health",
        headers={
            "Origin": cloud_run_origin,
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == cloud_run_origin


def test_cors_rejects_untrusted_origin() -> None:
    response = client.options(
        "/health",
        headers={
            "Origin": "http://untrusted.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in response.headers


def test_settings_masks_api_key_and_ignores_extra_env(monkeypatch) -> None:
    monkeypatch.setenv("NVIDIA_API_KEY", "test-placeholder-value")
    monkeypatch.setenv("PORT", "8080")
    monkeypatch.setenv("CORS_ORIGINS", "https://canopycrew.org")
    monkeypatch.setenv("VITE_API_BASE_URL", "http://localhost:8000/api/v1")

    cfg = Settings(_env_file=None)
    assert cfg.api_port == 8080
    assert "http://localhost:5173" in cfg.cors_origins
    assert "https://canopycrew.org" in cfg.cors_origins
    assert cfg.nvidia_api_key is not None
    assert cfg.has_nvidia_api_key is True
    assert "test-placeholder-value" not in repr(cfg)
    assert "test-placeholder-value" not in str(cfg.nvidia_api_key)

    empty_cfg = Settings(_env_file=None, nvidia_api_key="   ")
    assert empty_cfg.has_nvidia_api_key is False


def test_ignore_files_exclude_dotenv_secrets() -> None:
    from app.core.config import BACKEND_DIR, REPO_ROOT

    gitignore = (REPO_ROOT / ".gitignore").read_text(encoding="utf-8")
    dockerignore = (BACKEND_DIR / ".dockerignore").read_text(encoding="utf-8")
    gcloudignore = (BACKEND_DIR / ".gcloudignore").read_text(encoding="utf-8")

    assert ".env" in gitignore
    assert ".env*" in dockerignore
    assert ".env*" in gcloudignore

