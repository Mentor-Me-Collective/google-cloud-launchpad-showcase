import json

import pytest
import requests

from proofstack.providers.nvidia_nim import NvidiaNimProvider


class FakeResponse:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload
        self.text = text

    @property
    def ok(self):
        return 200 <= self.status_code < 300

    def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


@pytest.fixture
def configured_env(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("NVIDIA_MODEL", "test/model")
    monkeypatch.setenv("NVIDIA_API_BASE", "https://example.test/v1")
    monkeypatch.setenv("NVIDIA_TIMEOUT_SECONDS", "12")
    monkeypatch.setenv("NVIDIA_MAX_TOKENS", "222")
    monkeypatch.setenv("NVIDIA_TEMPERATURE", "0")


def test_requires_api_key(monkeypatch):
    monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
    monkeypatch.setenv("NVIDIA_MODEL", "test/model")
    with pytest.raises(RuntimeError, match="NVIDIA_API_KEY"):
        NvidiaNimProvider()


def test_list_models(configured_env, monkeypatch):
    def fake_request(method, url, **kwargs):
        assert method == "GET"
        assert url == "https://example.test/v1/models"
        assert kwargs["headers"]["Authorization"] == "Bearer test-key"
        return FakeResponse(
            payload={"data": [{"id": "model/a"}, {"id": "model/b"}]}
        )

    monkeypatch.setattr(requests, "request", fake_request)
    provider = NvidiaNimProvider()
    assert provider.list_models() == ["model/a", "model/b"]


def test_assess_sends_expected_payload(configured_env, monkeypatch):
    captured = {}

    def fake_request(method, url, **kwargs):
        captured["method"] = method
        captured["url"] = url
        captured["json"] = kwargs["json"]
        captured["timeout"] = kwargs["timeout"]
        return FakeResponse(
            payload={
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "label": "SUPPORTED",
                                    "rationale": "The export shows MFA for all accounts.",
                                    "cited_excerpt": "MFA enrolled: 4",
                                }
                            )
                        }
                    }
                ]
            }
        )

    monkeypatch.setattr(requests, "request", fake_request)
    provider = NvidiaNimProvider()
    raw = provider.assess(
        {"question": "MFA?", "claim": "All privileged accounts use MFA."},
        {"title": "Export", "artifact_type": "system_export"},
        "MFA enrolled: 4",
    )

    assert json.loads(raw)["label"] == "SUPPORTED"
    assert captured["method"] == "POST"
    assert captured["url"] == "https://example.test/v1/chat/completions"
    assert captured["json"]["model"] == "test/model"
    assert captured["json"]["stream"] is False
    assert captured["json"]["max_tokens"] == 222
    assert captured["timeout"] == 12


def test_http_error_is_actionable(configured_env, monkeypatch):
    def fake_request(*args, **kwargs):
        return FakeResponse(
            status_code=401,
            payload={"error": "unauthorized"},
            text='{"error":"unauthorized"}',
        )

    monkeypatch.setattr(requests, "request", fake_request)
    provider = NvidiaNimProvider()

    with pytest.raises(RuntimeError, match="HTTP 401"):
        provider.list_models()


def test_malformed_chat_response_is_rejected(configured_env, monkeypatch):
    monkeypatch.setattr(
        requests,
        "request",
        lambda *args, **kwargs: FakeResponse(payload={"choices": []}),
    )
    provider = NvidiaNimProvider()

    with pytest.raises(RuntimeError, match="did not contain message content"):
        provider.assess(
            {"question": "MFA?", "claim": "All privileged accounts use MFA."},
            {"title": "Export", "artifact_type": "system_export"},
            "MFA enrolled: 4",
        )


def test_network_error_is_wrapped(configured_env, monkeypatch):
    def fake_request(*args, **kwargs):
        raise requests.Timeout("timed out")

    monkeypatch.setattr(requests, "request", fake_request)
    provider = NvidiaNimProvider()

    with pytest.raises(RuntimeError, match="failed before receiving"):
        provider.list_models()
