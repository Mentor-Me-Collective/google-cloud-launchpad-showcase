# Threat model and security release gate

**Owner:** Shiksha · **Status:** proposed STRIDE-inspired review.

## Assets and trust boundaries

Assets: manager approval, tenant data, source/weather records, NVIDIA API key, proof objects and audit history. Trust boundaries: browser→API; NWS→ingestion; API→NVIDIA; API→Firestore/storage; uploader→private object bucket.

| Threat | Example | Required control | Test |
|---|---|---|---|
| Spoofed approval | staff crafts approval HTTP request | Server-side RBAC, manager-only role | 403 negative test |
| Tenant data leak | tenant B guesses tenant A ID | Derive tenant from auth, filter all queries | 403/404 isolation test |
| Brief tampering | modify approved task/brief version | Immutable approved hash + compare-and-set | revision invalidates approval |
| Malicious proof | executable or oversize upload | allowlist, MIME/content checks, object size quotas | upload rejection |
| Secret exposure | API key in client or git | Secret Manager, env-only server injection, secret scan | CI secret scan |
| Prompt injection | NWS/source text issues instructions | data-only serialization and output validation | adversarial fixture |
| False freshness | old weather shown as live | explicit fetched/issued time and stale banner | clock-controlled test |
| Lost audit event | task commits but event fails | transactional write and reconciliation | fault-injection test |
| Unbounded costs | polling or generation loops | rate limit, backoff, quotas, budget alerts | retry test |

## Required security signoff

Document system auth design, role matrix, test logs, private bucket IAM, secret redaction, sample-only data review and rollback plan. If a critical control fails, no production claim or public user rollout. This prototype is not an operational emergency-response service.
