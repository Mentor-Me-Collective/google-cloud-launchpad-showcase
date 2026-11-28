from enum import Enum

from pydantic import BaseModel, Field


class Label(str, Enum):
    SUPPORTED = "SUPPORTED"
    UNSUPPORTED = "UNSUPPORTED"


class Question(BaseModel):
    question_id: str
    question: str
    claim: str
    reviewer_friendly_question: str = ""
    reviewer_hint: str = ""


class EvidenceRecord(BaseModel):
    evidence_id: str
    question_id: str
    title: str
    artifact_type: str
    path: str


class ModelAssessment(BaseModel):
    label: str
    rationale: str = ""
    cited_excerpt: str = ""
    parse_status: str = "ok"
    raw: str = ""


class ReviewerDecision(BaseModel):
    question_id: str
    evidence_id: str
    model_label: str
    reviewer_label: Label
    reviewer: str = ""
    notes: str = ""
    timestamp_utc: str = Field(default="")
