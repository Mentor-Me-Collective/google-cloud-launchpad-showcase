"""Phase 3: teacher-owned classrooms and student memberships.

Register with ``app.include_router(classroom_router(get_current_user, get_db, profile_for))``.
All persistent writes are server-authorized; no client-provided owner or role is trusted.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Callable

from fastapi import APIRouter, Depends, HTTPException, status
from google.api_core.exceptions import AlreadyExists, Conflict
from google.cloud import firestore
from pydantic import BaseModel, ConfigDict, Field

from app.common import targets_student

ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"  # Unambiguous symbols


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def new_join_code() -> str:
    # 12 characters selected with a cryptographic RNG; 60+ bits of entropy.
    return "LL-" + "".join(secrets.choice(ALPHABET) for _ in range(12))


def clean_code(value: str) -> str:
    return "".join(value.upper().split())


class CreateClassroom(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    grade: str = Field(min_length=1, max_length=80)
    subject: str = Field(min_length=1, max_length=120)
    color: str = Field(default="#2F6BFF", pattern=r"^#[0-9a-fA-F]{6}$")
    allowJoinByCode: bool = True


class UpdateClassroom(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=120)
    grade: str | None = Field(default=None, min_length=1, max_length=80)
    subject: str | None = Field(default=None, min_length=1, max_length=120)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    allowJoinByCode: bool | None = None


class JoinClassroom(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=4, max_length=40)


def classroom_router(get_current_user: Callable, get_db: Callable, profile_for: Callable) -> APIRouter:
    router = APIRouter(prefix="/api/v1", tags=["classrooms"])

    def current_teacher(user=Depends(get_current_user), db=Depends(get_db)):
        profile = profile_for(user, db)
        if profile["role"] != "teacher":
            raise HTTPException(403, "Teacher role required")
        return user

    def current_student(user=Depends(get_current_user), db=Depends(get_db)):
        profile = profile_for(user, db)
        if profile["role"] != "student":
            raise HTTPException(403, "Student role required")
        return user

    def owned_classroom(db, classroom_id: str, teacher_uid: str):
        snap = db.collection("classrooms").document(classroom_id).get()
        if not snap.exists:
            raise HTTPException(404, "Classroom not found")
        obj = snap.to_dict()
        if obj.get("ownerId") != teacher_uid:
            # Do not disclose whether a private classroom exists.
            raise HTTPException(404, "Classroom not found")
        return obj

    def count_members(db, classroom_id: str) -> int:
        docs = db.collection("classrooms").document(classroom_id).collection("members").limit(500).stream()
        return sum(1 for d in docs if (d.to_dict() or {}).get("status") == "active")

    def count_assignments(db, classroom_id: str, uid: str) -> int:
        docs = db.collection("classrooms").document(classroom_id).collection("assignments").limit(100).stream()
        return sum(
            1 for d in docs
            if (d.to_dict() or {}).get("status") == "published" and targets_student(d.to_dict() or {}, uid)
        )

    def student_view(obj: dict) -> dict:
        return {key: obj[key] for key in (
            "id", "name", "grade", "subject", "color", "createdAt", "status"
        ) if key in obj}

    @router.post("/teacher/classrooms", status_code=201)
    def create_classroom(payload: CreateClassroom, teacher=Depends(current_teacher), db=Depends(get_db)):
        uid = teacher["uid"]
        classroom_ref = db.collection("classrooms").document()
        record = {
            "id": classroom_ref.id,
            "ownerId": uid,
            "name": payload.name.strip(),
            "grade": payload.grade.strip(),
            "subject": payload.subject.strip(),
            "color": payload.color,
            "allowJoinByCode": payload.allowJoinByCode,
            "status": "active",
            "createdAt": utc_now(),
            "updatedAt": utc_now(),
        }
        for _ in range(5):
            code = new_join_code()
            code_ref = db.collection("classroom_join_codes").document(code)
            tx = db.transaction()

            @firestore.transactional
            def save(transaction):
                # Fail atomically if a code is already in use.
                transaction.create(code_ref, {"classroomId": classroom_ref.id, "createdAt": record["createdAt"]})
                transaction.create(classroom_ref, {**record, "code": code})

            try:
                save(tx)
                return {**record, "code": code}
            except (AlreadyExists, Conflict):
                continue
        raise HTTPException(503, "Could not allocate classroom code")

    @router.get("/teacher/classrooms")
    def teacher_classrooms(teacher=Depends(current_teacher), db=Depends(get_db)):
        query = db.collection("classrooms").where("ownerId", "==", teacher["uid"]).limit(50)
        items = [snap.to_dict() for snap in query.stream()]
        return {"items": [
            {**x, "studentCount": count_members(db, x["id"])}
            for x in items if x.get("status") == "active"
        ]}

    @router.get("/teacher/classrooms/{classroom_id}")
    def get_teacher_classroom(classroom_id: str, teacher=Depends(current_teacher), db=Depends(get_db)):
        return {
            **owned_classroom(db, classroom_id, teacher["uid"]),
            "studentCount": count_members(db, classroom_id),
        }

    @router.patch("/teacher/classrooms/{classroom_id}")
    def update_teacher_classroom(classroom_id: str, payload: UpdateClassroom, teacher=Depends(current_teacher), db=Depends(get_db)):
        obj = owned_classroom(db, classroom_id, teacher["uid"])
        if obj.get("status") != "active":
            raise HTTPException(409, "Classroom is archived")
        changes = payload.model_dump(exclude_none=True, exclude_unset=True)
        if changes:
            for key in ("name", "grade", "subject"):
                if key in changes:
                    changes[key] = changes[key].strip()
            changes["updatedAt"] = utc_now()
            # Ownership is rechecked above; production concurrency/version checks are still required.
            db.collection("classrooms").document(classroom_id).update(changes)
        return owned_classroom(db, classroom_id, teacher["uid"])

    @router.post("/teacher/classrooms/{classroom_id}/rotate-code")
    def rotate_code(classroom_id: str, teacher=Depends(current_teacher), db=Depends(get_db)):
        for _ in range(5):
            code = new_join_code()
            doc_ref = db.collection("classrooms").document(classroom_id)
            code_ref = db.collection("classroom_join_codes").document(code)
            tx = db.transaction()

            @firestore.transactional
            def rotate(transaction):
                snap = doc_ref.get(transaction=transaction)
                if not snap.exists or snap.to_dict().get("ownerId") != teacher["uid"]:
                    raise HTTPException(404, "Classroom not found")
                obj = snap.to_dict()
                if obj.get("status") != "active":
                    raise HTTPException(409, "Classroom is archived")
                old_code = obj.get("code")
                transaction.create(code_ref, {"classroomId": classroom_id, "createdAt": utc_now()})
                transaction.update(doc_ref, {"code": code, "updatedAt": utc_now()})
                if old_code:
                    transaction.delete(db.collection("classroom_join_codes").document(old_code))

            try:
                rotate(tx)
                return {"code": code}
            except (AlreadyExists, Conflict):
                continue
        raise HTTPException(503, "Could not rotate classroom code")

    @router.post("/me/classrooms/join")
    def join_classroom(payload: JoinClassroom, student=Depends(current_student), db=Depends(get_db)):
        uid = student["uid"]
        code = clean_code(payload.code)
        if not code.startswith("LL-") or len(code) != 15:
            raise HTTPException(404, "Classroom code not found")
        idx_ref = db.collection("classroom_join_codes").document(code)
        tx = db.transaction()

        @firestore.transactional
        def enroll(transaction):
            idx = idx_ref.get(transaction=transaction)
            if not idx.exists:
                raise HTTPException(404, "Classroom code not found")
            classroom_id = idx.to_dict()["classroomId"]
            classroom_ref = db.collection("classrooms").document(classroom_id)
            classroom = classroom_ref.get(transaction=transaction)
            if not classroom.exists:
                raise HTTPException(404, "Classroom not found")
            obj = classroom.to_dict()
            if obj.get("status") != "active" or not obj.get("allowJoinByCode", False):
                raise HTTPException(403, "Classroom is closed for joining")
            if obj.get("code") != code:
                raise HTTPException(404, "Classroom code expired")
            member_ref = classroom_ref.collection("members").document(uid)
            member = member_ref.get(transaction=transaction)
            user_class_ref = db.collection("users").document(uid).collection("classrooms").document(classroom_id)
            if not member.exists:
                joined = utc_now()
                transaction.create(member_ref, {"studentId": uid, "joinedAt": joined, "status": "active"})
                transaction.set(user_class_ref, {"classroomId": classroom_id, "joinedAt": joined, "status": "active"})
                return {"alreadyMember": False, "classroom": student_view(obj)}
            if member.to_dict().get("status") != "active":
                raise HTTPException(409, "Membership needs administrator review")
            return {"alreadyMember": True, "classroom": student_view(obj)}

        # HTTP 200 for both idempotent and first joins in this MVP; see contract note.
        return enroll(tx)

    @router.get("/me/classrooms")
    def student_classrooms(student=Depends(current_student), db=Depends(get_db)):
        memberships = db.collection("users").document(student["uid"]).collection("classrooms").limit(50).stream()
        items = []
        for membership in memberships:
            data = membership.to_dict()
            if data.get("status") != "active":
                continue
            snap = db.collection("classrooms").document(data["classroomId"]).get()
            if snap.exists and snap.to_dict().get("status") == "active":
                items.append({
                    **student_view(snap.to_dict()),
                    "assignmentCount": count_assignments(db, data["classroomId"], student["uid"]),
                })
        return {"items": items}

    return router
