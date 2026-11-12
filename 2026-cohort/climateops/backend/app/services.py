"""Business rules. All state changes + their audit event happen inside store.transaction().
The approval gate (ADR-001) lives HERE, in Service.create_tasks, not in the UI."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from . import nws
from .auth import Principal, err
from .config import Settings
from .evidence import build_bundle, canonical_hash
from .grounding import generate_brief
from .nim import LLM
from .uploads import ALLOWED_TYPES, Signer, make_signer, new_object_path, object_prefix
from .scoring import hazard_from_records, rank_facilities

TIER_DEADLINE_H = {"watch": 24, "advisory_or_warning": 12, "day_of": 4}
TASK_FLOW = {"ASSIGNED": {"IN_PROGRESS"}}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso() -> str:
    return _now().isoformat()


class Service:
    def __init__(self, store, settings: Settings, llm: LLM | None, signer: Signer | None = None) -> None:
        self.s, self.cfg, self.llm = store, settings, llm
        self.signer = signer or make_signer(settings.storage_bucket)
        self.playbook = json.loads((settings.fixtures_dir / "heat_tasks.json").read_text())

    # ---------- seed / weather ----------
    def seed_demo(self) -> None:
        raw = json.loads((self.cfg.fixtures_dir / "demo_orgs.json").read_text())
        for t in raw["tenants"]:
            self.s.put("tenants", t["tenant_id"], t)
        for f in raw["facilities"]:
            f = dict(f)
            st = dict(f["status"])
            hrs = st.pop("as_of_hours_ago")
            st["as_of"] = (_now() - timedelta(hours=hrs)).isoformat()
            f["status"] = st
            self.s.put("facilities", f["facility_id"], f)

    def ingest_weather(self) -> dict[str, Any]:
        """Demo mode: labelled replay fixture. Live mode: NWS point alerts per facility (deduped)."""
        if self.cfg.demo_mode:
            res = nws.load_replay(self.cfg.fixtures_dir)
        else:
            facs = self.s.list("facilities")
            pts = {(round(f["lat"], 3), round(f["lon"], 3)) for f in facs}
            recs: dict[str, dict] = {}
            failed = None
            for lat, lon in sorted(pts):
                r = nws.fetch_alerts_for_point(lat, lon, self.cfg.nws_user_agent)
                if r.status != "ok":
                    failed = r.error
                    continue
                for rec in r.records:
                    recs[rec["id"]] = rec
            res = nws.WeatherResult("failed" if failed and not recs else "ok", "NWS_LIVE", nws.now_iso(),
                                    list(recs.values()), failed)
        doc = {"status": res.status, "source": res.source, "fetched_at": res.fetched_at,
               "records": res.records, "error": res.error}
        # keep last good fetch; a failure must not erase evidence, but status shows the failure
        self.s.put("weather", "latest", doc)
        return doc

    def weather_status(self) -> dict[str, Any]:
        w = self.s.get("weather", "latest")
        if w is None:
            return {"status": "none", "source": None, "freshness": "UNKNOWN", "records": []}
        fr = nws.freshness(w["fetched_at"], self.cfg.stale_after_seconds)
        badge = {"NWS_LIVE": "LIVE", "NWS_REPLAY": "REPLAY", "SIMULATED": "SIMULATED"}.get(w["source"], w["source"])
        return {**w, "freshness": fr, "badge": badge}

    def _hazard(self) -> tuple[dict, dict]:
        w = self.weather_status()
        ok = w["status"] == "ok" and (w["source"] != "NWS_LIVE" or w["freshness"] == "FRESH")
        return w, hazard_from_records(w.get("records", []), ok, _now())

    # ---------- audit ----------
    def event(self, p: Principal | None, tenant_id: str, action: str, entity_id: str,
              prev: str | None, new: str | None, request_id: str, **extra: Any) -> None:
        eid = str(uuid.uuid4())
        self.s.put("events", eid, {
            "event_id": eid, "tenant_id": tenant_id, "event_type": action, "entity_id": entity_id,
            "previous_state": prev, "new_state": new, "actor_role": p.role if p else "system",
            "actor_id": p.actor_id if p else "system", "occurred_at": _iso(), "request_id": request_id, **extra,
        })

    # ---------- tenant guard ----------
    @staticmethod
    def guard_tenant(p: Principal, doc: dict | None, what: str) -> dict:
        if doc is None:
            raise err(404, "not_found", f"{what} not found")
        if doc["tenant_id"] != p.tenant_id:
            raise err(403, "forbidden_tenant", "Resource not accessible")
        return doc

    # ---------- priorities / briefs ----------
    def priorities(self, p: Principal) -> dict[str, Any]:
        w, hazard = self._hazard()
        facs = self.s.list("facilities", tenant_id=p.tenant_id)
        return {"hazard": hazard, "weather": {k: w.get(k) for k in ("badge", "freshness", "fetched_at", "status")},
                "ranking": rank_facilities(facs, hazard, _now())}

    def generate_brief(self, p: Principal, request_id: str) -> dict[str, Any]:
        w, hazard = self._hazard()
        facs = self.s.list("facilities", tenant_id=p.tenant_id)
        if not facs:
            raise err(422, "no_facilities", "Tenant has no facilities")
        snaps = rank_facilities(facs, hazard, _now())
        bundle = build_bundle(
            tenant_id=p.tenant_id, fetched_at=w.get("fetched_at") or _iso(),
            weather_source=w.get("source") or "NONE", weather_records=w.get("records", []),
            weather_status="ok" if hazard["status"] == "ok" else "failed",
            facilities=sorted(facs, key=lambda f: f["facility_id"]), snapshots=snaps, playbook=self.playbook,
        )
        out = generate_brief(bundle, self.llm, self.cfg.nvidia_model_id)
        bid = "BR-" + uuid.uuid4().hex[:8]
        brief = {
            "id": bid, "tenant_id": p.tenant_id, "version": 1, "status": "DRAFT", "bundle": bundle,
            "content": out["content"], "model_metadata": out["model_metadata"], "created_by": p.actor_id,
            "created_at": _iso(), "active_approval_id": None,
        }
        brief["content_hash"] = self._hash(brief)
        with self.s.transaction():
            self.s.put("briefs", bid, brief)
            self.event(p, p.tenant_id, "brief.generated", bid, None, "DRAFT", request_id,
                       content_version=1, used_fallback=out["model_metadata"]["used_fallback"])
        return brief

    @staticmethod
    def _hash(brief: dict) -> str:
        return canonical_hash({"content": brief["content"], "bundle_id": brief["bundle"]["bundle_id"],
                               "version": brief["version"]})

    def edit_brief(self, p: Principal, bid: str, summary: str | None, request_id: str) -> dict:
        with self.s.transaction():
            b = self.guard_tenant(p, self.s.get("briefs", bid), "Brief")
            if b["status"] in {"ASSIGNED", "SUPERSEDED"}:
                raise err(409, "replan_required", "Tasks already assigned; cancel/replan explicitly")
            prev = b["status"]
            if b.get("active_approval_id"):  # material edit voids approval
                a = self.s.get("approvals", b["active_approval_id"])
                a["active"] = False
                self.s.put("approvals", a["id"], a)
                b["active_approval_id"] = None
            if summary is not None:
                b["content"]["summary"] = summary
            b["version"] += 1
            b["status"] = "DRAFT"
            b["content_hash"] = self._hash(b)
            self.s.put("briefs", bid, b)
            self.event(p, p.tenant_id, "brief.edited", bid, prev, "DRAFT", request_id, content_version=b["version"])
        return b

    def submit(self, p: Principal, bid: str, request_id: str) -> dict:
        with self.s.transaction():
            b = self.guard_tenant(p, self.s.get("briefs", bid), "Brief")
            if b["status"] != "DRAFT":
                raise err(409, "invalid_state", f"Cannot submit from {b['status']}")
            claims = b["content"].get("claims") or []
            if not claims or any(not c.get("source_ids") for c in claims):
                raise err(422, "missing_citations", "Every claim needs source_ids")
            b["status"] = "PENDING_APPROVAL"
            self.s.put("briefs", bid, b)
            self.event(p, p.tenant_id, "brief.submitted", bid, "DRAFT", "PENDING_APPROVAL", request_id,
                       content_version=b["version"])
        return b

    def decide(self, p: Principal, bid: str, decision: str, expected_version: int,
               expected_content_hash: str, idempotency_key: str, reason: str | None, request_id: str) -> dict:
        with self.s.transaction():
            b = self.guard_tenant(p, self.s.get("briefs", bid), "Brief")
            idem_id = f"{p.tenant_id}:decide:{idempotency_key}"
            prior = self.s.get("idem", idem_id)
            if prior:
                if prior["brief_id"] != bid:
                    raise err(409, "idempotency_conflict", "Key already used for another brief")
                return prior["result"]
            if b["status"] != "PENDING_APPROVAL":
                raise err(409, "invalid_state", f"Brief is {b['status']}, not PENDING_APPROVAL")
            if expected_version != b["version"] or expected_content_hash != b["content_hash"]:
                raise err(409, "stale_version", "Brief changed since you viewed it; reload and review again")
            if decision == "reject" and not reason:
                raise err(422, "reason_required", "A rejection needs a reason")
            aid = "AP-" + uuid.uuid4().hex[:8]
            approved = decision == "approve"
            self.s.put("approvals", aid, {
                "id": aid, "tenant_id": p.tenant_id, "brief_id": bid, "version": b["version"],
                "content_hash": b["content_hash"], "actor_id": p.actor_id, "decision": decision,
                "timestamp": _iso(), "active": approved, "reason": reason, "idempotency_key": idempotency_key,
            })
            new = "APPROVED" if approved else "DRAFT"
            b["status"] = new
            b["active_approval_id"] = aid if approved else None
            self.s.put("briefs", bid, b)
            self.event(p, p.tenant_id, f"brief.{decision}d" if approved else "brief.rejected", bid,
                       "PENDING_APPROVAL", new, request_id, content_version=b["version"], approval_id=aid)
            self.s.put("idem", idem_id, {"brief_id": bid, "result": b})
        return b

    # ---------- THE GATE ----------
    def create_tasks(self, p: Principal, bid: str, idempotency_key: str, request_id: str) -> list[dict]:
        with self.s.transaction():
            b = self.guard_tenant(p, self.s.get("briefs", bid), "Brief")
            idem_id = f"{p.tenant_id}:tasks:{idempotency_key}"
            prior = self.s.get("idem", idem_id)
            if prior:
                return prior["result"]
            ap = self.s.get("approvals", b["active_approval_id"]) if b.get("active_approval_id") else None
            ok = (
                b["status"] == "APPROVED" and ap is not None and ap["active"]
                and ap["decision"] == "approve" and ap["tenant_id"] == p.tenant_id
                and ap["version"] == b["version"] and ap["content_hash"] == b["content_hash"]
            )
            if not ok:
                raise err(409, "approval_required",
                          "No active manager approval for this exact brief version; tasks cannot be created")
            tenant = self.s.get("tenants", p.tenant_id)
            lib = {t["id"]: t for t in self.playbook["tasks"]}
            created = []
            for i, a in enumerate(b["content"]["facility_actions"], 1):
                tier = lib[a["playbook_task_id"]]["tier"]
                tid = f"T-{bid[3:]}-{i:02d}"
                task = {
                    "id": tid, "tenant_id": p.tenant_id, "brief_id": bid, "approved_version": b["version"],
                    "approval_id": ap["id"], "facility_id": a["facility_id"], "playbook_task_id": a["playbook_task_id"],
                    "title": a["task_candidate"], "assignee_role": "staff", "assignee_id": tenant["default_staff_id"],
                    "deadline": (_now() + timedelta(hours=TIER_DEADLINE_H[tier])).isoformat(),
                    "status": "ASSIGNED", "evidence": None,
                }
                self.s.put("tasks", tid, task)
                self.event(p, p.tenant_id, "task.created", tid, None, "ASSIGNED", request_id,
                           content_version=b["version"], approval_id=ap["id"])
                created.append(task)
            b["status"] = "ASSIGNED"
            self.s.put("briefs", bid, b)
            self.event(p, p.tenant_id, "brief.assigned", bid, "APPROVED", "ASSIGNED", request_id)
            self.s.put("idem", idem_id, {"brief_id": bid, "result": created})
        return created

    # ---------- task lifecycle ----------
    def _task_for(self, p: Principal, tid: str) -> dict:
        t = self.guard_tenant(p, self.s.get("tasks", tid), "Task")
        if p.role == "staff" and t["assignee_id"] != p.actor_id:
            raise err(403, "not_assignee", "Task is not assigned to you")
        return t

    def start_task(self, p: Principal, tid: str, request_id: str) -> dict:
        with self.s.transaction():
            t = self._task_for(p, tid)
            if "IN_PROGRESS" not in TASK_FLOW.get(t["status"], set()):
                raise err(409, "invalid_transition", f"{t['status']} -> IN_PROGRESS not allowed")
            prev, t["status"] = t["status"], "IN_PROGRESS"
            self.s.put("tasks", tid, t)
            self.event(p, p.tenant_id, "task.started", tid, prev, t["status"], request_id)
        return t

    def issue_upload(self, p: Principal, tid: str, content_type: str, request_id: str) -> dict:
        t = self._task_for(p, tid)
        if t["status"] != "IN_PROGRESS":
            raise err(409, "invalid_transition", "Start the task before uploading proof")
        if content_type not in ALLOWED_TYPES:
            raise err(422, "unsupported_type", f"Allowed: {sorted(ALLOWED_TYPES)}")
        path = new_object_path(p.tenant_id, tid, content_type)
        url = self.signer.issue(path, content_type)
        self.event(p, p.tenant_id, "task.upload_url_issued", tid, t["status"], t["status"], request_id)
        return {"object_path": path, "upload_url": url, "mode": self.signer.mode, "expires_minutes": 10,
                "content_type": content_type}

    def integrations(self, last_brief: dict | None) -> dict[str, Any]:
        """Truthful status for the demo: what is real right now and what is not."""
        meta = (last_brief or {}).get("model_metadata") or {}
        w = self.weather_status()
        return {
            "google_cloud": {
                "cloud_run": {"running_on_cloud_run": bool(self.cfg.cloud_run_service), "service": self.cfg.cloud_run_service or None},
                "firestore": {"in_use": self.cfg.store_backend == "firestore", "backend": self.cfg.store_backend},
                "cloud_storage": {"in_use": self.signer.mode == "gcs", "mode": self.signer.mode},
                "secret_manager": {"note": "secrets arrive as env vars via Cloud Run --set-secrets", "nvidia_key_present": bool(self.cfg.nvidia_api_key and not self.cfg.nvidia_api_key.startswith("SET_VIA"))},
            },
            "nvidia": {"configured": self.llm is not None, "model_id": self.cfg.nvidia_model_id or None,
                       "last_brief_used_fallback": meta.get("used_fallback"), "last_brief_fallback_reason": meta.get("fallback_reason"),
                       "last_latency_ms": meta.get("latency_ms")},
            "weather": {"source": w.get("source"), "badge": w.get("badge"), "freshness": w.get("freshness")},
            "demo_mode": self.cfg.demo_mode,
        }

    def submit_evidence(self, p: Principal, tid: str, object_path: str, sha256: str, note: str, request_id: str) -> dict:
        with self.s.transaction():
            t = self._task_for(p, tid)
            if t["status"] != "IN_PROGRESS":
                raise err(409, "invalid_transition", "Evidence only accepted while IN_PROGRESS")
            if not object_path.startswith(object_prefix(p.tenant_id, tid)):
                raise err(422, "bad_object_path", "Use the object_path returned by the upload-url endpoint")
            t["evidence"] = {"object_path": object_path, "sha256": sha256, "note": note,
                             "submitted_by": p.actor_id, "submitted_at": _iso(), "review": None}
            prev, t["status"] = t["status"], "COMPLETION_SUBMITTED"
            self.s.put("tasks", tid, t)
            self.event(p, p.tenant_id, "task.evidence_submitted", tid, prev, t["status"], request_id)
        return t

    def verify(self, p: Principal, tid: str, decision: str, note: str, request_id: str) -> dict:
        with self.s.transaction():
            t = self._task_for(p, tid)
            if t["status"] != "COMPLETION_SUBMITTED":
                raise err(409, "invalid_transition", "Nothing to verify")
            if t["evidence"]["submitted_by"] == p.actor_id:
                raise err(403, "self_verification", "Reviewer cannot verify their own submission")
            new = "VERIFIED" if decision == "accept" else "IN_PROGRESS"
            t["evidence"]["review"] = {"decision": decision, "reviewer": p.actor_id, "note": note, "at": _iso()}
            prev, t["status"] = t["status"], new
            self.s.put("tasks", tid, t)
            self.event(p, p.tenant_id, f"task.evidence_{decision}ed" if decision == "accept" else "task.evidence_rejected",
                       tid, prev, new, request_id)
        return t
