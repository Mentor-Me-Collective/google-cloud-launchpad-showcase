# ADR-007: Give Google Cloud and NVIDIA separate functional responsibilities

- **Status:** Proposed
- **Owner:** Blanca and AI Research; accept Justin
- **Date:** 2026-10-27

## Context

The brief requires both stacks to contribute meaningful, demonstrable features.

## Decision

Use Cloud Run FastAPI, Cloud Scheduler, Firestore, Cloud Storage and server-side Secret Manager. Verify accessible NVIDIA NIM model endpoint and use it to generate grounded structured readiness brief explanations.

## Consequences

Clear integration demo, plus model quota, outage and latency dependencies. Do not claim completed integrations before smoke testing.

## Verification / revisit condition

Link acceptance test(s), recorded reviewer approval, implementation PR and evidence of behavior before changing status to Accepted. Revisit if field user feedback, API behavior or security tests contradict assumptions.
