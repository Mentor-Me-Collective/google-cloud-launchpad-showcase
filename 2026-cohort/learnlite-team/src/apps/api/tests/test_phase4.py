from app.learning import ModuleInput, LessonInput, AssignmentInput, SubmissionInput
from main import app
from pydantic import ValidationError
import pytest


def test_module_validation():
    with pytest.raises(ValidationError):
        ModuleInput(title="")


def test_lesson_validation():
    with pytest.raises(ValidationError):
        LessonInput(title="")
    # Content now lives in blocks: text and position are optional.
    lesson = LessonInput(title="Lesson")
    assert lesson.content == ""
    assert lesson.position is None


def test_assignment_validation():
    with pytest.raises(ValidationError):
        AssignmentInput(title="", instructions="Complete this")


def test_submission_validation():
    with pytest.raises(ValidationError):
        SubmissionInput(answer="")


def test_phase4_routes():
    paths = app.openapi()["paths"]
    operations = [
        (method, path)
        for path, methods in paths.items()
        if "/modules" in path or "/assignments" in path
        for method in methods
        if method in ("get", "post", "patch")
    ]
    # The original Phase 4 routes must keep working; new routes may be added.
    original = {
        ("post", "/api/v1/teacher/modules"),
        ("get", "/api/v1/teacher/modules"),
        ("post", "/api/v1/teacher/modules/{mid}/lessons"),
        ("get", "/api/v1/teacher/modules/{mid}/lessons"),
        ("post", "/api/v1/teacher/modules/{mid}/publish"),
        ("get", "/api/v1/classrooms/{cid}/modules"),
        ("get", "/api/v1/classrooms/{cid}/modules/{mid}/lessons"),
        ("post", "/api/v1/classrooms/{cid}/assignments"),
        ("get", "/api/v1/classrooms/{cid}/assignments"),
        ("post", "/api/v1/classrooms/{cid}/assignments/{aid}/submit"),
        ("get", "/api/v1/classrooms/{cid}/assignments/{aid}/submissions"),
    }
    assert original <= set(operations)


def test_module_rejects_blank_title():
    with pytest.raises(ValidationError):
        ModuleInput(title="   ", subject="Mathematics")


def test_module_rejects_blank_subject():
    with pytest.raises(ValidationError):
        ModuleInput(title="Fractions", subject="   ")
