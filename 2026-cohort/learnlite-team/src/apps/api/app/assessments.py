"""Phase 5: teacher quizzes, secure marking, and learner achievements."""
from datetime import datetime, timezone
from typing import Callable
from fastapi import APIRouter, Depends, HTTPException
from google.api_core.exceptions import AlreadyExists, Conflict
from google.cloud import firestore
from pydantic import BaseModel, ConfigDict, Field, model_validator


def timestamp():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Question(StrictModel):
    text: str = Field(min_length=1, max_length=1000)
    options: list[str] = Field(min_length=2, max_length=6)
    correctIndex: int = Field(ge=0, le=5)

    @model_validator(mode="after")
    def validate_options(self):
        if any(not option.strip() for option in self.options):
            raise ValueError("Answer options cannot be blank")
        if self.correctIndex >= len(self.options):
            raise ValueError("Correct answer index is out of range")
        return self


class QuizInput(StrictModel):
    title: str = Field(min_length=1, max_length=150)
    moduleId: str | None = None
    questions: list[Question] = Field(min_length=1, max_length=20)


class QuizAnswers(StrictModel):
    answers: list[int] = Field(min_length=1, max_length=20)


def student_view(data):
    return {
        "id": data["id"],
        "title": data["title"],
        "classroomId": data["classroomId"],
        "status": data["status"],
        "questions": [
            {
                "text": question["text"],
                "options": question["options"],
            }
            for question in data["questions"]
        ],
    }


def badges_for(points):
    badges = []
    if points >= 10:
        badges.append("FIRST_STEPS")
    if points >= 50:
        badges.append("RISING_LEARNER")
    if points >= 100:
        badges.append("KNOWLEDGE_BUILDER")
    return badges


def assessments_router(get_current_user: Callable,
                       get_db: Callable,
                       profile_for: Callable) -> APIRouter:
    router = APIRouter(prefix="/api/v1", tags=["assessments"])

    def identity(user=Depends(get_current_user), db=Depends(get_db)):
        profile = profile_for(user, db)
        if profile.get("role") not in ("teacher", "student"):
            raise HTTPException(403, "Valid learning role required")
        return {"uid": user["uid"], "role": profile["role"]}

    def authorized(db, cid, person, teacher_only=False):
        cref = db.collection("classrooms").document(cid)
        snap = cref.get()
        if not snap.exists or snap.to_dict().get("status") != "active":
            raise HTTPException(404, "Classroom not found")
        info = snap.to_dict()
        if person["role"] == "teacher":
            if info.get("ownerId") != person["uid"]:
                raise HTTPException(404, "Classroom not found")
        elif teacher_only:
            raise HTTPException(403, "Teacher role required")
        else:
            membership = cref.collection("members").document(person["uid"]).get()
            if not membership.exists or membership.to_dict().get("status") != "active":
                raise HTTPException(403, "Active enrollment required")
        return cref

    def quiz_ref(cref, quiz_id):
        return cref.collection("quizzes").document(quiz_id)

    def get_quiz(cref, quiz_id):
        snap = quiz_ref(cref, quiz_id).get()
        if not snap.exists:
            raise HTTPException(404, "Quiz not found")
        return snap.to_dict()

    @router.post("/classrooms/{cid}/quizzes", status_code=201)
    def create_quiz(cid: str, payload: QuizInput,
                    person=Depends(identity), db=Depends(get_db)):
        cref = authorized(db, cid, person, teacher_only=True)
        if payload.moduleId:
            module = db.collection("modules").document(payload.moduleId).get()
            if not module.exists:
                raise HTTPException(404, "Module not found")

            module_data = module.to_dict() or {}

            if module_data.get("authorId") != person["uid"]:
                raise HTTPException(404, "Module not found")

            if module_data.get("status") != "published":
                raise HTTPException(
                    409, "Publish module before creating quiz"
                )
        ref = cref.collection("quizzes").document()
        record = {
            "id": ref.id,
            "classroomId": cid,
            "authorId": person["uid"],
            "title": payload.title.strip(),
            "moduleId": payload.moduleId,
            "questions": [q.model_dump() for q in payload.questions],
            "status": "draft",
            "createdAt": timestamp(),
        }
        ref.create(record)
        return record

    @router.post("/classrooms/{cid}/quizzes/{qid}/publish")
    def publish_quiz(cid: str, qid: str,
                     person=Depends(identity), db=Depends(get_db)):
        cref = authorized(db, cid, person, teacher_only=True)
        ref = quiz_ref(cref, qid)
        if not ref.get().exists:
            raise HTTPException(404, "Quiz not found")
        ref.update({"status": "published", "publishedAt": timestamp()})
        return {"id": qid, "status": "published"}

    @router.get("/classrooms/{cid}/quizzes")
    def list_quizzes(cid: str,
                     person=Depends(identity), db=Depends(get_db)):
        cref = authorized(db, cid, person)
        records = [
            snap.to_dict()
            for snap in cref.collection("quizzes").limit(100).stream()
        ]
        if person["role"] == "teacher":
            return {"items": records}
        return {"items": [
            student_view(q) for q in records
            if q.get("status") == "published"
        ]}

    @router.get("/classrooms/{cid}/quizzes/{qid}")
    def quiz_details(cid: str, qid: str,
                     person=Depends(identity), db=Depends(get_db)):
        cref = authorized(db, cid, person)
        quiz = get_quiz(cref, qid)
        if person["role"] == "teacher":
            return quiz
        if quiz.get("status") != "published":
            raise HTTPException(404, "Quiz not found")
        return student_view(quiz)

    @router.post("/classrooms/{cid}/quizzes/{qid}/attempt", status_code=201)
    def attempt_quiz(cid: str, qid: str, payload: QuizAnswers,
                     person=Depends(identity), db=Depends(get_db)):
        cref = authorized(db, cid, person)
        if person["role"] != "student":
            raise HTTPException(403, "Student role required")
        quiz = get_quiz(cref, qid)
        if quiz.get("status") != "published":
            raise HTTPException(404, "Quiz not found")

        questions = quiz["questions"]
        if len(payload.answers) != len(questions):
            raise HTTPException(422, "Answer count does not match questions")
        for answer, question in zip(payload.answers, questions):
            if answer < 0 or answer >= len(question["options"]):
                raise HTTPException(422, "Answer index out of range")

        correct = sum(
            answer == question["correctIndex"]
            for answer, question in zip(payload.answers, questions)
        )
        points = correct * 10
        result = {
            "quizId": qid,
            "classroomId": cid,
            "studentId": person["uid"],
            "correct": correct,
            "total": len(questions),
            "points": points,
            "status": "graded",
            "submittedAt": timestamp(),
        }

        attempt_ref = quiz_ref(cref, qid).collection(
            "attempts"
        ).document(person["uid"])
        score_ref = db.collection("users").document(
            person["uid"]
        ).collection("quiz_scores").document(f"{cid}_{qid}")

        @firestore.transactional
        def record_attempt(tx):
            tx.create(attempt_ref, {**result, "answers": payload.answers})
            tx.create(score_ref, result)

        try:
            record_attempt(db.transaction())
        except (AlreadyExists, Conflict):
            raise HTTPException(409, "Quiz already attempted")
        return result

    @router.get("/me/achievements")
    def my_achievements(person=Depends(identity), db=Depends(get_db)):
        if person["role"] != "student":
            raise HTTPException(403, "Student role required")
        records = db.collection("users").document(
            person["uid"]
        ).collection("quiz_scores").limit(500).stream()
        results = [snap.to_dict() for snap in records]
        points = sum(item.get("points", 0) for item in results)
        return {
            "points": points,
            "completedQuizzes": len(results),
            "badges": badges_for(points),
        }

    @router.get("/classrooms/{cid}/quizzes/{qid}/attempts")
    def teacher_attempts(cid: str, qid: str,
                         person=Depends(identity), db=Depends(get_db)):
        cref = authorized(db, cid, person, teacher_only=True)
        if not quiz_ref(cref, qid).get().exists:
            raise HTTPException(404, "Quiz not found")
        docs = quiz_ref(cref, qid).collection("attempts").limit(100).stream()
        return {"items": [doc.to_dict() for doc in docs]}

    return router
