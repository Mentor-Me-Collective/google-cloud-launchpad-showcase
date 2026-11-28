"""LearnLite learning modules, lessons and classroom assignments."""

from datetime import datetime, timezone
from typing import Callable

from fastapi import APIRouter, Depends, HTTPException
from google.api_core.exceptions import Conflict
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.common import lessons_with_blocks, targets_student
from app.content_models import LessonSettings


def now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ModuleInput(StrictModel):
    title: str = Field(min_length=1, max_length=150)
    subject: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)

    @field_validator("title", "subject")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field cannot be blank")
        return value


class LessonInput(StrictModel):
    """A lesson. Its content now lives in blocks; `content` is optional legacy text."""

    title: str = Field(min_length=1, max_length=150)
    content: str = Field(default="", max_length=30000)
    position: int | None = Field(default=None, ge=0)  # default: appended at the end
    objective: str | None = Field(default=None, max_length=500)
    minutes: int | None = Field(default=None, ge=0, le=600)
    contentKey: str | None = Field(default=None, max_length=80)
    settings: LessonSettings | None = None


class AssignmentInput(StrictModel):
    title: str = Field(min_length=1, max_length=150)
    instructions: str = Field(min_length=1, max_length=10000)
    moduleId: str | None = None
    dueAt: datetime | None = None


class SubmissionInput(StrictModel):
    answer: str = Field(min_length=1, max_length=30000)


def learning_router(
    get_current_user: Callable,
    get_db: Callable,
    profile_for: Callable,
) -> APIRouter:

    router = APIRouter(prefix="/api/v1", tags=["learning"])

    def identity(user=Depends(get_current_user), db=Depends(get_db)):
        profile = profile_for(user, db)
        role = profile.get("role")
        if role not in ("teacher", "student"):
            raise HTTPException(403, "Valid learning role required")
        return {"uid": user["uid"], "role": role}

    def require_teacher(user):
        if user["role"] != "teacher":
            raise HTTPException(403, "Teacher role required")

    def authorize_classroom(db, cid, user, teacher_only=False):
        snap = db.collection("classrooms").document(cid).get()
        if not snap.exists:
            raise HTTPException(404, "Classroom not found")

        obj = snap.to_dict() or {}
        if obj.get("status") != "active":
            raise HTTPException(404, "Classroom not found")

        if user["role"] == "teacher":
            if obj.get("ownerId") != user["uid"]:
                raise HTTPException(404, "Classroom not found")
        elif teacher_only:
            raise HTTPException(403, "Teacher role required")
        else:
            member = (
                db.collection("classrooms").document(cid)
                .collection("members").document(user["uid"]).get()
            )
            if not member.exists or (
                member.to_dict() or {}
            ).get("status") != "active":
                raise HTTPException(403, "Active enrollment required")

        return obj

    def module_ref(db, mid):
        return db.collection("modules").document(mid)

    def owned_module(db, mid, user):
        require_teacher(user)
        ref = module_ref(db, mid)
        snap = ref.get()
        if not snap.exists:
            raise HTTPException(404, "Module not found")
        data = snap.to_dict() or {}
        if data.get("authorId") != user["uid"]:
            raise HTTPException(404, "Module not found")
        return ref, data

    def assignment_ref(db, cid, aid):
        return (
            db.collection("classrooms").document(cid)
            .collection("assignments").document(aid)
        )

    def visible_module(db, cid, mid, user):
        ref = module_ref(db, mid)
        snap = ref.get()
        if not snap.exists:
            raise HTTPException(404, "Module not found")

        data = snap.to_dict() or {}

        if user["role"] == "teacher":
            if data.get("authorId") != user["uid"]:
                raise HTTPException(404, "Module not found")
            return ref, data

        if data.get("status") != "published":
            raise HTTPException(404, "Module not found")

        assignments = (
            db.collection("classrooms").document(cid)
            .collection("assignments")
            .where("moduleId", "==", mid)
            .limit(100).stream()
        )
        if not any(
            (a.to_dict() or {}).get("status") == "published"
            and targets_student(a.to_dict() or {}, user["uid"])
            for a in assignments
        ):
            raise HTTPException(404, "Module not assigned")

        return ref, data

    # Global teacher-owned modules.

    @router.post("/teacher/modules", status_code=201)
    def create_module(
        payload: ModuleInput,
        user=Depends(identity),
        db=Depends(get_db),
    ):
        require_teacher(user)
        ref = db.collection("modules").document()
        timestamp = now()
        record = {
            "id": ref.id,
            "authorId": user["uid"],
            "title": payload.title.strip(),
            "subject": payload.subject.strip(),
            "description": payload.description.strip(),
            "status": "draft",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        }
        ref.create(record)
        return record

    @router.get("/teacher/modules")
    def teacher_modules(user=Depends(identity), db=Depends(get_db)):
        require_teacher(user)
        docs = (
            db.collection("modules")
            .where("authorId", "==", user["uid"])
            .limit(100).stream()
        )
        return {"items": [doc.to_dict() for doc in docs]}

    @router.post("/teacher/modules/{mid}/lessons", status_code=201)
    def create_lesson(
        mid: str,
        payload: LessonInput,
        user=Depends(identity),
        db=Depends(get_db),
    ):
        parent, _ = owned_module(db, mid, user)
        ref = parent.collection("lessons").document()
        position = payload.position
        if position is None:
            position = len(list(parent.collection("lessons").limit(200).stream()))
        record = {
            "id": ref.id,
            "moduleId": mid,
            "title": payload.title.strip(),
            "content": payload.content.strip(),
            "position": position,
            "status": "published",
            "createdAt": now(),
            **payload.model_dump(
                include={"objective", "minutes", "contentKey", "settings"}, exclude_none=True
            ),
        }
        ref.create(record)
        return {**record, "blocks": []}

    @router.get("/teacher/modules/{mid}/lessons")
    def teacher_lessons(
        mid: str,
        user=Depends(identity),
        db=Depends(get_db),
    ):
        parent, _ = owned_module(db, mid, user)
        return {"items": lessons_with_blocks(parent)}

    @router.post("/teacher/modules/{mid}/publish")
    def publish_module(
        mid: str,
        user=Depends(identity),
        db=Depends(get_db),
    ):
        ref, module = owned_module(db, mid, user)
        lessons = lessons_with_blocks(ref)
        if not lessons:
            raise HTTPException(422, "Add at least one lesson before publishing")
        for lesson in lessons:
            if not lesson["blocks"] and not (lesson.get("content") or "").strip():
                raise HTTPException(
                    422, f"Lesson '{lesson['title']}' needs at least one block"
                )
        version = int(module.get("version") or 0) + 1
        ref.update({
            "status": "published",
            "version": version,
            "publishedAt": now(),
            "updatedAt": now(),
        })
        return {"id": mid, "status": "published", "version": version}

    # Classroom-level access to assigned modules.

    @router.get("/classrooms/{cid}/modules")
    def classroom_modules(
        cid: str,
        user=Depends(identity),
        db=Depends(get_db),
    ):
        authorize_classroom(db, cid, user)
        docs = (
            db.collection("classrooms").document(cid)
            .collection("assignments").limit(100).stream()
        )

        items = []
        seen = set()

        for doc in docs:
            assignment = doc.to_dict() or {}
            mid = assignment.get("moduleId")
            if not mid or mid in seen:
                continue
            if user["role"] == "student" and (
                assignment.get("status") != "published"
                or not targets_student(assignment, user["uid"])
            ):
                continue

            snap = module_ref(db, mid).get()
            if not snap.exists:
                continue

            module = snap.to_dict() or {}
            if user["role"] == "teacher":
                if module.get("authorId") != user["uid"]:
                    continue
            elif module.get("status") != "published":
                continue

            items.append(module)
            seen.add(mid)

        return {"items": items}

    @router.get("/classrooms/{cid}/modules/{mid}/lessons")
    def classroom_lessons(
        cid: str,
        mid: str,
        user=Depends(identity),
        db=Depends(get_db),
    ):
        authorize_classroom(db, cid, user)
        parent, _ = visible_module(db, cid, mid, user)
        return {
            "items": lessons_with_blocks(parent, student=user["role"] == "student")
        }

    # Classroom-specific assignments and submissions.

    @router.post("/classrooms/{cid}/assignments", status_code=201)
    def create_assignment(
        cid: str,
        payload: AssignmentInput,
        user=Depends(identity),
        db=Depends(get_db),
    ):
        authorize_classroom(db, cid, user, teacher_only=True)

        if payload.moduleId:
            _, module = owned_module(db, payload.moduleId, user)
            if module.get("status") != "published":
                raise HTTPException(409, "Publish module before assigning")

        ref = (
            db.collection("classrooms").document(cid)
            .collection("assignments").document()
        )
        record = {
            "id": ref.id,
            "classroomId": cid,
            "title": payload.title.strip(),
            "instructions": payload.instructions.strip(),
            "moduleId": payload.moduleId,
            "authorId": user["uid"],
            "dueAt": (
                payload.dueAt.isoformat()
                if payload.dueAt else None
            ),
            "status": "published",
            "createdAt": now(),
        }
        ref.create(record)
        return record

    @router.get("/classrooms/{cid}/assignments")
    def list_assignments(
        cid: str,
        user=Depends(identity),
        db=Depends(get_db),
    ):
        authorize_classroom(db, cid, user)
        docs = (
            db.collection("classrooms").document(cid)
            .collection("assignments").limit(100).stream()
        )
        return {
            "items": [
                data for doc in docs
                if (data := doc.to_dict() or {})
                and (
                    user["role"] == "teacher"
                    or (
                        data.get("status") == "published"
                        and targets_student(data, user["uid"])
                    )
                )
            ]
        }

    @router.post(
        "/classrooms/{cid}/assignments/{aid}/submit",
        status_code=201,
    )
    def submit_assignment(
        cid: str,
        aid: str,
        payload: SubmissionInput,
        user=Depends(identity),
        db=Depends(get_db),
    ):
        authorize_classroom(db, cid, user)
        if user["role"] != "student":
            raise HTTPException(403, "Student role required")

        assignment = assignment_ref(db, cid, aid).get()
        if (
            not assignment.exists
            or (assignment.to_dict() or {}).get("status") != "published"
            or not targets_student(assignment.to_dict() or {}, user["uid"])
        ):
            raise HTTPException(404, "Assignment not found")

        ref = (
            assignment_ref(db, cid, aid)
            .collection("submissions").document(user["uid"])
        )
        record = {
            "studentId": user["uid"],
            "assignmentId": aid,
            "answer": payload.answer.strip(),
            "status": "submitted",
            "submittedAt": now(),
        }
        try:
            ref.create(record)
        except Conflict:
            raise HTTPException(409, "Assignment already submitted")
        return record

    @router.get("/classrooms/{cid}/assignments/{aid}/submissions")
    def list_submissions(
        cid: str,
        aid: str,
        user=Depends(identity),
        db=Depends(get_db),
    ):
        authorize_classroom(db, cid, user, teacher_only=True)
        if not assignment_ref(db, cid, aid).get().exists:
            raise HTTPException(404, "Assignment not found")
        docs = (
            assignment_ref(db, cid, aid)
            .collection("submissions").limit(100).stream()
        )
        return {"items": [doc.to_dict() for doc in docs]}

    return router
