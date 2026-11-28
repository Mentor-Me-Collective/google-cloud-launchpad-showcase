"""Classroom members, invitations, archiving and leaving.

Contract IDs: D-05, D-07, D-08, D-12, D-13, E-03, E-04.
Storage (created by classrooms.py): classrooms/{cid}/members/{uid} and users/{uid}/classrooms/{cid}.
"""
from __future__ import annotations

from typing import Callable

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field, field_validator

from app.common import (
    load_stats,
    make_identity,
    now,
    require_student,
    require_teacher,
    today,
)
from app.content_models import Strict, email_key


class AddMembers(Strict):
    studentIds: list[str] = Field(min_length=1, max_length=100)


class Invitation(Strict):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

    @field_validator("email", mode="before")
    @classmethod
    def trim(cls, value):
        return value.strip() if isinstance(value, str) else value


def yesterday() -> str:
    from datetime import datetime, timedelta, timezone

    return (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()


def short_name(name: str) -> str:
    """"Ana Gomez" -> "Ana G.", "ana.gomez@school.edu" -> "Ana". Classmates never see full names or e-mails."""
    base = name.split("@")[0].replace(".", " ").replace("_", " ").replace("+", " ") if "@" in name else name
    parts = [p for p in base.split() if p]
    if not parts:
        return "Student"
    first = parts[0][:1].upper() + parts[0][1:]
    return f"{first} {parts[1][:1].upper()}." if len(parts) > 1 else first


def learning_status(stats: dict) -> str:
    """Same rule the app uses today for the teacher's student list."""
    answers = stats["totalAnswers"]
    accuracy = round(100 * stats["correctAnswers"] / answers) if answers else 0
    active_today = stats["lastActiveDate"] == today()
    if stats["streak"] == 0:
        return "broken-streak"
    if answers and accuracy < 66:
        return "needs-help"
    if not active_today and stats["streak"] < 3:
        return "at-risk"
    return "on-track"


def members_router(get_current_user: Callable, get_db: Callable, profile_for: Callable) -> APIRouter:
    router = APIRouter(prefix="/api/v1", tags=["members"])
    identity = make_identity(get_current_user, get_db, profile_for)

    def owned_classroom(db, cid: str, user: dict, allow_archived: bool = False):
        require_teacher(user)
        ref = db.collection("classrooms").document(cid)
        snap = ref.get()
        data = (snap.to_dict() or {}) if snap.exists else {}
        if not snap.exists or data.get("ownerId") != user["uid"]:
            raise HTTPException(404, "Classroom not found")
        if data.get("status") != "active" and not allow_archived:
            raise HTTPException(409, "Classroom is archived")
        return ref, data

    def member_view(db, uid: str, membership: dict) -> dict:
        profile = (db.collection("users").document(uid).get().to_dict() or {})
        stats = load_stats(db, uid)
        answers = stats["totalAnswers"]
        return {
            "studentId": uid,
            "name": profile.get("name") or profile.get("email") or "Student",
            "email": profile.get("email", ""),
            "membership": membership.get("status"),
            "joinedAt": membership.get("joinedAt"),
            "xp": stats["xp"],
            "streak": stats["streak"],
            "accuracy": round(100 * stats["correctAnswers"] / answers) if answers else 0,
            "activeToday": stats["lastActiveDate"] == today(),
            "lastActive": stats["lastActiveDate"],
            "status": learning_status(stats),
        }

    def activate(db, cid: str, uid: str) -> bool:
        """Make a student an active member. Returns False if they already were."""
        ref = db.collection("classrooms").document(cid).collection("members").document(uid)
        snap = ref.get()
        stamp = now()
        user_ref = db.collection("users").document(uid).collection("classrooms").document(cid)
        if snap.exists and (snap.to_dict() or {}).get("status") == "active":
            return False
        record = {"studentId": uid, "joinedAt": stamp, "status": "active"}
        ref.set(record) if snap.exists else ref.create(record)
        user_ref.set({"classroomId": cid, "joinedAt": stamp, "status": "active"})
        return True

    # ---- teacher ---------------------------------------------------------
    @router.delete("/teacher/classrooms/{cid}", status_code=204)
    def archive_classroom(cid: str, user=Depends(identity), db=Depends(get_db)):
        """Archive, never hard delete: members keep their history."""
        ref, _ = owned_classroom(db, cid, user, allow_archived=True)
        ref.update({"status": "archived", "updatedAt": now()})

    @router.get("/teacher/classrooms/{cid}/members")
    def list_members(
        cid: str,
        q: str | None = Query(default=None, max_length=80),
        user=Depends(identity),
        db=Depends(get_db),
    ):
        ref, _ = owned_classroom(db, cid, user)
        items = []
        for snap in ref.collection("members").limit(200).stream():
            membership = snap.to_dict() or {}
            if membership.get("status") != "active":
                continue
            items.append(member_view(db, snap.id, membership))
        if q:
            needle = q.strip().casefold()
            items = [i for i in items if needle in i["name"].casefold() or needle in i["email"].casefold()]
        items.sort(key=lambda i: i["name"].casefold())
        return {"items": items}

    @router.post("/teacher/classrooms/{cid}/members")
    def add_members(cid: str, payload: AddMembers, user=Depends(identity), db=Depends(get_db)):
        """Add existing students. Idempotent: students already in the class are reported, not duplicated."""
        _, _ = owned_classroom(db, cid, user)
        ids = list(dict.fromkeys(payload.studentIds))
        for uid in ids:  # validate everything first
            profile = db.collection("users").document(uid).get()
            if not profile.exists or (profile.to_dict() or {}).get("role") != "student":
                raise HTTPException(404, "Student not found")
        added, existing = [], []
        for uid in ids:
            (added if activate(db, cid, uid) else existing).append(uid)
        return {"added": added, "alreadyMembers": existing}

    @router.post("/teacher/classrooms/{cid}/invitations", status_code=201)
    def invite(cid: str, payload: Invitation, user=Depends(identity), db=Depends(get_db)):
        """Add a student by e-mail. If nobody has that e-mail yet, keep a pending invitation."""
        ref, _ = owned_classroom(db, cid, user)
        email = payload.email.strip().lower()
        found = list(db.collection("users").where("email", "==", email).limit(1).stream())
        if found and (found[0].to_dict() or {}).get("role") == "student":
            uid = found[0].to_dict()["id"]
            activate(db, cid, uid)
            return {"email": email, "status": "active", "studentId": uid}
        if found:
            raise HTTPException(409, "That e-mail belongs to a teacher account")
        record = {"email": email, "status": "pending", "invitedBy": user["uid"], "createdAt": now()}
        ref.collection("invitations").document(email_key(email)).set(record)
        return {"email": email, "status": "pending"}

    @router.delete("/teacher/classrooms/{cid}/members/{student_id}", status_code=204)
    def remove_member(cid: str, student_id: str, user=Depends(identity), db=Depends(get_db)):
        """Remove from the class only. Account, XP and history stay with the student."""
        ref, _ = owned_classroom(db, cid, user)
        member = ref.collection("members").document(student_id)
        snap = member.get()
        if not snap.exists or (snap.to_dict() or {}).get("status") != "active":
            raise HTTPException(404, "Member not found")
        member.update({"status": "removed", "removedAt": now()})
        db.collection("users").document(student_id).collection("classrooms").document(cid).set(
            {"classroomId": cid, "status": "removed"}, merge=True
        )

    # ---- student ---------------------------------------------------------
    @router.delete("/me/classrooms/{cid}", status_code=204)
    def leave_classroom(cid: str, user=Depends(identity), db=Depends(get_db)):
        require_student(user)
        member = db.collection("classrooms").document(cid).collection("members").document(user["uid"])
        snap = member.get()
        if not snap.exists or (snap.to_dict() or {}).get("status") != "active":
            raise HTTPException(404, "Classroom not found")
        member.update({"status": "left", "leftAt": now()})
        db.collection("users").document(user["uid"]).collection("classrooms").document(cid).set(
            {"classroomId": cid, "status": "left"}, merge=True
        )

    @router.get("/me/classrooms/{cid}/leaderboard")
    def classroom_leaderboard(cid: str, user=Depends(identity), db=Depends(get_db)):
        """The classroom league: classmates ranked by XP. Only first name and an initial are shown."""
        require_student(user)
        me = db.collection("classrooms").document(cid).collection("members").document(user["uid"]).get()
        room = db.collection("classrooms").document(cid).get()
        if (
            not me.exists
            or (me.to_dict() or {}).get("status") != "active"
            or not room.exists
            or (room.to_dict() or {}).get("status") != "active"
        ):
            raise HTTPException(404, "Classroom not found")
        rows = []
        for snap in db.collection("classrooms").document(cid).collection("members").limit(200).stream():
            if (snap.to_dict() or {}).get("status") != "active":
                continue
            profile = db.collection("users").document(snap.id).get().to_dict() or {}
            stats = load_stats(db, snap.id)
            rows.append({
                "name": short_name(profile.get("name") or profile.get("email") or ""),
                "xp": stats["xp"],
                "streak": stats["streak"] if stats["lastActiveDate"] in (today(), yesterday()) else 0,
                "isMe": snap.id == user["uid"],
            })
        rows.sort(key=lambda r: (-r["xp"], r["name"].casefold()))
        for rank, row in enumerate(rows, start=1):
            row["rank"] = rank
        return {"classroomId": cid, "classroomName": (room.to_dict() or {}).get("name"), "items": rows}

    @router.get("/me/classrooms/{cid}")
    def my_classroom(cid: str, user=Depends(identity), db=Depends(get_db)):
        require_student(user)
        member = db.collection("classrooms").document(cid).collection("members").document(user["uid"]).get()
        if not member.exists or (member.to_dict() or {}).get("status") != "active":
            raise HTTPException(404, "Classroom not found")
        snap = db.collection("classrooms").document(cid).get()
        data = (snap.to_dict() or {}) if snap.exists else {}
        if data.get("status") != "active":
            raise HTTPException(404, "Classroom not found")
        owner = db.collection("users").document(data["ownerId"]).get().to_dict() or {}
        view = {k: data[k] for k in ("id", "name", "grade", "subject", "color", "createdAt", "status") if k in data}
        return {**view, "teacherName": owner.get("name", "")}

    return router
