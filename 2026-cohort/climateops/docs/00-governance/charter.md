# Project charter — ClimateOps

**Status:** active · **Team Lead:** Blanca Perez · **Duration:** 4-week MVP following kickoff on 2026-11-01.

## Mission and outcome

A South Bronx facility manager with limited staff can understand an extreme-heat update, compare a small number of sample facilities, approve an evidence-backed readiness plan, assign due-dated work, and review proof and history. ClimateOps supports decisions; it does not issue emergency orders.

## Target persona

- Works across limited staff and limited time.
- Wants the top risks, why they are ranked, what can be done, who is responsible, and when it is due.
- Must be able to approve, reject, edit and request changes without learning technical vocabulary.
- **Persona is an assumption until user research is conducted.**

## Scope contract

**Included:** heat only; NWS alerts/forecasts; scheduled ingestion; matching 5–10 verified public sample locations in Mott Haven/Melrose; two clearly synthetic demo organizations; sample onboarding; deterministic prioritization; NVIDIA-assisted cited brief; manager approval; assignment/deadlines; completion evidence; timestamped events.

**Excluded:** staff contact imports, real organizational affiliation, physical operations control, automated dispatch, multi-hazard detection, predictive medical risk, real-time IoT, production emergency-response certification.

## Design principles

1. Human managerial accountability; zero tasks created before authorized approval.
2. Weather and facility claims trace to dated sources; unknown fields remain unknown.
3. Deterministic rankings; AI composes explanations rather than assigning risk.
4. Defaults protect privacy, tenant separation and evidence integrity.
5. Time-limited build: integration, testability and useful demonstration outrank optional features.
6. Honest demo: distinguish live feeds, replayed fixtures and fictitious business state.

## Team responsibilities

- **Blanca Perez (Team Lead · AI Research Foundations):** Builds the core pipeline from forecast to cited readiness brief, NVIDIA NIM models (`nvidia/nemotron-3.5-bolt-e4b` and `meta/llama-3.2-90b-vision-instruct`), model behavior, and visible prioritization.
- **Justin Mafie (AI Cloud Leader):** Defines the workflow, requirements, feature priorities, manager approval flow, value framing, UI/UX console engineering, and Cloud Run deployment.
- **Kseniya Naumovich (Cloud Data Analytics):** Validates data, facility and neighborhood records, forecast quality, success metrics, and evaluation sets.
- **Shiksha Kandel (Cloud Cybersecurity):** Secures access, sign-in and RBAC roles, API key management in Secret Manager, input validation, and privacy of facility data.

## Definition of done

- Full fixture-backed heat scenario through verified completion in deployed app.
- Cloud Run, data storage and NVIDIA model make **meaningful, demonstrated** feature contributions.
- Unauthorized task creation, stale weather misrepresentation and cross-tenant access rejected.
- 100% claims in evaluation set linked to evidence; unresolved claims are removed or blocked.
- Reproducible docs/README, 3-page summary, ≤8-slide deck and ≤5-minute walkthrough.
- Explicit limitations and recorded test outcomes.

## Governance and change control

Decisions are reviewed collaboratively across all four tracks. Shiksha can block security release; Kseniya can block invalid data; Blanca can block unsafe integration; Justin accepts workflow requirements. Record tradeoffs and changed commitments in decision log and ADRs. No blocked gate can be overridden silently.
