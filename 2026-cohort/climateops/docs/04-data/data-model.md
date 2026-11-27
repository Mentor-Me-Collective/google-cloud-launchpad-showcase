# Data model and consistency

**Owners:** Kseniya and Blanca · **Status:** proposed logical schema.

| Entity | Key fields | Key invariants |
|---|---|---|
| Tenant | tenant_id, name, demo_flag | both organizations visibly fictional |
| Facility | id, tenant_id, public_source_id, name, lat/lon, neighborhood, provenance | public location != ownership/condition |
| WeatherRecord | id, source_url, NWS_id, issued/effective/expires/fetched, payload_hash, fixture_flag | source traceable and time-aware |
| PrioritySnapshot | facility_id, rule_version, factors, data_quality_flags, score | pure deterministic computation |
| EvidenceBundle | id, source_record_refs, facility_fact_refs, created_at, content_hash | claims reference allowed immutable facts |
| ReadinessBrief | id, tenant_id, version, evidence_bundle_id, claims, state, hash | approved versions frozen |
| Approval | id, tenant_id, brief_id, version, actor_id, decision, timestamp, active | actor and tenant verified server-side |
| Task | id, tenant_id, brief_id, approved_version, assignee_role, deadline, status | only active approved plan |
| Evidence | id, tenant_id, task_id, object_path, SHA256, submitted_at, review | private bucket and review required |
| AuditEvent | id, tenant_id, action, entity_id, actor_role, previous/new state, timestamp, request_id | append-only application semantics |

## State consistency

Use Firestore transactions to check brief version, record approval and write audit event. For task creation, re-check approval within transaction and derive task scope from approved brief. Every write carries a tenant boundary, idempotency key and request correlation ID.

## Retention and deletion

A demo-only retention period must be decided by Shiksha at kickoff; avoid indefinite sample-photo retention. Keep a deletion plan for objects and metadata. Do not promise cryptographic immutability, disaster recovery or compliance certifications without implementing/verifying them.

## Privacy

Use synthetic role identifiers such as `staff_demo_01`; no real names, employee details, contact lists, home addresses, medical data, private facility weaknesses or credentials.
