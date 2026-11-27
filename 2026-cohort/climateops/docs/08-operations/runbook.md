# Deployment, observability and failure runbook

**Owners:** Blanca + Shiksha. **Environment:** demo-first, not safety-critical operations.

## Required configuration (values never committed)

- GCP project/region, Cloud Run service, Firestore database, private Cloud Storage bucket and Cloud Scheduler job names.
- NVIDIA API secret reference and verified model ID.
- NWS User-Agent, polling intervals and allowed points.
- Auth identity provider, tenant-role configuration, logging level and budget/quota caps.

## Deployment checklist

1. Confirm CI unit/security/e2e tests and source/data validation.
2. Apply least-privilege service accounts; Secret Manager access restricted to backend.
3. Deploy Cloud Run artifact; run `/health` and authenticated smoke tests.
4. Configure Scheduler to invoke only authenticated ingestion endpoint.
5. Verify Firestore rules/access path, bucket private policy and upload restrictions.
6. Verify NIM response and citations from a non-sensitive fixture.
7. Replay end-to-end approval-first scenario and preserve redacted proof.
8. Publish verified deployment and demo links to README; until then remain TBD.

## Observability

Track fetch success, alert age, 429/5xx responses, priority-version changes, model timeouts, citation validation failure, approval transitions, task creation retries, evidence verification time and tenant access denials. Do not log keys or raw private proof content.

## Incident response

- **Weather stale:** mark historical; stop issuing new current claims; investigate connectivity/caching.
- **NIM offline or invalid:** use deterministic template with explicit fallback status; never emit unsupported claims.
- **Approval bypass suspected:** disable task create, preserve logs, assess tenant impact, patch and rerun negative tests.
- **Evidence exposure:** revoke affected object access, rotate credentials as needed, scope incident and follow security lead process.
- **Faulty release:** roll back previous verified image; ensure data schema compatibility.

## Cost control

Budget alerts, modest Cloud Run scaling, bounded forecast polls, finite generation tokens, caching and log retention. Never claim cost estimates until quota/model pricing and load assumptions are checked.
