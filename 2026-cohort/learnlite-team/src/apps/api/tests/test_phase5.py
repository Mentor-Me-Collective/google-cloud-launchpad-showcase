import pytest
from pydantic import ValidationError
from app.assessments import Question, QuizInput, QuizAnswers, badges_for
from main import app


def test_valid_quiz():
    quiz = QuizInput(
        title="Math",
        questions=[{
            "text": "2 + 2?",
            "options": ["3", "4"],
            "correctIndex": 1
        }]
    )
    assert quiz.questions[0].correctIndex == 1


def test_invalid_correct_index():
    with pytest.raises(ValidationError):
        Question(text="Question", options=["A", "B"], correctIndex=2)


def test_no_blank_options():
    with pytest.raises(ValidationError):
        Question(text="Question", options=["A", ""], correctIndex=0)


def test_answers_validation():
    with pytest.raises(ValidationError):
        QuizAnswers(answers=[])


def test_badges():
    assert badges_for(0) == []
    assert badges_for(10) == ["FIRST_STEPS"]
    assert len(badges_for(100)) == 3


def test_phase5_routes():
    paths = app.openapi()["paths"]
    count = sum(
        1 for path, methods in paths.items()
        for method in methods
        if ("/quizzes" in path or path == "/api/v1/me/achievements")
        and method in ("get", "post")
    )
    assert count == 7
