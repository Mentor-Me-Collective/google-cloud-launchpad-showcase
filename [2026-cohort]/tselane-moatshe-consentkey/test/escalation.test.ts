/**
 * Implementation plan, phase 2: two-working-day escalation.
 * Assumptions A-01 to A-03 in docs/legal-decisions-log.md.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSchool } from "../src/school.js";
import { PermissionDeniedError } from "../src/connector/consentConnector.js";
import type { ConsentChangeRequest } from "../src/connector/consentConnector.js";
import {
  escalationConfigFromEnv,
  escalationRecipient,
  escalationStatus,
  recordEscalations,
  workingDaysBetween,
} from "../src/approval/escalation.js";
import { entriesForStaff } from "../src/audit/visibility.js";
import { describeEntry } from "../src/audit/describe.js";

// 2026-11-09 is a Monday.
const monday = new Date("2026-11-09T09:00:00Z");
const wednesday = new Date("2026-11-11T09:00:00Z");

const tripsRequest: ConsentChangeRequest = {
  parentId: "P-002",
  parentVerified: true,
  verificationMethod: "demo_login",
  learnerId: "L-102",
  type: "School Trips",
  from: "not_set",
  to: "granted",
  changeId: "chg-trips",
};

function pendingOf(request: ConsentChangeRequest, createdAt: Date) {
  return { id: request.changeId!, createdAt: createdAt.toISOString(), request };
}

test("A-01: holidays are skipped, and the default list is the South African public holidays", () => {
  assert.equal(workingDaysBetween(monday, wednesday), 2);
  assert.equal(workingDaysBetween(monday, wednesday, ["2026-11-10"]), 1);
  assert.equal(workingDaysBetween(monday, wednesday, ["2026-11-14"]), 2); // a Saturday
  assert.equal(escalationStatus(monday.toISOString(), wednesday).state, "overdue");
  assert.equal(
    escalationStatus(monday.toISOString(), wednesday, { holidays: ["2026-11-10"] }).state,
    "within_limit",
  );
});

test("A-01/A-02: config reads env and ignores bad values", () => {
  const base = escalationConfigFromEnv({}).holidays;
  assert.ok(base.includes("2026-12-25"), "built-in SA holidays are present");
  assert.equal(escalationConfigFromEnv({}).recipient, undefined);
  const withExtra = escalationConfigFromEnv({
    SCHOOL_HOLIDAYS: "2026-11-30, nonsense",
    ESCALATION_RECIPIENT: "S-02",
  });
  assert.ok(withExtra.holidays.includes("2026-11-30"));
  assert.ok(!withExtra.holidays.includes("nonsense"));
  assert.ok(withExtra.holidays.includes("2026-12-25"), "extra dates are added, not replaced");
  assert.equal(withExtra.recipient, "S-02");
  assert.equal(escalationConfigFromEnv({ ESCALATION_RECIPIENT: "S-99" }).recipient, undefined);
});

test("A-02: default recipient is the other staff role", () => {
  assert.equal(escalationRecipient("admin_officer"), "S-02");
  assert.equal(escalationRecipient("information_officer"), "S-01");
  // A configured recipient in the same role adds nobody, so it falls back.
  assert.equal(escalationRecipient("admin_officer", { holidays: [], recipient: "S-01" }), "S-02");
});

test("a request within the limit is not escalated", () => {
  const school = buildSchool();
  school.connector.process(tripsRequest);
  const before = school.audit.entries().length;
  const done = recordEscalations([pendingOf(tripsRequest, monday)], school.audit, new Date("2026-11-10T09:00:00Z"));
  assert.deepEqual(done, []);
  assert.equal(school.audit.entries().length, before);
});

test("a request past 2 working days reaches the recipient and is escalated once", () => {
  const school = buildSchool();
  school.connector.process(tripsRequest);
  const pending = [pendingOf(tripsRequest, monday)];

  assert.deepEqual(recordEscalations(pending, school.audit, wednesday), ["chg-trips"]);
  // Idempotent: reading again does not write a second entry.
  assert.deepEqual(recordEscalations(pending, school.audit, wednesday), []);

  const entries = school.audit.entries().filter((e) => e.event === "approval.escalated");
  assert.equal(entries.length, 1);
  assert.equal(entries[0]!.details.escalatedTo, "S-02");
  assert.equal(entries[0]!.details.requiredRole, "admin_officer");
  assert.equal(entries[0]!.details.autoApproved, false);
  assert.match(describeEntry(entries[0]!).title, /Escalated to S-02/);

  // The recipient can see the entry; it is a read-only visibility grant.
  const seenByS02 = entriesForStaff(school.audit.entries(), {
    staffId: "S-02",
    role: "information_officer",
  });
  assert.ok(seenByS02.some((e) => e.event === "approval.escalated"));
  assert.ok(!seenByS02.some((e) => e.event === "approval.requested" || e.event === "request.received"));

  assert.deepEqual(school.audit.verify(), { ok: true });
});

test("a Medical request escalates to S-01, and a configured recipient is honoured", () => {
  const school = buildSchool();
  const medical: ConsentChangeRequest = {
    ...tripsRequest,
    parentId: "P-003",
    learnerId: "L-103",
    type: "Medical",
    from: "granted",
    to: "withdrawn",
    changeId: "chg-med",
  };
  school.connector.process(medical);
  recordEscalations([pendingOf(medical, monday)], school.audit, wednesday, { holidays: [], recipient: "S-01" });
  const entry = school.audit.entries().find((e) => e.event === "approval.escalated");
  assert.equal(entry?.details.escalatedTo, "S-01");
});

test("escalation never approves: no state change without a human decision", () => {
  const school = buildSchool();
  const first = school.connector.process(tripsRequest);
  const longAfter = new Date("2027-03-01T09:00:00Z");

  recordEscalations([pendingOf(tripsRequest, monday)], school.audit, longAfter);
  const status = escalationStatus(monday.toISOString(), longAfter, undefined, "admin_officer");
  assert.equal(status.state, "overdue");
  assert.equal(status.autoApproved, false);

  assert.equal(first.request.approvalStatus, "pending");
  assert.equal(school.connector.getState("L-102", "School Trips"), "not_set");
  const events = school.audit.entries().map((e) => e.event);
  for (const forbidden of ["approval.approved", "approval.rejected", "system.updated", "change.complete"]) {
    assert.ok(!events.includes(forbidden), forbidden);
  }

  // The escalation recipient has no authority to decide it.
  assert.throws(
    () => school.connector.process(tripsRequest, { staffId: "S-02", approved: true }),
    PermissionDeniedError,
  );
  assert.equal(school.connector.getState("L-102", "School Trips"), "not_set");

  // Only the assigned role can decide, and that is a human act.
  const decided = school.connector.process(tripsRequest, { staffId: "S-01", approved: true });
  assert.equal(decided.request.approvalStatus, "approved");
  assert.deepEqual(school.audit.verify(), { ok: true });
});

test("A-03: no request type skips the wait", () => {
  for (const type of ["School Trips", "Medical", "Contact Details"] as const) {
    const status = escalationStatus(
      monday.toISOString(),
      new Date("2026-11-10T09:00:00Z"),
      undefined,
      type === "Medical" ? "information_officer" : "admin_officer",
    );
    assert.equal(status.state, "within_limit", type);
    assert.equal(status.escalated, false, type);
  }
});
