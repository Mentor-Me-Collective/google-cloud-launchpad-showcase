import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSchool } from "../src/school.js";
import {
  PermissionDeniedError,
  UnverifiedParentError,
} from "../src/connector/consentConnector.js";

test("Scenario 1: parent withdraws Photos consent, no approval, 1 of 1 system", () => {
  const school = buildSchool();
  const result = school.connector.process({
    parentId: "P-001",
    parentVerified: true,
    verificationMethod: "separate_pin",
    learnerId: "L-101",
    type: "Photos",
    from: "granted",
    to: "withdrawn",
  });

  assert.equal(result.status, "complete");
  assert.equal(result.impactSummary.updated, 1);
  assert.equal(result.impactSummary.total, 1);
  assert.equal(school.connector.getState("L-101", "Photos"), "withdrawn");
  assert.equal(result.request.needsApproval, false);
  assert.equal(result.request.currentState, "withdrawn");
  assert.equal(result.request.verificationMethod, "separate_pin");
  assert.ok(result.request.auditEntryIndexes.length > 0);
  const requestEvents = school.audit
    .entries()
    .filter((entry) => entry.details.requestId === result.request.requestId);
  assert.ok(requestEvents.length > 0);
  assert.deepEqual(
    result.request.auditEntryIndexes,
    requestEvents.map((entry) => entry.index),
  );
  assert.ok(
    requestEvents.every(
      (entry) => entry.details.verificationMethod === "separate_pin",
    ),
  );
  // All 5 test photos blocked.
  assert.ok(school.photoLibrary.photosFor("L-101").every((p) => p.blocked));
});

test("Scenario 1 fails safely: if the Photo Library does not update, change is incomplete", () => {
  const school = buildSchool();
  school.photoLibrary.failNext = true; // simulate failed system

  const result = school.connector.process({
    parentId: "P-001",
    parentVerified: true,
    verificationMethod: "separate_pin",
    learnerId: "L-101",
    type: "Photos",
    from: "granted",
    to: "withdrawn",
  });

  assert.equal(result.status, "incomplete");
  assert.equal(result.impactSummary.updated, 0);
  assert.ok(
    result.history.impactMap().some((e) => e.status === "failed"),
    "impact map must show the failed system",
  );

  // Retry now that the transient failure is cleared -> completes.
  const retry = school.connector.retry({
    parentId: "P-001",
    parentVerified: true,
    verificationMethod: "separate_pin",
    learnerId: "L-101",
    type: "Photos",
    from: "granted",
    to: "withdrawn",
  });
  assert.equal(retry.status, "complete");
  assert.equal(retry.impactSummary.updated, 1);
});

test("Scenario 2: parent grants School Trips, S-01 approves, 2 of 2 systems", () => {
  const school = buildSchool();
  const result = school.connector.process(
    {
      parentId: "P-002",
      parentVerified: true,
      verificationMethod: "separate_pin",
      learnerId: "L-102",
      type: "School Trips",
      from: "not_set",
      to: "granted",
    },
    { staffId: "S-01", approved: true },
  );

  assert.equal(result.status, "complete");
  assert.equal(result.impactSummary.updated, 2);
  assert.equal(result.impactSummary.total, 2);
  assert.equal(result.request.needsApproval, true);
  assert.equal(result.request.approvalReason, "school_trip");
  assert.equal(result.request.approvalStatus, "approved");
  assert.ok(school.tripsRegister.membershipFor("L-102").onTripList);
  assert.ok(school.learnerRecords.recordFor("L-102").tripEmergencyContactFlagged);
  const approvalEvent = school.audit
    .entries()
    .find(
      (entry) =>
        entry.event === "approval.approved" &&
        entry.details.requestId === result.request.requestId,
    );
  assert.equal(approvalEvent?.details.staffId, "S-01");
  assert.equal(approvalEvent?.details.verificationMethod, "separate_pin");
});

test("Scenario 2 variation: S-01 rejects, nothing changes, reason recorded", () => {
  const school = buildSchool();
  const result = school.connector.process(
    {
      parentId: "P-002",
      parentVerified: true,
      verificationMethod: "separate_pin",
      learnerId: "L-102",
      type: "School Trips",
      from: "not_set",
      to: "granted",
    },
    { staffId: "S-01", approved: false, reason: "trip is full" },
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.impactSummary.updated, 0);
  // No system changed.
  assert.equal(school.tripsRegister.membershipFor("L-102").onTripList, false);
  // Rejection reason is in the audit log.
  assert.ok(
    school.audit
      .entries()
      .some(
        (e) =>
          e.event === "approval.rejected" && e.details.reason === "trip is full",
      ),
  );
});

test("Scenario 3: parent withdraws Medical, S-02 approves, 2 of 2 systems", () => {
  const school = buildSchool();
  const result = school.connector.process(
    {
      parentId: "P-003",
      parentVerified: true,
      verificationMethod: "separate_pin",
      learnerId: "L-103",
      type: "Medical",
      from: "granted",
      to: "withdrawn",
    },
    { staffId: "S-02", approved: true },
  );

  assert.equal(result.status, "complete");
  assert.equal(result.impactSummary.updated, 2);
  assert.ok(school.learnerRecords.recordFor("L-103").medicalNoteRestricted);
});

test("Scenario 3 permission: a non-S-02 staff member may not approve Medical (Thando's test)", () => {
  const school = buildSchool();
  assert.throws(
    () =>
      school.connector.process(
        {
          parentId: "P-003",
          parentVerified: true,
          verificationMethod: "separate_pin",
          learnerId: "L-103",
          type: "Medical",
          from: "granted",
          to: "withdrawn",
        },
        { staffId: "S-01", approved: true }, // wrong role
      ),
    PermissionDeniedError,
  );
  // Nothing changed.
  assert.equal(school.learnerRecords.recordFor("L-103").medicalNoteRestricted, false);
});

test("Unverified parent is rejected before anything changes", () => {
  const school = buildSchool();
  assert.throws(
    () =>
      school.connector.process({
        parentId: "P-999",
        parentVerified: false,
        verificationMethod: "separate_pin",
        learnerId: "L-101",
        type: "Photos",
        from: "granted",
        to: "withdrawn",
      }),
    UnverifiedParentError,
  );
});

test("Contact Details changes need S-01 approval, ordinary or emergency", () => {
  const school = buildSchool();
  const standardChange = school.connector.process({
    parentId: "P-001",
    parentVerified: true,
    verificationMethod: "separate_pin",
    learnerId: "L-101",
    type: "Contact Details",
    from: "not_set",
    to: "granted",
  });

  assert.equal(standardChange.request.needsApproval, true);
  assert.equal(standardChange.request.approvalReason, "contact_details");
  assert.equal(standardChange.request.approvalStatus, "pending");
  assert.equal(standardChange.impactSummary.updated, 0);

  const emergencyContactChange = school.connector.process({
    parentId: "P-001",
    parentVerified: true,
    verificationMethod: "separate_pin",
    learnerId: "L-101",
    type: "Contact Details",
    from: "granted",
    to: "withdrawn",
    changeContext: "emergency_contact",
  });

  assert.equal(emergencyContactChange.request.needsApproval, true);
  assert.equal(
    emergencyContactChange.request.approvalReason,
    "emergency_contact",
  );
  assert.equal(emergencyContactChange.request.approvalStatus, "pending");
  // The earlier ordinary change is still pending, so nothing has been applied.
  assert.equal(emergencyContactChange.request.currentState, "not_set");
  assert.equal(emergencyContactChange.impactSummary.updated, 0);

  const approvedEmergencyContactChange = school.connector.process(
    {
      parentId: "P-001",
      parentVerified: true,
      verificationMethod: "separate_pin",
      learnerId: "L-101",
      type: "Contact Details",
      from: "granted",
      to: "withdrawn",
      changeContext: "emergency_contact",
    },
    { staffId: "S-01", approved: true },
  );
  assert.equal(approvedEmergencyContactChange.request.approvalStatus, "approved");
  assert.equal(approvedEmergencyContactChange.status, "complete");
  const emergencyApprovalEvent = school.audit
    .entries()
    .find(
      (entry) =>
        entry.event === "approval.approved" &&
        entry.details.requestId ===
          approvedEmergencyContactChange.request.requestId,
    );
  assert.equal(emergencyApprovalEvent?.details.staffId, "S-01");
});
