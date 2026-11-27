# Product Requirements Document (PRD) — heat-only MVP

**Owner:** Justin · **Status:** proposed · **Deadline:** end of fourth development week.

## User goal and job-to-be-done

When extreme heat is expected, I need one credible readiness view, an understandable order of work, and a quick way to approve and track actions so my small team can act without losing accountability.

## Functional requirements

| ID | Feature | Acceptance condition | Priority |
|---|---|---|---|
| FR-ONB-001 | Facility onboarding | Add sample facility name, neighborhood, sourced coordinates, clear source classification | Must |
| FR-TEN-001 | Two demo organizations | Separate records and visible DEMO label | Must |
| FR-WTH-001 | Scheduled NWS retrieval | Persist source identifiers, issue/expiry/fetch time; show stale failures | Must |
| FR-GEO-001 | Match facilities to weather | Match by documented geometry/point methodology and disclose uncertainty | Must |
| FR-PRI-001 | Explainable priority | Rule-versioned score and visible contributing inputs; unknowns flagged | Must |
| FR-AI-001 | Cited readiness brief | NIM-derived structured draft; all claims checked against evidence | Must |
| FR-APP-001 | Human approval | Server-side gate; approved immutable version only | Must |
| FR-APP-002 | Edits/rejection | Modified/rejected plans cannot create tasks before new approval | Must |
| FR-TSK-001 | Tasks and due dates | Only approved tasks assigned to demo staff role with due date | Must |
| FR-EVD-001 | Completion evidence | Controlled checklist/sample file, reviewer result, file hash | Must |
| FR-HIS-001 | History | Persist weather-to-completion transition events and actors | Must |
| FR-SEC-001 | Authorization | No cross-tenant data; secrets server-side | Must |

## Non-functional requirements

- **Accuracy:** evidence/provenance required for every weather claim; stale data marked.
- **Usability:** compact manager review screen showing what, why, by when and approve/revise action.
- **Reproducibility:** replay known weather fixture and consistent deterministic score; publish dependency/environment templates.
- **Reliability:** NWS/API failure does not produce falsely current claims; write workflows idempotently.
- **Security:** server-side role/tenant enforcement; private evidence objects; no real personal data in repo.
- **Observability:** correlation IDs, source latency, generation failure/fallback, approval and task transitions.

## Decision boundaries

The model cannot create tasks, determine authority, silently revise an approved plan or invent readiness observations. Rankings are rules-engine outputs, not medical outcomes or official city risk categories.

## Demonstration definition of done

One fixture produces relevant ranked facilities, cited brief, manager revision then approval, due-dated tasks and sample completion proof with an event history. Repeat with unauthorized user and verify denial. Show actual GCP and NVIDIA features in operation.

## Exclusions and backlog

No other hazards, proactive real-world dispatch, direct staff communications, sensitive IoT telemetry, actual employee data, emergency-response endorsement or predictive epidemiology.
