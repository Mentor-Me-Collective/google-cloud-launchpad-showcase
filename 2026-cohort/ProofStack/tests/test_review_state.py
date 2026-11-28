from proofstack.review_state import (
    assessment_matches_case,
    reviewer_submission_errors,
)


def test_assessment_matches_current_case():
    context = {"question_id": "Q01", "evidence_id": "E01"}
    assert assessment_matches_case(context, "Q01", "E01")


def test_assessment_rejected_for_different_evidence():
    context = {"question_id": "Q01", "evidence_id": "E01"}
    assert not assessment_matches_case(context, "Q01", "E02")


def test_assessment_rejected_for_different_question():
    context = {"question_id": "Q01", "evidence_id": "E01"}
    assert not assessment_matches_case(context, "Q02", "E01")


def test_assessment_rejected_without_context():
    assert not assessment_matches_case(None, "Q01", "E01")


def test_reviewer_name_is_required():
    errors = reviewer_submission_errors(
        "",
        "SUPPORTED",
        "",
        {"label": "SUPPORTED"},
    )
    assert "Reviewer name is required." in errors


def test_override_requires_note():
    errors = reviewer_submission_errors(
        "John",
        "UNSUPPORTED",
        "",
        {"label": "SUPPORTED"},
    )
    assert any("overriding" in error for error in errors)


def test_matching_decision_does_not_require_note():
    assert reviewer_submission_errors(
        "John",
        "SUPPORTED",
        "",
        {"label": "SUPPORTED"},
    ) == []


def test_missing_final_decision_is_rejected():
    errors = reviewer_submission_errors("John", None, "", {"label": "SUPPORTED"})
    assert "Choose a final decision." in errors


def test_invalid_final_decision_is_rejected():
    errors = reviewer_submission_errors("John", "MAYBE", "", None)
    assert "Choose a final decision." in errors
