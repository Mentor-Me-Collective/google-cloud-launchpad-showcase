# ADR-009: Enforce tenant boundaries and server-side role checks

- **Status:** Proposed
- **Owner:** Shiksha and Blanca
- **Date:** 2026-10-27

## Context

Two fictional demo organizations must remain segregated even when sharing cloud infrastructure.

## Decision

Authenticate demo manager and staff identities, scope all API reads/writes by server-derived tenant, enforce deny-by-default RBAC, and keep credentials in Secret Manager.

## Consequences

More integration tests/auth work; essential against approval spoofing and cross-tenant proof access.

## Verification / revisit condition

Link acceptance test(s), recorded reviewer approval, implementation PR and evidence of behavior before changing status to Accepted. Revisit if field user feedback, API behavior or security tests contradict assumptions.
