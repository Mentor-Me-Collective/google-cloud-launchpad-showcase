"""
Teacher-only endpoints for AI-assisted lesson drafting (Gemini) and fact checking (Nemotron).

Mount inside the LearnLite API (preferred), using the backend's existing auth dependency:

    from ai_content_api import build_router, install_error_handlers
    app.include_router(build_router(get_current_user=get_current_user), prefix="/api/v1")
    install_error_handlers(app)   # optional: contract-format errors

get_current_user is the backend's dependency that verifies the Firebase ID token and returns the
user (decoded token dict, dataclass or Pydantic model). This router then requires the custom
claim role == "teacher". If the backend already has a teacher-only dependency, pass
require_teacher=... instead and its decision is used as-is.

Endpoints (all under /teacher/ai-content):
    POST   /drafts                                  draft a lesson with Gemini from approved sources
    GET    /drafts                                  list my drafts (paginated)
    GET    /drafts/{draftId}                        one draft with blocks, claims and checker results
    POST   /drafts/{draftId}/check                  check all (or some) blocks with Nemotron
    PATCH  /drafts/{draftId}/blocks/{blockKey}      edit a block (clears its check)
    POST   /drafts/{draftId}/blocks/{blockKey}/approve
    POST   /drafts/{draftId}/blocks/{blockKey}/remove
    POST   /drafts/{draftId}/blocks/{blockKey}/restore
    POST   /drafts/{draftId}/export                 approved Lesson in contract format + audit record
"""
from __future__ import annotations

import asyncio
import datetime as dt
import uuid
from typing import Any, Callable

from fastapi import APIRouter, Depends, Query

from . import pipeline as pl
from .auth import adapt_user, check_runtime_config
from .errors import ApiError
from .schemas import BlockPatch, CheckRequest, Decision, DraftCreate, ExportRequest
from .store import get_store


def _now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _uid(user: Any) -> str:
    return adapt_user(user).uid


def _name(user: Any) -> str:
    return adapt_user(user).name


def _view(draft: dict) -> dict:
    """What the teacher sees: the draft plus review counts."""
    out = dict(draft)
    out["counts"] = pl.review_counts(draft["blocks"])
    return out


def _load(draft_id: str, user: Any) -> dict:
    draft = get_store().get(draft_id)
    if not draft or draft["ownerId"] != _uid(user):  # do not reveal other teachers' drafts
        raise ApiError(404, "DRAFT_NOT_FOUND", "This draft does not exist or is not yours.")
    if draft["status"] == "exported":
        raise ApiError(409, "DRAFT_EXPORTED", "This draft was already exported. Start a new draft to change it.")
    return draft


def _save(draft: dict) -> dict:
    draft["updatedAt"] = _now()
    draft["version"] = draft.get("version", 1) + 1
    get_store().put(draft)
    return _view(draft)


def _block(draft: dict, key: str) -> dict:
    for b in draft["blocks"]:
        if b["contentKey"] == key:
            return b
    raise ApiError(404, "BLOCK_NOT_FOUND", "No block with this key in the draft.", {"blockKey": key})


def _apply_patch(block: dict, patch: BlockPatch, source_ids: set) -> None:
    p = patch.model_dump(exclude_none=True)
    if not p:
        raise ApiError(400, "VALIDATION_ERROR", "Nothing to change.")
    if "source_id" in p and p["source_id"] not in source_ids:
        raise ApiError(400, "VALIDATION_ERROR", "Unknown source.", {"field": "sourceId"})
    theory_only, activity_only = {"body"}, {"prompt", "options", "correct_index", "correct_bool", "categories", "explanation"}
    if block["kind"] == "theory" and activity_only & p.keys():
        raise ApiError(400, "VALIDATION_ERROR", "Theory blocks have no activity fields.", {"fields": sorted(activity_only & p.keys())})
    if block["kind"] == "activity" and theory_only & p.keys():
        raise ApiError(400, "VALIDATION_ERROR", "Activity blocks have no body.", {"field": "body"})
    if "title" in p:
        block["title"] = p["title"].strip()
    if "body" in p:
        block["body"] = p["body"].strip()
    if block["kind"] == "activity":
        act, t = block["activity"], block["activity"]["type"]
        for k in ("prompt", "explanation"):
            if k in p:
                act[k] = p[k].strip()
        if t == "multiple-choice":
            if "options" in p:
                act["options"] = [o.strip() for o in p["options"]]
            if "correct_index" in p:
                act["correctIndex"] = p["correct_index"]
        elif t == "true-false" and "correct_bool" in p:
            act["correctBool"] = p["correct_bool"]
        elif t == "classify" and "categories" in p:
            act["categories"] = [{"name": c["name"].strip(), "items": [i.strip() for i in c["items"]]} for c in p["categories"]]
        wrong = {"multiple-choice": {"correct_bool", "categories"}, "true-false": {"options", "correct_index", "categories"},
                 "classify": {"options", "correct_index", "correct_bool"}}[t] & p.keys()
        if wrong:
            raise ApiError(400, "VALIDATION_ERROR", f"Fields not used by {t} activities.", {"fields": sorted(wrong)})
    if "source_id" in p:
        block["sourceId"] = p["source_id"]
    if "claims" in p:
        block["claims"] = [c.strip() for c in p["claims"] if c.strip()]
    problems = pl.block_problems(block, source_ids)
    contract_problems = [x for x in problems if not x.startswith(("No claims", "Cites a source"))]
    if contract_problems:
        raise ApiError(422, "INVALID_BLOCK", "The edited block does not match the content rules.", {"problems": contract_problems})
    if block["check"]["status"] == "checked":
        block["review"]["edited_after_check"] = True
    if block["review"]["status"] == "approved":
        block["review"]["status"] = "pending"


def _teacher_from(get_current_user: Callable) -> Callable:
    """Wrap the host's sign-in dependency with the teacher rule (custom claim role == "teacher")."""
    def require_teacher_claim(user=Depends(get_current_user)):
        u = adapt_user(user)
        if not u.is_teacher:
            raise ApiError(403, "FORBIDDEN", "Only teachers can use the AI content tools.")
        return u
    return require_teacher_claim


def build_router(get_current_user: Callable | None = None, require_teacher: Callable | None = None) -> APIRouter:
    """Create the router.

    get_current_user: the host API's dependency returning the verified Firebase user; teacher is
                      then decided here from the custom claim. (Preferred for integration.)
    require_teacher:  the host API's own teacher-only dependency, used as-is.
    Neither:          standalone mode, Firebase verification in auth.py.
    Raises RuntimeError if a test-only switch (AUTH_MODE=dev, LEARNLITE_MOCK) is on outside local/test.
    """
    check_runtime_config()
    if get_current_user and require_teacher:
        raise ValueError("Pass get_current_user or require_teacher, not both.")
    if get_current_user:
        require_teacher = _teacher_from(get_current_user)
    elif require_teacher is None:
        from .auth import require_teacher as default_dep
        require_teacher = default_dep
    teacher = Depends(require_teacher)
    r = APIRouter(prefix="/teacher/ai-content", tags=["ai-content"])

    @r.get("/status")
    def status(user=teacher):
        """Which AI services are configured (never returns keys)."""
        return {"drafting": {"route": pl.gemini_backend(), "model": pl.GEMINI_MODEL},
                "checking": {"ready": pl.nemotron_ready(), "model": pl.NEMOTRON_MODEL},
                "mock": pl.mock_mode()}

    @r.post("/drafts", status_code=201)
    async def create_draft(body: DraftCreate, user=teacher):
        if pl.gemini_backend() == "missing":
            raise ApiError(503, "AI_NOT_CONFIGURED", "Gemini is not configured on the server.")
        meta = {"lesson_key": body.lesson_key, "position": body.position, "title": body.title,
                "objective": body.objective, "minutes": body.minutes}
        sources = [{"source_id": s.source_id, "title": s.title, "publisher": s.publisher, "url": s.url,
                    "reuse": s.reuse, "text": s.text} for s in body.sources]
        try:
            blocks = await asyncio.to_thread(pl.draft_lesson, meta, sources, body.counts.as_styles())
        except ValueError as exc:
            raise ApiError(422, "DRAFT_FAILED", str(exc))
        except Exception:
            raise ApiError(502, "AI_UNAVAILABLE", "The drafting service did not respond. Try again.")
        now = _now()
        draft = {"draftId": f"draft_{uuid.uuid4().hex}", "ownerId": _uid(user), "status": "in_review",
                 "meta": meta, "sources": pl.clean_sources(sources), "blocks": blocks,
                 "createdAt": now, "updatedAt": now, "version": 1}
        get_store().put(draft)
        return _view(draft)

    @r.get("/drafts")
    def list_drafts(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
                    user=teacher):
        rows, total = get_store().list_for_owner(_uid(user), page_size, (page - 1) * page_size)
        data = [{"draftId": d["draftId"], "status": d["status"], "lessonKey": d["meta"]["lesson_key"],
                 "title": d["meta"]["title"], "counts": pl.review_counts(d["blocks"]), "updatedAt": d["updatedAt"]}
                for d in rows]
        return {"data": data, "pagination": {"page": page, "pageSize": page_size, "total": total,
                                             "hasNext": page * page_size < total}}

    @r.get("/drafts/{draft_id}")
    def get_draft(draft_id: str, user=teacher):
        draft = get_store().get(draft_id)
        if not draft or draft["ownerId"] != _uid(user):
            raise ApiError(404, "DRAFT_NOT_FOUND", "This draft does not exist or is not yours.")
        return _view(draft)

    @r.post("/drafts/{draft_id}/check")
    async def check(draft_id: str, body: CheckRequest | None = None, user=teacher):
        draft = _load(draft_id, user)
        if not pl.nemotron_ready():
            raise ApiError(503, "AI_NOT_CONFIGURED", "The Nemotron checker is not configured on the server.")
        keys = set(body.block_keys) if body and body.block_keys else None
        if keys:
            unknown = keys - {b["contentKey"] for b in draft["blocks"]}
            if unknown:
                raise ApiError(404, "BLOCK_NOT_FOUND", "Unknown block keys.", {"blockKeys": sorted(unknown)})
        draft["blocks"] = await asyncio.to_thread(pl.check_blocks, draft["blocks"], draft["sources"], keys)
        return _save(draft)

    @r.patch("/drafts/{draft_id}/blocks/{block_key}")
    def edit_block(draft_id: str, block_key: str, body: BlockPatch, user=teacher):
        draft = _load(draft_id, user)
        b = _block(draft, block_key)
        if b["review"]["status"] == "removed":
            raise ApiError(409, "BLOCK_REMOVED", "Restore the block before editing it.")
        _apply_patch(b, body, {s["source_id"] for s in draft["sources"]})
        return _save(draft)

    @r.post("/drafts/{draft_id}/blocks/{block_key}/approve")
    def approve(draft_id: str, block_key: str, body: Decision | None = None, user=teacher):
        draft = _load(draft_id, user)
        b = _block(draft, block_key)
        note = body.note if body else ""
        if b["review"]["status"] == "removed":
            raise ApiError(409, "BLOCK_REMOVED", "Restore the block before approving it.")
        ok, why = pl.can_approve(b, note)
        if not ok:
            code = "CHECK_REQUIRED" if "Check this block" in why else "REVIEW_NOTE_REQUIRED"
            raise ApiError(409, code, why, {"verdict": b["check"].get("verdict")})
        b["review"].update(status="approved", note=note, decidedBy=_uid(user), decidedAt=_now())
        return _save(draft)

    @r.post("/drafts/{draft_id}/blocks/{block_key}/remove")
    def remove(draft_id: str, block_key: str, body: Decision | None = None, user=teacher):
        draft = _load(draft_id, user)
        b = _block(draft, block_key)
        b["review"].update(status="removed", note=body.note if body else "", decidedBy=_uid(user), decidedAt=_now())
        return _save(draft)

    @r.post("/drafts/{draft_id}/blocks/{block_key}/restore")
    def restore(draft_id: str, block_key: str, user=teacher):
        draft = _load(draft_id, user)
        _block(draft, block_key)["review"]["status"] = "pending"
        return _save(draft)

    @r.post("/drafts/{draft_id}/export")
    def export(draft_id: str, body: ExportRequest | None = None, user=teacher):
        draft = _load(draft_id, user)
        body = body or ExportRequest()
        approver = (body.approver_name or _name(user) or _uid(user)).strip()
        try:
            lesson, audit = pl.export_lesson(draft["meta"], draft["blocks"], draft["sources"], approver,
                                             body.content_version)
        except ValueError as exc:
            raise ApiError(409, "REVIEW_INCOMPLETE", str(exc), pl.review_counts(draft["blocks"]))
        probe = pl.new_module("Check", "Check", "check")
        probe["sources"] = pl.module_sources(draft["sources"], {b["sourceId"] for b in lesson["blocks"]})
        probe["lessons"] = [dict(lesson, position=0)]
        errors = pl.validate(probe)
        if errors:
            raise ApiError(422, "INVALID_LESSON", "The lesson does not match the backend contract.", {"errors": errors})
        audit["approvedByUid"] = _uid(user)
        audit["contractMode"] = body.contract_mode
        audit["lessonBlocks"] = [{"position": b["position"], "contentKey": b["contentKey"],
                                  "sourceId": b["sourceId"], "reviewedBy": b["reviewedBy"]} for b in lesson["blocks"]]
        if body.contract_mode == "strict":
            lesson = pl.strict_lesson(lesson)
        draft.update(status="exported", exportedAt=_now(), audit=audit)
        _save(draft)
        return {"lesson": lesson, "sources": probe["sources"], "audit": audit}

    return r
