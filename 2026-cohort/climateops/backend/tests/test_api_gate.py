"""Security regression suite from docs/02-product/approval-workflow.md. These are the tests that
protect the one hard rule: no task before approval of the exact brief version."""
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import build_service, create_app
from helpers import FakeLLM, make_bundle

H = lambda t: {"Authorization": f"Bearer {t}"}
MGR, STAFF, MGR_B, STAFF_B, VAL = (H("demo-manager-a"), H("demo-staff-a"), H("demo-manager-b"),
                                    H("demo-staff-b"), H("demo-validator-a"))


class AnyLLM(FakeLLM):
    def __init__(self):
        pass

    def generate(self, bundle):
        return FakeLLM(bundle).generate(bundle)


@pytest.fixture()
def client():
    svc = build_service(Settings(demo_mode=True), llm=AnyLLM())
    with TestClient(create_app(svc)) as c:
        yield c


def draft(c, hdr=MGR):
    r = c.post("/api/v1/briefs/generate", headers=hdr)
    assert r.status_code == 201, r.text
    return r.json()


def pending(c):
    b = draft(c)
    assert c.post(f"/api/v1/briefs/{b['id']}/submit", headers=MGR).status_code == 200
    return b


def proof(c, hdr, tid, note=""):
    u = c.post(f"/api/v1/tasks/{tid}/evidence/upload-url", headers=hdr, json={"content_type": "image/jpeg"})
    assert u.status_code == 200, u.text
    return {"object_path": u.json()["object_path"], "sha256": "a" * 64, "note": note}


def approve_body(b, key="approve-key-1"):
    return {"expected_version": b["version"], "expected_content_hash": b["content_hash"], "idempotency_key": key}


def approved(c):
    b = pending(c)
    r = c.post(f"/api/v1/briefs/{b['id']}/approve", headers=MGR, json=approve_body(b))
    assert r.status_code == 200, r.text
    return r.json()


def test_unauthenticated_401(client):
    assert client.get("/api/v1/facilities").status_code == 401
    assert client.get("/api/v1/facilities", headers=H("nope")).status_code == 401


def test_task_creation_in_draft_and_pending_is_rejected(client):
    b = draft(client)
    body = {"brief_id": b["id"], "idempotency_key": "tasks-key-1"}
    assert client.post("/api/v1/tasks", headers=MGR, json=body).status_code == 409
    client.post(f"/api/v1/briefs/{b['id']}/submit", headers=MGR)
    r = client.post("/api/v1/tasks", headers=MGR, json=body)
    assert r.status_code == 409 and r.json()["code"] == "approval_required"
    assert client.get("/api/v1/tasks", headers=MGR).json() == []


def test_staff_cannot_approve_or_create_or_generate(client):
    b = pending(client)
    assert client.post(f"/api/v1/briefs/{b['id']}/approve", headers=STAFF, json=approve_body(b)).status_code == 403
    assert client.post("/api/v1/tasks", headers=STAFF, json={"brief_id": b["id"], "idempotency_key": "kkkkkk"}).status_code == 403
    assert client.post("/api/v1/briefs/generate", headers=STAFF).status_code == 403


def test_validator_cannot_approve(client):
    b = pending(client)
    assert client.post(f"/api/v1/briefs/{b['id']}/approve", headers=VAL, json=approve_body(b)).status_code == 403


def test_other_tenant_manager_cannot_touch_plan(client):
    b = pending(client)
    r = client.post(f"/api/v1/briefs/{b['id']}/approve", headers=MGR_B, json=approve_body(b))
    assert r.status_code == 403
    assert client.get(f"/api/v1/briefs/{b['id']}", headers=MGR_B).status_code == 403


def test_stale_version_or_hash_409(client):
    b = pending(client)
    bad = approve_body(b); bad["expected_version"] = 99
    assert client.post(f"/api/v1/briefs/{b['id']}/approve", headers=MGR, json=bad).status_code == 409
    bad = approve_body(b); bad["expected_content_hash"] = "sha256:deadbeef"
    assert client.post(f"/api/v1/briefs/{b['id']}/approve", headers=MGR, json=bad).status_code == 409


def test_missing_version_is_rejected(client):
    b = pending(client)
    r = client.post(f"/api/v1/briefs/{b['id']}/approve", headers=MGR, json={"idempotency_key": "abcdef"})
    assert r.status_code == 422


def test_happy_path_approval_then_tasks_then_proof(client):
    b = approved(client)
    r = client.post("/api/v1/tasks", headers=MGR, json={"brief_id": b["id"], "idempotency_key": "tasks-key-1"})
    assert r.status_code == 201
    tasks = r.json()
    assert tasks and all(t["approved_version"] == b["version"] and t["status"] == "ASSIGNED" for t in tasks)
    t = tasks[0]
    assert client.patch(f"/api/v1/tasks/{t['id']}", headers=STAFF, json={"status": "IN_PROGRESS"}).status_code == 200
    ev = proof(client, STAFF, t["id"], "AC on, filters cleaned")
    assert ev["object_path"].startswith(f"evidence/demo-a/{t['id']}/")
    assert client.post(f"/api/v1/tasks/{t['id']}/evidence", headers=STAFF, json=ev).status_code == 200
    v = client.post(f"/api/v1/tasks/{t['id']}/verify", headers=MGR, json={"decision": "accept"})
    assert v.status_code == 200 and v.json()["status"] == "VERIFIED"
    events = [e["event_type"] for e in client.get("/api/v1/events", headers=MGR).json()]
    for needed in ("brief.generated", "brief.submitted", "brief.approved", "task.created", "task.evidence_accepted"):
        assert needed in events


def test_duplicate_task_request_creates_one_set(client):
    b = approved(client)
    body = {"brief_id": b["id"], "idempotency_key": "same-key-1"}
    r1 = client.post("/api/v1/tasks", headers=MGR, json=body).json()
    r2 = client.post("/api/v1/tasks", headers=MGR, json=body).json()
    assert [t["id"] for t in r1] == [t["id"] for t in r2]
    assert len(client.get("/api/v1/tasks", headers=MGR).json()) == len(r1)
    # a different key must NOT create a second set either (brief is now ASSIGNED)
    r3 = client.post("/api/v1/tasks", headers=MGR, json={"brief_id": b["id"], "idempotency_key": "other-key-2"})
    assert r3.status_code == 409


def test_editing_after_approval_voids_approval(client):
    b = approved(client)
    e = client.patch(f"/api/v1/briefs/{b['id']}", headers=MGR, json={"summary": "Changed after approval"})
    assert e.status_code == 200 and e.json()["version"] == b["version"] + 1 and e.json()["status"] == "DRAFT"
    r = client.post("/api/v1/tasks", headers=MGR, json={"brief_id": b["id"], "idempotency_key": "tasks-key-9"})
    assert r.status_code == 409
    # old hash can't approve the new version
    client.post(f"/api/v1/briefs/{b['id']}/submit", headers=MGR)
    old = client.post(f"/api/v1/briefs/{b['id']}/approve", headers=MGR, json=approve_body(b, "old-hash-key"))
    assert old.status_code == 409


def test_rejection_cannot_create_tasks_and_needs_reason(client):
    b = pending(client)
    body = approve_body(b, "reject-key-1")
    assert client.post(f"/api/v1/briefs/{b['id']}/reject", headers=MGR, json=body).status_code == 422
    body["reason"] = "Needs AC data confirmed"
    assert client.post(f"/api/v1/briefs/{b['id']}/reject", headers=MGR, json=body).status_code == 200
    r = client.post("/api/v1/tasks", headers=MGR, json={"brief_id": b["id"], "idempotency_key": "tasks-key-2"})
    assert r.status_code == 409


def test_staff_sees_only_own_tasks_and_cross_tenant_task_blocked(client):
    b = approved(client)
    t = client.post("/api/v1/tasks", headers=MGR, json={"brief_id": b["id"], "idempotency_key": "tasks-key-3"}).json()[0]
    assert client.get("/api/v1/tasks", headers=STAFF_B).json() == []
    r = client.patch(f"/api/v1/tasks/{t['id']}", headers=STAFF_B, json={"status": "IN_PROGRESS"})
    assert r.status_code == 403
    ev = {"object_path": "e/x.jpg", "sha256": "b" * 64}
    assert client.post(f"/api/v1/tasks/{t['id']}/evidence", headers=STAFF_B, json=ev).status_code == 403


def test_evidence_before_start_and_self_verification_blocked(client):
    b = approved(client)
    t = client.post("/api/v1/tasks", headers=MGR, json={"brief_id": b["id"], "idempotency_key": "tasks-key-4"}).json()[0]
    ev = {"object_path": "e/x.jpg", "sha256": "c" * 64}
    assert client.post(f"/api/v1/tasks/{t['id']}/evidence", headers=STAFF, json=ev).status_code == 409
    client.patch(f"/api/v1/tasks/{t['id']}", headers=MGR, json={"status": "IN_PROGRESS"})
    client.post(f"/api/v1/tasks/{t['id']}/evidence", headers=MGR, json=proof(client, MGR, t["id"]))
    r = client.post(f"/api/v1/tasks/{t['id']}/verify", headers=MGR, json={"decision": "accept"})
    assert r.status_code == 403 and r.json()["code"] == "self_verification"


def test_events_are_tenant_isolated(client):
    draft(client)
    assert client.get("/api/v1/events", headers=MGR_B).json() == []


def test_invalid_evidence_path_rejected(client):
    b = approved(client)
    t = client.post("/api/v1/tasks", headers=MGR, json={"brief_id": b["id"], "idempotency_key": "tasks-key-5"}).json()[0]
    client.patch(f"/api/v1/tasks/{t['id']}", headers=STAFF, json={"status": "IN_PROGRESS"})
    bad = {"object_path": "../../etc/passwd; rm", "sha256": "d" * 64}
    assert client.post(f"/api/v1/tasks/{t['id']}/evidence", headers=STAFF, json=bad).status_code == 422


def test_works_with_no_model_configured_fallback_draft(client):
    svc = build_service(Settings(demo_mode=True), llm=None)
    with TestClient(create_app(svc)) as c:
        b = draft(c)
        assert b["model_metadata"]["used_fallback"] is True and b["status"] == "DRAFT"


def test_weather_badge_is_labelled_not_live(client):
    w = client.get("/api/v1/weather/status", headers=MGR).json()
    assert w["badge"] == "SIMULATED" and w["status"] == "ok"


def test_ingest_requires_token(client):
    assert client.post("/internal/ingest").status_code == 403


def test_forged_or_cross_tenant_object_path_rejected(client):
    b = approved(client)
    t = client.post("/api/v1/tasks", headers=MGR, json={"brief_id": b["id"], "idempotency_key": "tasks-key-6"}).json()[0]
    client.patch(f"/api/v1/tasks/{t['id']}", headers=STAFF, json={"status": "IN_PROGRESS"})
    for bad in ("evidence/demo-b/other-task/x.jpg", f"evidence/demo-a/OTHER/{'x'}.jpg", "somewhere/else.jpg"):
        r = client.post(f"/api/v1/tasks/{t['id']}/evidence", headers=STAFF, json={"object_path": bad, "sha256": "e" * 64})
        assert r.status_code == 422 and r.json()["code"] == "bad_object_path"


def test_upload_url_rules(client):
    b = approved(client)
    t = client.post("/api/v1/tasks", headers=MGR, json={"brief_id": b["id"], "idempotency_key": "tasks-key-7"}).json()[0]
    url = f"/api/v1/tasks/{t['id']}/evidence/upload-url"
    assert client.post(url, headers=STAFF, json={}).status_code == 409           # not started yet
    client.patch(f"/api/v1/tasks/{t['id']}", headers=STAFF, json={"status": "IN_PROGRESS"})
    assert client.post(url, headers=STAFF, json={"content_type": "application/x-sh"}).status_code == 422
    assert client.post(url, headers=STAFF_B, json={}).status_code == 403          # other tenant
    ok = client.post(url, headers=STAFF, json={"content_type": "image/png"}).json()
    assert ok["mode"] == "demo_no_bucket" and ok["upload_url"] is None and ok["object_path"].endswith(".png")


def test_integrations_status_is_truthful(client):
    st = client.get("/api/v1/integrations/status", headers=MGR).json()
    assert st["nvidia"]["configured"] is True and st["google_cloud"]["cloud_storage"]["in_use"] is False
    assert st["google_cloud"]["firestore"]["in_use"] is False and st["weather"]["badge"] == "SIMULATED"
    assert client.get("/api/v1/integrations/status", headers=STAFF).status_code == 403
