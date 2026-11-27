/**
 * Implementation plan, phase 3: Medical withdrawal restrictions, the
 * restriction deadline, the reason list, and logged audit views.
 * Assumptions A-05 and A-06 in docs/legal-decisions-log.md.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { AuditLog } from "../src/audit/auditLog.js";
import { ConsentConnector } from "../src/connector/consentConnector.js";
import type { ConsentChangeRequest } from "../src/connector/consentConnector.js";
import { PhotoMediaLibrary } from "../src/systems/photoMediaLibrary.js";
import { TripsEventsRegister } from "../src/systems/tripsEventsRegister.js";
import { LearnerRecords } from "../src/systems/learnerRecords.js";
import {
  DEFAULT_MEDICAL_RESTRICTION_DAYS,
  medicalRestrictionDaysFromEnv,
  restrictionDeadline,
} from "../src/approval/medicalRestriction.js";
import {
  decisionReasons,
  isValidReasonCode,
  reasonCodeRequired,
} from "../src/approval/decisionReasons.js";
import {
  VIEW_REASONS,
  isValidViewReason,
  viewAuditEntry,
} from "../src/audit/viewControl.js";
import { entriesForFamily, entriesForStaff } from "../src/audit/visibility.js";

const NOW = new Date("2026-11-09T10:00:00Z");

function medicalSchool(days?: number) {
  const trips = new TripsEventsRegister();
  const records = new LearnerRecords();
  const audit = new AuditLog();
  records.seedRecord("L-103");
  const connector = new ConsentConnector(
    [new PhotoMediaLibrary(), trips, records],
    audit,
    new Map(),
    { now: () => NOW, ...(days !== undefined ? { medicalRestrictionDays: days } : {}) },
  );
  // The learner starts with Medical granted and the flag set on trip lists.
  connector.process({ ...grant }, { staffId: "S-02", approved: true, reasonCode: "routine" });
  return { connector, audit, trips, records };
}

const grant: ConsentChangeRequest = {
  parentId: "P-003",
  parentVerified: true,
  verificationMethod: "demo_login",
  learnerId: "L-103",
  type: "Medical",
  from: "not_set",
  to: "granted",
};
const withdraw: ConsentChangeRequest = { ...grant, from: "granted", to: "withdrawn", changeId: "chg-w" };

test("A-05: deadline defaults to 7 calendar days and is configurable", () => {
  assert.equal(DEFAULT_MEDICAL_RESTRICTION_DAYS, 7);
  assert.equal(medicalRestrictionDaysFromEnv({}), 7);
  assert.equal(medicalRestrictionDaysFromEnv({ MEDICAL_RESTRICTION_DAYS: "14" }), 14);
  for (const bad of ["0", "-3", "abc", "1.5", "9999", ""]) {
    assert.equal(medicalRestrictionDaysFromEnv({ MEDICAL_RESTRICTION_DAYS: bad }), 7, bad);
  }
  assert.equal(restrictionDeadline(NOW, 7), "2026-11-16T10:00:00.000Z");
});

test("approved Medical withdrawal restricts the note, clears the flag, sets the deadline", () => {
  const { connector, audit, trips, records } = medicalSchool();
  assert.equal(trips.membershipFor("L-103").medicalFlag, true);

  const result = connector.process(withdraw, {
    staffId: "S-02",
    approved: true,
    reasonCode: "restrict_except_required",
  });

  assert.equal(result.request.approvalStatus, "approved");
  assert.equal(result.status, "complete");
  const record = records.recordFor("L-103");
  assert.equal(record.medicalNoteRestricted, true);
  assert.equal(record.restrictionDueBy, "2026-11-16T10:00:00.000Z");
  assert.equal(trips.membershipFor("L-103").medicalFlag, false);

  const scheduled = audit.entries().find((e) => e.event === "restriction.scheduled");
  assert.equal(scheduled?.details.restrictionDays, 7);
  assert.equal(scheduled?.details.restrictionMethod, "restrict_not_delete");
  assert.equal(audit.verify().ok, true);
});

test("the deadline follows configuration", () => {
  const { connector, records } = medicalSchool(14);
  connector.process(withdraw, { staffId: "S-02", approved: true, reasonCode: "restrict_all" });
  assert.equal(records.recordFor("L-103").restrictionDueBy, "2026-11-23T10:00:00.000Z");
});

test("rejected Medical withdrawal changes nothing", () => {
  const { connector, audit, trips, records } = medicalSchool();
  const result = connector.process(withdraw, {
    staffId: "S-02",
    approved: false,
    reasonCode: "must_keep_record",
    reason: "Record must be kept",
  });

  assert.equal(result.request.approvalStatus, "rejected");
  assert.equal(connector.getState("L-103", "Medical"), "granted");
  assert.equal(records.recordFor("L-103").medicalNoteRestricted, false);
  assert.equal(records.recordFor("L-103").restrictionDueBy, undefined);
  assert.equal(trips.membershipFor("L-103").medicalFlag, true);
  assert.equal(audit.entries().some((e) => e.event === "restriction.scheduled"), false);
});

test("a pending Medical withdrawal restricts nothing", () => {
  const { connector, records } = medicalSchool();
  connector.process(withdraw);
  assert.equal(records.recordFor("L-103").medicalNoteRestricted, false);
  assert.equal(connector.getState("L-103", "Medical"), "granted");
});

test("A-06: reason list reused, extended minimally for Medical", () => {
  assert.equal(reasonCodeRequired("Medical"), true);
  assert.equal(isValidReasonCode("Medical", false, "must_keep_record"), true);
  assert.equal(isValidReasonCode("School Trips", false, "must_keep_record"), false);
  assert.equal(isValidReasonCode("Medical", true, "restrict_all"), true);
  assert.equal(
    decisionReasons("Medical", false).length,
    decisionReasons("School Trips", false).length + 1,
  );
});

// ---------------------------------------------------------- audit view control

function auditWithEntries() {
  const { connector, audit } = medicalSchool();
  connector.process({ ...withdraw, changeId: "chg-x" });
  // A School Trips request from another family, for the wrong-role checks.
  connector.process({
    ...grant,
    parentId: "P-002",
    learnerId: "L-102",
    type: "School Trips",
    changeId: "chg-trip",
  });
  return audit;
}

test("view reasons come from a fixed list", () => {
  assert.ok(VIEW_REASONS.length > 0);
  assert.equal(isValidViewReason(VIEW_REASONS[0]!.code), true);
  assert.equal(isValidViewReason("because"), false);
  assert.equal(isValidViewReason(undefined), false);
});

test("an allowed view is logged with who and why, and the chain still verifies", () => {
  const audit = auditWithEntries();
  const target = audit.entries().find((e) => e.details.changeId === "chg-x")!;
  const before = audit.entries().length;

  const out = viewAuditEntry(
    audit,
    { kind: "staff", staffId: "S-02", role: "information_officer" },
    target.index,
    "check_decision",
  );

  assert.equal(out.ok, true);
  assert.equal(audit.entries().length, before + 1);
  const logged = audit.entries()[before]!;
  assert.equal(logged.event, "audit.viewed");
  assert.equal(logged.details.staffId, "S-02");
  assert.equal(logged.details.reasonCode, "check_decision");
  assert.equal(logged.details.viewedIndex, target.index);
  assert.ok(logged.timestamp);
  assert.deepEqual(audit.verify(), { ok: true });
});

test("a parent may open their own family's entry and sees the view in their trail", () => {
  const audit = auditWithEntries();
  const target = audit.entries().find((e) => e.details.changeId === "chg-x")!;
  const family = { parentId: "P-003", learnerId: "L-103" };
  const out = viewAuditEntry(audit, { kind: "parent", ...family }, target.index, "check_my_request");
  assert.equal(out.ok, true);
  assert.ok(entriesForFamily(audit.entries(), family).some((e) => e.event === "audit.viewed"));
  assert.deepEqual(audit.verify(), { ok: true });
});

test("a blocked role is refused, nothing is returned, and the attempt is logged", () => {
  const audit = auditWithEntries();
  const medical = audit.entries().find((e) => e.details.changeId === "chg-x")!;
  const trips = audit.entries().find((e) => e.details.changeId === "chg-trip")!;

  // S-01 does not handle Medical.
  const s01 = viewAuditEntry(
    audit,
    { kind: "staff", staffId: "S-01", role: "admin_officer" },
    medical.index,
    "audit_check",
  );
  assert.deepEqual(s01, { ok: false, reason: "forbidden" });

  // Another family's parent.
  const other = viewAuditEntry(
    audit,
    { kind: "parent", parentId: "P-003", learnerId: "L-103" },
    trips.index,
    "check_my_request",
  );
  assert.deepEqual(other, { ok: false, reason: "forbidden" });

  const denied = audit.entries().filter((e) => e.event === "audit.view_denied");
  assert.equal(denied.length, 2);
  // The refusal does not copy the refused entry's event name into the trail.
  assert.equal(denied[0]!.details.viewedEvent, null);
  assert.deepEqual(audit.verify(), { ok: true });
});

test("a missing entry is refused and logs nothing", () => {
  const audit = auditWithEntries();
  const before = audit.entries().length;
  const out = viewAuditEntry(
    audit,
    { kind: "staff", staffId: "S-02", role: "information_officer" },
    9999,
    "audit_check",
  );
  assert.deepEqual(out, { ok: false, reason: "not_found" });
  assert.equal(audit.entries().length, before);
});

test("view-log entries stay inside their owner's scope", () => {
  const audit = auditWithEntries();
  const target = audit.entries().find((e) => e.details.changeId === "chg-x")!;
  viewAuditEntry(
    audit,
    { kind: "staff", staffId: "S-02", role: "information_officer" },
    target.index,
    "audit_check",
  );
  const s01 = entriesForStaff(audit.entries(), { staffId: "S-01", role: "admin_officer" });
  assert.equal(s01.some((e) => e.event === "audit.viewed"), false);
  const s02 = entriesForStaff(audit.entries(), { staffId: "S-02", role: "information_officer" });
  assert.equal(s02.some((e) => e.event === "audit.viewed"), true);
});