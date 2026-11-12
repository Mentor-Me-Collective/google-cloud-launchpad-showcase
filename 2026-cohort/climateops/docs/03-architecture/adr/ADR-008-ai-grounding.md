# ADR-008: Validate AI-generated briefs against a versioned evidence bundle

- **Status:** Proposed
- **Owner:** AI Research, Justin and Kseniya
- **Date:** 2026-10-27

## Context

Generative text can invent weather details, citations and readiness status.

## Decision

Create an evidence bundle with allowed claim IDs; require schema-valid NIM response, resolve all references and validate numeric assertions. Unsupported outputs blocked; deterministic citation-bearing template fallback.

## Consequences

Additional validation code and safe fallback; improved claim traceability, not a guarantee of truth.

## Verification / revisit condition

Link acceptance test(s), recorded reviewer approval, implementation PR and evidence of behavior before changing status to Accepted. Revisit if field user feedback, API behavior or security tests contradict assumptions.
