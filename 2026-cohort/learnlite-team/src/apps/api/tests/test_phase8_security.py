"""Phase 8: authentication boundary and response security checks."""

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    app.dependency_overrides.clear()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.mark.parametrize("path", [
    "/api/v1/teacher/classrooms",
    "/api/v1/me/classrooms",
    "/api/v1/me",
    "/api/v1/me/achievements",
    "/api/v1/sync/pull",
    "/api/v1/classrooms/test-class/discussions",
    "/api/v1/classrooms/test-class/announcements",
])
def test_protected_get_requires_authentication(client, path):
    response = client.get(path)
    assert response.status_code == 401, (
        f"{path}: expected 401, got {response.status_code}"
    )


@pytest.mark.parametrize("path,payload", [
    (
        "/api/v1/teacher/classrooms",
        {"name": "Test", "grade": "10", "subject": "Math"}
    ),
    (
        "/api/v1/teacher/modules",
        {"title": "Test Module"}
    ),
    (
        "/api/v1/classrooms/test-class/quizzes",
        {"title": "Quiz", "questions": [
            {"text": "1+1?", "options": ["1", "2"], "correctIndex": 1}
        ]}
    ),
    (
        "/api/v1/classrooms/test-class/ai/generate",
        {"topic": "Mathematics", "grade": "Grade 10"}
    ),
])
def test_protected_post_requires_authentication(client, path, payload):
    response = client.post(path, json=payload)
    assert response.status_code == 401, (
        f"{path}: expected 401, got {response.status_code}"
    )


def test_health_endpoint_available(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_openapi_includes_all_phase_routes(client):
    paths = client.get("/openapi.json").json()["paths"]
    assert "/api/v1/teacher/classrooms" in paths
    assert "/api/v1/sync/push" in paths
    assert "/api/v1/me/achievements" in paths
    assert "/api/v1/classrooms/{cid}/ai/generate" in paths
