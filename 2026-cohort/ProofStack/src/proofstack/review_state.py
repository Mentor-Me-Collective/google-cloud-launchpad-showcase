from proofstack import LABELS


def assessment_matches_case(context, question_id: str, evidence_id: str) -> bool:
    """Return True only when an assessment belongs to the selected review case."""
    if not isinstance(context, dict):
        return False
    return (
        context.get("question_id") == question_id
        and context.get("evidence_id") == evidence_id
    )


def reviewer_submission_errors(
    reviewer: str,
    reviewer_label: str,
    notes: str,
    assessment: dict | None = None,
) -> list[str]:
    """Validate only the minimum traceability rules for a human decision."""
    errors = []
    reviewer = str(reviewer or "").strip()
    notes = str(notes or "").strip()

    if not reviewer:
        errors.append("Reviewer name is required.")
    if reviewer_label not in LABELS:
        errors.append("Choose a final decision.")

    model_label = ""
    if isinstance(assessment, dict):
        model_label = str(assessment.get("label", "")).strip().upper()

    if (
        model_label in LABELS
        and reviewer_label in LABELS
        and reviewer_label != model_label
        and not notes
    ):
        errors.append("Reviewer notes are required when overriding the model assessment.")

    return errors
