"""Helpers shared by the MVP routers (authoring, members, learner)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable

from fastapi import Depends, HTTPException


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def make_identity(get_current_user: Callable, get_db: Callable, profile_for: Callable) -> Callable:
    """FastAPI dependency returning {"uid", "role"} from the verified token and stored profile."""

    def identity(user=Depends(get_current_user), db=Depends(get_db)):
        profile = profile_for(user, db)
        role = profile.get("role")
        if role not in ("teacher", "student"):
            raise HTTPException(403, "Valid learning role required")
        return {"uid": user["uid"], "role": role}

    return identity


def require_teacher(user: dict) -> None:
    if user["role"] != "teacher":
        raise HTTPException(403, "Teacher role required")


def require_student(user: dict) -> None:
    if user["role"] != "student":
        raise HTTPException(403, "Student role required")


def targets_student(assignment: dict, uid: str) -> bool:
    """An assignment with no studentIds targets the whole classroom."""
    ids = assignment.get("studentIds") or []
    return not ids or uid in ids


def error(code: str, message: str, status: int = 409) -> HTTPException:
    """HTTP error with a stable machine-readable code (see main.http_error)."""
    return HTTPException(status, {"code": code, "message": message})


# --------------------------------------------------------------------------
# Reading lessons with their blocks
# --------------------------------------------------------------------------
def is_after(stamp: str | None, since: str | None) -> bool:
    """True when ISO time `stamp` is later than `since` (both as written by now())."""
    if not stamp or not since:
        return False
    parse = lambda value: datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parse(stamp) > parse(since)


def by_position(items: list[dict]) -> list[dict]:
    return sorted(items, key=lambda item: (item.get("position", 0), item.get("id", "")))


def lesson_blocks(lesson_ref, student: bool = False) -> list[dict]:
    from app.content_models import student_block

    blocks = by_position([s.to_dict() or {} for s in lesson_ref.collection("blocks").limit(300).stream()])
    return [student_block(b) for b in blocks] if student else blocks


def lessons_with_blocks(module_ref, student: bool = False, reveal: bool = False) -> list[dict]:
    """Lessons ordered by position, each with its ordered blocks.

    Students only get published lessons and blocks without solutions. `reveal` keeps the
    solutions (only the offline download uses it).
    """
    lessons = by_position([s.to_dict() or {} for s in module_ref.collection("lessons").limit(200).stream()])
    out = []
    for lesson in lessons:
        if student and lesson.get("status") != "published":
            continue
        ref = module_ref.collection("lessons").document(lesson["id"])
        out.append({**lesson, "blocks": lesson_blocks(ref, student=student and not reveal)})
    return out


# --------------------------------------------------------------------------
# Student statistics (XP, hearts, streak): written only by the server
# --------------------------------------------------------------------------
MAX_HEARTS = 5


def default_stats() -> dict:
    return {
        "xp": 0,
        "hearts": MAX_HEARTS,
        "maxHearts": MAX_HEARTS,
        "streak": 0,
        "lastActiveDate": None,
        "totalAnswers": 0,
        "correctAnswers": 0,
    }


def stats_ref(db, uid: str):
    return db.collection("users").document(uid).collection("stats").document("summary")


def load_stats(db, uid: str) -> dict:
    snap = stats_ref(db, uid).get()
    return {**default_stats(), **((snap.to_dict() or {}) if snap.exists else {})}
