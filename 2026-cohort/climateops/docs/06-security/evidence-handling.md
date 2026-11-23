# Facility data privacy and completion evidence

**Owner:** Shiksha (`@Shiksha99`) · **Status:** implemented for the demo; retention job not built.

## Facility data privacy

| Rule | How it is enforced | Test |
|---|---|---|
| Each organization sees only its own facilities | Every facility query filters by the caller's `tenant_id` | `test_facility_lists_are_tenant_scoped` |
| One organization cannot discover another's facility IDs | Duplicate check is scoped to the caller's tenant; new facilities are stored under a tenant-scoped key | `test_cannot_discover_other_tenants_facility_ids`, `test_duplicate_inside_own_tenant_still_409` |
| Nothing is visible signed out | Every API route needs sign-in | `test_unauthenticated_cannot_see_any_facility_data` |
| Staff do not see risk scores, briefs or the audit log | Manager or validator role required | `test_staff_cannot_see_priority_scores_or_audit` |
| Honest labels | Facilities are `PUBLIC_VERIFIED`, `DEMO_SYNTHETIC` or `UNKNOWN`; a public listing never implies a real cooling center or a real operator | input validation rejects any other label |
| No personal data | Only public site listings and fictional DEMO statuses; no names of real staff, residents or patients | data review of `data/fixtures/` |

**Data sent to NVIDIA:** only the validated evidence bundle (public site names and locations, DEMO statuses, weather records). No personal data and no keys other than the API key in the request header.

## Evidence types

Use synthetic checklist text and clearly labeled sample images. Never upload faces, real employee identity documents, badge information, building access diagrams, private maintenance notes or medical data.

## Upload sequence (as built)

1. A signed-in manager or the assigned staff member requests an upload URL for a task in their own tenant that has been started.
2. The server checks the type against an allowlist (JPEG, PNG, PDF) and picks the object path itself: `evidence/<tenant>/<task>/<random>.<ext>`. Clients can never choose the path.
3. In Cloud mode the server returns a V4 signed PUT URL valid for 10 minutes to a **private** bucket (uniform access, no public objects).
4. The client submits the object path and SHA-256. The server rejects paths outside the caller's tenant and task, and malformed hashes.
5. A manager who did not submit the proof verifies the content. The hash only shows the bytes did not change; it does not prove the real-world action happened.
6. Each step writes an audit event.

Tests: `test_upload_url_rules`, `test_forged_or_cross_tenant_object_path_rejected`, `test_invalid_evidence_path_rejected`, `test_task_and_upload_inputs_validated`, `test_evidence_before_start_and_self_verification_blocked`.

## Retention

Proposed: delete proof objects **30 days** after the task is verified, using a Cloud Storage lifecycle rule on the `evidence/` prefix:

```bash
cat > lifecycle.json <<'JSON'
{"rule": [{"action": {"type": "Delete"}, "condition": {"age": 30, "matchesPrefix": ["evidence/"]}}]}
JSON
gsutil lifecycle set lifecycle.json gs://$PROJECT-climateops-proof
```

## Known limits

- Signed PUT URLs cannot cap file size. Proposed limit 5 MB, enforced later with a POST policy or a size check when the upload finishes.
- No malware scan on uploads yet.
- Firestore audit events are append-only in the app, but a cloud administrator could still change them. Stronger immutability needs separate protected logging after a cost and security review.
