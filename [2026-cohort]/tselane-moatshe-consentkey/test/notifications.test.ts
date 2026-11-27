/** In-app notifications derived from the audit log. No email or SMS. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSchool } from "../src/school.js";
import type { ConsentChangeRequest } from "../src/connector/consentConnector.js";
import { workingDaysBetween } from "../src/approval/escalation.js";
import {
  ReadStore,
  parentNotifications,
  staffNotifications,
} from "../src/notifications/notifications.js";

const trips: ConsentChangeRequest = {
  parentId: "P-002",
  parentVerified: true,
  verificationMethod: "demo_login",
  learnerId: "L-102",
  type: "School Trips",
  from: "not_set",
  to: "granted",
  changeId: "chg-1",
};
const medical: ConsentChangeRequest = {
  ...trips,
  parentId: "P-003",
  learnerId: "L-103",
  type: "Medical",
  from: "granted",
  to: "withdrawn",
  changeId: "chg-2",
};

const familyA = { parentId: "P-002", learnerId: "L-102" };
const familyB = { parentId: "P-003", learnerId: "L-103" };
const adminOfficer = { staffId: "S-01", role: "admin_officer" as const };
const infoOfficer = { staffId: "S-02", role: "information_officer" as const };

/** First instant after `from` that is exactly one working day later. */
function oneWorkingDayAfter(from: string): Date {
  const d = new Date(from);
  for (let i = 0; i < 10; i++) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (workingDaysBetween(new Date(from), d) === 1) return d;
  }
  throw new Error("no working day found");
}

test("parent is told when a change is completed", () => {
  const school = buildSchool();
  school.connector.process(trips);
  school.connector.process(trips, { staffId: "S-01", approved: true });
  const kinds = parentNotifications(school.audit.entries(), familyA).map((n) => n.kind);
  assert.ok(kinds.includes("needs_approval"));
  assert.ok(kinds.includes("change_complete"));
});

test("parent is told when a change is declined", () => {
  const school = buildSchool();
  school.connector.process(trips);
  school.connector.process(trips, { staffId: "S-01", approved: false, reason: "private reason" });
  const items = parentNotifications(school.audit.entries(), familyA);
  assert.ok(items.some((n) => n.kind === "change_declined"));
  assert.ok(!items.some((n) => n.text.includes("private reason")));
});

test("parent is told when a request is escalated", () => {
  const school = buildSchool();
  school.connector.process(trips);
  school.audit.record("approval.escalated", {
    changeId: "chg-1", parentId: "P-002", learnerId: "L-102", type: "School Trips",
    changeContext: "standard", escalatedTo: "S-02",
  });
  assert.ok(parentNotifications(school.audit.entries(), familyA).some((n) => n.kind === "escalated"));
});

test("another parent gets none of them", () => {
  const school = buildSchool();
  school.connector.process(trips);
  school.connector.process(trips, { staffId: "S-01", approved: true });
  assert.deepEqual(parentNotifications(school.audit.entries(), familyB), []);
});

test("staff get a near-deadline notice for their role; the wrong role gets none", () => {
  const school = buildSchool();
  school.connector.process(trips); // School Trips: assigned to the admin officer
  const created = school.audit.entries().find((e) => e.event === "approval.pending")!.timestamp;
  const now = oneWorkingDayAfter(created);

  const mine = staffNotifications(school.audit.entries(), adminOfficer, now);
  assert.equal(mine.filter((n) => n.kind === "near_deadline").length, 1);
  assert.deepEqual(staffNotifications(school.audit.entries(), infoOfficer, now), []);

  // Not yet near the deadline on the day it was created.
  assert.deepEqual(staffNotifications(school.audit.entries(), adminOfficer, new Date(created)), []);

  // Once decided, there is nothing left to warn about.
  school.connector.process(trips, { staffId: "S-01", approved: true });
  assert.deepEqual(staffNotifications(school.audit.entries(), adminOfficer, now), []);
});

test("staff are told about an escalation to their role", () => {
  const school = buildSchool();
  school.connector.process(trips);
  school.audit.record("approval.escalated", {
    changeId: "chg-1", parentId: "P-002", learnerId: "L-102", type: "School Trips",
    changeContext: "standard", escalatedTo: "S-02",
  });
  const now = new Date();
  assert.ok(staffNotifications(school.audit.entries(), adminOfficer, now).some((n) => n.kind === "escalated"));
  // The named recipient is told too (visibility only).
  assert.ok(staffNotifications(school.audit.entries(), infoOfficer, now).some((n) => n.kind === "escalated"));
});

test("no names or health details appear in any notification text", () => {
  const school = buildSchool();
  school.connector.process(medical);
  school.connector.process(medical, { staffId: "S-02", approved: false, reason: "allergy to peanuts" });
  school.connector.process(trips);
  school.audit.record("approval.escalated", {
    changeId: "chg-2", parentId: "P-003", learnerId: "L-103", type: "Medical",
    changeContext: "standard", escalatedTo: "S-01",
  });
  const now = oneWorkingDayAfter(school.audit.entries()[0]!.timestamp);
  const all = [
    ...parentNotifications(school.audit.entries(), familyA),
    ...parentNotifications(school.audit.entries(), familyB),
    ...staffNotifications(school.audit.entries(), adminOfficer, now),
    ...staffNotifications(school.audit.entries(), infoOfficer, now),
  ];
  assert.ok(all.length > 0);
  for (const n of all) {
    assert.doesNotMatch(n.text, /medical|allerg|peanut|health|P-00\d|L-10\d|S-0\d/i);
  }
});

test("read state is kept per user", () => {
  const store = new ReadStore();
  const items = [{ id: "a", kind: "change_complete" as const, text: "x", at: "2026-01-01T00:00:00Z" }];
  store.markRead("parent:P-002", ["a"]);
  assert.equal(store.apply("parent:P-002", items)[0]!.read, true);
  assert.equal(store.apply("parent:P-003", items)[0]!.read, false);
});
