/**
 * Tests for the rows in the decisions sheet (OD-03, OD-04, OD-06, OD-07,
 * OD-09 and the approval time limit).
 *
 * Each test names the row it covers so a reviewer can tick the sheet off
 * against the build.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { AuditLog } from "../src/audit/auditLog.js";
import {
  entriesForFamily,
  entriesForStaff,
  isVisibleToStaff,
} from "../src/audit/visibility.js";
import {
  expiredEntries,
  planArchive,
  retainUntil,
} from "../src/audit/retention.js";
import {
  canApprove,
  requiredRole,
  STAFF,
} from "../src/approval/approvalRules.js";
import {
  decisionReasons,
  isValidReasonCode,
  reasonCodeRequired,
} from "../src/approval/decisionReasons.js";
import {
  ESCALATION_WORKING_DAYS,
  escalationStatus,
  workingDaysBetween,
} from "../src/approval/escalation.js";
import { buildSchool } from "../src/school.js";

// ---------------------------------------------------------------- OD-03

test("OD-03: exactly three roles, and no Administrator or System Service", () => {
  assert.deepEqual(Object.keys(STAFF).sort(), ["S-01", "S-02"]);
  assert.equal(STAFF["S-01"]!.role, "admin_officer");
  assert.equal(STAFF["S-02"]!.role, "information_officer");
});

// ---------------------------------------------------------------- OD-04

test("OD-04: the five approval rules", () => {
  assert.equal(requiredRole("Photos"), undefined);
  assert.equal(requiredRole("Contact Details", "standard"), "admin_officer");
  assert.equal(requiredRole("School Trips"), "admin_officer");
  assert.equal(requiredRole("Contact Details", "emergency_contact"), "admin_officer");
  assert.equal(requiredRole("Medical"), "information_officer");
});

test("OD-04: an officer may not approve another role's request", () => {
  assert.equal(canApprove("S-02", "School Trips"), false);
  assert.equal(canApprove("S-01", "Medical"), false);
  assert.equal(canApprove("S-01", "School Trips"), true);
  assert.equal(canApprove("S-02", "Medical"), true);
});

test("a wrong-role attempt is refused AND recorded, never masked by validation", () => {
  // Regression: the OD-07 reason check ran before the permission check, so an
  // officer who could not decide a Medical request got "choose a reason"
  // (HTTP 400) instead of being refused — and because the request never
  // reached the connector, the attempt was never written to the audit trail.
  // Authorization must be decided first, and the attempt must be logged.
  const school = buildSchool();

  // Medical needs a reason (OD-07) — but S-01 may not decide it at all, so the
  // permission failure must win, with no reason supplied.
  assert.equal(reasonCodeRequired("Medical"), true);
  assert.equal(canApprove("S-01", "Medical"), false);

  assert.throws(
    () =>
      school.connector.process(
        {
          parentId: "P-003",
          parentVerified: true,
          verificationMethod: "demo_login",
          learnerId: "L-103",
          type: "Medical",
          from: "granted",
          to: "withdrawn",
        },
        { staffId: "S-01", approved: true },
      ),
    /S-01 may not approve Medical/,
  );

  const denied = school.audit.entries().find((e) => e.event === "approval.denied");
  assert.ok(denied, "the blocked attempt must be in the audit trail");
  assert.equal(denied!.details.staffId, "S-01");
  assert.equal(denied!.details.requiredRole, "information_officer");
});

// ---------------------------------------------------------------- OD-07

test("OD-07: a Medical decision requires a reason from the short list", () => {
  assert.equal(reasonCodeRequired("Medical"), true);
  assert.equal(reasonCodeRequired("School Trips"), false);

  // Decision 1 option B is offered explicitly for Medical approvals.
  const codes = decisionReasons("Medical", true).map((r) => r.code);
  assert.ok(codes.includes("restrict_except_required"));
  assert.ok(codes.includes("restrict_all"));

  assert.equal(isValidReasonCode("Medical", true, "restrict_all"), true);
  assert.equal(isValidReasonCode("Medical", true, "made_up_code"), false);
  // An approval reason is not silently accepted as a decline reason.
  assert.equal(isValidReasonCode("Medical", false, "restrict_all"), false);
});

test("OD-07: the reason is recorded on approval, not only on rejection", () => {
  const school = buildSchool();
  const result = school.connector.process(
    {
      parentId: "P-003",
      parentVerified: true,
      verificationMethod: "demo_login",
      learnerId: "L-103",
      type: "Medical",
      from: "granted",
      to: "withdrawn",
    },
    {
      staffId: "S-02",
      approved: true,
      reasonCode: "restrict_except_required",
      reason: "Kept only what the school must keep",
    },
  );

  assert.equal(result.request.approvalStatus, "approved");
  const approval = school.audit
    .entries()
    .find((e) => e.event === "approval.approved");
  assert.equal(approval?.details.reasonCode, "restrict_except_required");
  assert.equal(approval?.details.staffId, "S-02");
});

// ---------------------------------------------------------------- OD-09

test("OD-09: a parent sees only their own family's entries", () => {
  const audit = new AuditLog();
  audit.record("system.seeded", { states: 3 });
  audit.record("consent.change_requested", { parentId: "P-001", learnerId: "L-101" });
  audit.record("consent.change_requested", { parentId: "P-002", learnerId: "L-102" });

  const mine = entriesForFamily(audit.entries(), {
    parentId: "P-001",
    learnerId: "L-101",
  });
  assert.equal(mine.length, 1);
  assert.equal(mine[0]!.details.parentId, "P-001");
});

test("OD-09: a staff member sees only requests assigned to their role", () => {
  const audit = new AuditLog();
  audit.record("consent.change_requested", {
    learnerId: "L-102",
    type: "School Trips",
    changeContext: "standard",
  });
  audit.record("consent.change_requested", {
    learnerId: "L-103",
    type: "Medical",
    changeContext: "standard",
  });

  const admin = entriesForStaff(audit.entries(), {
    staffId: "S-01",
    role: "admin_officer",
  });
  const info = entriesForStaff(audit.entries(), {
    staffId: "S-02",
    role: "information_officer",
  });

  assert.deepEqual(admin.map((e) => e.details.type), ["School Trips"]);
  assert.deepEqual(info.map((e) => e.details.type), ["Medical"]);
});

test("OD-09: Contact Details entries go to S-01, whether or not an emergency contact", () => {
  const audit = new AuditLog();
  const emergency = audit.record("consent.change_requested", {
    type: "Contact Details",
    changeContext: "emergency_contact",
  });
  const ordinary = audit.record("consent.change_requested", {
    type: "Contact Details",
    changeContext: "standard",
  });

  const admin = { staffId: "S-01", role: "admin_officer" } as const;
  assert.equal(isVisibleToStaff(emergency, admin), true);
  // Plan phase 1: every Contact Details change is assigned to S-01.
  assert.equal(isVisibleToStaff(ordinary, admin), true);
  assert.equal(
    isVisibleToStaff(ordinary, { staffId: "S-02", role: "information_officer" }),
    false,
  );
});

test("OD-09: an officer always sees their own actions", () => {
  const audit = new AuditLog();
  // A Medical approval recorded by S-02 is visible to S-02 as the actor even
  // though the lookup below is by role too.
  const entry = audit.record("approval.approved", {
    type: "Medical",
    staffId: "S-02",
  });
  assert.equal(
    isVisibleToStaff(entry, { staffId: "S-02", role: "information_officer" }),
    true,
  );
});

// ---------------------------------------------------------------- OD-06

test("OD-06: no configured period means no retention stamp, not 'keep forever'", () => {
  assert.equal(retainUntil(new Date("2026-11-17T00:00:00Z"), null), null);
});

test("OD-06: a configured period stamps the entry", () => {
  const until = retainUntil(new Date("2026-11-17T00:00:00Z"), 12);
  assert.equal(until, "2027-11-17T00:00:00.000Z");
});

test("OD-06: nothing expires while no period is set", () => {
  const audit = new AuditLog();
  audit.record("consent.change_requested", { parentId: "P-001" });
  // retainUntil is null on these entries, so they can never be selected for
  // deletion by accident.
  assert.equal(expiredEntries(audit.entries(), new Date("2099-01-01")).length, 0);
});

test("OD-06: an archive plan anchors the chain to the last removed hash", () => {
  const audit = new AuditLog();
  audit.record("a", {});
  audit.record("b", {});
  const third = audit.record("c", {});

  const plan = planArchive(audit.entries(), 1, new Date("2026-11-17T00:00:00Z"));
  assert.equal(plan?.removedCount, 2);
  assert.equal(plan?.lastRemovedIndex, 1);
  assert.equal(plan?.lastRemovedHash, audit.entries()[1]!.hash);
  // The surviving entry still points at the anchor, so the chain reconnects.
  assert.equal(third.prevHash, plan?.lastRemovedHash);
  assert.equal(planArchive(audit.entries(), -1), null);
});

// ------------------------------------------------- approval time limit

test("time limit: weekends do not count toward the two working days", () => {
  // Friday 13 Nov 2026 -> Monday 16 Nov 2026 is one working day.
  const friday = new Date("2026-11-13T09:00:00Z");
  const monday = new Date("2026-11-16T09:00:00Z");
  assert.equal(workingDaysBetween(friday, monday), 1);
  assert.equal(escalationStatus(friday.toISOString(), monday).state, "within_limit");

  // Friday -> Tuesday is two working days, so it is overdue.
  const tuesday = new Date("2026-11-17T09:00:00Z");
  assert.equal(workingDaysBetween(friday, tuesday), 2);
  assert.equal(escalationStatus(friday.toISOString(), tuesday).state, "overdue");
});

test("time limit: a request is never auto-approved, however long it waits", () => {
  const long = escalationStatus("2020-01-01T00:00:00Z", new Date("2026-11-17"));
  assert.equal(long.state, "overdue");
  assert.equal(long.autoApproved, false);
  assert.ok(long.workingDaysWaiting > ESCALATION_WORKING_DAYS);

  // And the rules engine still refuses to apply anything without a decision.
  const school = buildSchool();
  const pending = school.connector.process({
    parentId: "P-002",
    parentVerified: true,
    verificationMethod: "demo_login",
    learnerId: "L-102",
    type: "School Trips",
    from: "not_set",
    to: "granted",
  });
  assert.equal(pending.request.approvalStatus, "pending");
  assert.equal(pending.request.currentState, "not_set");
  assert.equal(pending.impactSummary.updated, 0);
});
