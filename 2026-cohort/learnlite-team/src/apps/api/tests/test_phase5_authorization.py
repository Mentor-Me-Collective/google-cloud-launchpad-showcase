"""Phase 5 ownership and global-module authorization tests."""

import pytest
from fastapi.testclient import TestClient
from main import app, get_current_user, get_db


class Snapshot:
    def __init__(self, path, data):
        self.id = path[-1]
        self.exists = data is not None
        self.data = data

    def to_dict(self):
        return self.data


class Document:
    def __init__(self, db, path):
        self.db = db
        self.path = path
        self.id = path[-1]

    def get(self):
        return Snapshot(self.path, self.db.records.get(self.path))

    def collection(self, name):
        return Collection(self.db, self.path + (name,))

    def create(self, data):
        if self.path in self.db.records:
            raise ValueError("Document already exists")
        self.db.records[self.path] = dict(data)


class Collection:
    def __init__(self, db, path):
        self.db = db
        self.path = path

    def document(self, key=None):
        if key is None:
            self.db.counter += 1
            key = f"generated-{self.db.counter}"
        return Document(self.db, self.path + (key,))


class MemoryDB:
    def __init__(self):
        self.records = {}
        self.counter = 0

    def collection(self, name):
        return Collection(self, (name,))


@pytest.fixture
def api_context():
    db = MemoryDB()
    current = {"uid": "teacher-a", "role": "teacher"}
    previous = dict(app.dependency_overrides)

    db.records[("classrooms", "class-a")] = {
        "id": "class-a",
        "ownerId": "teacher-a",
        "status": "active",
    }

    def switch(uid, role):
        current.update(uid=uid, role=role)
        db.records[("users", uid)] = {
            "id": uid,
            "role": role,
            "email": "",
            "status": "active",
        }

    switch("teacher-a", "teacher")

    app.dependency_overrides[get_current_user] = lambda: dict(current)
    app.dependency_overrides[get_db] = lambda: db

    yield TestClient(app), db, switch

    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous)


def quiz_payload(module_id="module-a"):
    return {
        "title": "Fractions assessment",
        "moduleId": module_id,
        "questions": [{
            "text": "What is 1 + 1?",
            "options": ["1", "2"],
            "correctIndex": 1,
        }],
    }


def put_module(db, author, status="published"):
    db.records[("modules", "module-a")] = {
        "id": "module-a",
        "authorId": author,
        "status": status,
        "subject": "Mathematics",
    }


def test_teacher_can_use_own_published_module(api_context):
    client, db, _ = api_context
    put_module(db, "teacher-a")

    response = client.post(
        "/api/v1/classrooms/class-a/quizzes",
        json=quiz_payload(),
    )

    assert response.status_code == 201, response.text
    assert response.json()["authorId"] == "teacher-a"
    assert response.json()["moduleId"] == "module-a"


def test_teacher_cannot_use_another_authors_module(api_context):
    client, db, _ = api_context
    put_module(db, "teacher-b")

    response = client.post(
        "/api/v1/classrooms/class-a/quizzes",
        json=quiz_payload(),
    )

    assert response.status_code == 404


def test_draft_module_cannot_be_attached(api_context):
    client, db, _ = api_context
    put_module(db, "teacher-a", "draft")

    response = client.post(
        "/api/v1/classrooms/class-a/quizzes",
        json=quiz_payload(),
    )

    assert response.status_code == 409


def test_student_cannot_create_quiz(api_context):
    client, db, switch = api_context
    switch("student-a", "student")
    db.records[(
        "classrooms", "class-a", "members", "student-a"
    )] = {"status": "active"}

    response = client.post(
        "/api/v1/classrooms/class-a/quizzes",
        json=quiz_payload(),
    )

    assert response.status_code == 403


def test_unenrolled_student_cannot_access_quizzes(api_context):
    client, _, switch = api_context
    switch("student-outsider", "student")

    response = client.get(
        "/api/v1/classrooms/class-a/quizzes"
    )

    assert response.status_code == 403
