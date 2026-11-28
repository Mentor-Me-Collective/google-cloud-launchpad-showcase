import pytest
from unittest.mock import patch
from fastapi import HTTPException
from pydantic import ValidationError

from app.phase7 import (
    DiscussionInput,
    AnnouncementInput,
    AIRequest,
    generate_ai_draft
)
from main import app


def test_valid_discussion():
    assert DiscussionInput(message="Hello class").message == "Hello class"


def test_empty_discussion_rejected():
    with pytest.raises(ValidationError):
        DiscussionInput(message="")


def test_announcement_validation():
    with pytest.raises(ValidationError):
        AnnouncementInput(title="", message="Important update")


def test_ai_topic_validation():
    with pytest.raises(ValidationError):
        AIRequest(topic="AI", grade="Grade 10")


def test_missing_nvidia_configuration():
    with patch.dict("os.environ", {}, clear=True):
        with pytest.raises(HTTPException) as result:
            generate_ai_draft(
                AIRequest(topic="Mathematics", grade="Grade 10")
            )
    assert result.value.status_code == 503


def test_phase7_routes():
    paths = app.openapi()["paths"]
    operations = sum(
        1 for path, methods in paths.items()
        if "/discussions" in path
        or "/announcements" in path
        or "/ai/generate" in path
        for method in methods
        if method in ("get", "post")
    )
    assert operations == 5
