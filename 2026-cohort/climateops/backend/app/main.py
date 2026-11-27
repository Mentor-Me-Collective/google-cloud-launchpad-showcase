"""FastAPI entrypoint. Routes follow docs/03-architecture/interfaces/api-contract.md.
Run:  uvicorn app.main:app --reload --port 8080   (from backend/)"""

import hmac
import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .auth import Principal, current_principal, err, require_role
from .config import ROOT, Settings, get_settings
from .nim import NimClient
from .vision import VisionClient
from .services import Service
from .store import make_store

log = logging.getLogger("climateops")
PROVENANCE = {"PUBLIC_VERIFIED", "DEMO_SYNTHETIC", "UNKNOWN"}


def build_service(settings: Settings | None = None, llm=None, store=None, vision=None) -> Service:
    cfg = settings or get_settings()
    store = store or make_store(cfg.store_backend, cfg.google_project)
    if llm is None and cfg.nvidia_ready:
        llm = NimClient(cfg.nvidia_api_key, cfg.nvidia_model_id, cfg.nvidia_base_url)
    if vision is None and cfg.nvidia_ready and cfg.nvidia_vision_model_id:
        vision = VisionClient(cfg.nvidia_api_key, cfg.nvidia_vision_model_id, cfg.nvidia_base_url)
    svc = Service(store, cfg, llm, vision=vision)
    return svc


def create_app(service: Service | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        svc = service or build_service()
        if svc.cfg.demo_mode:
            svc.seed_demo()  # idempotent; refreshes DEMO facility statuses so they are not 'stale' on demo day
        svc.ingest_weather()
        app.state.svc = svc
        log.info("ClimateOps ready: demo_mode=%s model_configured=%s", svc.cfg.demo_mode, svc.llm is not None)
        yield

    app = FastAPI(title="ClimateOps", version="0.1.0", lifespan=lifespan)

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        # Browser hardening (docs/06-security/threat-model.md). frame-ancestors blocks clickjacking
        # without breaking the console's inline script.
        resp = await call_next(request)
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers["Referrer-Policy"] = "no-referrer"
        resp.headers["Content-Security-Policy"] = "frame-ancestors 'none'"
        if request.url.path.startswith("/api/"):
            resp.headers["Cache-Control"] = "no-store"
        return resp

    def svc_dep(request: Request) -> Service:
        return request.app.state.svc

    def rid(x_request_id: str | None = Header(default=None)) -> str:
        return x_request_id or str(uuid.uuid4())

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception):  # never leak internals
        log.exception("unhandled error")
        return JSONResponse(status_code=500, content={"code": "internal_error", "message": "Internal error",
                                                      "request_id": request.headers.get("x-request-id", "")})

    @app.exception_handler(RequestValidationError)
    async def bad_request(request: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content={"code": "validation_error", "message": "Invalid request",
                                                      "errors": [e["msg"] + ": " + ".".join(map(str, e["loc"])) for e in exc.errors()]})

    from fastapi import HTTPException

    @app.exception_handler(HTTPException)
    async def http_err(request: Request, exc: HTTPException):
        body = exc.detail if isinstance(exc.detail, dict) else {"code": "error", "message": str(exc.detail)}
        body = {**body, "request_id": request.headers.get("x-request-id", "")}
        return JSONResponse(status_code=exc.status_code, content=body)

    @app.get("/healthz")
    def healthz(s: Service = Depends(svc_dep)):
        return {"ok": True, "demo_mode": s.cfg.demo_mode, "model_configured": s.llm is not None,
                "store": s.cfg.store_backend}

    # ---- internal ingest (Cloud Scheduler) ----
    @app.post("/internal/ingest")
    def ingest(x_ingest_token: str | None = Header(default=None), s: Service = Depends(svc_dep)):
        # Constant-time compare so response timing cannot reveal how much of the token was right.
        if not s.cfg.ingest_token or not x_ingest_token or not hmac.compare_digest(
                x_ingest_token.encode(), s.cfg.ingest_token.encode()):
            raise err(403, "forbidden", "Invalid ingest token")
        doc = s.ingest_weather()
        return {"status": doc["status"], "source": doc["source"], "records": len(doc["records"])}

    api = "/api/v1"

    @app.get(f"{api}/me")
    def me(p: Principal = Depends(current_principal)):
        return p.__dict__

    @app.get(f"{api}/weather/status")
    def weather_status(_: Principal = Depends(current_principal), s: Service = Depends(svc_dep)):
        return s.weather_status()

    # ---- facilities ----
    # Input validation (owner: Shiksha). IDs are plain characters only; names cannot carry HTML or
    # control characters (the console renders some text as HTML); sources must be HTTPS links.
    SAFE_ID = r"^[A-Za-z0-9_\-]+$"
    SAFE_TEXT = r"^[^<>\x00-\x1f\x7f]+$"

    class FacilityIn(BaseModel):
        facility_id: str = Field(min_length=2, max_length=40, pattern=SAFE_ID)
        name: str = Field(min_length=2, max_length=120, pattern=SAFE_TEXT)
        lat: float = Field(ge=-90, le=90)
        lon: float = Field(ge=-180, le=180)
        provenance: Literal["PUBLIC_VERIFIED", "DEMO_SYNTHETIC", "UNKNOWN"]
        source_url: str | None = Field(default=None, max_length=500, pattern=r"^https://[^\s<>\"']+$")

    @app.post(f"{api}/facilities", status_code=201)
    def add_facility(body: FacilityIn, p: Principal = Depends(require_role("manager")),
                     s: Service = Depends(svc_dep), request_id: str = Depends(rid)):
        if body.provenance == "PUBLIC_VERIFIED" and not body.source_url:
            raise err(422, "source_required", "PUBLIC_VERIFIED facilities need source_url")
        # Facility data privacy: only check for duplicates inside the caller's own organization, and
        # store under a tenant-scoped key. Before, a global check answered "already exists" for another
        # organization's IDs, which let one tenant discover another tenant's facilities.
        if any(f["facility_id"] == body.facility_id for f in s.s.list("facilities", tenant_id=p.tenant_id)):
            raise err(409, "exists", "facility_id already exists in your organization")
        doc = {**body.model_dump(), "tenant_id": p.tenant_id, "status": None}
        with s.s.transaction():
            s.s.put("facilities", f"{p.tenant_id}__{body.facility_id}", doc)
            s.event(p, p.tenant_id, "facility.created", body.facility_id, None, "ACTIVE", request_id)
        return doc

    @app.get(f"{api}/facilities")
    def list_facilities(p: Principal = Depends(current_principal), s: Service = Depends(svc_dep)):
        return s.s.list("facilities", tenant_id=p.tenant_id)

    @app.get(f"{api}/priorities")
    def priorities(p: Principal = Depends(require_role("manager", "validator")), s: Service = Depends(svc_dep)):
        return s.priorities(p)

    # ---- briefs ----
    @app.post(f"{api}/briefs/generate", status_code=201)
    def gen(p: Principal = Depends(require_role("manager")), s: Service = Depends(svc_dep), r: str = Depends(rid)):
        return s.generate_brief(p, r)

    @app.get(f"{api}/briefs")
    def briefs(p: Principal = Depends(require_role("manager", "validator")), s: Service = Depends(svc_dep)):
        return s.s.list("briefs", tenant_id=p.tenant_id)

    @app.get(f"{api}/briefs/{{bid}}")
    def brief(bid: str, p: Principal = Depends(require_role("manager", "validator")), s: Service = Depends(svc_dep)):
        return s.guard_tenant(p, s.s.get("briefs", bid), "Brief")

    class EditIn(BaseModel):
        summary: str = Field(min_length=1, max_length=900, pattern=r"^[^<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]+$")

    @app.patch(f"{api}/briefs/{{bid}}")
    def edit(bid: str, body: EditIn, p: Principal = Depends(require_role("manager")),
             s: Service = Depends(svc_dep), r: str = Depends(rid)):
        return s.edit_brief(p, bid, body.summary, r)

    @app.post(f"{api}/briefs/{{bid}}/submit")
    def submit(bid: str, p: Principal = Depends(require_role("manager")), s: Service = Depends(svc_dep), r: str = Depends(rid)):
        return s.submit(p, bid, r)

    class DecisionIn(BaseModel):
        expected_version: int = Field(ge=1)
        expected_content_hash: str = Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9:_\-]+$")
        idempotency_key: str = Field(min_length=6, max_length=100, pattern=SAFE_ID)
        reason: str | None = Field(default=None, max_length=500, pattern=SAFE_TEXT)

    @app.post(f"{api}/briefs/{{bid}}/approve")
    def approve(bid: str, body: DecisionIn, p: Principal = Depends(require_role("manager")),
                s: Service = Depends(svc_dep), r: str = Depends(rid)):
        return s.decide(p, bid, "approve", body.expected_version, body.expected_content_hash,
                        body.idempotency_key, body.reason, r)

    @app.post(f"{api}/briefs/{{bid}}/reject")
    def reject(bid: str, body: DecisionIn, p: Principal = Depends(require_role("manager")),
               s: Service = Depends(svc_dep), r: str = Depends(rid)):
        return s.decide(p, bid, "reject", body.expected_version, body.expected_content_hash,
                        body.idempotency_key, body.reason, r)

    # ---- tasks ----
    class TaskCreateIn(BaseModel):
        brief_id: str = Field(min_length=3, max_length=40, pattern=SAFE_ID)
        idempotency_key: str = Field(min_length=6, max_length=100, pattern=SAFE_ID)

    @app.post(f"{api}/tasks", status_code=201)
    def create_tasks(body: TaskCreateIn, p: Principal = Depends(require_role("manager")),
                     s: Service = Depends(svc_dep), r: str = Depends(rid)):
        return s.create_tasks(p, body.brief_id, body.idempotency_key, r)

    @app.get(f"{api}/tasks")
    def tasks(p: Principal = Depends(current_principal), s: Service = Depends(svc_dep)):
        ts = s.s.list("tasks", tenant_id=p.tenant_id)
        return [t for t in ts if p.role != "staff" or t["assignee_id"] == p.actor_id]

    class TaskPatch(BaseModel):
        status: Literal["IN_PROGRESS"]

    @app.patch(f"{api}/tasks/{{tid}}")
    def patch_task(tid: str, body: TaskPatch, p: Principal = Depends(require_role("manager", "staff")),
                   s: Service = Depends(svc_dep), r: str = Depends(rid)):
        return s.start_task(p, tid, r)

    class UploadReq(BaseModel):
        content_type: str = Field(default="image/jpeg", max_length=40, pattern=r"^[a-z]+/[a-z0-9.+\-]+$")

    @app.post(f"{api}/tasks/{{tid}}/evidence/upload-url")
    def upload_url(tid: str, body: UploadReq, p: Principal = Depends(require_role("manager", "staff")),
                   s: Service = Depends(svc_dep), r: str = Depends(rid)):
        return s.issue_upload(p, tid, body.content_type, r)

    @app.get(f"{api}/integrations/status")
    def integrations(p: Principal = Depends(require_role("manager", "validator")), s: Service = Depends(svc_dep)):
        briefs = sorted(s.s.list("briefs", tenant_id=p.tenant_id), key=lambda b: b["created_at"])
        return s.integrations(briefs[-1] if briefs else None)

    class EvidenceIn(BaseModel):
        object_path: str = Field(min_length=3, max_length=300, pattern=r"^[A-Za-z0-9_\-./]+$")
        sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
        note: str = Field(default="", max_length=500)

    @app.post(f"{api}/tasks/{{tid}}/evidence")
    def evidence(tid: str, body: EvidenceIn, p: Principal = Depends(require_role("manager", "staff")),
                 s: Service = Depends(svc_dep), r: str = Depends(rid)):
        return s.submit_evidence(p, tid, body.object_path, body.sha256, body.note, r)

    class PhotoIn(BaseModel):
        image_base64: str = Field(min_length=8, max_length=7_200_000)
        content_type: Literal["image/jpeg", "image/png"] = "image/jpeg"
        note: str = Field(default="", max_length=500)

    @app.post(f"{api}/tasks/{{tid}}/evidence/photo")
    def evidence_photo(tid: str, body: PhotoIn, p: Principal = Depends(require_role("manager", "staff")),
                       s: Service = Depends(svc_dep), r: str = Depends(rid)):
        """Upload the proof photo itself; returns the task with an advisory AI check (DEC-09)."""
        return s.submit_photo_evidence(p, tid, body.image_base64, body.content_type, body.note, r)

    class VerifyIn(BaseModel):
        decision: Literal["accept", "reject"]
        note: str = Field(default="", max_length=500)

    @app.post(f"{api}/tasks/{{tid}}/verify")
    def verify(tid: str, body: VerifyIn, p: Principal = Depends(require_role("manager")),
               s: Service = Depends(svc_dep), r: str = Depends(rid)):
        return s.verify(p, tid, body.decision, body.note, r)

    @app.get(f"{api}/events")
    def events(p: Principal = Depends(require_role("manager", "validator")), s: Service = Depends(svc_dep)):
        ev = sorted(s.s.list("events", tenant_id=p.tenant_id), key=lambda e: e["occurred_at"])
        return ev  # TODO: cursor pagination (api-contract.md)

    web = ROOT / "web"
    if web.exists():
        app.mount("/static", StaticFiles(directory=web), name="static")

        @app.get("/", include_in_schema=False)
        def index():
            return FileResponse(web / "index.html")

    return app


app = create_app()
