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


# ---- input validation ----
GOOD_FAC = {"facility_id": "VAL-OK1", "name": "Valid Site", "lat": 40.81, "lon": -73.92,
            "provenance": "PUBLIC_VERIFIED", "source_url": "https://www.nyc.gov/site"}


@pytest.mark.parametrize("field,value", [
    ("facility_id", "../../etc"),                 # path characters
    ("facility_id", "a b"),                       # spaces
    ("facility_id", "x" * 41),                    # too long
    ("name", "<script>alert(1)</script>"),        # HTML injection into the console
    ("name", "bad\x00name"),                      # control character
    ("lat", 200),                                 # impossible coordinate
    ("lon", -500),
    ("provenance", "TRUST_ME"),                   # not an allowed label
    ("source_url", "javascript:alert(1)"),        # not a web link
    ("source_url", "http://insecure.example"),    # must be HTTPS
])
def test_bad_facility_input_rejected(client, field, value):
    r = client.post(f"{API}/facilities", headers=MGR, json={**GOOD_FAC, field: value})
    assert r.status_code == 422, (field, r.text)
    assert r.json()["code"] == "validation_error"


def test_good_facility_input_accepted(client):
    assert client.post(f"{API}/facilities", headers=MGR, json=GOOD_FAC).status_code == 201


def test_brief_edit_rejects_html_and_oversize(client):
    b = draft(client)
    url = f"{API}/briefs/{b['id']}"
    assert client.patch(url, headers=MGR, json={"summary": "<img src=x onerror=alert(1)>"}).status_code == 422
    assert client.patch(url, headers=MGR, json={"summary": "x" * 901}).status_code == 422
    assert client.patch(url, headers=MGR, json={"summary": "Check AC first.\nThen water."}).status_code == 200


def test_approval_inputs_validated(client):
    b = pending(client)
    url = f"{API}/briefs/{b['id']}/approve"
    assert client.post(url, headers=MGR, json={**approve_body(b), "expected_version": 0}).status_code == 422
    assert client.post(url, headers=MGR, json={**approve_body(b), "idempotency_key": "key with spaces"}).status_code == 422
    assert client.post(url, headers=MGR, json={**approve_body(b), "reason": "r" * 501}).status_code == 422


def test_task_and_upload_inputs_validated(client):
    assert client.post(f"{API}/tasks", headers=MGR, json={"brief_id": "../x", "idempotency_key": "abcdef"}).status_code == 422
    b = approved(client)
    t = client.post(f"{API}/tasks", headers=MGR, json={"brief_id": b["id"], "idempotency_key": "tasks-val-1"}).json()[0]
    client.patch(f"{API}/tasks/{t['id']}", headers=STAFF, json={"status": "IN_PROGRESS"})
    url = f"{API}/tasks/{t['id']}/evidence/upload-url"
    assert client.post(url, headers=STAFF, json={"content_type": "image/png; x=<y>"}).status_code == 422
    assert client.post(url, headers=STAFF, json={"content_type": "text/html"}).status_code == 422
    ev = {"object_path": "evidence/demo-a/../../secret", "sha256": "a" * 64}
    assert client.post(f"{API}/tasks/{t['id']}/evidence", headers=STAFF, json=ev).status_code in (403, 422)
    assert client.post(f"{API}/tasks/{t['id']}/evidence", headers=STAFF,
                       json={"object_path": "evidence/x", "sha256": "not-a-hash"}).status_code == 422


# ---- facility data privacy ----
def test_cannot_discover_other_tenants_facility_ids(client):
    a_id = client.get(f"{API}/facilities", headers=MGR).json()[0]["facility_id"]
    # Tenant B using the same ID must NOT get "already exists" (that would reveal tenant A's data).
    r = client.post(f"{API}/facilities", headers=MGR_B, json={**FAC, "facility_id": a_id})
    assert r.status_code == 201 and r.json()["tenant_id"] == "demo-b"
    # Tenant A's facility is untouched and still only visible to A.
    a_list = client.get(f"{API}/facilities", headers=MGR).json()
    assert [f for f in a_list if f["facility_id"] == a_id][0]["tenant_id"] == "demo-a"
    assert all(f["tenant_id"] == "demo-a" for f in a_list)


def test_duplicate_inside_own_tenant_still_409(client):
    assert client.post(f"{API}/facilities", headers=MGR, json=FAC).status_code == 201
    assert client.post(f"{API}/facilities", headers=MGR, json=FAC).status_code == 409


def test_unauthenticated_cannot_see_any_facility_data(client):
    r = client.get(f"{API}/facilities")
    assert r.status_code == 401 and "DEMO" not in r.text


def test_staff_cannot_see_priority_scores_or_audit(client):
    assert client.get(f"{API}/priorities", headers=STAFF).status_code == 403
    assert client.get(f"{API}/events", headers=STAFF_B).status_code == 403
