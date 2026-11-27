# ADR-005: Separate public facility facts from synthetic tenant operations

- **Status:** Proposed
- **Owner:** Kseniya and Shiksha
- **Date:** 2026-10-27

## Context

Public addresses cannot support inference about building conditions, managers, staffing or cooling center status.

## Decision

Classify every field as PUBLIC_VERIFIED, DEMO_SYNTHETIC or UNKNOWN; show DEMO labels and never imply ownership of a sampled public building. Do not upload real personal information.

## Consequences

Clear competition demo and safer data boundaries; extra source tracking needed.

## Verification / revisit condition

Link acceptance test(s), recorded reviewer approval, implementation PR and evidence of behavior before changing status to Accepted. Revisit if field user feedback, API behavior or security tests contradict assumptions.
