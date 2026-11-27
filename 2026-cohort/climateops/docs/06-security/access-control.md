# Tenant isolation and role permissions

**Owner:** Shiksha (`@Shiksha99`) · **Status:** implemented for the demo and covered by automated tests (`backend/tests/test_security.py`, `backend/tests/test_api_gate.py`).

## Sign-in (authentication)

The MVP uses fixed DEMO bearer tokens from `data/fixtures/demo_auth.json`. They are public demo values for two fictional organizations, not secrets. Every `/api/v1` route requires a token.

| Check | Result | Test |
|---|---|---|
| No header, wrong scheme, empty, unknown or oversized token | 401 `unauthenticated` | `test_bad_sign_in_is_401` |
| Any API read without sign-in | 401 | `test_every_api_read_needs_sign_in` |
| Error responses never echo the token | no token in body | `test_errors_do_not_leak_tokens` |
| Unknown role (for example a typo like `manger`) in the token file | app refuses to start (fail closed) | `test_unknown_role_in_token_file_fails_closed` |

`tenant_id` and role come only from the server-side token claims. A `tenant_id` sent in a request body is ignored (`test_body_cannot_override_tenant`).

## Role matrix (RBAC)

| Operation | Manager | Staff | Validator | Signed out |
|---|---|---|---|---|
| View own-tenant facilities | Yes | Yes | Yes | No |
| Onboard sample site | Yes | No | No | No |
| View priorities and briefs | Yes | No | Read only | No |
| Draft, edit, submit brief | Yes | No | No | No |
| Approve or reject brief | **Yes** | No | No | No |
| Create tasks from approved plan | Yes | No | No | No |
| Start task, request upload, submit proof | Yes | Assigned only | No | No |
| Verify proof | Yes (not their own) | No | No | No |
| Read audit events | Yes | No | Read only | No |

Enforced on the server by `require_role(...)` in `backend/app/main.py`, not only by the console. The console hides buttons too (for example Generate AI Brief is disabled for staff), but the tests call the API directly to prove a crafted request is refused with 403. Tests: `test_only_manager_*`, `test_staff_cannot_*`, `test_validator_*`.

## Tenant isolation

Every list query filters by the caller's `tenant_id`; single-record lookups go through `guard_tenant`. Tests: `test_other_tenant_cannot_read_brief`, `test_facility_lists_are_tenant_scoped`, `test_events_are_tenant_isolated`, `test_cannot_discover_other_tenants_facility_ids`.

## Other access controls

- `/internal/ingest` (Cloud Scheduler) requires `X-Ingest-Token`, compared in constant time with `hmac.compare_digest` so timing cannot reveal the token (`test_ingest_rejects_missing_or_wrong_token`).
- Browser hardening headers on every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, and `Cache-Control: no-store` on API responses (`test_security_headers_present`).

## Known limits (honest list)

- Demo tokens never expire. Before any real use, replace them with a real identity provider (for example Google Identity Platform) with expiring sessions.
- Wrong-tenant single records return 403 and missing ones 404. Returning 404 for both would hide whether a record exists; recommended follow-up in `services.py::guard_tenant`.
- The Cloud Run service allows unauthenticated network access because the app does its own bearer auth on DEMO data. Put it behind IAM or IAP before real use.
