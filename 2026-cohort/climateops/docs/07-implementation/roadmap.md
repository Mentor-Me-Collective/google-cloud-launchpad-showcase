# Four-week build plan — approval first

**Owner:** Justin. **Assumed kickoff:** Oct 29, 2026. **Proposed development start:** Nov 2, 2026. Dates must be reconciled with the actual competition deadline.

| Week | Dates (proposed) | Engineering milestones | Exit gate / evidence |
|---|---|---|---|
| 1 | Nov 2–8 | Accept PRD/ADRs; manager screen, versioned approval API, auth negative tests; repo/CI/GCP skeleton; NIM/NWS smoke tests | G1: no unapproved task creation through API |
| 2 | Nov 9–15 | NWS ingestion/replay, 5–10 verified sample places, provenance, matching, deterministic rankings | G2: traceable priority list from reproducible fixture |
| 3 | Nov 16–22 | NIM grounded brief, citation verifier, manager workflow, assignment, deadlines, private proof, event history; tenant-security tests | G3+G4: full lifecycle with real integrations and critical auth tests |
| 4 | Nov 23–29 | Evaluation against baselines, failure/UX tests, polish, documentation, demo recording and submission | G5: release evidence, README, summary, deck, recording |

## Task ownership and dependencies

- **Justin:** resolve organizer instructions; ratify approval-first PRD, review scripts, owner coordination, tests and final story.
- **Blanca:** approval endpoint **before** connecting model; application + scheduled cloud ingestion; evidence transactions; deployment.
- **Kseniya:** datasets, normalized weather, priority arithmetic, provenance and scoring evaluation.
- **Shiksha:** manager role policy, tenant-negative tests, secrets, proof upload and release security checks.
- **AI Research named owner TBD:** NVIDIA endpoint access, structured outputs, claim checking and evaluation.

## Parallel work and integration cadence

Week 1 begin with static evidence bundle and mock AI response to validate approval logic. In parallel, probe weather and NIM connectivity. Week 2 inject real weather, preserving unchanged approval contract. Week 3 connect validated AI output and evidence. Week 4 freeze feature scope and prioritize defect fixes, end-to-end testing and honest submission proof.

## Risk register

| Risk | Owner | Trigger | Mitigation |
|---|---|---|---|
| NWS outage | Blanca | fetch fails/stale | cache historical data with stale label, fixtures |
| Unsupported AI claims | AI Research | invalid evidence mapping | block and fall back to template |
| Public listing errors | Kseniya | ambiguous/old record | verify and exclude until confirmed |
| Approval bypass | Shiksha | negative test succeeds | block release, fix server auth |
| Cross-tenant leak | Shiksha | forbidden read works | block release and inspect queries |
| NIM inaccessible | Blanca | smoke test fails | verify another accessible model, preserve fallback |
| Timeline/scope drift | Justin | unowned new feature | enforce heat-only ADR, cut extras |
| Demo overclaims | Justin | unsupported efficacy claims | add fixture badges, limitations and source links |
| Conflicting event rules | Justin | deadlines/team sizes disagree | obtain official organizer clarification |

## Open questions

Who owns AI research? Which official submission calendar and repo? Which 5–10 public facilities qualify? Do any managers consent to quick evaluation? Which NVIDIA model actually works? Are role accounts or simulated identities acceptable? What are rank thresholds and proof retention? How should an updated alert supersede approved outstanding work?

## Next actions before Nov 4

- [ ] Confirm competition identity, due date, team roster and submission path.
- [ ] Hold 45-minute kickoff; write agreed decisions.
- [ ] Approve ADR-001 and approval contract.
- [ ] Assign all workstream owners and PR reviewers.
- [ ] Create repo/issues/CI and weekly status gates.
- [ ] Validate NWS and NVIDIA smoke tests.
- [ ] Begin verifying sourced location records.
- [ ] Agree Week 1 tests, escalation and communication schedule.
