import pytest
from pydantic import ValidationError
from app.offline_sync import SyncBatch, SyncOperation, fingerprint
from main import app


def valid_operation(**overrides):
    values = {
        "operationId": "offline-op-001",
        "classroomId": "class-001",
        "kind": "lesson_progress",
        "targetId": "lesson-001",
        "value": "completed",
        "baseRevision": 0,
    }
    values.update(overrides)
    return SyncOperation(**values)


def test_valid_sync_operation():
    assert valid_operation().value == "completed"


def test_invalid_progress():
    with pytest.raises(ValidationError):
        valid_operation(value="invalid")


def test_negative_revision():
    with pytest.raises(ValidationError):
        valid_operation(baseRevision=-1)


def test_batch_size_limit():
    with pytest.raises(ValidationError):
        SyncBatch(operations=[valid_operation()] * 26)


def test_fingerprint_detects_changes():
    assert fingerprint(valid_operation()) != fingerprint(
        valid_operation(value="in_progress")
    )


def test_sync_routes_registered():
    paths = app.openapi()["paths"]
    assert "post" in paths["/api/v1/sync/push"]
    assert "get" in paths["/api/v1/sync/pull"]
