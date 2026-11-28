# ConsentKey — Integration layer (Manoj)

This is the integration part of ConsentKey: the three simulated systems, the
connector that fans a consent change out to them, the task completion history /
impact map, and an append-only (hash-chained) audit log.

It answers Tselane's kickoff question — *"do the three systems and the
completion history look buildable?"* — with working, tested code.

## Run it

```bash
npm install
npm test     # runs the three scenarios + variations as tests
npm run demo # prints history, impact map and request audit evidence for each scenario
npm run dashboard # starts the Scenario 1 parent dashboard at http://127.0.0.1:4173
```

## What's here

| Area | File | Purpose |
|------|------|---------|
| Consent model | `consent/model.ts` | 4 types, 3 states (`not_set/granted/withdrawn`) |
| Simulated systems | `systems/photoMediaLibrary.ts`, `systems/tripsEventsRegister.ts`, `systems/learnerRecords.ts` | hold data and react to the consent types they follow |
| Approval rules | `approval/approvalRules.ts` | School Trips (S-01), Medical (S-02), and emergency-contact changes (S-01); Photos and ordinary Contact Details changes need no approval |
| Completion history | `history/completionHistory.ts` | step list + impact map + overall status |
| Connector | `connector/consentConnector.ts` | orchestrates a change: verify → record → approve → fan out → log |
| Audit log | `audit/auditLog.ts` | append-only, hash-chained, tamper-evident (for Thando) |
| Parent dashboard | `dashboard.html`, `dashboard.ts` | local Scenario 1 flow with test-parent verification, photo withdrawal, history, impact map, and audit evidence |
| School fixture | `school.ts` | wires it all up with the fictional test data |

## Design notes for the team

- **Storage is behind interfaces** (`AuditStore`, the `SimulatedSystem`
  contract). Today everything runs in memory so anyone can clone and run it.
  The README stack (Firestore + Cloud Run) can be added by implementing those
  interfaces against Firestore, without changing the orchestration logic.
- **A change is only "complete"** when every affected system has logged its
  update. If a system fails, the impact map shows it as `failed`, the overall
  status is `incomplete`, and `connector.retry(...)` re-runs it.
- **Permissions are enforced in the connector**: a staff member without the
  required role raises `PermissionDeniedError` and nothing changes. This is the
  hook for Thando's "who can approve" tests.
- **Verification and approvals are auditable**: each request has a request ID;
  its request, approval, system-sync, and completion entries record the
  verification method and approval policy. The request result exposes the
  current state, approval status, and related audit-entry indexes.
- **PIN boundary**: the local test requests record `separate_pin` only after a
  trusted verifier has confirmed the parent. The prototype does not store or
  validate PINs; a real authentication service must do that before calling the
  connector. Never put a PIN in request details or the audit log.
- **Dashboard boundary**: `npm run dashboard` binds to `127.0.0.1` and uses
  fictional, in-memory test data. Its "Continue as verified test parent"
  button simulates verification and is not an authentication feature for real
  users or real learner data.

Set CONSENTKEY_DEMO_PIN (your own 4 to 8 digits) before starting the app.

## Open questions I hit while building (for kickoff)

1. **Scenario 2 touches two systems** (Trips Register *and* Learner Records for
   the trip emergency contact), as confirmed in the PR discussion. The
   implementation updates both before reporting completion.
2. **NVIDIA NIM message parsing** is out of the MVP and remains a stretch goal,
   per the team decision in the PR discussion.
3. **Timeline:** the repository README records the current programme deadline
   as Nov 28; confirm any changes against the programme roadmap.