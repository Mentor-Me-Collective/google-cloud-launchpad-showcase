"""DEC-09: advisory AI photo-proof check. The model only suggests; the manager decides.
These tests use fake vision models: no network, no key."""
import base64
import hashlib
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import build_service, create_app
from app.vision import VisionClient, parse_answer, run_photo_check
from test_api_gate import MGR, MGR_B, STAFF, STAFF_B, AnyLLM, approve_body, pending

JPEG = b"\xff\xd8\xff\xe0" + b"0" * 200
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 200
b64 = lambda d: base64.b64encode(d).decode()


class FakeVision:
    model_id = "fake/vision"

    def __init__(self, verdict="pass", raises=None):
        self.verdict, self.raises, self.calls = verdict, raises, []

    def check(self, image, content_type, playbook_task_id):
        self.calls.append((len(image), content_type, playbook_task_id))
        if self.raises:
            raise self.raises
        return ({"verdict": self.verdict, "reading_f": 72.0, "what_i_see": "a thermostat", "reason": "reads 72"},
                {"model_id": self.model_id, "latency_ms": 5})


def make_client(vision):
    svc = build_service(Settings(demo_mode=True), llm=AnyLLM(), vision=vision)
    return TestClient(create_app(svc))


def started_task(c):
    b = pending(c)
    assert c.post(f"/api/v1/briefs/{b['id']}/approve", headers=MGR, json=approve_body(b)).status_code == 200
    tasks = c.post("/api/v1/tasks", headers=MGR, json={"brief_id": b["id"], "idempotency_key": "vision-key-1"}).json()
    t = tasks[0]
    assert c.patch(f"/api/v1/tasks/{t['id']}", headers=STAFF, json={"status": "IN_PROGRESS"}).status_code == 200
    return t


def upload(c, tid, data=JPEG, ctype="image/jpeg", hdr=STAFF):
    return c.post(f"/api/v1/tasks/{tid}/evidence/photo", headers=hdr,
                  json={"image_base64": b64(data), "content_type": ctype, "note": "photo"})


def test_photo_upload_runs_advisory_check_and_manager_still_decides():
    v = FakeVision("pass")
    with make_client(v) as c:
        t = started_task(c)
        r = upload(c, t["id"])
        assert r.status_code == 200, r.text
        body = r.json()
        ev = body["evidence"]
        assert body["status"] == "COMPLETION_SUBMITTED"            # NOT verified by the AI
        assert ev["sha256"] == hashlib.sha256(JPEG).hexdigest()     # server computes the hash
        assert ev["object_path"].startswith(f"evidence/demo-a/{t['id']}/")
        assert ev["ai_check"]["status"] == "done" and ev["ai_check"]["verdict"] == "pass"
        assert ev["ai_check"]["advisory"] is True
        assert v.calls == [(len(JPEG), "image/jpeg", t["playbook_task_id"])]
        # manager makes the final call
        assert c.post(f"/api/v1/tasks/{t['id']}/verify", headers=MGR, json={"decision": "accept"}).json()["status"] == "VERIFIED"
        ev_log = c.get("/api/v1/events", headers=MGR).json()
        sub = [e for e in ev_log if e["event_type"] == "task.evidence_submitted"][-1]
        assert sub["ai_check_status"] == "done" and sub["ai_verdict"] == "pass"


def test_ai_fail_verdict_does_not_block_or_reject():
    with make_client(FakeVision("fail")) as c:
        t = started_task(c)
        body = upload(c, t["id"]).json()
        assert body["status"] == "COMPLETION_SUBMITTED" and body["evidence"]["ai_check"]["verdict"] == "fail"


def test_model_outage_becomes_manual_review_not_an_error():
    err = httpx.HTTPStatusError("503", request=httpx.Request("POST", "https://x.invalid"), response=httpx.Response(503))
    with make_client(FakeVision(raises=err)) as c:
        t = started_task(c)
        r = upload(c, t["id"])
        assert r.status_code == 200
        ai = r.json()["evidence"]["ai_check"]
        assert ai["status"] == "unavailable" and "manager reviews" in ai["reason"]


def test_no_vision_configured_still_accepts_photo():
    with make_client(None) as c:
        t = started_task(c)
        r = upload(c, t["id"], PNG, "image/png")
        assert r.status_code == 200 and r.json()["evidence"]["ai_check"]["status"] == "unavailable"


def test_task_without_photo_rule_is_not_applicable():
    assert run_photo_check(FakeVision(), JPEG, "image/jpeg", "HT-04")["status"] == "not_applicable"


@pytest.mark.parametrize("data,ctype,code", [
    (b"not an image at all", "image/jpeg", 422),     # bytes are not a JPEG
    (PNG, "image/jpeg", 422),                         # declared type does not match the bytes
    (b"\xff\xd8\xff" + b"0" * (5 * 1024 * 1024), "image/jpeg", 413),  # over 5 MB
])
def test_bad_photos_rejected_before_any_ai_call(data, ctype, code):
    v = FakeVision()
    with make_client(v) as c:
        t = started_task(c)
        assert upload(c, t["id"], data, ctype).status_code == code
        assert v.calls == []


def test_invalid_base64_rejected():
    with make_client(FakeVision()) as c:
        t = started_task(c)
        r = c.post(f"/api/v1/tasks/{t['id']}/evidence/photo", headers=STAFF,
                   json={"image_base64": "!!!not-base64!!!", "content_type": "image/jpeg"})
        assert r.status_code == 422


def test_photo_requires_task_in_progress():
    with make_client(FakeVision()) as c:
        b = pending(c)
        c.post(f"/api/v1/briefs/{b['id']}/approve", headers=MGR, json=approve_body(b))
        t = c.post("/api/v1/tasks", headers=MGR, json={"brief_id": b["id"], "idempotency_key": "vision-key-2"}).json()[0]
        assert upload(c, t["id"]).status_code == 409   # still ASSIGNED


def test_other_tenant_cannot_upload_to_task():
    v = FakeVision()
    with make_client(v) as c:
        t = started_task(c)
        assert upload(c, t["id"], hdr=STAFF_B).status_code in (403, 404)
        assert upload(c, t["id"], hdr=MGR_B).status_code in (403, 404)
        assert v.calls == []


def test_vision_client_request_shape_and_parsing():
    seen = {}

    def h(req):
        seen["body"] = json.loads(req.content)
        seen["auth"] = req.headers["authorization"]
        return httpx.Response(200, json={"id": "r1", "choices": [{"message": {"content":
            '```json\n{"verdict": "Unclear", "reading_f": null, "what_i_see": "blurry", "reason": "cannot read"}\n```'}}]})

    vc = VisionClient("k-test", "nvidia/vl-x", "https://example.invalid/v1", client=httpx.Client(transport=httpx.MockTransport(h)))
    ans, meta = vc.check(JPEG, "image/jpeg", "HT-01")
    assert ans["verdict"] == "unclear" and ans["reading_f"] is None
    assert seen["auth"] == "Bearer k-test" and seen["body"]["model"] == "nvidia/vl-x"
    img = seen["body"]["messages"][1]["content"][1]["image_url"]["url"]
    assert img.startswith("data:image/jpeg;base64,")
    assert meta["provider"] == "nvidia-nim"


def test_vision_client_retries_without_thinking_switch_on_400():
    calls = []

    def h(req):
        calls.append(json.loads(req.content))
        if len(calls) == 1:
            return httpx.Response(400, json={"error": "unknown field"})
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"verdict": "pass"}'}}]})

    vc = VisionClient("k", "m", "https://example.invalid/v1", client=httpx.Client(transport=httpx.MockTransport(h)))
    assert vc.check(JPEG, "image/jpeg", "HT-07")[0]["verdict"] == "pass"
    assert "chat_template_kwargs" in calls[0] and "chat_template_kwargs" not in calls[1]


def test_parse_answer_rejects_garbage():
    with pytest.raises(ValueError):
        parse_answer("I think it is fine")
    with pytest.raises(ValueError):
        parse_answer('{"verdict": "approved"}')
