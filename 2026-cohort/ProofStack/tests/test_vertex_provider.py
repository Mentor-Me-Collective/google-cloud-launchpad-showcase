import pytest

from proofstack.providers import google_vertex


class FakeResponse:
    text = '{"label":"SUPPORTED","rationale":"grounded","cited_excerpt":"MFA enrolled: 4"}'


class FakeModels:
    def __init__(self):
        self.kwargs = None

    def generate_content(self, **kwargs):
        self.kwargs = kwargs
        return FakeResponse()


class FakeClient:
    def __init__(self, **kwargs):
        self.init_kwargs = kwargs
        self.models = FakeModels()


def test_vertex_requires_project(monkeypatch):
    monkeypatch.delenv("GOOGLE_CLOUD_PROJECT", raising=False)
    monkeypatch.delenv("GCP_PROJECT_ID", raising=False)
    monkeypatch.setenv("VERTEX_MODEL", "test-model")

    with pytest.raises(RuntimeError, match="GOOGLE_CLOUD_PROJECT"):
        google_vertex.GoogleVertexProvider()


def test_vertex_requires_model(monkeypatch):
    monkeypatch.setenv("GCP_PROJECT_ID", "proofstack-test")
    monkeypatch.delenv("VERTEX_MODEL", raising=False)

    with pytest.raises(RuntimeError, match="VERTEX_MODEL"):
        google_vertex.GoogleVertexProvider()


def test_vertex_rejects_invalid_thinking_level(monkeypatch):
    monkeypatch.setenv("GCP_PROJECT_ID", "proofstack-test")
    monkeypatch.setenv("VERTEX_MODEL", "test-model")
    monkeypatch.setenv("VERTEX_THINKING_LEVEL", "MINIMAL")

    with pytest.raises(RuntimeError, match="LOW, MEDIUM, or HIGH"):
        google_vertex.GoogleVertexProvider()


def test_vertex_rejects_invalid_timeout(monkeypatch):
    monkeypatch.setenv("GCP_PROJECT_ID", "proofstack-test")
    monkeypatch.setenv("VERTEX_MODEL", "test-model")
    monkeypatch.setenv("VERTEX_TIMEOUT_MS", "0")

    with pytest.raises(RuntimeError, match="VERTEX_TIMEOUT_MS"):
        google_vertex.GoogleVertexProvider()


def test_vertex_rejects_invalid_retry_count(monkeypatch):
    monkeypatch.setenv("GCP_PROJECT_ID", "proofstack-test")
    monkeypatch.setenv("VERTEX_MODEL", "test-model")
    monkeypatch.setenv("VERTEX_RETRY_ATTEMPTS", "0")

    with pytest.raises(RuntimeError, match="VERTEX_RETRY_ATTEMPTS"):
        google_vertex.GoogleVertexProvider()


def test_vertex_uses_adc_project_location_model_schema_and_http_bounds(monkeypatch):
    created = {}

    def fake_client(**kwargs):
        created["client"] = FakeClient(**kwargs)
        return created["client"]

    monkeypatch.setenv("GCP_PROJECT_ID", "proofstack-test")
    monkeypatch.setenv("GOOGLE_CLOUD_LOCATION", "global")
    monkeypatch.setenv("VERTEX_MODEL", "test-model")
    monkeypatch.setenv("VERTEX_THINKING_LEVEL", "LOW")
    monkeypatch.setenv("VERTEX_TIMEOUT_MS", "45000")
    monkeypatch.setenv("VERTEX_RETRY_ATTEMPTS", "2")
    monkeypatch.setattr(google_vertex.genai, "Client", fake_client)

    provider = google_vertex.GoogleVertexProvider()
    raw = provider.assess(
        {"question": "MFA?", "claim": "All privileged accounts use MFA."},
        {"title": "Export", "artifact_type": "system_export"},
        "MFA enrolled: 4",
    )

    assert '"label":"SUPPORTED"' in raw
    assert created["client"].init_kwargs["vertexai"] is True
    assert created["client"].init_kwargs["project"] == "proofstack-test"
    assert created["client"].init_kwargs["location"] == "global"

    http_options = created["client"].init_kwargs["http_options"]
    assert http_options.timeout == 45000
    assert http_options.retry_options.attempts == 2

    assert created["client"].models.kwargs["model"] == "test-model"
    config = created["client"].models.kwargs["config"]
    assert config.response_mime_type == "application/json"
    assert config.response_schema == google_vertex.ASSESSMENT_SCHEMA
    assert config.max_output_tokens == 800


def test_vertex_empty_response_is_rejected(monkeypatch):
    class EmptyModels:
        def generate_content(self, **kwargs):
            return type("Response", (), {"text": ""})()

    class EmptyClient:
        models = EmptyModels()

    monkeypatch.setenv("GCP_PROJECT_ID", "proofstack-test")
    monkeypatch.setenv("VERTEX_MODEL", "test-model")
    monkeypatch.setenv("VERTEX_THINKING_LEVEL", "LOW")
    monkeypatch.setattr(
        google_vertex.genai,
        "Client",
        lambda **kwargs: EmptyClient(),
    )

    provider = google_vertex.GoogleVertexProvider()
    with pytest.raises(RuntimeError, match="empty text response"):
        provider.assess(
            {"question": "MFA?", "claim": "All privileged accounts use MFA."},
            {"title": "Export", "artifact_type": "system_export"},
            "MFA enrolled: 4",
        )
