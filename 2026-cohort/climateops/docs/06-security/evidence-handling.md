# Completion evidence: upload, verification, retention

**Owner:** Shiksha · **Status:** proposal.

## Evidence types

Prefer synthetic checklist text and explicitly labeled sample images. Never upload faces, real employee identity documents, badge information, building access diagrams, private maintenance notes or medical data.

## Upload sequence

1. Authenticated assigned role requests proof upload against tenant-scoped task.
2. API checks task approved version and allowed state; generates private object path scoped by tenant/task.
3. Restrict file size (propose 5 MB), types (JPEG/PNG/PDF or text checklist) and count; prohibit execution.
4. Store upload metadata and SHA-256; perform format and malware screening appropriate to implementation.
5. Reviewer verifies the *content*; hash only identifies identical bytes, not truth of real-world action.
6. Store submitted/reviewed timestamps; append corresponding audit events transactionally when feasible.
7. Apply retention/deletion period approved by security track (TBD); revoke links when needed.

## Integrity limitations

Hashing is tamper-evidence only when stored trusted reference is secured. Firestore logical append-only events are not immutable against privileged administrators. If stronger immutability is required post-MVP, use separate protected logging and object retention policies after cost/security review.
