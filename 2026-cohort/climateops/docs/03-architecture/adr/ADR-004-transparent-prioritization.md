# ADR-004: Use deterministic and inspectable priority ranking

- **Status:** Proposed
- **Owner:** Justin and Kseniya
- **Date:** 2026-10-27

## Context

Opaque LLM-generated risk scores are hard to audit and reproduce.

## Decision

Compute P=0.40W+0.30R+0.20V+0.10U with each input 0–100, recording version, sources and unknown fields. Weather severity, readiness gaps, neighborhood context and urgency must be distinguished. Model may explain, not edit, numeric ranking.

## Consequences

Reproducible rationale; weights/thresholds are hypotheses to validate. Unknown readiness must not silently score zero.

## Verification / revisit condition

Link acceptance test(s), recorded reviewer approval, implementation PR and evidence of behavior before changing status to Accepted. Revisit if field user feedback, API behavior or security tests contradict assumptions.
