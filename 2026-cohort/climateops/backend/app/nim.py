"""NVIDIA NIM client (build.nvidia.com API Catalog, OpenAI-compatible chat endpoint).

UNVERIFIED until Blanca makes one real call (decision DEC-06): the model id, and whether the chosen
model honours response_format. Run `python scripts/smoke_nim.py` once the key is in the environment.
The key is read from the environment only (Secret Manager in Cloud Run) and is never logged.
"""
from __future__ import annotations

import json
import os
import re
import time
from typing import Any, Protocol

import httpx

SYSTEM_PROMPT = """You write a short heat-readiness brief for a facility manager.
You may ONLY use facts in the provided evidence bundle JSON. Rules:
- Output a single JSON object and nothing else.
- Every claim must list source_ids copied exactly from permitted_source_ids.
- Do not invent scores, ranks, staffing, building conditions, or official cooling-center status.
- Do not decide anything; the human manager approves. Do not say tasks are approved or assigned.
- For each facility action, pick a playbook task id from task_library and cite claim ids that justify it.
- If any data_quality_flags or assumptions limit what is known, list them in "uncertainties".
Schema: {"summary": str, "claims": [{"id":"C-01","text":str,"source_ids":[str]}],
"facility_actions": [{"facility_id":str,"playbook_task_id":str,"task_candidate":str,"rationale_claim_ids":[str]}],
"uncertainties":[str]}"""


class LLM(Protocol):
    def generate(self, bundle: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
        """Return (parsed_json, metadata). Raise on any failure."""


class NimClient:
    def __init__(self, api_key: str, model_id: str, base_url: str,
                 timeout: float = float(os.getenv("NVIDIA_TIMEOUT", "75.0")),
                 client: httpx.Client | None = None) -> None:
        self._key, self.model_id, self._base = api_key, model_id, base_url.rstrip("/")
        self._client = client or httpx.Client(timeout=timeout)

    def generate(self, bundle: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
        payload = {
            "model": self.model_id,
            "temperature": 0.1,
            "max_tokens": 1500,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(bundle, ensure_ascii=False)},
            ],
        }
        t0 = time.monotonic()
        r = self._client.post(
            f"{self._base}/chat/completions",
            headers={"Authorization": f"Bearer {self._key}", "Accept": "application/json"},
            json=payload,
        )
        r.raise_for_status()
        body = r.json()
        text = body["choices"][0]["message"]["content"]
        # integration trace shown in the demo and README: proves a real call happened
        meta = {"model_id": self.model_id, "provider": "nvidia-nim", "latency_ms": int((time.monotonic() - t0) * 1000),
                "usage": body.get("usage"), "provider_response_id": body.get("id")}
        return extract_json(text), meta


def extract_json(text: str) -> dict[str, Any]:
    """Models sometimes wrap JSON in prose or code fences. Pull out the first object."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S)
    if fence:
        text = fence.group(1)
    else:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            raise ValueError("no JSON object in model output")
        text = text[start : end + 1]
    obj = json.loads(text)
    if not isinstance(obj, dict):
        raise ValueError("model output is not a JSON object")
    return obj
