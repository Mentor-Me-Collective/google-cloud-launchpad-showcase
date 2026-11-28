"""LearnLite Phase 6: authenticated, revision-aware offline synchronization."""
import hashlib
import json
from datetime import datetime, timezone
from typing import Callable, Literal

from fastapi import APIRouter, Depends, HTTPException
from google.cloud import firestore
from pydantic import BaseModel, ConfigDict, Field, model_validator


def now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


IDENTIFIER = r"^[A-Za-z0-9_-]{1,100}$"


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SyncOperation(StrictModel):
    operationId: str = Field(pattern=IDENTIFIER)
    classroomId: str = Field(pattern=IDENTIFIER)
    kind: Literal["lesson_progress", "assignment_draft"]
    targetId: str = Field(pattern=IDENTIFIER)
    value: str = Field(max_length=10000)
    baseRevision: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_value(self):
        if self.kind == "lesson_progress":
            if self.value not in ("not_started", "in_progress", "completed"):
                raise ValueError("Invalid lesson progress state")
        return self


class SyncBatch(StrictModel):
    operations: list[SyncOperation] = Field(min_length=1, max_length=25)


def fingerprint(operation):
    body = json.dumps(
        operation.model_dump(), sort_keys=True, separators=(",", ":")
    )
    return hashlib.sha256(body.encode()).hexdigest()


def sync_router(get_current_user: Callable,
                get_db: Callable,
                profile_for: Callable) -> APIRouter:

    router = APIRouter(prefix="/api/v1/sync", tags=["offline-sync"])

    def current_student(user=Depends(get_current_user),
                        db=Depends(get_db)):
        profile = profile_for(user, db)
        if profile.get("role") != "student":
            raise HTTPException(403, "Student role required")
        return user

    def check_membership(db, uid, classroom_id):
        classroom_ref = db.collection("classrooms").document(classroom_id)
        classroom = classroom_ref.get()
        if not classroom.exists or classroom.to_dict().get("status") != "active":
            raise HTTPException(404, "Classroom not found")

        membership = (
            classroom_ref.collection("members").document(uid).get()
        )
        if not membership.exists or membership.to_dict().get("status") != "active":
            raise HTTPException(403, "Active enrollment required")

    @router.post("/push")
    def push(payload: SyncBatch,
             student=Depends(current_student),
             db=Depends(get_db)):

        uid = student["uid"]
        user_ref = db.collection("users").document(uid)
        results = []

        for op in payload.operations:
            check_membership(db, uid, op.classroomId)

            op_ref = user_ref.collection("sync_operations").document(
                op.operationId
            )

            state_key = hashlib.sha256(
                f"{op.classroomId}:{op.kind}:{op.targetId}".encode()
            ).hexdigest()

            state_ref = user_ref.collection("offline_items").document(state_key)
            request_hash = fingerprint(op)

            @firestore.transactional
            def apply(tx):
                existing = op_ref.get(transaction=tx)

                if existing.exists:
                    old = existing.to_dict()
                    if old.get("fingerprint") != request_hash:
                        return {
                            "operationId": op.operationId,
                            "status": "operation_id_conflict"
                        }
                    return {
                        "operationId": op.operationId,
                        "status": "duplicate",
                        "revision": old["revision"]
                    }

                current = state_ref.get(transaction=tx)
                current_data = current.to_dict() if current.exists else {}
                revision = current_data.get("revision", 0)

                if op.baseRevision != revision:
                    return {
                        "operationId": op.operationId,
                        "status": "conflict",
                        "serverRevision": revision,
                        "serverValue": current_data.get("value")
                    }

                new_revision = revision + 1
                record = {
                    "classroomId": op.classroomId,
                    "kind": op.kind,
                    "targetId": op.targetId,
                    "value": op.value,
                    "revision": new_revision,
                    "updatedAt": now()
                }

                tx.set(state_ref, record)
                tx.create(op_ref, {
                    "fingerprint": request_hash,
                    "revision": new_revision,
                    "createdAt": now()
                })

                return {
                    "operationId": op.operationId,
                    "status": "applied",
                    "revision": new_revision
                }

            results.append(apply(db.transaction()))

        return {"results": results}

    @router.get("/pull")
    def pull(student=Depends(current_student),
             db=Depends(get_db)):
        uid = student["uid"]
        refs = (
            db.collection("users").document(uid)
            .collection("offline_items").limit(100).stream()
        )

        items = []
        for snap in refs:
            item = snap.to_dict()
            try:
                check_membership(db, uid, item["classroomId"])
            except HTTPException:
                continue
            items.append(item)

        return {
            "items": items,
            "count": len(items),
            "hasMore": len(items) == 100,
            "serverTime": now()
        }

    return router
