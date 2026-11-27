#!/usr/bin/env python3
"""End-to-end walkthrough against a RUNNING server (default http://localhost:8080):
generate -> submit -> try tasks too early (must fail) -> approve -> create tasks -> start -> proof -> verify.
Use it to rehearse the Nov 6 demo and as a smoke test after deploys:  python scripts/demo_flow.py [BASE_URL]"""
import sys, uuid
import httpx

base = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/") + "/api/v1"
M, S = {"Authorization": "Bearer demo-manager-a"}, {"Authorization": "Bearer demo-staff-a"}
c = httpx.Client(timeout=120)

def step(label, r, ok=(200, 201)):
    print(f"{'PASS' if r.status_code in ok else 'FAIL'} {r.status_code} {label}")
    if r.status_code not in ok:
        print("   ", r.text[:300]); sys.exit(1)
    return r.json()

w = step("weather status", c.get(base + "/weather/status", headers=M)); print("   badge:", w["badge"], w["freshness"])
b = step("generate brief", c.post(base + "/briefs/generate", headers=M))
print("   status:", b["status"], "| fallback:", b["model_metadata"]["used_fallback"], b["model_metadata"]["fallback_reason"])
step("submit", c.post(f"{base}/briefs/{b['id']}/submit", headers=M))
step("tasks BEFORE approval are blocked", c.post(base + "/tasks", headers=M, json={"brief_id": b["id"], "idempotency_key": uuid.uuid4().hex}), ok=(409,))
step("staff cannot approve", c.post(f"{base}/briefs/{b['id']}/approve", headers=S, json={"expected_version": b["version"], "expected_content_hash": b["content_hash"], "idempotency_key": uuid.uuid4().hex}), ok=(403,))
step("manager approves exact version", c.post(f"{base}/briefs/{b['id']}/approve", headers=M, json={"expected_version": b["version"], "expected_content_hash": b["content_hash"], "idempotency_key": uuid.uuid4().hex}))
tasks = step("create tasks", c.post(base + "/tasks", headers=M, json={"brief_id": b["id"], "idempotency_key": uuid.uuid4().hex}))
t = tasks[0]
step("staff starts task", c.patch(f"{base}/tasks/{t['id']}", headers=S, json={"status": "IN_PROGRESS"}))
u = step("staff gets upload URL", c.post(f"{base}/tasks/{t['id']}/evidence/upload-url", headers=S, json={"content_type": "image/jpeg"})); print("   mode:", u["mode"])
step("staff submits proof", c.post(f"{base}/tasks/{t['id']}/evidence", headers=S, json={"object_path": u["object_path"], "sha256": "0" * 64, "note": "DEMO proof"}))
step("manager verifies", c.post(f"{base}/tasks/{t['id']}/verify", headers=M, json={"decision": "accept"}))
i = step("integration status", c.get(base + "/integrations/status", headers=M)); print("   nvidia:", i["nvidia"]); print("   gcp:", i["google_cloud"])
ev = step("event history", c.get(base + "/events", headers=M)); print("   events:", len(ev))
print("ALL STEPS PASSED")
