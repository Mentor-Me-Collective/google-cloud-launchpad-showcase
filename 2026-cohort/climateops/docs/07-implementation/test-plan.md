# Functional, data, AI and security test plan

**Owners:** Blanca (functional), Kseniya (data), AI Research (grounding), Shiksha (security), Justin (acceptance).

## Contract tests

| Test ID | Scenario | Expected result |
|---|---|---|
| T-001 | POST task against DRAFT brief | No task, error and audit-safe rejection |
| T-002 | Staff approves pending brief | 403 |
| T-003 | Manager of tenant B approves tenant A brief | 403 |
| T-004 | Brief version changes after manager approval | Existing approval cannot authorize changed plan |
| T-005 | Repeated task create with same idempotency key | One task set only |
| T-006 | Invalid evidence MIME/size | Reject upload without state change |
| T-007 | Submitted proof awaiting review | Not marked VERIFIED |
| T-008 | NWS retrieval fails | Stale/historical label, not “no warning” |
| T-009 | Weather fixture repeats same rules | Identical priority ordering and explanations |
| T-010 | NIM generates invalid citation | Block text; use safe template fallback |
| T-011 | Cross-tenant GET /events | No data leaks |
| T-012 | Concurrent update/approval | Exactly one valid version transition |

## End-to-end demo test

Start with clearly labeled simulated extreme-heat scenario → NWS-sourced or labeled replay data → ranking with four factors → NVIDIA brief generation and citation verification → manager requests revision → manager approves exact revised version → task assigned to DEMO role with deadline → sample proof upload → review → completed event history.

Record test environment, executed command, timestamp, outcome, failure screenshots, log correlation IDs and owner signoff. This docs package includes no completed run results.

## Release gate

No release if any T-001–T-012 critical check fails, meaningful NIM integration cannot be demonstrated (or disclosed as unavailable), weather claims lack evidence, or public facility associations are misleading.
