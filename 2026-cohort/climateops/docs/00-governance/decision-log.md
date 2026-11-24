# Decision log, unresolved issues and change requests

**Status:** starter register; no decision below is accepted until meeting record confirms it.

| ID | Decision/question | Proposed owner | Status | Deadline |
|---|---|---|---|---|
| DEC-01 | Manager is mandatory approval gate | Justin | Proposed | 2026-10-29 |
| DEC-02 | Heat-only scope | Justin | Proposed | 2026-10-29 |
| DEC-03 | Poll 5min alerts / 30min forecast (cache-aware) | Blanca/Kseniya | Proposed | 2026-11-04 |
| DEC-04 | Deterministic weighted ranking | Justin/Kseniya | Proposed | 2026-11-06 |
| DEC-05 | Public vs DEMO record labeling | Kseniya/Shiksha | Proposed | 2026-11-04 |
| DEC-06 | NIM model / API access validated | Blanca/AI Research | Accepted (`nvidia/nemotron-3.5-bolt-e4b`) | 2026-11-07 (smoke test passed 2026-11-24 with scripts/smoke_nim.py, Blanca: HTTP 200, "ready"; model comparison evidence: docs/05-ai-evaluation/model-comparison) |
| DEC-07 | Deadline and team rules confirmed with organizer | Justin | Open | 2026-10-29 |
| DEC-08 | Readiness brief prompt: adopt playbook-grounded prompt B; model Nemotron 3.5 Lightning (primary, thinking off) vs. Bolt (fallback). Evidence: docs/05-ai-evaluation/model-comparison | Blanca | Proposed | 2026-11-25 |
| DEC-09 | Photo (vision) feature: cut from MVP, or switch to `nvidia/nemotron-3.5-super-vl-120b-a12b` (passed vision test) and build it. Configured `meta/llama-3.2-90b-vision-instruct` was retired 2026-11-16. Evidence: docs/05-ai-evaluation/model-comparison | Blanca | Open | 2026-11-25 |

## Change-control template

- **Requested change:**
- **Requester/date:**
- **Evidence/user problem:**
- **In scope?**
- **Security/data risks:**
- **Impact on four-week gates:**
- **Decision, owner, review date:**
- **ADR or issue link:**
