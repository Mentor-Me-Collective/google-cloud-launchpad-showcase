# ADR-010: Use conventional state documents with append-only logical events

- **Status:** Proposed
- **Owner:** Blanca and Justin
- **Date:** 2026-10-27

## Context

Full event sourcing is disproportionate to an MVP but judges need a reliable history.

## Decision

Persist current facility/brief/task state plus tenant-scoped append-only application event documents in atomic transactions; verify consistency and prohibit normal-role modifications.

## Consequences

Simple queries and auditable timeline; administrative immutability is not guaranteed without stronger storage controls.

## Verification / revisit condition

Link acceptance test(s), recorded reviewer approval, implementation PR and evidence of behavior before changing status to Accepted. Revisit if field user feedback, API behavior or security tests contradict assumptions.
