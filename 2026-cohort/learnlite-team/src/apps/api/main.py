import os
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from typing import Literal

import firebase_admin
from firebase_admin import auth
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google.api_core.exceptions import Conflict
from google.cloud import firestore
from pydantic import BaseModel, ConfigDict, Field
from app.classrooms import classroom_router

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "learnlite-514514")

app = FastAPI(title="LearnLite API", version="0.2.0")
origins = [s.strip() for s in os.getenv("CORS_ORIGINS", "http://localhost:8081,http://localhost:19006").split(",") if s.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=False,
)


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@app.middleware("http")
async def request_identifier(request: Request, call_next):
    request.state.request_id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    code = {401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 503: "DEPENDENCY_UNAVAILABLE"}.get(exc.status_code, "REQUEST_ERROR")
    message = str(exc.detail)
    if isinstance(exc.detail, dict) and exc.detail.get("code"):
        # Stable machine-readable codes, e.g. HEARTS_EXHAUSTED.
        code, message = str(exc.detail["code"]), str(exc.detail.get("message", ""))
    return JSONResponse(status_code=exc.status_code, content={"error": {"code": code, "message": message, "details": {}, "requestId": getattr(request.state, "request_id", "")}})


@app.exception_handler(RequestValidationError)
async def invalid_payload(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": {"code": "VALIDATION_ERROR", "message": "Invalid request data", "details": {}, "requestId": getattr(request.state, "request_id", "")}})


@lru_cache
def get_db():
    return firestore.Client(project=PROJECT_ID)


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Firebase ID token required")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(401, "Firebase ID token required")
    try:
        try:
            firebase_admin.get_app()
        except ValueError:
            firebase_admin.initialize_app(options={"projectId": PROJECT_ID})
        return auth.verify_id_token(token, check_revoked=True)
    except (auth.InvalidIdTokenError, auth.ExpiredIdTokenError, auth.RevokedIdTokenError, auth.UserDisabledError, ValueError):
        raise HTTPException(401, "Invalid or expired Firebase ID token")
    except auth.CertificateFetchError:
        raise HTTPException(503, "Authentication verification temporarily unavailable")


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=120)
    school: str | None = Field(default=None, max_length=160)
    subject: str | None = Field(default=None, max_length=160)


class PreferencesUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    locale: Literal["en", "es"] | None = None
    theme: Literal["light", "dark", "system"] | None = None
    density: Literal["cozy", "compact"] | None = None


def profile_for(user: dict, db):
    uid = user["uid"]
    ref = db.collection("users").document(uid)
    snap = ref.get()
    # Only server-verified custom claims grant teacher access.
    role = "teacher" if user.get("role") == "teacher" else "student"
    if not snap.exists:
        ts = now_utc()
        record = {
            "id": uid,
            "email": str(user.get("email") or "").lower(),
            "name": str(user.get("name") or user.get("email") or "Learner")[:120],
            "role": role,
            "school": "",
            "subject": "",
            "status": "active",
            "preferences": {"locale": "en", "theme": "system", "density": "cozy"},
            "createdAt": ts,
            "updatedAt": ts,
        }
        try:
            ref.create(record)
            return record
        except Conflict:
            snap = ref.get()  # Another request created it first.
    record = snap.to_dict()
    if not record or record.get("status") != "active":
        raise HTTPException(403, "Account is not active")
    # Email and role are sourced from the verified Firebase token, not the client body.
    changes = {}
    email = str(user.get("email") or "").lower()
    if record.get("email") != email:
        changes["email"] = email
    if record.get("role") != role:
        changes["role"] = role
    if changes:
        changes["updatedAt"] = now_utc()
        ref.update(changes)
        record.update(changes)
    return record


@app.get("/")
def root():
    return {"app": "LearnLite", "status": "online", "version": "0.2.0"}


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0", "timestamp": now_utc()}


@app.get("/api/v1/config")
def config():
    return {"supportedLocales": ["en", "es"], "maxUploadBytes": 52_428_800,
            "maxHearts": 5, "offline": {"enabled": False},
            "features": {"community": False, "notifications": False}}


@app.post("/api/v1/me/bootstrap")
def bootstrap(user: dict = Depends(get_current_user), db=Depends(get_db)):
    return profile_for(user, db)


@app.get("/api/v1/me")
def me(user: dict = Depends(get_current_user), db=Depends(get_db)):
    return profile_for(user, db)


@app.patch("/api/v1/me")
def patch_me(input: ProfileUpdate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    profile_for(user, db)
    changes = input.model_dump(exclude_unset=True, exclude_none=True)
    if changes:
        changes["updatedAt"] = now_utc()
        db.collection("users").document(user["uid"]).update(changes)
    return profile_for(user, db)


@app.get("/api/v1/me/preferences")
def preferences(user: dict = Depends(get_current_user), db=Depends(get_db)):
    return profile_for(user, db)["preferences"]


@app.patch("/api/v1/me/preferences")
def patch_preferences(input: PreferencesUpdate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    profile_for(user, db)
    changes = input.model_dump(exclude_unset=True, exclude_none=True)
    if changes:
        ref = db.collection("users").document(user["uid"])
        ref.update({**{f"preferences.{key}": value for key, value in changes.items()}, "updatedAt": now_utc()})
    return profile_for(user, db)["preferences"]

app.include_router(
    classroom_router(get_current_user, get_db, profile_for)
)
from app.learning import learning_router

app.include_router(
    learning_router(get_current_user, get_db, profile_for)
)

from app.authoring import authoring_router

app.include_router(
    authoring_router(get_current_user, get_db, profile_for)
)

from app.members import members_router

app.include_router(
    members_router(get_current_user, get_db, profile_for)
)

from app.learner import learner_router

app.include_router(
    learner_router(get_current_user, get_db, profile_for)
)

from app.assessments import assessments_router

app.include_router(
    assessments_router(get_current_user, get_db, profile_for)
)

from app.offline_sync import sync_router

app.include_router(
    sync_router(get_current_user, get_db, profile_for)
)

from app.phase7 import phase7_router

app.include_router(
    phase7_router(get_current_user, get_db, profile_for)
)

# Legacy course endpoints retained from the backend foundation.

class CourseCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(default="", max_length=2000)


@app.get("/api/v1/courses")
def list_courses(
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    docs = db.collection("courses").limit(25).stream()
    return {
        "courses": [
            {"id": doc.id, **doc.to_dict()}
            for doc in docs
        ]
    }


@app.post("/api/v1/courses", status_code=201)
def create_course(
    course: CourseCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if user.get("role") not in ("admin", "editor"):
        raise HTTPException(
            status_code=403,
            detail="Course editor role required",
        )

    data = {
        "title": course.title,
        "description": course.description,
        "created_by": user["uid"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    ref = db.collection("courses").document()
    ref.set(data)
    return {"id": ref.id, **data}
