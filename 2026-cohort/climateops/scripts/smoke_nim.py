#!/usr/bin/env python3
"""Blanca's first task (DEC-06): ONE real NVIDIA call to prove key + model id work.
  export NVIDIA_API_KEY=...   (from build.nvidia.com; never commit it)
  export NVIDIA_MODEL_ID=...  (copy the exact id from the model's page on build.nvidia.com)
  python scripts/smoke_nim.py
Prints OK/FAIL and the HTTP status. Record the working model id in docs/00-governance/decision-log.md."""
import os, sys
import httpx

key, model = os.getenv("NVIDIA_API_KEY", ""), os.getenv("NVIDIA_MODEL_ID", "")
base = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1").rstrip("/")
if not key or key.startswith("SET_VIA") or not model or model == "TBD":
    sys.exit("Set NVIDIA_API_KEY and NVIDIA_MODEL_ID in your shell first (not in a file that gets committed).")
r = httpx.post(f"{base}/chat/completions", timeout=60,
               headers={"Authorization": f"Bearer {key}"},
               json={"model": model, "max_tokens": 20, "messages": [{"role": "user", "content": "Reply with the single word: ready"}]})
print("HTTP", r.status_code)
if r.status_code == 200:
    print("OK:", r.json()["choices"][0]["message"]["content"].strip())
else:
    print("FAIL:", r.text[:300])  # body never contains your key
    sys.exit(1)
