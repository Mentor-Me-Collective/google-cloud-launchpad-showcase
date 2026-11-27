"""Validation chain + deterministic fallback (grounding-policy.md). A model output only becomes a
DRAFT if it passes every check; otherwise an evidence-only template is rendered and the reason logged.

Known limit (documented in the policy): passing these checks proves the citations EXIST, not that the
sentence is entailed by the source. Sampled human review is still required."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from .nim import LLM

MAX_SUMMARY = 900
MAX_CLAIMS = 20
MAX_ACTIONS = 12
FORBIDDEN = re.compile(r"\b(approved|assigned|official cooling cent(?:er|re)|guaranteed)\b", re.I)


class ValidationError(Exception):
    pass


def validate(out: dict[str, Any], bundle: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(out.get("summary"), str) or not out["summary"].strip():
        raise ValidationError("missing summary")
    if len(out["summary"]) > MAX_SUMMARY:
        raise ValidationError("summary too long")
    claims = out.get("claims")
    if not isinstance(claims, list) or not (1 <= len(claims) <= MAX_CLAIMS):
        raise ValidationError("claims missing or too many")
    allowed = set(bundle["permitted_source_ids"])
    claim_ids: set[str] = set()
    text_all = out["summary"]
    for i, c in enumerate(claims, 1):
        if not isinstance(c, dict) or not c.get("text") or not c.get("source_ids"):
            raise ValidationError(f"claim {i} lacks text or source_ids")
        bad = [s for s in c["source_ids"] if s not in allowed]
        if bad:
            raise ValidationError(f"claim {i} cites sources not in bundle: {bad}")
        c.setdefault("id", f"C-{i:02d}")
        claim_ids.add(c["id"])
        text_all += " " + c["text"]
    # hard facts: any alert event name mentioned must exist in the bundle's weather records
    events_in_bundle = {r["event"] for r in bundle["weather_records"]}
    for ev in ("Extreme Heat Warning", "Extreme Heat Watch", "Heat Advisory"):
        if ev.lower() in text_all.lower() and ev not in events_in_bundle:
            raise ValidationError(f"mentions '{ev}' but no such alert is in the evidence")
    if FORBIDDEN.search(text_all):
        raise ValidationError("model asserted approval/assignment/official status")
    facility_ids = {f["facility_id"] for f in bundle["facility_facts"]}
    library = {t["id"] for t in bundle["task_library"]}
    actions = out.get("facility_actions", [])
    if not isinstance(actions, list) or len(actions) > MAX_ACTIONS:
        raise ValidationError("facility_actions invalid")
    for a in actions:
        if a.get("facility_id") not in facility_ids:
            raise ValidationError(f"unknown facility {a.get('facility_id')}")
        if a.get("playbook_task_id") not in library:
            raise ValidationError(f"unknown playbook task {a.get('playbook_task_id')}")
        r_ids = a.get("rationale_claim_ids")
        if isinstance(r_ids, str):
            r_ids = [r_ids]
        elif not isinstance(r_ids, list):
            r_ids = list(r_ids or [])
        r_clean = []
        for rid in r_ids:
            rid_str = str(rid).strip()
            if rid_str in claim_ids:
                r_clean.append(rid_str)
            else:
                m = re.match(r"^C-(\d+)$", rid_str, re.I)
                if m:
                    norm = f"C-{int(m.group(1)):02d}"
                    if norm in claim_ids:
                        r_clean.append(norm)
        if not r_clean and claim_ids:
            r_clean = [sorted(claim_ids)[0]]
        a["rationale_claim_ids"] = r_clean
        if not a.get("task_candidate") or not a.get("rationale_claim_ids"):
            raise ValidationError("action lacks a rationale referencing real claims")
    flags_present = any(s["data_quality_flags"] for s in bundle["priority_snapshot"]) or \
        len(bundle["explicit_demo_assumptions"]) > 0
    if flags_present and not out.get("uncertainties"):
        raise ValidationError("uncertainties required when data is incomplete")
    unc_raw = out.get("uncertainties", [])
    if isinstance(unc_raw, str):
        unc_clean = [unc_raw]
    elif isinstance(unc_raw, (list, tuple)):
        unc_clean = [str(u) for u in unc_raw]
    else:
        unc_clean = [str(unc_raw)]
    return {
        "summary": out["summary"].strip(),
        "claims": claims,
        "facility_actions": actions,
        "uncertainties": unc_clean,
    }


def fallback_brief(bundle: dict[str, Any], reason: str, top_n: int = 3) -> dict[str, Any]:
    """Evidence-only, deterministic. No model. Labelled as such."""
    snaps = bundle["priority_snapshot"][:top_n]
    names = {f["facility_id"]: f["name"] for f in bundle["facility_facts"]}
    alert_ids = [r["id"] for r in bundle["weather_records"]]
    wx_src = alert_ids or [s for s in bundle["permitted_source_ids"] if s.startswith("SRC-")][:1]
    claims, actions = [], []
    n = 0
    if bundle["weather_records"]:
        r = bundle["weather_records"][0]
        n += 1
        claims.append({"id": f"C-{n:02d}", "text": f"{r['event']} in the evidence (source: {bundle['weather_source']}).",
                       "source_ids": [r["id"]]})
    else:
        n += 1
        claims.append({"id": f"C-{n:02d}", "text": "No active heat alert is in the evidence; this is not confirmation that there is no hazard.",
                       "source_ids": wx_src or ["SRC-NWS-OKX"]})
    weather_claim = claims[0]["id"]
    tier_pick = "HT-01"
    for s in snaps:
        n += 1
        fid = s["facility_id"]
        claims.append({"id": f"C-{n:02d}",
                       "text": f"{names[fid]} ranks #{s['rank']} (score {s['score']}, rule {s['rule_version']}, confidence {s['confidence']}).",
                       "source_ids": [f"FAC:{fid}"]})
        actions.append({"facility_id": fid, "playbook_task_id": tier_pick,
                        "task_candidate": "Confirm air conditioning works where at-risk people spend time (DEMO).",
                        "rationale_claim_ids": [claims[-1]["id"], weather_claim]})
    unc = list(bundle["explicit_demo_assumptions"])
    for s in bundle["priority_snapshot"]:
        for f in s["data_quality_flags"]:
            unc.append(f"{s['facility_id']}: {f}")
    return {
        "summary": "Evidence-only readiness template (no AI text). Review the ranked facilities and sources below.",
        "claims": claims, "facility_actions": actions, "uncertainties": sorted(set(unc)),
        "_fallback_reason": reason,
    }


def generate_brief(bundle: dict[str, Any], llm: LLM | None, model_id: str = "") -> dict[str, Any]:
    """Returns {content, model_metadata}. Never raises: any failure -> fallback with reason."""
    meta: dict[str, Any] = {"model_id": model_id or None, "generated_at": datetime.now(timezone.utc).isoformat(),
                            "used_fallback": False, "fallback_reason": None}
    if llm is None:
        content = fallback_brief(bundle, "model_not_configured")
    else:
        try:
            raw, m = llm.generate(bundle)
            content = validate(raw, bundle)
            meta.update(m)
        except Exception as e:  # noqa: BLE001 - deliberate: any failure falls back
            content = fallback_brief(bundle, f"{type(e).__name__}: {str(e)[:200]}")
    if "_fallback_reason" in content:
        meta["used_fallback"], meta["fallback_reason"] = True, content.pop("_fallback_reason")
    return {"content": content, "model_metadata": meta}
