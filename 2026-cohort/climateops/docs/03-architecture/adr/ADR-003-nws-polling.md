# ADR-003: Use NWS for operational weather with cache-aware scheduling

- **Status:** Proposed
- **Owner:** Blanca and Kseniya
- **Date:** 2026-10-27

## Context

Operational weather claims require an authoritative source, freshness and failure handling.

## Decision

Use NWS active alerts and /points-discovered forecast endpoints. Propose 5-minute alerts, 30-minute forecasts; respect headers and API terms. Persist issued/effective/expires/fetched timestamps, IDs and source URL.

## Consequences

External service risk. When unavailable, mark last retrieved data stale and forbid new current-status claims. Confirm cadence against live APIs.

## Verification / revisit condition

Link acceptance test(s), recorded reviewer approval, implementation PR and evidence of behavior before changing status to Accepted. Revisit if field user feedback, API behavior or security tests contradict assumptions.
