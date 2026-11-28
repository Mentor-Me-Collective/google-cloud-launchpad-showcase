"""Lessons made of ordered blocks: models, validation (contract section 7) and grading.

A block is one piece of lesson content: theory, material, link or activity.
An activity has one of six types. The server keeps the solution and grades answers.
"""
from __future__ import annotations

import re
from typing import Any, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ActivityType = Literal[
    "multiple-choice", "true-false", "match-pairs", "order-steps", "fill-blanks", "classify"
]
BlockKind = Literal["theory", "material", "link", "activity"]

# Fields a student must never receive before answering.
SECRET_ACTIVITY_FIELDS = ("correctIndex", "correctBool", "answers", "explanation")


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Pair(Strict):
    left: str = Field(min_length=1, max_length=300)
    right: str = Field(min_length=1, max_length=300)


class Category(Strict):
    name: str = Field(min_length=1, max_length=120)
    items: list[str] = Field(default_factory=list, max_length=30)


def _clean(value: str) -> str:
    return " ".join(value.split()).casefold()


class ActivityDef(Strict):
    type: ActivityType
    instruction: str | None = Field(default=None, max_length=500)
    prompt: str = Field(min_length=1, max_length=2000)
    options: list[str] | None = Field(default=None, max_length=10)
    correctIndex: int | None = Field(default=None, ge=0)
    correctBool: bool | None = None
    answers: list[str] | None = Field(default=None, max_length=20)
    pairs: list[Pair] | None = Field(default=None, max_length=12)
    steps: list[str] | None = Field(default=None, max_length=12)
    categories: list[Category] | None = Field(default=None, max_length=8)
    explanation: str = Field(default="", max_length=2000)
    hint: str | None = Field(default=None, max_length=500)
    xp: int = Field(default=10, ge=0, le=1000)

    @model_validator(mode="after")
    def check_type_rules(self) -> "ActivityDef":
        t = self.type
        if t == "multiple-choice":
            options = [o.strip() for o in (self.options or [])]
            if len(options) < 2 or any(not o for o in options):
                raise ValueError("multiple-choice needs at least two non-empty options")
            if self.correctIndex is None or self.correctIndex >= len(options):
                raise ValueError("correctIndex must point to one of the options")
        elif t == "true-false":
            if self.correctBool is None:
                raise ValueError("true-false needs correctBool")
        elif t == "match-pairs":
            pairs = self.pairs or []
            if len(pairs) < 2:
                raise ValueError("match-pairs needs at least two pairs")
            lefts = [_clean(p.left) for p in pairs]
            if len(set(lefts)) != len(lefts):
                raise ValueError("match-pairs left sides must be unique")
        elif t == "order-steps":
            steps = [s.strip() for s in (self.steps or [])]
            if len(steps) < 2 or any(not s for s in steps):
                raise ValueError("order-steps needs at least two non-empty steps")
            if len({_clean(s) for s in steps}) != len(steps):
                raise ValueError("order-steps steps must be unique")
        elif t == "fill-blanks":
            answers = [a.strip() for a in (self.answers or [])]
            if not answers or any(not a for a in answers):
                raise ValueError("fill-blanks needs at least one valid answer")
        elif t == "classify":
            categories = self.categories or []
            if len(categories) < 2:
                raise ValueError("classify needs at least two categories")
            if len({_clean(c.name) for c in categories}) != len(categories):
                raise ValueError("classify category names must be unique")
            items = [_clean(i) for c in categories for i in c.items]
            if not items:
                raise ValueError("classify needs items")
            if len(set(items)) != len(items):
                raise ValueError("each classify item must belong to exactly one category")
        return self


class BlockFields(Strict):
    """Everything a block can carry. Extension fields are optional and stored as is."""

    kind: BlockKind
    title: str = Field(min_length=1, max_length=200)
    body: str | None = Field(default=None, max_length=20000)
    imageDescription: str | None = Field(default=None, max_length=500)
    lumiComment: str | None = Field(default=None, max_length=1000)
    attachAsSupport: bool | None = None
    fileName: str | None = Field(default=None, max_length=200)
    fileSize: str | None = Field(default=None, max_length=40)
    url: str | None = Field(default=None, max_length=1000)
    activity: ActivityDef | None = None
    # Optional extension fields (content team): never required, ignored by the app for now.
    contentKey: str | None = Field(default=None, max_length=80)
    sourceId: str | None = Field(default=None, max_length=80)
    reviewedBy: str | None = Field(default=None, max_length=120)
    illustrative: bool | None = None
    aiChoices: list[dict[str, Any]] | None = Field(default=None, max_length=20)
    tokenExamples: list[dict[str, Any]] | None = Field(default=None, max_length=20)
    sliderSettings: list[dict[str, Any]] | None = Field(default=None, max_length=20)

    @field_validator("url")
    @classmethod
    def only_web_links(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        parsed = urlparse(value.strip())
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("url must be an http(s) link")
        return value.strip()

    @model_validator(mode="after")
    def check_kind(self) -> "BlockFields":
        if self.kind == "activity" and self.activity is None:
            raise ValueError("activity blocks need an activity")
        if self.kind != "activity" and self.activity is not None:
            raise ValueError("only activity blocks can have an activity")
        if self.kind == "link" and not self.url:
            raise ValueError("link blocks need a url")
        return self


class BlockInput(BlockFields):
    position: int | None = Field(default=None, ge=0)


class BlockPatch(Strict):
    """Partial update. The merged block is validated again as a whole."""

    kind: BlockKind | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    body: str | None = None
    imageDescription: str | None = None
    lumiComment: str | None = None
    attachAsSupport: bool | None = None
    fileName: str | None = None
    fileSize: str | None = None
    url: str | None = None
    activity: ActivityDef | None = None
    contentKey: str | None = None
    sourceId: str | None = None
    reviewedBy: str | None = None
    illustrative: bool | None = None
    aiChoices: list[dict[str, Any]] | None = None
    tokenExamples: list[dict[str, Any]] | None = None
    sliderSettings: list[dict[str, Any]] | None = None


class LessonSettings(Strict):
    show_feedback: bool | None = None
    counts_as: str | None = Field(default=None, max_length=40)
    badge: str | None = Field(default=None, max_length=80)


class LessonImport(Strict):
    title: str = Field(min_length=1, max_length=150)
    position: int | None = Field(default=None, ge=0)
    objective: str | None = Field(default=None, max_length=500)
    minutes: int | None = Field(default=None, ge=0, le=600)
    contentKey: str | None = Field(default=None, max_length=80)
    settings: LessonSettings | None = None
    blocks: list[BlockInput] = Field(default_factory=list, max_length=200)


class ModuleImport(Strict):
    """Whole module in the contract format (see content/module1_module.json).

    status/version are accepted but ignored: an imported module always starts as a draft.
    """

    title: str = Field(min_length=1, max_length=150)
    subject: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)
    subtitle: str | None = Field(default=None, max_length=300)
    language: str | None = Field(default=None, max_length=10)
    audience: str | None = Field(default=None, max_length=200)
    contentKey: str | None = Field(default=None, max_length=80)
    contentVersion: str | int | None = None
    sources: list[dict[str, Any]] | None = Field(default=None, max_length=50)
    status: str | None = None
    version: int | str | None = None
    lessons: list[LessonImport] = Field(max_length=100)

    @model_validator(mode="after")
    def limit_total_blocks(self) -> "ModuleImport":
        if sum(len(lesson.blocks) for lesson in self.lessons) > 600:
            raise ValueError("A module can have at most 600 blocks")
        return self


# --------------------------------------------------------------------------
# Student view and grading
# --------------------------------------------------------------------------
def student_block(block: dict) -> dict:
    """The block as a student receives it: no correct answer and no explanation."""
    out = dict(block)
    activity = out.get("activity")
    if activity:
        out["activity"] = {k: v for k, v in activity.items() if k not in SECRET_ACTIVITY_FIELDS}
    return out


class AnswerError(ValueError):
    """The answer payload does not match the activity type."""


def _text(value: Any) -> str:
    if not isinstance(value, str):
        raise AnswerError("Expected text")
    return " ".join(value.split()).casefold()


def _strip_accents(value: str) -> str:
    import unicodedata

    return "".join(c for c in unicodedata.normalize("NFD", value) if unicodedata.category(c) != "Mn")


def grade_answer(activity: dict, answer: Any) -> bool:
    """Return True/False, or raise AnswerError when the payload shape is wrong."""
    if not isinstance(answer, dict):
        raise AnswerError("answer must be an object")
    t = activity["type"]
    if t == "multiple-choice":
        index = answer.get("selectedIndex")
        if isinstance(index, bool) or not isinstance(index, int):
            raise AnswerError("selectedIndex must be a number")
        if not 0 <= index < len(activity.get("options") or []):
            raise AnswerError("selectedIndex is out of range")
        return index == activity["correctIndex"]
    if t == "true-false":
        value = answer.get("value")
        if not isinstance(value, bool):
            raise AnswerError("value must be true or false")
        return value == activity["correctBool"]
    if t == "match-pairs":
        matches = answer.get("matches")
        if not isinstance(matches, list):
            raise AnswerError("matches must be a list")
        expected = {_text(p["left"]): _text(p["right"]) for p in activity["pairs"]}
        given: dict[str, str] = {}
        for m in matches:
            if not isinstance(m, dict):
                raise AnswerError("each match must be an object")
            left, right = _text(m.get("left")), _text(m.get("right"))
            if left not in expected:
                raise AnswerError("unknown item in matches")
            if left in given:
                raise AnswerError("duplicate item in matches")
            given[left] = right
        if len(given) != len(expected):
            raise AnswerError("every pair must be matched")
        return given == expected
    if t == "order-steps":
        order = answer.get("order")
        if not isinstance(order, list):
            raise AnswerError("order must be a list")
        given_steps = [_text(s) for s in order]
        expected_steps = [_text(s) for s in activity["steps"]]
        if sorted(given_steps) != sorted(expected_steps):
            raise AnswerError("order must contain every step exactly once")
        return given_steps == expected_steps
    if t == "fill-blanks":
        raw = answer.get("values", answer.get("value"))
        value = raw[0] if isinstance(raw, list) and len(raw) == 1 else raw
        if isinstance(value, list):
            raise AnswerError("only one blank is supported")
        given_text = _strip_accents(_text(value))
        return any(_strip_accents(_text(a)) == given_text for a in activity["answers"])
    if t == "classify":
        assignments = answer.get("assignments")
        if not isinstance(assignments, list):
            raise AnswerError("assignments must be a list")
        expected_map = {
            _text(item): _text(cat["name"]) for cat in activity["categories"] for item in cat["items"]
        }
        given_map: dict[str, str] = {}
        for entry in assignments:
            if not isinstance(entry, dict):
                raise AnswerError("each assignment must be an object")
            item, category = _text(entry.get("item")), _text(entry.get("category"))
            if item not in expected_map:
                raise AnswerError("unknown item in assignments")
            if item in given_map:
                raise AnswerError("duplicate item in assignments")
            given_map[item] = category
        if len(given_map) != len(expected_map):
            raise AnswerError("every item must be classified")
        return given_map == expected_map
    raise AnswerError("Unsupported activity type")


SLUG = re.compile(r"[^a-z0-9]+")


def email_key(email: str) -> str:
    """Stable document id for an e-mail address."""
    return SLUG.sub("-", email.strip().lower()).strip("-")[:120]
