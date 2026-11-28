"""
Security, integration and contract tests.

Production-style auth is exercised with Firebase verification replaced by a fake verifier,
so no real tokens or keys are needed. Run:  python -m pytest -q
"""
import json
import os
import pathlib
from dataclasses import dataclass, field

os.environ["LEARNLITE_MOCK"] = "1"
os.environ["APP_ENV"] = "test"

import pytest  # noqa: E402
from fastapi import FastAPI, Header  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from ai_content_api import auth, build_router, install_error_handlers  # noqa: E402
from ai_content_api.store import MemoryStore, set_store  # noqa: E402
from ai_content_api.validate_module import validate_module  # noqa: E402
from main import app  # noqa: E402

BASE = "/api/v1/teacher/ai-content"
SOURCES = json.loads((pathlib.Path(__file__).parent / "sample_sources.json").read_text())["sources"]

# Fake Firebase: token -> verified claims. Anything else fails verification.
TOKENS = {
    "tok-teacher-a": {"uid": "teacher_a", "role": "teacher", "name": "Teacher A"},
    "tok-teacher-b": {"uid": "teacher_b", "role": "teacher", "name": "Teacher B"},
    "tok-student": {"uid": "student_1", "role": "student"},
    "tok-no-role": {"uid": "user_no_role"},                      # e.g. teacher only in a Firestore profile
    "tok-role-list": {"uid": "user_list", "role": ["teacher"]},  # malformed claim
}


def bearer(tok):
    return {"Authorization": f"Bearer {tok}"}


def fake_verify(token):
    if token not in TOKENS:
        raise ValueError("invalid, expired or revoked token")
    return dict(TOKENS[token])


def body(**over):
    b = {"lessonKey": "m2.l1", "title": "How chatbots build answers",
         "objective": "Explain how a chatbot builds an answer.", "position": 0,
         "sources": [{"sourceId": s["source_id"], "title": s["title"], "publisher": s["publisher"],
                      "url": s["url"], "reuse": s["reuse"], "text": s["text"]} for s in SOURCES],
         "counts": {"theory": 3, "multipleChoice": 2, "trueFalse": 1, "spotTheError": 1, "classify": 1}}
    b.update(over)
    return b


@pytest.fixture(autouse=True)
def firebase_mode(monkeypatch):
    """Production-style auth: no dev shortcut, Firebase verification faked."""
    set_store(MemoryStore())
    monkeypatch.delenv("AUTH_MODE", raising=False)
    monkeypatch.setenv("APP_ENV", "test")
    for m in auth.CLOUD_MARKERS:
        monkeypatch.delenv(m, raising=False)
    monkeypatch.setattr(auth, "_verify_with_firebase", fake_verify)


@pytest.fixture
def client():
    return TestClient(app)


def make_draft(client, tok="tok-teacher-a"):
    r = client.post(f"{BASE}/drafts", json=body(), headers=bearer(tok))
    assert r.status_code == 201, r.text
    return r.json()


def decide_all(client, d, headers):
    did = d["draftId"]
    d = client.post(f"{BASE}/drafts/{did}/check", headers=headers).json()
    for b in d["blocks"]:
        k = b["contentKey"]
        if "always search the internet" in b.get("body", ""):
            client.post(f"{BASE}/drafts/{did}/blocks/{k}/remove", json={"note": "False"}, headers=headers)
        else:
            note = "" if b["check"]["verdict"] == "SUPPORTED" else "Checked by hand."
            r = client.post(f"{BASE}/drafts/{did}/blocks/{k}/approve", json={"note": note}, headers=headers)
            assert r.status_code == 200, r.text
    return did


# --------------------------------------------------------------------------
# 401: missing or invalid authentication
# --------------------------------------------------------------------------
@pytest.mark.parametrize("headers", [
    {},                                           # no header
    {"Authorization": "Bearer"},                  # empty token
    {"Authorization": "Bearer   "},
    {"Authorization": "Token tok-teacher-a"},     # wrong scheme
    {"Authorization": "tok-teacher-a"},           # no scheme
    bearer("not-a-real-token"),                   # fails verification (invalid / expired / revoked)
    {"X-Dev-User": "teacher_a:teacher"},          # dev header is ignored when dev mode is off
])
def test_401_missing_or_invalid(client, headers):
    for method, path in [("get", "/status"), ("get", "/drafts"), ("post", "/drafts")]:
        kw = {"json": body()} if method == "post" else {}
        r = getattr(client, method)(BASE + path, headers=headers, **kw)
        assert r.status_code == 401, (path, headers, r.text)
        err = r.json()["error"]
        assert err["code"] == "UNAUTHENTICATED" and err["requestId"].startswith("req_")


# --------------------------------------------------------------------------
# 403: signed in, but not a teacher
# --------------------------------------------------------------------------
@pytest.mark.parametrize("tok", ["tok-student", "tok-no-role", "tok-role-list"])
def test_403_not_teacher(client, tok):
    d_owner = make_draft(client)  # a real draft exists
    did = d_owner["draftId"]
    k = d_owner["blocks"][0]["contentKey"]
    calls = [("get", "/status", None), ("get", "/drafts", None), ("post", "/drafts", body()),
             ("get", f"/drafts/{did}", None), ("post", f"/drafts/{did}/check", None),
             ("patch", f"/drafts/{did}/blocks/{k}", {"title": "Hacked"}),
             ("post", f"/drafts/{did}/blocks/{k}/approve", None), ("post", f"/drafts/{did}/export", None)]
    for method, path, js in calls:
        r = getattr(client, method)(BASE + path, headers=bearer(tok), **({"json": js} if js else {}))
        assert r.status_code == 403, (tok, path, r.text)
        assert r.json()["error"]["code"] == "FORBIDDEN"
    # and nothing changed
    again = client.get(f"{BASE}/drafts/{did}", headers=bearer("tok-teacher-a")).json()
    assert again["blocks"][0]["title"] != "Hacked"


# --------------------------------------------------------------------------
# 404: another teacher's draft
# --------------------------------------------------------------------------
def test_404_other_teachers_draft(client):
    d = make_draft(client, "tok-teacher-a")
    did, k = d["draftId"], d["blocks"][0]["contentKey"]
    b = bearer("tok-teacher-b")
    calls = [("get", f"/drafts/{did}", None), ("post", f"/drafts/{did}/check", None),
             ("patch", f"/drafts/{did}/blocks/{k}", {"title": "Changed by B"}),
             ("post", f"/drafts/{did}/blocks/{k}/approve", None),
             ("post", f"/drafts/{did}/blocks/{k}/remove", None),
             ("post", f"/drafts/{did}/blocks/{k}/restore", None),
             ("post", f"/drafts/{did}/export", None)]
    for method, path, js in calls:
        r = getattr(client, method)(BASE + path, headers=b, **({"json": js} if js else {}))
        assert r.status_code == 404, (path, r.text)
        assert r.json()["error"]["code"] == "DRAFT_NOT_FOUND"
    # same answer as a draft that does not exist, so B cannot tell it exists
    missing = client.get(f"{BASE}/drafts/draft_doesnotexist", headers=b).json()["error"]
    other = client.get(f"{BASE}/drafts/{did}", headers=b).json()["error"]
    assert (missing["code"], missing["message"]) == (other["code"], other["message"])
    # B's list is empty, A's draft is untouched
    assert client.get(f"{BASE}/drafts", headers=b).json()["pagination"]["total"] == 0
    a = client.get(f"{BASE}/drafts/{did}", headers=bearer("tok-teacher-a")).json()
    assert a["blocks"][0]["title"] != "Changed by B" and a["counts"]["approved"] == 0


# --------------------------------------------------------------------------
# AUTH_MODE=dev and LEARNLITE_MOCK cannot run outside local/test
# --------------------------------------------------------------------------
@pytest.mark.parametrize("env", [
    {"APP_ENV": "production"},
    {"APP_ENV": "staging"},
    {"APP_ENV": None},                              # unset defaults to production
    {"APP_ENV": "local", "K_SERVICE": "ai-content"},  # Cloud Run
    {"APP_ENV": "test", "CLOUD_RUN_JOB": "job"},
    {"APP_ENV": "local", "GAE_ENV": "standard"},     # App Engine
    {"APP_ENV": "local", "FUNCTION_TARGET": "fn"},   # Cloud Functions
])
@pytest.mark.parametrize("switch", [("AUTH_MODE", "dev"), ("LEARNLITE_MOCK", "1")])
def test_test_switches_refused_outside_local(monkeypatch, env, switch):
    for k, v in env.items():
        monkeypatch.delenv(k, raising=False) if v is None else monkeypatch.setenv(k, v)
    if switch[0] == "AUTH_MODE":
        monkeypatch.delenv("LEARNLITE_MOCK", raising=False)
    monkeypatch.setenv(*switch)
    with pytest.raises(RuntimeError):
        build_router()


def test_dev_header_blocked_at_request_time(client, monkeypatch):
    """Even if the environment changes after startup, the dev header never authenticates."""
    monkeypatch.setenv("AUTH_MODE", "dev")
    monkeypatch.setenv("APP_ENV", "production")
    r = client.get(f"{BASE}/drafts", headers={"X-Dev-User": "x:teacher"})
    assert r.status_code == 500 and r.json()["error"]["code"] == "AUTH_MISCONFIGURED"


def test_dev_mode_works_locally(client, monkeypatch):
    monkeypatch.setenv("AUTH_MODE", "dev")
    monkeypatch.setenv("APP_ENV", "local")
    assert client.get(f"{BASE}/status", headers={"X-Dev-User": "t:teacher"}).status_code == 200
    assert client.get(f"{BASE}/status", headers={"X-Dev-User": "s:student"}).status_code == 403


# --------------------------------------------------------------------------
# Integration with the backend's own auth dependency
# --------------------------------------------------------------------------
@dataclass
class HostUser:  # what a backend might return from its own get_current_user
    uid: str
    role: str = ""            # e.g. read from a Firestore profile: must NOT grant teacher access
    claims: dict = field(default_factory=dict)
    display_name: str = ""


def host_app(dep):
    h = FastAPI()
    install_error_handlers(h)
    h.include_router(build_router(get_current_user=dep), prefix="/api/v1")
    return TestClient(h)


def test_integration_decoded_token_dict():
    def get_current_user(authorization: str = Header(default="")):
        return fake_verify(authorization.removeprefix("Bearer "))   # host returns the decoded token
    c = host_app(get_current_user)
    r = c.post(f"{BASE}/drafts", json=body(), headers=bearer("tok-teacher-a"))
    assert r.status_code == 201 and r.json()["ownerId"] == "teacher_a"
    assert c.post(f"{BASE}/drafts", json=body(), headers=bearer("tok-student")).status_code == 403


def test_integration_user_object_uses_claims_only():
    users = {"a": HostUser(uid="a", claims={"role": "teacher"}, display_name="A"),
             "profile_only": HostUser(uid="p", role="teacher", claims={}),   # profile says teacher, token does not
             "student": HostUser(uid="s", claims={"role": "student"})}

    def get_current_user(x_user: str = Header(default="")):
        return users[x_user]
    c = host_app(get_current_user)
    assert c.get(f"{BASE}/status", headers={"x-user": "a"}).status_code == 200
    assert c.get(f"{BASE}/status", headers={"x-user": "profile_only"}).status_code == 403
    assert c.get(f"{BASE}/status", headers={"x-user": "student"}).status_code == 403


def test_integration_host_401_passes_through():
    from fastapi import HTTPException

    def get_current_user():
        raise HTTPException(status_code=401, detail="Not signed in")
    c = host_app(get_current_user)
    assert c.get(f"{BASE}/status").status_code == 401


# --------------------------------------------------------------------------
# Contract v1.0 compatibility of the export
# --------------------------------------------------------------------------
@pytest.mark.parametrize("mode", ["extended", "strict"])
def test_export_matches_contract(client, mode):
    h = bearer("tok-teacher-a")
    did = decide_all(client, make_draft(client), h)
    r = client.post(f"{BASE}/drafts/{did}/export", json={"contractMode": mode, "contentVersion": "0.3.0"}, headers=h)
    assert r.status_code == 200, r.text
    out = r.json()
    lesson = out["lesson"]
    module = {"title": "Module", "subject": "AI literacy", "status": "draft",
              "sources": out["sources"], "lessons": [lesson]}
    errors, notes = validate_module(module)
    assert errors == []
    for b in lesson["blocks"]:
        if b["kind"] == "activity":
            act = b["activity"]
            assert act["type"] in {"multiple-choice", "true-false", "classify"}
            if act["type"] == "multiple-choice":
                assert 0 <= act["correctIndex"] < len(act["options"])
    if mode == "strict":
        assert set(lesson) == {"title", "position", "blocks"}
        assert all(set(b) <= {"position", "kind", "title", "body", "url", "activity"} for b in lesson["blocks"])
        assert not any("extension" in n for n in notes)
    else:
        assert all(b["reviewedBy"] == "Teacher A" for b in lesson["blocks"])
    # traceability is kept in the audit either way
    assert [x["position"] for x in out["audit"]["lessonBlocks"]] == list(range(len(lesson["blocks"])))
    assert out["audit"]["approvedByUid"] == "teacher_a" and out["audit"]["contractMode"] == mode
