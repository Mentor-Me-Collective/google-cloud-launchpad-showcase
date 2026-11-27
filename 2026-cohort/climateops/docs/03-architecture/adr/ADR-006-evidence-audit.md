# ADR-006: Store completion proof privately with tracked integrity and event history

- **Status:** Proposed
- **Owner:** Shiksha and Blanca
- **Date:** 2026-10-27

## Context

Checkboxes alone do not substantiate work; uploaded evidence may carry risks.

## Decision

Use Firestore for state/audit metadata and private Cloud Storage for allowlisted, size-limited proof. Store SHA-256, timestamps, reviewer decision, actor role, tenant and file reference. Append logical audit events transactionally.

## Consequences

Stronger reproducibility, with storage/auth complexity. Hash verifies bytes against a trusted hash, not truth of the reported task.

## Verification / revisit condition

Link acceptance test(s), recorded reviewer approval, implementation PR and evidence of behavior before changing status to Accepted. Revisit if field user feedback, API behavior or security tests contradict assumptions.
