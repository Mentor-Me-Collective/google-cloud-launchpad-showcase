# Threat model and security release gate

**Owner:** Shiksha (`@Shiksha99`) · **Status:** STRIDE review completed for the MVP; controls mapped to automated tests.

## Assets and trust boundaries

Assets: manager approval, tenant data, facility records, source and weather records, NVIDIA API key, ingest token, proof objects and audit history. Trust boundaries: browser to API; NWS to ingestion; API to NVIDIA; API to Firestore and Cloud Storage; uploader to private object bucket.

## STRIDE review

| STRIDE | Threat | Example | Control | Test | Status |
|---|---|---|---|---|---|
| **S**poofing | Fake sign-in | Missing, unknown or oversized token | Bearer auth on every API route | `test_bad_sign_in_is_401`, `test_every_api_read_needs_sign_in` | Done |
| **S**poofing | Fake scheduler call | Anyone POSTs `/internal/ingest` | Secret token, constant-time compare | `test_ingest_rejects_missing_or_wrong_token` | Done |
| **T**ampering | Brief changed after approval | Edit approved brief, then create tasks | Approval bound to exact version and content hash | `test_editing_after_approval_voids_approval`, `test_stale_version_or_hash_409` | Done |
| **T**ampering | Tenant switch in request | Body says `tenant_id: demo-b` | Tenant taken from server claims only | `test_body_cannot_override_tenant` | Done |
| **T**ampering | Malicious input | HTML/script in names, path characters in IDs, `javascript:` links | Strict field patterns and length limits | `test_bad_facility_input_rejected`, `test_brief_edit_rejects_html_and_oversize`, `test_approval_inputs_validated`, `test_task_and_upload_inputs_validated` | Done |
| **T**ampering | Malicious proof file | Executable or forged object path | Type allowlist, server-chosen tenant-scoped paths | `test_upload_url_rules`, `test_forged_or_cross_tenant_object_path_rejected` | Done; max file size not enforced yet |
| **R**epudiation | "I never approved that" | Manager denies an approval | Append-only audit events with actor, time and request ID | `test_happy_path_approval_then_tasks_then_proof` | Done (logical, not tamper-proof against cloud admins) |
| **I**nformation disclosure | Cross-tenant leak | Tenant B reads tenant A brief, tasks or events | Tenant filter on every query, `guard_tenant` | `test_other_tenant_cannot_read_brief`, `test_events_are_tenant_isolated`, `test_staff_sees_only_own_tasks_and_cross_tenant_task_blocked` | Done |
| **I**nformation disclosure | Facility ID discovery | "Already exists" reveals another tenant's facility | Duplicate check scoped to caller's tenant | `test_cannot_discover_other_tenants_facility_ids` | Fixed |
| **I**nformation disclosure | Secret exposure | API key in Git, browser or logs | Secret Manager, server-only use, secret scan | `scan_secrets.py` (clean) | Done |
| **D**enial of service | Cost or loop abuse | Repeated generation or polling | Poll interval, retries with backoff, budget alert | n/a | Partial: no per-user rate limit yet |
| **E**levation of privilege | Staff acts as manager | Staff crafts approve or create-task request | Server-side `require_role` | `test_staff_cannot_approve_or_create_or_generate`, `test_only_manager_*`, `test_validator_*` | Done |
| **E**levation of privilege | Self-verification | Staff verifies own proof | Verifier must differ from submitter | `test_evidence_before_start_and_self_verification_blocked` | Done |
| (AI) | Prompt injection | Weather text tells the model to change scores | Model never sets scores; citation validator; template fallback | `test_grounding.py` | Done |

## Findings handed to other owners

- **Console (Justin, `web/index.html`):** the search "No facilities match" and "No tasks match" messages insert the typed search text with `innerHTML`. Typing HTML there runs in your own browser only (self-XSS, low risk), but it should use `textContent` or escape the text.
- **Approval service (`services.py::guard_tenant`):** return 404 for both missing and wrong-tenant records so a caller cannot tell whether a record exists.

## Release gate

Before any non-demo use: real identity provider with expiring sessions, IAM or IAP in front of Cloud Run, dedicated least-privilege service account, upload size limit, rate limiting and a retention job. If a critical control fails, no production claim or public rollout. This prototype is not an operational emergency-response service.
