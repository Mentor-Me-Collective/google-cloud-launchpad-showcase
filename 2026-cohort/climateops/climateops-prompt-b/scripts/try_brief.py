#!/usr/bin/env python3
"""Generate one readiness brief locally with the app's real code path (DEC-08 check).
Uses the in-memory store and DEMO data, then calls NVIDIA with the app's SYSTEM_PROMPT and runs the
same validation chain as the live app. Nothing is written to Firestore.
  export NVIDIA_API_KEY=...   (never commit it)
  export NVIDIA_MODEL_ID=nvidia/nemotron-3.5-bolt-e4b   (optional; this is the default)
  python scripts/try_brief.py
Prints whether the AI brief passed validation or fell back to the template, and why."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
os.environ.setdefault("STORE_BACKEND", "memory")
os.environ.setdefault("DEMO_MODE", "true")

from app.auth import Principal  # noqa: E402
from app.main import build_service  # noqa: E402

svc = build_service()
if svc.llm is None:
    sys.exit("FAIL: NVIDIA_API_KEY is not set, so the app would use the template.")
svc.seed_demo()
svc.ingest_weather()
brief = svc.generate_brief(Principal("manager_demo_a1", "demo-a", "manager"), "try-brief")
meta, c = brief["model_metadata"], brief["content"]

print("Model:", meta.get("model_id"), "| latency:", meta.get("latency_ms"), "ms")
if meta["used_fallback"]:
    print("FALLBACK (template used). Reason:", meta["fallback_reason"])
else:
    print("OK: AI brief passed every validation check")
print("\nSUMMARY:", c["summary"])
print("\nCLAIMS:")
for cl in c["claims"]:
    print(f"  {cl['id']}: {cl['text']}  {cl['source_ids']}")
print("\nACTIONS:")
for a in c["facility_actions"]:
    print(f"  {a['facility_id']} {a['playbook_task_id']}: {a['task_candidate']}")
print("\nUNCERTAINTIES:")
for u in c["uncertainties"]:
    print("  -", u)
