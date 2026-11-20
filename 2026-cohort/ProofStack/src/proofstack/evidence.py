import os
import re


INSTRUCTION_PATTERNS = (
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"ignore\s+(all\s+)?prior\s+instructions",
    r"system\s+prompt",
    r"developer\s+message",
    r"you\s+are\s+now",
    r"act\s+as\s+",
    r"reveal\s+(the\s+)?(system|developer)\s+(prompt|message)",
    r"return\s+supported",
    r"return\s+unsupported",
    r"mark\s+(this\s+)?(as\s+)?supported",
    r"mark\s+(this\s+)?(as\s+)?unsupported",
)


def normalize_text(value: str) -> str:
    """Collapse whitespace for stable citation comparison."""
    return re.sub(r"\s+", " ", str(value or "")).strip()


def citation_is_grounded(cited_excerpt: str, evidence_text: str) -> bool:
    """Return True only when the cited excerpt is actually present in the evidence."""
    excerpt = normalize_text(cited_excerpt)
    evidence = normalize_text(evidence_text)
    if not excerpt or not evidence:
        return False
    return excerpt in evidence


def instruction_like_signals(evidence_text: str) -> list[str]:
    """Identify instruction-like text inside evidence for reviewer visibility."""
    text = str(evidence_text or "")
    hits = []
    for pattern in INSTRUCTION_PATTERNS:
        if re.search(pattern, text, flags=re.I):
            hits.append(pattern)
    return hits


def validate_evidence_size(evidence_text: str, max_chars: int | None = None) -> str:
    """Fail closed when evidence exceeds the configured model-input boundary."""
    text = str(evidence_text or "")
    if max_chars is None:
        max_chars = int(os.getenv("PROOFSTACK_MAX_EVIDENCE_CHARS", "20000"))
    if max_chars <= 0:
        raise ValueError("PROOFSTACK_MAX_EVIDENCE_CHARS must be greater than zero")
    if len(text) > max_chars:
        raise ValueError(
            f"Evidence is {len(text)} characters; the configured limit is {max_chars}. "
            "Review or reduce the evidence before sending it to a model."
        )
    return text
