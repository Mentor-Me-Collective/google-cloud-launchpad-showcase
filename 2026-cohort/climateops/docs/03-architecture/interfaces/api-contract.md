# HTTP API contract (draft, not OpenAPI production specification)

**Base:** `/api/v1` · **Auth:** bearer session, mapped to demo tenant and role; never trust user-supplied tenant identifier without verifying claims.

| Method/route | Role | Purpose | Key validation |
|---|---|---|---|
| `GET /weather/status` | authenticated | latest source status | includes freshness + live/replay badge |
| `POST /facilities` | manager | onboard demo facility | source/provenance explicit |
| `GET /facilities` | authenticated | tenant-scoped facility list | tenant enforced server-side |
| `POST /briefs/generate` | manager | build cited draft | only versioned evidence inputs |
| `POST /briefs/{id}/submit` | manager | move draft to approval queue | valid citations present |
| `POST /briefs/{id}/approve` | manager | approve exact version | expected_version/content_hash + idempotency |
| `POST /briefs/{id}/reject` | manager | reject and require update | reason tracked |
| `POST /tasks` | manager/authorized dispatcher | create approved tasks | checks active approval + version |
| `PATCH /tasks/{id}` | authorized staff | update state | validated transition |
| `POST /tasks/{id}/evidence` | assignee | issue upload request / submit metadata | private storage, allowlist, length limit |
| `POST /tasks/{id}/verify` | manager/reviewer | accept/reject evidence | explicit decision and event |
| `GET /events` | tenant manager | retrieve audit events | cursor pagination, tenant isolation |

## Suggested approval request

```json
{"expected_version":3,"expected_content_hash":"sha256:...","decision":"approve","idempotency_key":"request-unique-123"}
```

Reject missing version (400), unauthorized actor (403), wrong tenant (403), stale version (409), and missing evidence (422). Standardize API errors by `code`, `message`, `request_id`. Exact codes and routes require agreement at kickoff.
