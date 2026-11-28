import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from main import app, get_current_user, get_db, profile_for
from app.learning import ModuleInput, LessonInput


class FakeSnapshot:
    def __init__(self, data=None):
        self.data = data
        self.exists = data is not None

    def to_dict(self):
        return self.data


class FakeDocument:
    def __init__(self, data=None):
        self.data = data
        self.id = "test-module"

    def get(self):
        return FakeSnapshot(self.data)


class FakeCollection:
    def __init__(self, data=None):
        self.data = data

    def document(self, document_id=None):
        return FakeDocument(self.data)


class FakeDB:
    def __init__(self, data=None, uid=None, role=None):
        self.data = data
        self.uid = uid
        self.role = role

    def collection(self, name):
        if name == "users":
            return FakeCollection({
                "id": self.uid,
                "role": self.role,
                "email": "",
                "status": "active",
            })

        if name == "modules":
            return FakeCollection(self.data)

        return FakeCollection()


@pytest.fixture
def api_context():
    old = dict(app.dependency_overrides)
    client = TestClient(app)

    def configure(uid, role, module=None):
        app.dependency_overrides[get_current_user] = (
            lambda: {"uid": uid, "role": role}
        )
        app.dependency_overrides[get_db] = (
            lambda: FakeDB(module, uid, role)
        )

    yield client, configure

    app.dependency_overrides.clear()
    app.dependency_overrides.update(old)


def test_module_requires_subject():
    with pytest.raises(ValidationError):
        ModuleInput(title="Mathematics")


def test_lesson_position_is_optional_but_not_negative():
    assert LessonInput(title="Lesson 1").position is None
    with pytest.raises(ValidationError):
        LessonInput(title="Lesson 1", position=-5)


def test_lesson_position_cannot_be_negative():
    with pytest.raises(ValidationError):
        LessonInput(
            title="Lesson 1",
            content="Introduction",
            position=-1,
        )


def test_student_cannot_create_teacher_module(api_context):
    client, configure = api_context
    configure("student-1", "student")

    response = client.post(
        "/api/v1/teacher/modules",
        json={"title": "Math", "subject": "Mathematics"},
    )

    assert response.status_code == 403


def test_student_cannot_list_teacher_modules(api_context):
    client, configure = api_context
    configure("student-1", "student")

    response = client.get("/api/v1/teacher/modules")

    assert response.status_code == 403


def test_teacher_cannot_access_another_authors_lessons(api_context):
    client, configure = api_context
    configure(
        "teacher-b",
        "teacher",
        {
            "id": "test-module",
            "authorId": "teacher-a",
            "status": "published",
        },
    )

    response = client.get(
        "/api/v1/teacher/modules/test-module/lessons"
    )

    assert response.status_code == 404


def test_teacher_cannot_publish_another_authors_module(api_context):
    client, configure = api_context
    configure(
        "teacher-b",
        "teacher",
        {
            "id": "test-module",
            "authorId": "teacher-a",
            "status": "draft",
        },
    )

    response = client.post(
        "/api/v1/teacher/modules/test-module/publish"
    )

    assert response.status_code == 404
