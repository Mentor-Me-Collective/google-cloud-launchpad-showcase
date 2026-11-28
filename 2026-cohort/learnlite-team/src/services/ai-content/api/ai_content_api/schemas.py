"""Request bodies (camelCase on the wire, as in the backend contract)."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class SourceIn(_Camel):
    source_id: str = Field(min_length=1, max_length=80)
    title: str = Field(default="", max_length=200)
    publisher: str = Field(default="", max_length=120)
    url: str = Field(default="", max_length=500)
    reuse: str = Field(default="", max_length=200)
    text: str = Field(min_length=20, max_length=20000, description="Exact excerpt from the source")


class BlockCounts(_Camel):
    theory: int = Field(default=4, ge=2, le=8)
    multiple_choice: int = Field(default=2, ge=0, le=8)
    true_false: int = Field(default=1, ge=0, le=5)
    spot_the_error: int = Field(default=1, ge=0, le=3)
    classify: int = Field(default=0, ge=0, le=2)

    def as_styles(self) -> dict:
        return {"theory": self.theory, "multiple-choice": self.multiple_choice, "true-false": self.true_false,
                "spot-the-error": self.spot_the_error, "classify": self.classify}


class DraftCreate(_Camel):
    lesson_key: str = Field(min_length=1, max_length=40, pattern=r"^[A-Za-z0-9._-]+$")
    title: str = Field(min_length=3, max_length=120)
    objective: str = Field(min_length=10, max_length=500)
    position: int = Field(default=0, ge=0, le=100)
    minutes: int = Field(default=5, ge=2, le=30)
    sources: list[SourceIn] = Field(min_length=1, max_length=10)
    counts: BlockCounts = Field(default_factory=BlockCounts)


class CheckRequest(_Camel):
    block_keys: list[str] | None = Field(default=None, description="Only these blocks; omit to check all")


class CategoryIn(_Camel):
    name: str = Field(min_length=1, max_length=80)
    items: list[str] = Field(min_length=1, max_length=10)


class BlockPatch(_Camel):
    title: str | None = Field(default=None, max_length=120)
    body: str | None = Field(default=None, max_length=2000)
    prompt: str | None = Field(default=None, max_length=500)
    options: list[str] | None = Field(default=None, min_length=2, max_length=8)
    correct_index: int | None = Field(default=None, ge=0)
    correct_bool: bool | None = None
    categories: list[CategoryIn] | None = Field(default=None, min_length=2, max_length=4)
    explanation: str | None = Field(default=None, max_length=600)
    source_id: str | None = None
    claims: list[str] | None = Field(default=None, max_length=20)


class Decision(_Camel):
    note: str = Field(default="", max_length=1000)


class ExportRequest(_Camel):
    contract_mode: Literal["extended", "strict"] = Field(
        default="extended",
        description="strict = only contract v1.0 core fields; extended = also contentKey, sourceId, reviewedBy, objective, minutes")
    content_version: str = Field(default="0.1.0", max_length=20)
    approver_name: str | None = Field(default=None, max_length=120,
                                      description="Defaults to the signed-in teacher's name")
