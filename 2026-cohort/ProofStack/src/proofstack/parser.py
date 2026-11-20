import json
import re

from proofstack import LABELS, UNPARSEABLE
from proofstack.schema import ModelAssessment

# Non-JSON fallback accepts only an explicit label on its own line ("UNSUPPORTED",
# "Label: SUPPORTED"). A label word inside prose is never used, because
# "the evidence does not show the claim is SUPPORTED" must not become SUPPORTED.
_LABEL_RE = re.compile(
    r"^\W*(?:label\W*)?(SUPPORTED|UNSUPPORTED)\W*$", flags=re.I | re.M
)
_JSON_BLOCK_RE = re.compile(r"\{[^{}]*\}", flags=re.S)


def _valid(label):
    value = str(label or "").strip().upper().replace(" ", "_")
    return value if value in LABELS else None


def _assessment_from_obj(obj: dict, raw: str, parse_status: str):
    label = _valid(obj.get("label"))
    if not label:
        return None
    return ModelAssessment(
        label=label,
        rationale=str(obj.get("rationale", "")).strip(),
        cited_excerpt=str(obj.get("cited_excerpt", "")).strip(),
        parse_status=parse_status,
        raw=raw,
    )


def _invalid_label(raw: str) -> ModelAssessment:
    """JSON with a label outside LABELS must not fall through to word matching."""
    return ModelAssessment(
        label=UNPARSEABLE,
        rationale=raw[:500],
        parse_status="invalid_label",
        raw=raw,
    )


def parse_model_output(text: str) -> ModelAssessment:
    """Parse model output without silently converting ambiguity into a valid label."""
    raw = str(text or "").strip()
    if not raw:
        return ModelAssessment(
            label=UNPARSEABLE,
            parse_status="empty",
            raw=raw,
        )

    try:
        obj = json.loads(raw)
        if isinstance(obj, dict):
            parsed = _assessment_from_obj(obj, raw, "json")
            if parsed:
                return parsed
            if "label" in obj:
                return _invalid_label(raw)
    except json.JSONDecodeError:
        pass

    for match in _JSON_BLOCK_RE.finditer(raw):
        snippet = match.group(0)
        try:
            obj = json.loads(snippet)
        except json.JSONDecodeError:
            try:
                obj = json.loads(snippet.replace("'", '"'))
            except json.JSONDecodeError:
                continue

        if isinstance(obj, dict):
            parsed = _assessment_from_obj(obj, raw, "json_embedded")
            if parsed:
                return parsed
            if "label" in obj:
                return _invalid_label(raw)

    labels = {_valid(value) for value in _LABEL_RE.findall(raw)}
    labels.discard(None)
    if len(labels) == 1:
        return ModelAssessment(
            label=next(iter(labels)),
            rationale=raw[:500],
            parse_status="label_regex",
            raw=raw,
        )

    return ModelAssessment(
        label=UNPARSEABLE,
        rationale=raw[:500],
        parse_status="unparseable",
        raw=raw,
    )
