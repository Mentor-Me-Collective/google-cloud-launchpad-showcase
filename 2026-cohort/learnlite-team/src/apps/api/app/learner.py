"""Assignments for teachers, and the student's modules, lessons, answers and progress.

Contract IDs: H-01..H-07, G-01, G-02, I-01..I-05, I-07, I-08, C-02.

The server decides what is correct, how much XP is earned, hearts and streak. The client only
sends the answer.

Hearts belong to a lesson run: every run starts with 5. A wrong answer costs one; losing the
last one ends the run ("failed") and the student starts the lesson again from the beginning. Students never receive solutions (see content_models.student_block).

Storage:
  classrooms/{cid}/assignments/{aid}                 (shared with the older classroom routes)
  users/{uid}/attempts/{attemptId}                   one run of a lesson
  users/{uid}/attempts/{attemptId}/events/{eventId}  stored answers, for idempotent retries
  users/{uid}/activityResults/{blockId}              XP is earned once per activity
  users/{uid}/lessonProgress/{moduleId}__{lessonId}  completion and best score
  users/{uid}/stats/summary                          XP, hearts, streak (server-written only)
  users/{uid}/offlineRuns/{clientRunId}              lessons played without internet, replayed once

Offline study: `GET /me/modules/{mid}/download` hands the student a module WITH its solutions so
the phone can grade by itself. When the connection is back, `POST /me/offline/sync` sends what
was answered; the server grades every answer again with the same rules (it never trusts the
phone's verdict), pays XP once per activity and completes the lesson.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field

from app.common import (
    MAX_HEARTS,
    by_position,
    error,
    is_after,
    lesson_blocks,
    lessons_with_blocks,
    load_stats,
    make_identity,
    now,
    require_student,
    require_teacher,
    stats_ref,
    targets_student,
    today,
)
from app.content_models import AnswerError, Strict, grade_answer, student_block
from app.members import short_name


class TeacherAssignmentInput(Strict):
    moduleId: str = Field(min_length=1, max_length=80)
    classroomIds: list[str] = Field(min_length=1, max_length=20)
    studentIds: list[str] = Field(default_factory=list, max_length=200)  # empty = whole classroom
    dueAt: datetime | None = None
    message: str = Field(default="", max_length=2000)
    notify: bool = False
    title: str | None = Field(default=None, min_length=1, max_length=150)


class TeacherAssignmentPatch(Strict):
    dueAt: datetime | None = None
    message: str | None = Field(default=None, max_length=2000)
    notify: bool | None = None
    status: Literal["published", "closed"] | None = None


class StartAttempt(Strict):
    restart: bool = False
    # After the teacher adds blocks to a lesson the student already finished, play only the new ones.
    onlyNew: bool = False


class AnswerInput(Strict):
    answer: dict[str, Any]
    clientEventId: str | None = Field(default=None, min_length=1, max_length=80)
    source: Literal["online", "offline"] = "online"


class OfflineAnswer(Strict):
    blockId: str = Field(min_length=1, max_length=100)
    # The answer that was right in the end, in the same shape the online route takes.
    answer: dict[str, Any]
    # Wrong tries before it. They count for accuracy; offline hearts are the phone's business.
    wrongAttempts: int = Field(default=0, ge=0, le=50)


class OfflineRun(Strict):
    clientRunId: str = Field(min_length=1, max_length=80)
    moduleId: str = Field(min_length=1, max_length=100)
    lessonId: str = Field(min_length=1, max_length=100)
    answers: list[OfflineAnswer] = Field(max_length=300)


class OfflineSync(Strict):
    runs: list[OfflineRun] = Field(min_length=1, max_length=20)


def effective_streak(stats: dict) -> int:
    """A streak that was not continued yesterday or today is over."""
    last = stats.get("lastActiveDate")
    if last in (today(), (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()):
        return stats.get("streak", 0)
    return 0


def gamification_view(stats: dict) -> dict:
    answers = stats["totalAnswers"]
    return {
        "xp": stats["xp"],
        "hearts": {"current": stats["hearts"], "max": stats["maxHearts"]},
        "streak": effective_streak(stats),
        "lastActiveDate": stats["lastActiveDate"],
        "activeToday": stats["lastActiveDate"] == today(),
        "totalAnswers": answers,
        "accuracy": round(100 * stats["correctAnswers"] / answers) if answers else 0,
    }


def learner_router(get_current_user: Callable, get_db: Callable, profile_for: Callable) -> APIRouter:
    router = APIRouter(prefix="/api/v1", tags=["learner"])
    identity = make_identity(get_current_user, get_db, profile_for)

    # ======================================================================
    # Shared lookups
    # ======================================================================
    def module_doc(db, mid: str):
        ref = db.collection("modules").document(mid)
        snap = ref.get()
        return ref, ((snap.to_dict() or {}) if snap.exists else None)

    def owned_classrooms(db, uid: str) -> list[dict]:
        docs = db.collection("classrooms").where("ownerId", "==", uid).limit(50).stream()
        return [d for d in (s.to_dict() or {} for s in docs) if d.get("status") == "active"]

    def find_assignment(db, uid: str, aid: str):
        """Locate one of this teacher's assignments by id."""
        for classroom in owned_classrooms(db, uid):
            ref = db.collection("classrooms").document(classroom["id"]).collection("assignments").document(aid)
            snap = ref.get()
            if snap.exists:
                return ref, snap.to_dict() or {}, classroom
        raise HTTPException(404, "Assignment not found")

    def active_member_ids(db, cid: str) -> list[str]:
        docs = db.collection("classrooms").document(cid).collection("members").limit(200).stream()
        return [s.id for s in docs if (s.to_dict() or {}).get("status") == "active"]

    def student_assignments(db, uid: str) -> list[dict]:
        """Published assignments reaching this student through an active membership."""
        out = []
        for entry in db.collection("users").document(uid).collection("classrooms").limit(50).stream():
            membership = entry.to_dict() or {}
            cid = membership.get("classroomId")
            if membership.get("status") != "active" or not cid:
                continue
            member = db.collection("classrooms").document(cid).collection("members").document(uid).get()
            classroom_snap = db.collection("classrooms").document(cid).get()
            classroom = (classroom_snap.to_dict() or {}) if classroom_snap.exists else {}
            if (
                not member.exists
                or (member.to_dict() or {}).get("status") != "active"
                or classroom.get("status") != "active"
            ):
                continue
            for snap in db.collection("classrooms").document(cid).collection("assignments").limit(100).stream():
                assignment = snap.to_dict() or {}
                if assignment.get("status") != "published" or not targets_student(assignment, uid):
                    continue
                if not assignment.get("moduleId"):
                    continue
                out.append({**assignment, "_classroom": classroom})
        return out

    def lesson_progress_ref(db, uid: str, mid: str, lid: str):
        return db.collection("users").document(uid).collection("lessonProgress").document(f"{mid}__{lid}")

    def published_lessons(module_ref) -> list[dict]:
        lessons = by_position([s.to_dict() or {} for s in module_ref.collection("lessons").limit(200).stream()])
        return [lesson for lesson in lessons if lesson.get("status") == "published"]

    def completed_lessons(db, uid: str, mid: str, lessons: list[dict]) -> int:
        count = 0
        for lesson in lessons:
            snap = lesson_progress_ref(db, uid, mid, lesson["id"]).get()
            if snap.exists and (snap.to_dict() or {}).get("status") == "completed":
                count += 1
        return count

    def module_summary(db, uid: str, mid: str, module: dict, module_ref) -> dict:
        lessons = published_lessons(module_ref)
        return {
            "id": mid,
            "title": module.get("title"),
            "subject": module.get("subject"),
            "description": module.get("description", ""),
            "version": module.get("version", 1),
            "lessonCount": len(lessons),
            "completedLessons": completed_lessons(db, uid, mid, lessons),
        }

    def accessible_module(db, uid: str, mid: str):
        """The module, if it is published and either public (Community) or assigned to this student."""
        ref, module = module_doc(db, mid)
        if module is None or module.get("status") != "published":
            raise HTTPException(404, "Module not found")
        if module.get("visibility") == "public":
            return ref, module
        if not any(a["moduleId"] == mid for a in student_assignments(db, uid)):
            raise HTTPException(404, "Module not found")
        return ref, module

    def assignment_view(a: dict, summary: dict | None = None) -> dict:
        classroom = a.get("_classroom") or {}
        view = {k: v for k, v in a.items() if k not in ("_classroom", "authorId", "studentIds")}
        view["classroomName"] = classroom.get("name")
        if summary:
            view["module"] = summary
        return view

    # ======================================================================
    # Teacher: assignments (H-01..H-05)
    # ======================================================================
    @router.post("/teacher/assignments", status_code=201)
    def create_assignments(payload: TeacherAssignmentInput, user=Depends(identity), db=Depends(get_db)):
        """Assign one published module to one or more of the teacher's classrooms."""
        require_teacher(user)
        module_ref, module = module_doc(db, payload.moduleId)
        if module is None or module.get("authorId") != user["uid"]:
            raise HTTPException(404, "Module not found")
        if module.get("status") != "published":
            raise HTTPException(409, "Publish the module before assigning it")

        owned = {c["id"]: c for c in owned_classrooms(db, user["uid"])}
        classroom_ids = list(dict.fromkeys(payload.classroomIds))
        if any(cid not in owned for cid in classroom_ids):
            raise HTTPException(404, "Classroom not found")

        members = {cid: set(active_member_ids(db, cid)) for cid in classroom_ids}
        wanted = list(dict.fromkeys(payload.studentIds))
        if wanted and not set(wanted) <= set().union(*members.values()):
            raise HTTPException(422, "Every student must be an active member of a selected classroom")

        created, skipped = [], []
        for cid in classroom_ids:
            ids = [s for s in wanted if s in members[cid]]
            if wanted and not ids:
                skipped.append(cid)  # nobody selected belongs to this classroom
                continue
            ref = db.collection("classrooms").document(cid).collection("assignments").document()
            stamp = now()
            record = {
                "id": ref.id,
                "classroomId": cid,
                "moduleId": payload.moduleId,
                "title": (payload.title or module["title"]).strip(),
                "instructions": payload.message.strip(),
                "message": payload.message.strip(),
                "notify": payload.notify,
                "studentIds": ids,
                "dueAt": payload.dueAt.isoformat() if payload.dueAt else None,
                "authorId": user["uid"],
                "status": "published",
                "createdAt": stamp,
                "updatedAt": stamp,
            }
            ref.create(record)
            created.append(record)
        return {"items": created, "skippedClassroomIds": skipped}

    @router.get("/teacher/assignments")
    def list_teacher_assignments(
        classroomId: str | None = Query(default=None, max_length=80),
        moduleId: str | None = Query(default=None, max_length=80),
        status: str | None = Query(default=None, max_length=20),
        user=Depends(identity),
        db=Depends(get_db),
    ):
        require_teacher(user)
        items = []
        for classroom in owned_classrooms(db, user["uid"]):
            if classroomId and classroom["id"] != classroomId:
                continue
            everyone = None
            for snap in db.collection("classrooms").document(classroom["id"]).collection("assignments").limit(100).stream():
                a = snap.to_dict() or {}
                if (moduleId and a.get("moduleId") != moduleId) or (status and a.get("status") != status):
                    continue
                if not status and a.get("status") == "cancelled":
                    continue  # removed assignments only show when asked for explicitly
                module_ref, module = module_doc(db, a["moduleId"]) if a.get("moduleId") else (None, None)
                targets = a.get("studentIds") or []
                if not targets:
                    everyone = everyone if everyone is not None else active_member_ids(db, classroom["id"])
                    targets = everyone
                lessons = published_lessons(module_ref) if module_ref and module else []
                done = 0
                if lessons:
                    for uid in targets:
                        if completed_lessons(db, uid, a["moduleId"], lessons) == len(lessons):
                            done += 1
                items.append({
                    **a,
                    "classroomName": classroom.get("name"),
                    "moduleTitle": (module or {}).get("title"),
                    "studentCount": len(targets),
                    "completedCount": done,
                })
        return {"items": items}

    @router.get("/teacher/assignments/{aid}")
    def get_teacher_assignment(aid: str, user=Depends(identity), db=Depends(get_db)):
        require_teacher(user)
        _, record, classroom = find_assignment(db, user["uid"], aid)
        return {**record, "classroomName": classroom.get("name")}

    @router.patch("/teacher/assignments/{aid}")
    def update_teacher_assignment(aid: str, payload: TeacherAssignmentPatch, user=Depends(identity), db=Depends(get_db)):
        require_teacher(user)
        ref, record, _ = find_assignment(db, user["uid"], aid)
        if record.get("status") == "cancelled":
            raise HTTPException(409, "Assignment was cancelled")
        changes = payload.model_dump(exclude_unset=True)
        if "dueAt" in changes and changes["dueAt"] is not None:
            changes["dueAt"] = changes["dueAt"].isoformat()
        if "message" in changes and changes["message"] is not None:
            changes["message"] = changes["message"].strip()
            changes["instructions"] = changes["message"]
        changes = {k: v for k, v in changes.items() if v is not None or k == "dueAt"}
        if changes:
            ref.update({**changes, "updatedAt": now()})
        return ref.get().to_dict()

    @router.delete("/teacher/assignments/{aid}", status_code=204)
    def cancel_teacher_assignment(aid: str, user=Depends(identity), db=Depends(get_db)):
        """Cancel (never hard delete): students lose access, progress is kept."""
        require_teacher(user)
        ref, _, _ = find_assignment(db, user["uid"], aid)
        ref.update({"status": "cancelled", "updatedAt": now()})

    # ======================================================================
    # Student: assignments and modules (H-06, H-07, G-01, G-02)
    # ======================================================================
    def with_module(db, uid: str, assignments: list[dict]) -> list[dict]:
        out, cache = [], {}
        for a in assignments:
            mid = a["moduleId"]
            if mid not in cache:
                ref, module = module_doc(db, mid)
                cache[mid] = module_summary(db, uid, mid, module, ref) if module and module.get("status") == "published" else None
            if cache[mid]:
                out.append(assignment_view(a, cache[mid]))
        return out

    @router.get("/me/assignments")
    def my_assignments(user=Depends(identity), db=Depends(get_db)):
        require_student(user)
        return {"items": with_module(db, user["uid"], student_assignments(db, user["uid"]))}

    @router.get("/me/classrooms/{cid}/assignments")
    def my_classroom_assignments(cid: str, user=Depends(identity), db=Depends(get_db)):
        require_student(user)
        mine = [a for a in student_assignments(db, user["uid"]) if a["classroomId"] == cid]
        if not mine:
            member = db.collection("classrooms").document(cid).collection("members").document(user["uid"]).get()
            if not member.exists or (member.to_dict() or {}).get("status") != "active":
                raise HTTPException(404, "Classroom not found")
        return {"items": with_module(db, user["uid"], mine)}

    @router.get("/me/modules")
    def my_modules(user=Depends(identity), db=Depends(get_db)):
        require_student(user)
        modules: dict[str, dict] = {}
        for a in student_assignments(db, user["uid"]):
            mid = a["moduleId"]
            ref, module = module_doc(db, mid)
            if not module or module.get("status") != "published":
                continue
            entry = modules.setdefault(mid, {**module_summary(db, user["uid"], mid, module, ref), "classroomIds": [], "dueAt": None})
            entry["classroomIds"].append(a["classroomId"])
            due = a.get("dueAt")
            if due and (entry["dueAt"] is None or due < entry["dueAt"]):
                entry["dueAt"] = due
        return {"items": list(modules.values())}

    # ======================================================================
    # Community: public modules from every teacher (G-03)
    # ======================================================================
    @router.get("/community/modules")
    def community_modules(
        q: str | None = Query(default=None, max_length=80),
        subject: str | None = Query(default=None, max_length=120),
        user=Depends(identity),
        db=Depends(get_db),
    ):
        """Published modules their authors chose to share. Newest first."""
        require_student(user)
        needle = (q or "").strip().casefold()
        wanted = (subject or "").strip().casefold()
        docs = (
            db.collection("modules").where("visibility", "==", "public").where("status", "==", "published").limit(100).stream()
        )
        assigned = {a["moduleId"] for a in student_assignments(db, user["uid"])}
        items = []
        for snap in docs:
            module = snap.to_dict() or {}
            if needle and needle not in f"{module.get('title', '')} {module.get('subject', '')} {module.get('description', '')}".casefold():
                continue
            if wanted and wanted != (module.get("subject") or "").casefold():
                continue
            ref = db.collection("modules").document(module["id"])
            lessons = lessons_with_blocks(ref, student=True)
            author = db.collection("users").document(module.get("authorId", "-")).get().to_dict() or {}
            items.append({
                "id": module["id"],
                "title": module.get("title"),
                "subject": module.get("subject"),
                "description": module.get("description", ""),
                "authorName": short_name(author.get("name") or ""),
                "lessonCount": len(lessons),
                "activityCount": sum(1 for lesson in lessons for b in lesson["blocks"] if b.get("kind") == "activity"),
                "publishedAt": module.get("publishedAt"),
                "assigned": module["id"] in assigned,
                "completedLessons": completed_lessons(db, user["uid"], module["id"], [l for l in lessons]),
            })
        items.sort(key=lambda m: m.get("publishedAt") or "", reverse=True)
        subjects = sorted({m["subject"] for m in items if m.get("subject")}, key=str.casefold)
        return {"items": items, "subjects": subjects}

    def module_tree(db, uid: str, mid: str, reveal: bool = False) -> dict:
        """The module as the student sees it. `reveal` keeps the solutions (the offline download)."""
        ref, module = accessible_module(db, uid, mid)
        lessons = lessons_with_blocks(ref, student=True, reveal=reveal)
        for lesson in lessons:
            snap = lesson_progress_ref(db, uid, mid, lesson["id"]).get()
            progress = (snap.to_dict() or {}) if snap.exists else {}
            finished_at = progress.get("lastAttemptAt")
            new_blocks = (
                sum(1 for b in lesson["blocks"] if is_after(b.get("createdAt"), finished_at))
                if progress.get("status") == "completed"
                else 0
            )
            lesson["progress"] = {
                "status": progress.get("status", "not_started"),
                "bestScore": progress.get("bestScore"),
                "completedAt": progress.get("completedAt"),
                "newBlockCount": new_blocks,
            }
        # Activities this student already answered correctly: the app shows them as done,
        # and the progress survives signing out and in again.
        block_ids = {
            b["id"] for lesson in lessons for b in lesson["blocks"] if b.get("kind") == "activity"
        }
        results = db.collection("users").document(uid).collection("activityResults").limit(5000).stream()
        done = {}
        for snap in results:
            record = snap.to_dict() or {}
            if snap.id in block_ids and record.get("correct"):
                done[snap.id] = {"xp": record.get("xp", 0), "completedAt": record.get("at")}
        return {
            **module_summary(db, uid, mid, module, ref),
            "lessons": lessons,
            "activityResults": done,
        }

    @router.get("/me/modules/{mid}")
    def my_module(mid: str, user=Depends(identity), db=Depends(get_db)):
        require_student(user)
        return module_tree(db, user["uid"], mid)

    @router.get("/me/modules/{mid}/download")
    def download_module(mid: str, user=Depends(identity), db=Depends(get_db)):
        """The whole module for studying without internet, solutions included.

        The student asked to keep it on the phone, and the phone has to grade by itself, so this
        is the one place a student receives the answers. Whatever the phone reports later is
        graded again by `POST /me/offline/sync`.
        """
        require_student(user)
        return {**module_tree(db, user["uid"], mid, reveal=True), "downloadedAt": now()}

    @router.post("/me/offline/sync")
    def sync_offline_runs(payload: OfflineSync, user=Depends(identity), db=Depends(get_db)):
        """Replay lessons that were played without internet. Safe to send twice (clientRunId)."""
        require_student(user)
        uid = user["uid"]
        results = [replay_offline_run(db, uid, run) for run in payload.runs]
        return {"items": results, "gamification": gamification_view(load_stats(db, uid))}

    def replay_offline_run(db, uid: str, run: OfflineRun) -> dict:
        runs = db.collection("users").document(uid).collection("offlineRuns")
        stored = runs.document(run.clientRunId).get()
        if stored.exists:
            return (stored.to_dict() or {})["response"]

        def finish(response: dict) -> dict:
            response = {"clientRunId": run.clientRunId, "moduleId": run.moduleId, "lessonId": run.lessonId, **response}
            runs.document(run.clientRunId).set({"response": response, "at": now()})
            return response

        try:
            module_ref, _ = accessible_module(db, uid, run.moduleId)
        except HTTPException:
            return finish({"status": "rejected", "reason": "MODULE_UNAVAILABLE", "completed": False, "earnedXp": 0})
        lesson_ref = module_ref.collection("lessons").document(run.lessonId)
        lesson = lesson_ref.get()
        if not lesson.exists or (lesson.to_dict() or {}).get("status") != "published":
            return finish({"status": "rejected", "reason": "LESSON_UNAVAILABLE", "completed": False, "earnedXp": 0})

        blocks = {b["id"]: b for b in lesson_blocks(lesson_ref)}
        activity_ids = [bid for bid, b in blocks.items() if b.get("kind") == "activity"]
        stats = load_stats(db, uid)
        results = db.collection("users").document(uid).collection("activityResults")
        earned, correct_ids, first_try, rejected = 0, set(), 0, []
        seen: set[str] = set()
        for item in run.answers:
            block = blocks.get(item.blockId)
            if block is None or block.get("kind") != "activity" or item.blockId in seen:
                rejected.append(item.blockId)
                continue
            seen.add(item.blockId)
            try:
                right = grade_answer(block["activity"], item.answer)
            except AnswerError:
                right = False
            stats["totalAnswers"] += item.wrongAttempts + 1
            if not right:
                rejected.append(item.blockId)  # the phone's copy of the lesson was out of date
                continue
            correct_ids.add(item.blockId)
            stats["correctAnswers"] += 1
            if item.wrongAttempts == 0:
                first_try += 1
            if not results.document(item.blockId).get().exists:  # XP is earned once per activity, ever
                xp = block["activity"]["xp"]
                earned += xp
                results.document(item.blockId).set({"correct": True, "xp": xp, "at": now()})
        if correct_ids:
            if stats["lastActiveDate"] != today():
                yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
                stats["streak"] = stats["streak"] + 1 if stats["lastActiveDate"] == yesterday else 1
            stats.update(lastActiveDate=today())
        stats["xp"] += earned
        stats_ref(db, uid).set(stats)

        completed = all(bid in correct_ids for bid in activity_ids)
        if blocks and completed:
            stamp = now()
            progress_ref = lesson_progress_ref(db, uid, run.moduleId, run.lessonId)
            snap = progress_ref.get()
            old = (snap.to_dict() or {}) if snap.exists else {}
            progress_ref.set({
                "studentId": uid,
                "moduleId": run.moduleId,
                "lessonId": run.lessonId,
                "status": "completed",
                "completedAt": old.get("completedAt") or stamp,
                "bestScore": max(old.get("bestScore") or 0, first_try),
                "lastAttemptAt": stamp,
                "version": (old.get("version") or 0) + 1,
            })
        lessons = published_lessons(module_ref)
        module_done = bool(lessons) and completed_lessons(db, uid, run.moduleId, lessons) == len(lessons)
        return finish({
            "status": "synced",
            "completed": bool(blocks) and completed,
            "earnedXp": earned,
            "score": {"correct": first_try, "total": len(activity_ids)},
            "rejectedBlocks": rejected,
            "moduleCompleted": module_done,
        })

    # ======================================================================
    # Student: lessons, answers, progress (I-01..I-05)
    # ======================================================================
    def own_attempt(db, uid: str, attempt_id: str):
        ref = db.collection("users").document(uid).collection("attempts").document(attempt_id)
        snap = ref.get()
        if not snap.exists:
            raise HTTPException(404, "Attempt not found")
        return ref, snap.to_dict() or {}

    def attempt_view(attempt: dict, blocks: list[dict], stats: dict) -> dict:
        return {
            "attemptId": attempt["id"],
            "moduleId": attempt["moduleId"],
            "lessonId": attempt["lessonId"],
            "moduleVersion": attempt["moduleVersion"],
            "totalBlocks": attempt["totalBlocks"],
            "currentPosition": attempt["currentPosition"],
            "onlyNew": attempt.get("onlyNew", False),
            "hearts": {"current": attempt.get("hearts", MAX_HEARTS), "max": MAX_HEARTS},
            "blocks": blocks,
        }

    @router.post("/me/modules/{mid}/lessons/{lid}/attempts", status_code=201)
    def start_attempt(mid: str, lid: str, payload: StartAttempt | None = None, user=Depends(identity), db=Depends(get_db)):
        """Start (or resume) a lesson run. `restart: true` begins again without erasing history."""
        require_student(user)
        uid = user["uid"]
        module_ref, module = accessible_module(db, uid, mid)
        lesson_ref = module_ref.collection("lessons").document(lid)
        lesson_snap = lesson_ref.get()
        if not lesson_snap.exists or (lesson_snap.to_dict() or {}).get("status") != "published":
            raise HTTPException(404, "Lesson not found")
        blocks = lesson_blocks(lesson_ref)
        if not blocks:
            raise error("LESSON_EMPTY", "This lesson has no blocks yet")

        only_new = False
        if payload and payload.onlyNew:
            progress = lesson_progress_ref(db, uid, mid, lid).get()
            finished_at = (progress.to_dict() or {}).get("lastAttemptAt") if progress.exists else None
            fresh = [b for b in blocks if is_after(b.get("createdAt"), finished_at)]
            if fresh and (progress.to_dict() or {}).get("status") == "completed":
                blocks, only_new = fresh, True  # nothing the student already did has to be repeated

        attempts = db.collection("users").document(uid).collection("attempts")
        running = [
            s.to_dict() for s in attempts.where("moduleId", "==", mid).where("lessonId", "==", lid)
            .where("status", "==", "in_progress").limit(5).stream()
        ]
        stats = load_stats(db, uid)
        restart = bool(payload and payload.restart)
        if running and not restart:
            attempt = running[0]
            by_id = {b["id"]: b for b in blocks}
            visible = [student_block(by_id[b]) for b in attempt["blockIds"] if b in by_id]
            return attempt_view(attempt, visible, stats)
        for old in running:
            attempts.document(old["id"]).update({"status": "abandoned", "updatedAt": now()})

        ref = attempts.document()
        stamp = now()
        attempt = {
            "id": ref.id,
            "studentId": uid,
            "moduleId": mid,
            "lessonId": lid,
            "moduleVersion": module.get("version", 1),
            "status": "in_progress",
            "blockIds": [b["id"] for b in blocks],
            "activityIds": [b["id"] for b in blocks if b["kind"] == "activity"],
            "totalBlocks": len(blocks),
            "currentPosition": 0,
            "onlyNew": only_new,
            "hearts": MAX_HEARTS,
            "answered": {},
            "earnedXp": 0,
            "sequence": 0,
            "createdAt": stamp,
            "updatedAt": stamp,
        }
        ref.create(attempt)
        return attempt_view(attempt, [student_block(b) for b in blocks], stats)

    @router.post("/me/attempts/{attempt_id}/blocks/{bid}/answer")
    def answer_block(attempt_id: str, bid: str, payload: AnswerInput, user=Depends(identity), db=Depends(get_db)):
        require_student(user)
        uid = user["uid"]
        ref, attempt = own_attempt(db, uid, attempt_id)

        events = ref.collection("events")
        if payload.clientEventId:
            stored = events.document(payload.clientEventId).get()
            if stored.exists:  # a retry of the same request: same answer, no second heart lost
                return stored.to_dict()["response"]

        if attempt["status"] != "in_progress":
            raise error("ATTEMPT_CLOSED", "This lesson run is already finished")
        if bid not in attempt["blockIds"]:
            raise HTTPException(404, "Block not found")
        index = attempt["blockIds"].index(bid)
        block_snap = (
            db.collection("modules").document(attempt["moduleId"]).collection("lessons")
            .document(attempt["lessonId"]).collection("blocks").document(bid).get()
        )
        block = (block_snap.to_dict() or {}) if block_snap.exists else {}
        if (
            attempt["answered"].get(bid, {}).get("correct")
            and index < attempt["currentPosition"]
            and block.get("kind") == "activity"
        ):
            # The same answer sent twice (a double tap, a retry after a slow reply): it was
            # already counted, so say so instead of failing. No XP, no heart, no new record.
            return {
                "correct": True,
                "earnedXp": 0,
                "explanation": block["activity"].get("explanation", ""),
                "hearts": {"current": attempt.get("hearts", MAX_HEARTS), "max": MAX_HEARTS},
                "attemptNumber": attempt["answered"][bid]["tries"],
                "nextPosition": attempt["currentPosition"],
                "canContinue": True,
                "serverSequence": attempt["sequence"],
                "alreadyAnswered": True,
            }
        if index != attempt["currentPosition"]:
            raise error("NOT_CURRENT_BLOCK", "Answer the lesson in order")
        if block.get("kind") != "activity":
            raise HTTPException(422, "Only activities can be answered")

        stats = load_stats(db, uid)
        hearts = attempt.get("hearts", MAX_HEARTS)
        if hearts <= 0:
            raise error("HEARTS_EXHAUSTED", "You are out of hearts: start the lesson again")
        try:
            correct = grade_answer(block["activity"], payload.answer)
        except AnswerError as exc:
            raise HTTPException(422, str(exc))

        previous = attempt["answered"].get(bid, {})
        tries = previous.get("tries", 0) + 1
        earned = 0
        if correct:
            result_ref = db.collection("users").document(uid).collection("activityResults").document(bid)
            if not result_ref.get().exists:  # XP is earned once per activity, ever
                earned = block["activity"]["xp"]
                result_ref.set({"correct": True, "xp": earned, "at": now()})
            streak = stats["streak"]
            if stats["lastActiveDate"] != today():
                yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
                streak = streak + 1 if stats["lastActiveDate"] == yesterday else 1
            stats.update(streak=streak, lastActiveDate=today())
        else:
            hearts = max(0, hearts - 1)
        failed = hearts == 0  # the last heart is gone: this run is over
        stats.update(
            xp=stats["xp"] + earned,
            totalAnswers=stats["totalAnswers"] + 1,
            correctAnswers=stats["correctAnswers"] + (1 if correct else 0),
        )
        stats_ref(db, uid).set(stats)

        position = index + 1 if correct else attempt["currentPosition"]
        sequence = attempt["sequence"] + 1
        attempt["answered"][bid] = {"correct": correct or previous.get("correct", False), "tries": tries, "firstTry": tries == 1 and correct}
        ref.update({
            "answered": attempt["answered"],
            "currentPosition": position,
            "earnedXp": attempt["earnedXp"] + earned,
            "sequence": sequence,
            "hearts": hearts,
            "status": "failed" if failed else "in_progress",
            "updatedAt": now(),
        })
        response = {
            "correct": correct,
            "earnedXp": earned,
            "explanation": block["activity"].get("explanation", ""),
            "hearts": {"current": hearts, "max": MAX_HEARTS},
            "lessonFailed": failed,
            "attemptNumber": tries,
            "nextPosition": position,
            "canContinue": correct,
            "serverSequence": sequence,
        }
        if payload.clientEventId:
            events.document(payload.clientEventId).create({"response": response, "at": now()})
        return response

    @router.post("/me/attempts/{attempt_id}/continue")
    def continue_attempt(attempt_id: str, user=Depends(identity), db=Depends(get_db)):
        """Move past a non-activity block (theory, material, link)."""
        require_student(user)
        ref, attempt = own_attempt(db, user["uid"], attempt_id)
        if attempt["status"] != "in_progress":
            raise error("ATTEMPT_CLOSED", "This lesson run is already finished")
        position = attempt["currentPosition"]
        if position >= attempt["totalBlocks"] - 1:
            raise error("LESSON_END", "This is the last block: complete the lesson")
        if attempt["blockIds"][position] in attempt["activityIds"]:
            raise error("ACTIVITY_PENDING", "Answer this activity correctly to continue")
        ref.update({"currentPosition": position + 1, "updatedAt": now()})
        return {"currentPosition": position + 1, "totalBlocks": attempt["totalBlocks"]}

    @router.post("/me/attempts/{attempt_id}/complete")
    def complete_attempt(attempt_id: str, user=Depends(identity), db=Depends(get_db)):
        require_student(user)
        uid = user["uid"]
        ref, attempt = own_attempt(db, uid, attempt_id)
        module_ref = db.collection("modules").document(attempt["moduleId"])
        lessons = published_lessons(module_ref)
        total = len(attempt["activityIds"])
        correct_first = sum(1 for b in attempt["activityIds"] if attempt["answered"].get(b, {}).get("firstTry"))

        def summary(module_done: bool) -> dict:
            return {
                "attemptId": attempt_id,
                "lessonId": attempt["lessonId"],
                "completed": True,
                "score": {"correct": correct_first, "total": total},
                "earnedXp": attempt["earnedXp"],
                "moduleCompleted": module_done,
                "gamification": gamification_view(load_stats(db, uid)),
            }

        def module_done() -> bool:
            return bool(lessons) and completed_lessons(db, uid, attempt["moduleId"], lessons) == len(lessons)

        if attempt["status"] == "completed":
            return summary(module_done())  # idempotent
        if attempt["status"] != "in_progress":
            raise error("ATTEMPT_CLOSED", "This lesson run was abandoned")
        unanswered = [b for b in attempt["activityIds"] if not attempt["answered"].get(b, {}).get("correct")]
        if unanswered or attempt["currentPosition"] < attempt["totalBlocks"] - 1:
            raise error("LESSON_INCOMPLETE", "Finish every block and activity first")

        stamp = now()
        progress_ref = lesson_progress_ref(db, uid, attempt["moduleId"], attempt["lessonId"])
        snap = progress_ref.get()
        old = (snap.to_dict() or {}) if snap.exists else {}
        progress_ref.set({
            "studentId": uid,
            "moduleId": attempt["moduleId"],
            "lessonId": attempt["lessonId"],
            "status": "completed",
            "completedAt": old.get("completedAt") or stamp,  # the first completion is kept forever
            "bestScore": max(old.get("bestScore") or 0, correct_first),
            "lastAttemptAt": stamp,
            "version": (old.get("version") or 0) + 1,
        })
        ref.update({"status": "completed", "currentPosition": attempt["totalBlocks"], "completedAt": stamp, "updatedAt": stamp})
        return summary(module_done())

    @router.get("/me/modules/{mid}/progress")
    def module_progress(mid: str, user=Depends(identity), db=Depends(get_db)):
        require_student(user)
        uid = user["uid"]
        ref, _ = accessible_module(db, uid, mid)
        running = {
            a["lessonId"]: a for a in (
                s.to_dict() for s in db.collection("users").document(uid).collection("attempts")
                .where("moduleId", "==", mid).where("status", "==", "in_progress").limit(50).stream()
            )
        }
        lessons = published_lessons(ref)
        items = []
        for lesson in lessons:
            snap = lesson_progress_ref(db, uid, mid, lesson["id"]).get()
            progress = (snap.to_dict() or {}) if snap.exists else {}
            status = progress.get("status") or ("in_progress" if lesson["id"] in running else "not_started")
            items.append({
                "lessonId": lesson["id"],
                "status": status,
                "bestScore": progress.get("bestScore"),
                "completedAt": progress.get("completedAt"),
                "currentBlockPosition": running.get(lesson["id"], {}).get("currentPosition"),
            })
        done = sum(1 for i in items if i["status"] == "completed")
        return {"moduleId": mid, "totalLessons": len(items), "completedLessons": done, "lessons": items}

    # ======================================================================
    # Student: XP, hearts and streak (C-02, I-07, I-08)
    # ======================================================================
    @router.get("/me/gamification")
    def my_gamification(user=Depends(identity), db=Depends(get_db)):
        require_student(user)
        return gamification_view(load_stats(db, user["uid"]))

    @router.post("/me/hearts/restore")
    def restore_hearts(user=Depends(identity), db=Depends(get_db)):
        """Refill hearts. The MVP has no cost or cooldown (the app offers it when you run out)."""
        require_student(user)
        stats = load_stats(db, user["uid"])
        if stats["hearts"] < stats["maxHearts"]:
            stats["hearts"] = stats["maxHearts"]
            stats_ref(db, user["uid"]).set(stats)
        return gamification_view(stats)

    @router.get("/me/streak")
    def my_streak(user=Depends(identity), db=Depends(get_db)):
        require_student(user)
        view = gamification_view(load_stats(db, user["uid"]))
        return {"streak": view["streak"], "lastActiveDate": view["lastActiveDate"], "activeToday": view["activeToday"]}

    return router
