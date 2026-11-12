# ADR-001: Manager approval is the mandatory gate before task creation

- **Status:** Proposed
- **Owner:** Justin; implement Blanca; review Shiksha
- **Date:** 2026-10-27

## Context

AI-drafted recommendations cannot authorize real or demo staff assignments. Managers own resource and timing decisions.

## Decision

All briefs enter PENDING_APPROVAL. Only authorized tenant manager approves exact immutable brief version/hash. Reject, edit, revoke or supersede require new approval. Task creation API validates active approval before any write.

## Consequences

Adds review latency and version control but blocks unauthorized autonomy. Negative authorization and concurrency tests are release gates.

## Verification / revisit condition

Link acceptance test(s), recorded reviewer approval, implementation PR and evidence of behavior before changing status to Accepted. Revisit if field user feedback, API behavior or security tests contradict assumptions.
