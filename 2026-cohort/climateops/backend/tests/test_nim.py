import httpx
from app.nim import NimClient, extract_json


def test_nim_request_shape_and_trace():
    seen = {}
    def h(req):
        seen["auth"], seen["url"] = req.headers["authorization"], str(req.url)
        import json as j; seen["body"] = j.loads(req.content)
        return httpx.Response(200, json={"id": "resp-1", "usage": {"total_tokens": 9},
                                         "choices": [{"message": {"content": "```json\n{\"summary\": \"x\"}\n```"}}]})
    c = NimClient("k-test", "vendor/model-x", "https://example.invalid/v1", client=httpx.Client(transport=httpx.MockTransport(h)))
    out, meta = c.generate({"a": 1})
    assert seen["url"].endswith("/chat/completions") and seen["auth"] == "Bearer k-test"
    assert seen["body"]["model"] == "vendor/model-x" and seen["body"]["messages"][0]["role"] == "system"
    assert out == {"summary": "x"} and meta["provider"] == "nvidia-nim" and meta["latency_ms"] >= 0 and meta["usage"]["total_tokens"] == 9


def test_extract_json_handles_prose_and_rejects_garbage():
    assert extract_json('Sure! {"a": 1} hope that helps') == {"a": 1}
    import pytest
    with pytest.raises(ValueError):
        extract_json("no json here")
