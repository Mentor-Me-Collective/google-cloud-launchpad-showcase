"""In-memory integration tests; no live Firestore writes."""

import pytest
from fastapi.testclient import TestClient
from google.cloud import firestore

from main import app, get_current_user, get_db
from memory_firestore import MemoryDB, passthrough_transactional


@pytest.fixture
def setup_api(monkeypatch):
    db = MemoryDB()
    monkeypatch.setattr(firestore, "transactional", passthrough_transactional)
    original = dict(app.dependency_overrides)
    current = {"uid": "teacher-1", "role": "teacher"}

    def user():
        return dict(current)

    app.dependency_overrides[get_current_user] = user
    app.dependency_overrides[get_db] = lambda: db

    def switch(uid, role):
        current.update(uid=uid, role=role)
        db.records[("users", uid)] = {
            "id": uid,
            "email": "",
            "role": role,
            "status": "active",
        }

    switch("teacher-1", "teacher")

    for cid in ("grade-7a", "grade-7b"):
        db.records[("classrooms", cid)] = {
            "id": cid,
            "ownerId": "teacher-1",
            "status": "active",
        }
        db.records[
            ("classrooms", cid, "members", "student-1")
        ] = {"status": "active"}

    yield TestClient(app), db, switch

    app.dependency_overrides.clear()
    app.dependency_overrides.update(original)


def test_one_module_reused_in_two_classrooms(setup_api):
    client, db, switch = setup_api

    created = client.post(
        "/api/v1/teacher/modules",
        json={
            "title": "Fractions",
            "subject": "Mathematics",
            "description": "Fractions basics",
        },
    )
    assert created.status_code == 201, created.text
    module = created.json()
    assert module["authorId"] == "teacher-1"
    assert module["subject"] == "Mathematics"

    mid = module["id"]

    for position in (2, 0, 1):
        result = client.post(
            f"/api/v1/teacher/modules/{mid}/lessons",
            json={
                "title": f"Lesson {position}",
                "content": "Learning material",
                "position": position,
            },
        )
        assert result.status_code == 201, result.text

    published = client.post(
        f"/api/v1/teacher/modules/{mid}/publish"
    )
    assert published.status_code == 200, published.text

    # The same module ID is assigned to two classrooms.
    for cid in ("grade-7a", "grade-7b"):
        assigned = client.post(
            f"/api/v1/classrooms/{cid}/assignments",
            json={
                "title": "Complete fractions",
                "instructions": "Read the lessons",
                "moduleId": mid,
            },
        )
        assert assigned.status_code == 201, assigned.text
        assert assigned.json()["moduleId"] == mid

    switch("student-1", "student")

    for cid in ("grade-7a", "grade-7b"):
        modules = client.get(
            f"/api/v1/classrooms/{cid}/modules"
        )
        assert modules.status_code == 200, modules.text
        assert [m["id"] for m in modules.json()["items"]] == [mid]

        lessons = client.get(
            f"/api/v1/classrooms/{cid}/modules/{mid}/lessons"
        )
        assert lessons.status_code == 200, lessons.text
        positions = [
            lesson["position"]
            for lesson in lessons.json()["items"]
        ]
        assert positions == [0, 1, 2]

    # A student outside the classroom cannot access lessons.
    switch("student-outsider", "student")
    denied = client.get(
        f"/api/v1/classrooms/grade-7a/modules/{mid}/lessons"
    )
    assert denied.status_code == 403

    # Removing the assignment makes the module inaccessible
    # to a student, despite valid classroom membership.
    switch("student-1", "student")
    for path in list(db.records):
        if (
            path[:3] ==
            ("classrooms", "grade-7a", "assignments")
        ):
            del db.records[path]

    denied = client.get(
        f"/api/v1/classrooms/grade-7a/modules/{mid}/lessons"
    )
    assert denied.status_code == 404
