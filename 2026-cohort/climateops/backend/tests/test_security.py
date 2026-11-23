"""RBAC and access-security tests (owner: Shiksha). Each test maps to a row in
docs/06-security/access-control.md or a threat in docs/06-security/threat-model.md."""
import json

import pytest

from app.auth import load_tokens
from test_api_gate import MGR, MGR_B, STAFF, STAFF_B, VAL, H, approve_body, approved, client, draft, pending, proof  # noqa: F401

API = "/api/v1"


# ---- sign-in (authentication) ----
@pytest.mark.parametrize("hdr", [
    {},                                         # no header
    {"Authorization": "demo-manager-a"},        # missing "Bearer"
    {"Authorization": "Basic demo-manager-a"},  # wrong scheme
    {"Authorization": "Bearer "},               # empty token
    H("not-a-real-token"),                      # unknown token
    H("x" * 500),                               # oversized token
])
def test_bad_sign_in_is_401(client, hdr):
    r = client.get(f"{API}/me", headers=hdr)
    assert r.status_code == 401
    assert r.json()["code"] == "unauthenticated"


@pytest.mark.parametrize("path", ["/facilities", "/priorities", "/briefs", "/tasks", "/events", "/integrations/status"])
def test_every_api_read_needs_sign_in(client, path):
    assert client.get(API + path).status_code == 401


def test_me_returns_server_side_claims(client):
    assert client.get(f"{API}/me", headers=STAFF).json() == {
        "actor_id": "staff_demo_a1", "tenant_id": "demo-a", "role": "staff"}


def test_body_cannot_override_tenant(client):
    # tenant_id in the body is ignored; the facility lands in the caller's own tenant.
    body = {"facility_id": "SEC-T1", "name": "Spoof test", "lat": 40.8, "lon": -73.9,
            "provenance": "DEMO_SYNTHETIC", "tenant_id": "demo-b"}
    r = client.post(f"{API}/facilities", headers=MGR, json=body)
    assert r.status_code == 201 and r.json()["tenant_id"] == "demo-a"
    assert all(f["facility_id"] != "SEC-T1" for f in client.get(f"{API}/facilities", headers=MGR_B).json())


def test_unknown_role_in_token_file_fails_closed(tmp_path):
    (tmp_path / "demo_auth.json").write_text(json.dumps(
        {"tokens": {"t": {"actor_id": "a", "tenant_id": "demo-a", "role": "admin"}}}))
    with pytest.raises(ValueError):
        load_tokens(tmp_path)


# ---- RBAC role matrix (access-control.md) ----
FAC = {"facility_id": "SEC-F1", "name": "Role test", "lat": 40.8, "lon": -73.9, "provenance": "DEMO_SYNTHETIC"}


@pytest.mark.parametrize("who", [STAFF, VAL])
def test_only_manager_onboards_sites(client, who):
    assert client.post(f"{API}/facilities", headers=who, json=FAC).status_code == 403


@pytest.mark.parametrize("who", [STAFF, VAL])
def test_only_manager_drafts_edits_submits(client, who):
    b = draft(client)
    assert client.post(f"{API}/briefs/generate", headers=who).status_code == 403
    assert client.patch(f"{API}/briefs/{b['id']}", headers=who, json={"summary": "x"}).status_code == 403
    assert client.post(f"{API}/briefs/{b['id']}/submit", headers=who).status_code == 403


@pytest.mark.parametrize("who", [STAFF, VAL])
def test_only_manager_rejects(client, who):
    b = pending(client)
    body = {**approve_body(b, "reject-key-1"), "reason": "no"}
    assert client.post(f"{API}/briefs/{b['id']}/reject", headers=who, json=body).status_code == 403


def test_staff_cannot_read_briefs_priorities_or_audit(client):
    for path in ["/briefs", "/priorities", "/events", "/integrations/status"]:
        assert client.get(API + path, headers=STAFF).status_code == 403, path


def test_validator_has_read_only_audit_access(client):
    for path in ["/briefs", "/priorities", "/events"]:
        assert client.get(API + path, headers=VAL).status_code == 200, path


def test_validator_cannot_touch_tasks_or_proof(client):
    brief = approved(client)
    tasks = client.post(f"{API}/tasks", headers=MGR, json={"brief_id": brief["id"], "idempotency_key": "tasks-sec-1"}).json()
    tid = tasks[0]["id"] if isinstance(tasks, list) else tasks["tasks"][0]["id"]
    assert client.patch(f"{API}/tasks/{tid}", headers=VAL, json={"status": "IN_PROGRESS"}).status_code == 403
    assert client.post(f"{API}/tasks/{tid}/evidence/upload-url", headers=VAL, json={"content_type": "image/jpeg"}).status_code == 403
    assert client.post(f"{API}/tasks/{tid}/verify", headers=VAL, json={"decision": "accept"}).status_code == 403
    assert client.post(f"{API}/tasks/{tid}/verify", headers=STAFF, json={"decision": "accept"}).status_code == 403


# ---- tenant isolation ----
def test_other_tenant_cannot_read_brief(client):
    b = draft(client)
    r = client.get(f"{API}/briefs/{b['id']}", headers=MGR_B)
    assert r.status_code in (403, 404)
    assert b["content_hash"] not in r.text  # no brief details leak in the error


def test_facility_lists_are_tenant_scoped(client):
    a = {f["tenant_id"] for f in client.get(f"{API}/facilities", headers=MGR).json()}
    b = {f["tenant_id"] for f in client.get(f"{API}/facilities", headers=MGR_B).json()}
    assert a == {"demo-a"} and b == {"demo-b"}


# ---- internal endpoint + browser hardening ----
@pytest.mark.parametrize("hdr", [{}, {"X-Ingest-Token": ""}, {"X-Ingest-Token": "wrong"}, MGR])
def test_ingest_rejects_missing_or_wrong_token(client, hdr):
    assert client.post("/internal/ingest", headers=hdr).status_code == 403


def test_security_headers_present(client):
    r = client.get(f"{API}/me", headers=MGR)
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert "frame-ancestors 'none'" in r.headers["Content-Security-Policy"]
    assert r.headers["Cache-Control"] == "no-store"


def test_errors_do_not_leak_tokens(client):
    r = client.get(f"{API}/me", headers=H("secret-looking-token-123"))
    assert "secret-looking-token-123" not in r.text
