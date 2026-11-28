/**
 * The audit trail is only accountability if the person it protects can read
 * it. These check that every event the system emits turns into plain language,
 * and that one consent change reads as one story rather than six rows.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { AuditLog } from "../src/audit/auditLog.js";
import {
  describeEntry,
  groupEntries,
  stateWords,
  verificationWords,
} from "../src/audit/describe.js";
import { buildSchool } from "../src/school.js";

test("consent states and verification read as words, not codes", () => {
  assert.equal(stateWords("not_set"), "not set");
  assert.equal(stateWords("granted"), "granted");
  assert.match(verificationWords("demo_login"), /no PIN was checked/);
  assert.match(verificationWords("separate_pin"), /separate PIN/);
});

test("every event the system emits has a plain-language title", () => {
  const events = [
    "system.seeded",
    "request.received",
    "request.rejected",
    "consent.change_requested",
    "approval.requested",
    "approval.pending",
    "approval.approved",
    "approval.rejected",
    "approval.denied",
    "system.updated",
    "system.update_failed",
    "change.complete",
    "change.incomplete",
    "change.retry",
    "ai.draft_created",
    "audit.archived",
  ];

  const audit = new AuditLog();
  for (const event of events) {
    const entry = audit.record(event, {
      type: "Medical",
      from: "not_set",
      to: "granted",
      staffId: "S-02",
      system: "Learner Records",
    });
    const described = describeEntry(entry);
    // No raw event codes leaking into the title.
    assert.ok(described.title.length > 0, `${event} has no title`);
    assert.ok(
      !described.title.includes("_") && !described.title.includes("."),
      `${event} title still looks like a code: ${described.title}`,
    );
  }
});

test("an unknown future event still renders something readable", () => {
  const audit = new AuditLog();
  const entry = audit.record("something.brand_new", { type: "Photos" });
  const described = describeEntry(entry);
  assert.equal(described.title, "something brand new");
  assert.equal(described.tone, "neutral");
});

test("a waiting approval says plainly that nothing has changed", () => {
  const audit = new AuditLog();
  const entry = audit.record("approval.requested", {
    type: "School Trips",
    from: "not_set",
    to: "granted",
  });
  const d = describeEntry(entry);
  assert.equal(d.tone, "warn");
  assert.match(d.meaning ?? "", /Nothing has changed yet/);
  assert.match(d.summary ?? "", /School Trips: not set to granted/);
});

test("an emergency-contact change says so in the summary", () => {
  const audit = new AuditLog();
  const entry = audit.record("consent.change_requested", {
    type: "Contact Details",
    changeContext: "emergency_contact",
    from: "not_set",
    to: "granted",
  });
  assert.match(describeEntry(entry).summary ?? "", /\(emergency contact\)/);
});

test("a wrong-role block explains who it actually needed", () => {
  const audit = new AuditLog();
  const entry = audit.record("approval.denied", {
    type: "Medical",
    staffId: "S-01",
    requiredRole: "information_officer",
  });
  const d = describeEntry(entry);
  // "warn", not "bad": the request is untouched and still live. See
  // "a blocked wrong-role attempt is NOT shown as a refusal".
  assert.equal(d.tone, "warn");
  assert.match(d.summary ?? "", /S-01 tried to decide this/);
  assert.match(d.summary ?? "", /Information Officer/);
});

test("one real consent change groups into one story", () => {
  const school = buildSchool();
  school.connector.process({
    parentId: "P-001",
    parentVerified: true,
    verificationMethod: "demo_login",
    learnerId: "L-101",
    type: "Photos",
    from: "granted",
    to: "withdrawn",
  });

  const groups = groupEntries(school.audit.entries());
  assert.equal(groups.length, 1, "a single change should be a single group");

  const [group] = groups;
  assert.equal(group!.outcome, "complete");
  assert.equal(group!.parentId, "P-001");
  assert.equal(group!.learnerId, "L-101");
  assert.equal(group!.verificationMethod, "demo_login");
  assert.match(group!.heading ?? "", /Photos: granted to withdrawn/);
  // request.received, consent.change_requested, system.updated, change.complete
  assert.ok(group!.steps.length >= 4);
});

test("separate changes stay separate, newest first", () => {
  const school = buildSchool();
  const common = {
    parentId: "P-001",
    parentVerified: true,
    verificationMethod: "demo_login" as const,
    learnerId: "L-101",
  };
  school.connector.process({ ...common, type: "Photos", from: "granted", to: "withdrawn" });
  school.connector.process({ ...common, type: "Contact Details", from: "not_set", to: "granted" });

  const groups = groupEntries(school.audit.entries());
  assert.equal(groups.length, 2);
  // Newest first, so the Contact Details change leads.
  assert.match(groups[0]!.heading ?? "", /Contact Details/);
  assert.match(groups[1]!.heading ?? "", /Photos/);
});

test("a queued change that is later approved reads as ONE record, not two", () => {
  // The bug this guards: the "sent for approval" entry is written when the
  // parent submits, and the rest when staff decide — potentially hours later.
  // Keyed separately, the parent saw the same request twice, once "waiting"
  // and once "complete".
  const school = buildSchool();
  const request = {
    parentId: "P-002",
    parentVerified: true,
    verificationMethod: "demo_login" as const,
    learnerId: "L-102",
    type: "School Trips" as const,
    from: "not_set" as const,
    to: "granted" as const,
    changeId: "change-abc",
  };

  // 1. Submitted: the app writes this entry directly.
  school.audit.record("approval.requested", {
    changeId: request.changeId,
    parentId: request.parentId,
    learnerId: request.learnerId,
    type: request.type,
    from: request.from,
    to: request.to,
  });

  // 2. Approved later: the connector writes its own batch.
  school.connector.process(request, { staffId: "S-01", approved: true });

  const groups = groupEntries(school.audit.entries());
  assert.equal(groups.length, 1, "submission and approval must be one record");
  assert.equal(groups[0]!.outcome, "complete");
  // The whole story is there, starting with the approval request.
  const titles = groups[0]!.steps.map((s) => s.title);
  assert.ok(titles.includes("Sent for staff approval"));
  assert.ok(titles.includes("Approved by S-01"));
  assert.ok(titles.includes("Change complete"));
});

test("housekeeping is separated from consent decisions", () => {
  const school = buildSchool();
  school.audit.record("system.seeded", { states: 3 });
  school.connector.process({
    parentId: "P-001",
    parentVerified: true,
    verificationMethod: "demo_login",
    learnerId: "L-101",
    type: "Photos",
    from: "granted",
    to: "withdrawn",
  });

  const groups = groupEntries(school.audit.entries());
  const records = groups.filter((g) => g.kind === "change");
  const system = groups.filter((g) => g.kind === "system");

  assert.equal(records.length, 1, "the Photos change is the only consent record");
  assert.equal(system.length, 1, "the seed is housekeeping, not a record");
  assert.match(records[0]!.heading ?? "", /Photos/);
});

test("the identity footer only appears where the parent actually asked", () => {
  // A staff member seeing only their own blocked attempt must not be shown
  // "identity checked using demo login" — that describes the parent, and on a
  // staff-only card it reads as if the staff member was checked that way.
  const audit = new AuditLog();
  audit.record("approval.denied", {
    requestId: "REQ-000001",
    type: "Medical",
    staffId: "S-01",
    requiredRole: "information_officer",
    parentId: "P-001",
    verificationMethod: "demo_login",
  });

  const [blockedOnly] = groupEntries(audit.entries());
  assert.equal(blockedOnly!.hasParentRequest, false);

  // With the parent's own request present, the footer is accurate again.
  audit.record("consent.change_requested", {
    requestId: "REQ-000001",
    type: "Medical",
    parentId: "P-001",
    verificationMethod: "demo_login",
  });
  const [withRequest] = groupEntries(audit.entries());
  assert.equal(withRequest!.hasParentRequest, true);
});

test("a blocked wrong-role attempt is NOT shown as a refusal", () => {
  // The bug this guards: approval.denied means the wrong officer tried to
  // decide and was stopped — the request is untouched and still waiting.
  // Lumping it with real refusals told a parent their Medical change had
  // been refused when nobody had decided anything.
  const audit = new AuditLog();
  audit.record("approval.denied", {
    requestId: "REQ-000001",
    type: "Medical",
    from: "not_set",
    to: "withdrawn",
    staffId: "S-01",
    requiredRole: "information_officer",
  });

  const [group] = groupEntries(audit.entries());
  assert.notEqual(group!.outcome, "refused");
  assert.equal(group!.outcome, "blocked");

  const step = group!.steps[0]!;
  assert.equal(step.tone, "warn", "a block is not a failure of the request");
  assert.match(step.meaning ?? "", /still waiting/);
  assert.match(step.meaning ?? "", /Information Officer/);
});

test("a staff member actually declining IS a refusal", () => {
  const audit = new AuditLog();
  audit.record("approval.rejected", {
    requestId: "REQ-000002",
    type: "Medical",
    staffId: "S-02",
    reason: "needs more information",
  });
  assert.equal(groupEntries(audit.entries())[0]!.outcome, "refused");
});

test("a request still queued stays 'waiting' even after a wrong-role attempt", () => {
  const audit = new AuditLog();
  audit.record("approval.requested", {
    changeId: "c1",
    type: "Medical",
    from: "not_set",
    to: "withdrawn",
  });
  audit.record("approval.denied", {
    changeId: "c1",
    type: "Medical",
    staffId: "S-01",
    requiredRole: "information_officer",
  });
  assert.equal(groupEntries(audit.entries())[0]!.outcome, "waiting");
});

test("one request is received once, however many times staff touch it", () => {
  // Regression: the connector re-ran its whole flow on every decision pass,
  // so a wrong-role attempt followed by a real approval logged "Request
  // received" and "Change requested" three times for ONE request.
  const school = buildSchool();
  const request = {
    parentId: "P-003",
    parentVerified: true,
    verificationMethod: "demo_login" as const,
    learnerId: "L-103",
    type: "Medical" as const,
    from: "granted" as const,
    to: "withdrawn" as const,
    changeId: "change-xyz",
  };

  // Submitted, then queued by the app.
  school.audit.record("approval.requested", {
    changeId: request.changeId,
    parentId: request.parentId,
    learnerId: request.learnerId,
    type: request.type,
    from: request.from,
    to: request.to,
  });

  // The wrong officer tries, is blocked.
  assert.throws(() =>
    school.connector.process(request, { staffId: "S-01", approved: true }),
  );
  // Then the right officer approves.
  school.connector.process(request, { staffId: "S-02", approved: true });

  const [group] = groupEntries(school.audit.entries());
  const titles = group!.steps.map((s) => s.title);
  const count = (t: string) => titles.filter((x) => x === t).length;

  assert.equal(count("Request received"), 0, "already logged at submission");
  assert.equal(count("Change requested"), 0, "already logged at submission");
  assert.equal(count("Sent for staff approval"), 1);
  assert.equal(count("Blocked — wrong role"), 1);
  assert.equal(count("Approved by S-02"), 1);
  assert.equal(group!.outcome, "complete");
});

test("an immediate change still logs its full story", () => {
  // The dedup above must not silence changes that need no approval — those
  // have no earlier submission entry to rely on.
  const school = buildSchool();
  school.connector.process({
    parentId: "P-001",
    parentVerified: true,
    verificationMethod: "demo_login",
    learnerId: "L-101",
    type: "Photos",
    from: "granted",
    to: "withdrawn",
  });

  const titles = groupEntries(school.audit.entries())[0]!.steps.map((s) => s.title);
  assert.ok(titles.includes("Request received"));
  assert.ok(titles.includes("Change requested"));
  assert.ok(titles.includes("Change complete"));
});

test("a refused change is marked refused, not complete", () => {
  const school = buildSchool();
  try {
    school.connector.process({
      parentId: "P-009",
      parentVerified: false,
      verificationMethod: "demo_login",
      learnerId: "L-104",
      type: "Photos",
      from: "granted",
      to: "withdrawn",
    });
  } catch {
    // The connector throws for an unverified parent; the entry is still logged.
  }

  const groups = groupEntries(school.audit.entries());
  assert.equal(groups[0]!.outcome, "refused");
});
