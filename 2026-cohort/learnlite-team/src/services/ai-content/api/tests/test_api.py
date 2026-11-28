"""
API tests in mock mode (no AI keys) with developer authentication.

Run from services/ai-content/api:   python -m pytest -q
"""
import json
import os
import pathlib

os.environ["LEARNLITE_MOCK"] = "1"
os.environ["AUTH_MODE"] = "dev"
os.environ["APP_ENV"] = "test"
os.environ.pop("K_SERVICE", None)

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from ai_content_api import build_router, install_error_handlers  # noqa: E402
from ai_content_api.store import MemoryStore, set_store  # noqa: E402
from main import app  # noqa: E402

BASE = "/api/v1/teacher/ai-content"
T1 = {"X-Dev-User": "teacher_1:teacher"}
T2 = {"X-Dev-User": "teacher_2:teacher"}
STUDENT = {"X-Dev-User": "student_1:student"}
SOURCES = json.loads((pathlib.Path(__file__).parent / "sample_sources.json").read_text())["sources"]


def draft_body(**over):
    body = {"lessonKey": "m2.l1", "title": "How chatbots build answers",
            "objective": "Explain how a chatbot builds an answer.", "position": 7,
            "sources": [{"sourceId": s["source_id"], "title": s["title"], "publisher": s["publisher"],
                         "url": s["url"], "reuse": s["reuse"], "text": s["text"]} for s in SOURCES],
            "counts": {"theory": 3, "multipleChoice": 2, "trueFalse": 1, "spotTheError": 1, "classify": 1}}
    body.update(over)
    return body


@pytest.fixture(autouse=True)
def fresh_store():
    set_store(MemoryStore())


@pytest.fixture
def client():
    return TestClient(app)


def new_draft(client):
    r = client.post(f"{BASE}/drafts", json=draft_body(), headers=T1)
    assert r.status_code == 201, r.text
    return r.json()


def test_auth_and_roles(client):
    r = client.post(f"{BASE}/drafts", json=draft_body())
    assert r.status_code == 401 and r.json()["error"]["code"] == "UNAUTHENTICATED"
    assert r.json()["error"]["requestId"].startswith("req_")
    r = client.post(f"{BASE}/drafts", json=draft_body(), headers=STUDENT)
    assert r.status_code == 403 and r.json()["error"]["code"] == "FORBIDDEN"


def test_validation_error_format(client):
    r = client.post(f"{BASE}/drafts", json=draft_body(sources=[]), headers=T1)
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "VALIDATION_ERROR" and "sources" in r.json()["error"]["details"]["fields"]


def test_full_teacher_workflow(client):
    d = new_draft(client)
    did = d["draftId"]
    styles = {b["style"] for b in d["blocks"]}
    assert {"theory", "multiple-choice", "true-false", "spot-the-error", "classify"} <= styles
    assert d["counts"]["unchecked"] == len(d["blocks"])

    # other teachers cannot see it
    assert client.get(f"{BASE}/drafts/{did}", headers=T2).status_code == 404
    lst = client.get(f"{BASE}/drafts", headers=T1).json()
    assert lst["pagination"]["total"] == 1 and lst["data"][0]["draftId"] == did
    assert client.get(f"{BASE}/drafts", headers=T2).json()["pagination"]["total"] == 0

    first = d["blocks"][0]["contentKey"]
    r = client.post(f"{BASE}/drafts/{did}/blocks/{first}/approve", headers=T1)
    assert r.status_code == 409 and r.json()["error"]["code"] == "CHECK_REQUIRED"

    d = client.post(f"{BASE}/drafts/{did}/check", headers=T1).json()
    flagged = [b for b in d["blocks"] if b["check"]["verdict"] != "SUPPORTED"]
    assert flagged, "mock drafter plants one unsupported claim"
    r = client.post(f"{BASE}/drafts/{did}/blocks/{flagged[0]['contentKey']}/approve", headers=T1)
    assert r.status_code == 409 and r.json()["error"]["code"] == "REVIEW_NOTE_REQUIRED"

    # editing an activity clears its check; invalid edits are refused
    mc = next(b for b in d["blocks"] if b["style"] == "multiple-choice")
    k = mc["contentKey"]
    r = client.patch(f"{BASE}/drafts/{did}/blocks/{k}", json={"correctIndex": 9}, headers=T1)
    assert r.status_code == 422 and r.json()["error"]["code"] == "INVALID_BLOCK"
    r = client.patch(f"{BASE}/drafts/{did}/blocks/{k}", json={"correctBool": True}, headers=T1)
    assert r.status_code == 400
    r = client.patch(f"{BASE}/drafts/{did}/blocks/{k}", json={"explanation": "Chatbots predict the next token."}, headers=T1)
    assert r.status_code == 200
    edited = next(b for b in r.json()["blocks"] if b["contentKey"] == k)
    assert edited["review"]["edited_after_check"] is True
    assert client.post(f"{BASE}/drafts/{did}/blocks/{k}/approve", headers=T1).json()["error"]["code"] == "CHECK_REQUIRED"
    d = client.post(f"{BASE}/drafts/{did}/check", json={"blockKeys": [k]}, headers=T1).json()

    # export is refused until every block has a decision
    r = client.post(f"{BASE}/drafts/{did}/export", headers=T1)
    assert r.status_code == 409 and r.json()["error"]["code"] == "REVIEW_INCOMPLETE"

    for b in d["blocks"]:
        key = b["contentKey"]
        if "always search the internet" in b.get("body", ""):
            assert client.post(f"{BASE}/drafts/{did}/blocks/{key}/remove", json={"note": "False claim"}, headers=T1).status_code == 200
        else:
            note = "" if b["check"]["verdict"] == "SUPPORTED" else "Checked by hand against the source."
            r = client.post(f"{BASE}/drafts/{did}/blocks/{key}/approve", json={"note": note}, headers=T1)
            assert r.status_code == 200, r.text

    r = client.post(f"{BASE}/drafts/{did}/export", json={"contentVersion": "0.3.0", "approverName": "Reshma Thomas"},
                    headers=T1)
    assert r.status_code == 200, r.text
    out = r.json()
    lesson = out["lesson"]
    assert lesson["contentKey"] == "m2.l1" and lesson["blocks"]
    assert all(b["reviewedBy"] == "Reshma Thomas" for b in lesson["blocks"])
    assert [b["position"] for b in lesson["blocks"]] == list(range(len(lesson["blocks"])))
    assert not any("always search" in b.get("body", "") for b in lesson["blocks"])
    assert out["audit"]["approvedByUid"] == "teacher_1" and out["audit"]["mode"] == "mock"
    assert {s["sourceId"] for s in out["sources"]} <= {s["source_id"] for s in SOURCES}

    # exported drafts are frozen
    r = client.post(f"{BASE}/drafts/{did}/check", headers=T1)
    assert r.status_code == 409 and r.json()["error"]["code"] == "DRAFT_EXPORTED"
    assert client.get(f"{BASE}/drafts/{did}", headers=T1).json()["status"] == "exported"


def test_mount_with_host_dependency():
    """The router can be mounted in the main API with that API's own teacher dependency."""
    def host_teacher():
        return {"uid": "host_teacher", "name": "Host Teacher", "role": "teacher"}

    host = FastAPI()
    install_error_handlers(host)
    host.include_router(build_router(require_teacher=host_teacher), prefix="/api/v1")
    c = TestClient(host)
    r = c.post(f"{BASE}/drafts", json=draft_body())
    assert r.status_code == 201 and r.json()["ownerId"] == "host_teacher"
    assert c.get(f"{BASE}/status").json()["mock"] is True
