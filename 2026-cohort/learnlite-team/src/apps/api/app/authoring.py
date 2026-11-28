"""Teacher authoring: modules with lessons made of blocks.

Contract IDs: F-03, F-04, F-06, F-08, F-09, F-10, F-11, F-12, F-13, F-14 plus a bulk import
of a whole module in the contract format (content/module1_module.json).

Storage:  modules/{mid}
          modules/{mid}/lessons/{lid}
          modules/{mid}/lessons/{lid}/blocks/{bid}
Every lesson and block has an explicit, contiguous `position` (0, 1, 2, ...).
"""
from __future__ import annotations

from typing import Callable, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field

from app.common import (
    by_position,
    lesson_blocks,
    lessons_with_blocks,
    make_identity,
    now,
    require_teacher,
)
from app.content_models import (
    BlockFields,
    BlockInput,
    BlockPatch,
    LessonSettings,
    ModuleImport,
    Strict,
)

MAX_BLOCKS_PER_LESSON = 200
MODULE_EXTRA_FIELDS = (
    "subtitle", "language", "audience", "contentKey", "contentVersion", "sources",
)


class ModuleUpdate(Strict):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    subject: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    # "public": any student can find it in Community once it is published. "private": only
    # students it is assigned to. Modules are private until the teacher shares them.
    visibility: Literal["private", "public"] | None = None


class LessonUpdate(Strict):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    content: str | None = Field(default=None, max_length=30000)
    objective: str | None = Field(default=None, max_length=500)
    minutes: int | None = Field(default=None, ge=0, le=600)
    contentKey: str | None = Field(default=None, max_length=80)
    settings: LessonSettings | None = None


class LessonReorder(Strict):
    lessonIds: list[str] = Field(min_length=1, max_length=200)


class BlockReorder(Strict):
    blockIds: list[str] = Field(min_length=1, max_length=MAX_BLOCKS_PER_LESSON)


def block_record(fields: BlockFields, bid: str, mid: str, lid: str, position: int, created: str) -> dict:
    return {
        **fields.model_dump(exclude_none=True),
        "id": bid,
        "moduleId": mid,
        "lessonId": lid,
        "position": position,
        "createdAt": created,
        "updatedAt": now(),
    }


def create_module_tree(db, author_id: str, payload: ModuleImport):
    """Write a draft module with all its lessons and blocks. Returns the module reference."""
    ref = db.collection("modules").document()
    stamp = now()
    ref.create({
        "id": ref.id,
        "authorId": author_id,
        "title": payload.title.strip(),
        "subject": payload.subject.strip(),
        "description": payload.description.strip(),
        "status": "draft",
        "createdAt": stamp,
        "updatedAt": stamp,
        **payload.model_dump(include=set(MODULE_EXTRA_FIELDS), exclude_none=True),
    })
    lessons = sorted(
        enumerate(payload.lessons),
        key=lambda pair: (pair[1].position if pair[1].position is not None else pair[0], pair[0]),
    )
    for lesson_index, (_, lesson) in enumerate(lessons):
        lesson_ref = ref.collection("lessons").document()
        lesson_ref.create({
            "id": lesson_ref.id,
            "moduleId": ref.id,
            "title": lesson.title.strip(),
            "content": "",
            "position": lesson_index,
            "status": "published",
            "createdAt": stamp,
            **lesson.model_dump(
                include={"objective", "minutes", "contentKey", "settings"}, exclude_none=True
            ),
        })
        ordered = sorted(
            enumerate(lesson.blocks),
            key=lambda pair: (pair[1].position if pair[1].position is not None else pair[0], pair[0]),
        )
        for block_index, (_, block) in enumerate(ordered):
            block_ref = lesson_ref.collection("blocks").document()
            fields = BlockFields(**block.model_dump(exclude={"position"}, exclude_none=True))
            block_ref.create(block_record(fields, block_ref.id, ref.id, lesson_ref.id, block_index, stamp))
    return ref


def authoring_router(get_current_user: Callable, get_db: Callable, profile_for: Callable) -> APIRouter:
    router = APIRouter(prefix="/api/v1", tags=["authoring"])
    identity = make_identity(get_current_user, get_db, profile_for)

    # ---- helpers ---------------------------------------------------------
    def owned_module(db, mid: str, user: dict):
        require_teacher(user)
        ref = db.collection("modules").document(mid)
        snap = ref.get()
        data = (snap.to_dict() or {}) if snap.exists else {}
        if not snap.exists or data.get("authorId") != user["uid"]:
            raise HTTPException(404, "Module not found")  # never reveal other teachers' modules
        return ref, data

    def owned_lesson(db, mid: str, lid: str, user: dict):
        module_ref, module = owned_module(db, mid, user)
        ref = module_ref.collection("lessons").document(lid)
        snap = ref.get()
        if not snap.exists:
            raise HTTPException(404, "Lesson not found")
        return module_ref, ref, snap.to_dict() or {}

    def touch(module_ref):
        module_ref.update({"updatedAt": now()})

    def module_tree(module_ref, data: dict) -> dict:
        return {**data, "lessons": lessons_with_blocks(module_ref)}

    def renumber(collection, items: list[dict]) -> None:
        """Make positions contiguous again (0..n-1), keeping the current order."""
        for index, item in enumerate(by_position(items)):
            if item.get("position") != index:
                collection.document(item["id"]).update({"position": index})

    # ---- whole module ----------------------------------------------------
    @router.post("/teacher/modules/import", status_code=201)
    def import_module(payload: ModuleImport, user=Depends(identity), db=Depends(get_db)):
        """Create a draft module with all its lessons and blocks in one call.

        Everything is validated before anything is written, so a bad block creates nothing.
        """
        require_teacher(user)
        ref = create_module_tree(db, user["uid"], payload)
        return module_tree(ref, ref.get().to_dict())

    @router.get("/teacher/modules/{mid}")
    def get_module(mid: str, user=Depends(identity), db=Depends(get_db)):
        ref, data = owned_module(db, mid, user)
        return module_tree(ref, data)

    @router.patch("/teacher/modules/{mid}")
    def update_module(mid: str, payload: ModuleUpdate, user=Depends(identity), db=Depends(get_db)):
        ref, _ = owned_module(db, mid, user)
        changes = {
            k: (v.strip() if isinstance(v, str) and k != "visibility" else v)
            for k, v in payload.model_dump(exclude_none=True).items()
        }
        if any(changes.get(k) == "" for k in ("title", "subject")):
            raise HTTPException(422, "title and subject cannot be blank")
        if changes:
            ref.update({**changes, "updatedAt": now()})
        return module_tree(ref, ref.get().to_dict())

    @router.post("/teacher/modules/{mid}/unpublish")
    def unpublish_module(mid: str, user=Depends(identity), db=Depends(get_db)):
        ref, _ = owned_module(db, mid, user)
        ref.update({"status": "draft", "updatedAt": now()})
        return {"id": mid, "status": "draft"}

    # ---- lessons ---------------------------------------------------------
    @router.post("/teacher/modules/{mid}/lessons/reorder")
    def reorder_lessons(mid: str, payload: LessonReorder, user=Depends(identity), db=Depends(get_db)):
        module_ref, _ = owned_module(db, mid, user)
        collection = module_ref.collection("lessons")
        existing = {s.to_dict()["id"] for s in collection.limit(200).stream()}
        if len(set(payload.lessonIds)) != len(payload.lessonIds) or set(payload.lessonIds) != existing:
            raise HTTPException(422, "lessonIds must list every lesson of the module exactly once")
        for index, lid in enumerate(payload.lessonIds):
            collection.document(lid).update({"position": index})
        touch(module_ref)
        return {"items": lessons_with_blocks(module_ref)}

    @router.patch("/teacher/modules/{mid}/lessons/{lid}")
    def update_lesson(mid: str, lid: str, payload: LessonUpdate, user=Depends(identity), db=Depends(get_db)):
        module_ref, ref, _ = owned_lesson(db, mid, lid, user)
        changes = payload.model_dump(exclude_none=True)
        if "title" in changes:
            changes["title"] = changes["title"].strip()
            if not changes["title"]:
                raise HTTPException(422, "title cannot be blank")
        if changes:
            ref.update(changes)
            touch(module_ref)
        return {**ref.get().to_dict(), "blocks": lesson_blocks(ref)}

    @router.delete("/teacher/modules/{mid}/lessons/{lid}", status_code=204)
    def delete_lesson(mid: str, lid: str, user=Depends(identity), db=Depends(get_db)):
        module_ref, ref, _ = owned_lesson(db, mid, lid, user)
        for block in lesson_blocks(ref):
            ref.collection("blocks").document(block["id"]).delete()
        ref.delete()
        collection = module_ref.collection("lessons")
        renumber(collection, [s.to_dict() for s in collection.limit(200).stream()])
        touch(module_ref)

    # ---- blocks ----------------------------------------------------------
    @router.post("/teacher/modules/{mid}/lessons/{lid}/blocks", status_code=201)
    def create_block(mid: str, lid: str, payload: BlockInput, user=Depends(identity), db=Depends(get_db)):
        module_ref, lesson_ref, _ = owned_lesson(db, mid, lid, user)
        blocks = lesson_blocks(lesson_ref)
        if len(blocks) >= MAX_BLOCKS_PER_LESSON:
            raise HTTPException(409, "This lesson already has the maximum number of blocks")
        position = len(blocks) if payload.position is None else min(payload.position, len(blocks))
        collection = lesson_ref.collection("blocks")
        for block in blocks:  # make room when inserting in the middle
            if block["position"] >= position:
                collection.document(block["id"]).update({"position": block["position"] + 1})
        ref = collection.document()
        fields = BlockFields(**payload.model_dump(exclude={"position"}, exclude_none=True))
        record = block_record(fields, ref.id, mid, lid, position, now())
        ref.create(record)
        touch(module_ref)
        return record

    @router.post("/teacher/modules/{mid}/lessons/{lid}/blocks/reorder")
    def reorder_blocks(mid: str, lid: str, payload: BlockReorder, user=Depends(identity), db=Depends(get_db)):
        module_ref, lesson_ref, _ = owned_lesson(db, mid, lid, user)
        existing = {b["id"] for b in lesson_blocks(lesson_ref)}
        if len(set(payload.blockIds)) != len(payload.blockIds) or set(payload.blockIds) != existing:
            raise HTTPException(422, "blockIds must list every block of the lesson exactly once")
        for index, bid in enumerate(payload.blockIds):
            lesson_ref.collection("blocks").document(bid).update({"position": index})
        touch(module_ref)
        return {"items": lesson_blocks(lesson_ref)}

    @router.patch("/teacher/modules/{mid}/lessons/{lid}/blocks/{bid}")
    def update_block(mid: str, lid: str, bid: str, payload: BlockPatch, user=Depends(identity), db=Depends(get_db)):
        module_ref, lesson_ref, _ = owned_lesson(db, mid, lid, user)
        ref = lesson_ref.collection("blocks").document(bid)
        snap = ref.get()
        if not snap.exists:
            raise HTTPException(404, "Block not found")
        current = snap.to_dict() or {}
        base = {k: v for k, v in current.items() if k not in ("id", "moduleId", "lessonId", "position", "createdAt", "updatedAt")}
        merged = {**base, **payload.model_dump(exclude_unset=True)}
        merged = {k: v for k, v in merged.items() if v is not None}
        fields = BlockFields(**merged)  # whole block is validated again
        record = block_record(fields, bid, mid, lid, current["position"], current.get("createdAt", now()))
        ref.set(record)
        touch(module_ref)
        return record

    @router.delete("/teacher/modules/{mid}/lessons/{lid}/blocks/{bid}", status_code=204)
    def delete_block(mid: str, lid: str, bid: str, user=Depends(identity), db=Depends(get_db)):
        module_ref, lesson_ref, _ = owned_lesson(db, mid, lid, user)
        ref = lesson_ref.collection("blocks").document(bid)
        if not ref.get().exists:
            raise HTTPException(404, "Block not found")
        ref.delete()
        collection = lesson_ref.collection("blocks")
        renumber(collection, [s.to_dict() for s in collection.limit(300).stream()])
        touch(module_ref)

    return router
