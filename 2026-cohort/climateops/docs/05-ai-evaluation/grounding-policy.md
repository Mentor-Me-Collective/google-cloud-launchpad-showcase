# Grounded generation policy — NVIDIA model

**Owners:** AI Research and Justin; validation Kseniya; implementation Blanca.

## Allowed role of AI

Convert a validated, finite evidence bundle into a clear, cited readiness brief for manager review. AI may simplify language, organize candidate tasks, disclose uncertainty and summarize sources. It may **not** decide scores, infer actual staffing/building condition, claim official center status, approve work or create tasks.

## Input policy

Evidence bundle includes `{bundle_id, fetched_at, weather_records[], facility_facts[], priority_snapshot, explicit_demo_assumptions[], permitted_source_ids[]}`. Keep the NVIDIA key server-side; avoid real personal data and private uploaded photos in prompts.

## Output contract

```json
{
  "brief_version": 1,
  "summary": "...",
  "claims": [{"text":"...", "source_ids":["SRC-NWS-001"]}],
  "facility_actions": [{"facility_id":"DEMO-01", "task_candidate":"...", "rationale_claim_ids":["C-01"]}],
  "uncertainties": ["..."],
  "model_metadata": {"model_id":"TBD", "generated_at":"TBD"}
}
```

## Validation chain

1. Validate JSON/schema and output length.
2. Reject all source IDs absent from provided evidence bundle.
3. Verify weather times, alert severity, locations and numeric values against authoritative records; use deterministic checks for hard facts.
4. Check every human-readable claim has support; require sampled manual evaluation for semantic entailment.
5. Require uncertainty disclosure for missing status/readiness inputs.
6. On error, render an evidence-only deterministic template and log fallback reason.
7. Release as `DRAFT`, never approved or assigned.

## Known limits

A syntactically valid reference may not support a statement; entailment review remains necessary. A model can summarize real conditions incorrectly despite a valid source URL. The human manager must see original-source access and freshness.
