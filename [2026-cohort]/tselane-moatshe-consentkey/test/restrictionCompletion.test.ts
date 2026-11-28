import assert from "node:assert/strict";
import { test } from "node:test";
import { AuditLog } from "../src/audit/auditLog.js";
import { describeEntry } from "../src/audit/describe.js";
import { ConsentConnector } from "../src/connector/consentConnector.js";
import type { ConsentChangeRequest } from "../src/connector/consentConnector.js";
import { PhotoMediaLibrary } from "../src/systems/photoMediaLibrary.js";
import { TripsEventsRegister } from "../src/systems/tripsEventsRegister.js";
import { LearnerRecords } from "../src/systems/learnerRecords.js";
import { completeRestriction } from "../src/approval/restrictionCompletion.js";

const APPROVED_AT = new Date("2026-11-09T10:00:00Z"); // due 2026-11-16T10:00Z

const base: ConsentChangeRequest = {
  parentId: "P-003",
  parentVerified: true,
  verificationMethod: "demo_login",
  learnerId: "L-103",
  type: "Medical",
  from: "granted",
  to: "withdrawn",
  changeId: "chg-w",
};

function school() {
  const records = new LearnerRecords();
  const audit = new AuditLog();
  records.seedRecord("L-103");
  const connector = new ConsentConnector(
    [new PhotoMediaLibrary(), new TripsEventsRegister(), records],
    audit,
    new Map(),
    { now: () => APPROVED_AT },
  );
  connector.process(base, { staffId: "S-02", approved: true, reasonCode: "restrict_except_required" });
  const at = (iso: string) => ({ audit, learnerRecords: records, now: () => new Date(iso) });
  return { audit, records, at };
}

test("S-02 completes on time: audit, record state and open list update", () => {
  const { audit, records, at } = school();
  assert.deepEqual(records.openRestrictions().map((r) => r.learnerId), ["L-103"]);

  const r = completeRestriction(at("2026-11-12T08:00:00Z"), "S-02", "L-103");
  assert.equal(r.status, "completed");
  assert.equal(r.status === "completed" && r.onTime, true);

  const rec = records.recordFor("L-103");
  assert.equal(rec.restrictionCompletedAt, "2026-11-12T08:00:00.000Z");
  assert.equal(rec.restrictionDueBy, undefined);
  assert.equal(rec.medicalNoteRestricted, true); // restricted, not deleted
  assert.equal(records.openRestrictions().length, 0);

  const e = audit.entries().find((x) => x.event === "medical.restriction.completed");
  assert.equal(e?.details.staffId, "S-02");
  assert.equal(e?.details.learnerId, "L-103");
  assert.equal(e?.details.changeId, "chg-w");
  assert.equal(e?.details.onTime, true);
  assert.equal(e?.details.restrictionDueBy, "2026-11-16T10:00:00.000Z");
  assert.equal(describeEntry(e!).tone, "good");
  assert.deepEqual(audit.verify(), { ok: true });
});

test("S-02 completing after the deadline is recorded as late", () => {
  const { audit, at } = school();
  const r = completeRestriction(at("2026-11-17T09:00:00Z"), "S-02", "L-103");
  assert.equal(r.status === "completed" && r.onTime, false);
  const e = audit.entries().find((x) => x.event === "medical.restriction.completed");
  assert.equal(e?.details.onTime, false);
  assert.equal(describeEntry(e!).tone, "warn");
  assert.deepEqual(audit.verify(), { ok: true });
});

test("S-01 is blocked, the attempt is logged, and nothing changes", () => {
  const { audit, records, at } = school();
  const r = completeRestriction(at("2026-11-12T08:00:00Z"), "S-01", "L-103");
  assert.equal(r.status, "denied");
  assert.equal(records.openRestrictions().length, 1);
  assert.equal(records.recordFor("L-103").restrictionCompletedAt, undefined);
  assert.equal(audit.entries().some((x) => x.event === "medical.restriction.completed"), false);
  const denied = audit.entries().find((x) => x.event === "medical.restriction.completion_denied");
  assert.equal(denied?.details.staffId, "S-01");
  assert.equal(denied?.details.learnerId, "L-103");
  assert.equal(describeEntry(denied!).tone, "warn");
  assert.deepEqual(audit.verify(), { ok: true });
});

test("a second completion is idempotent and writes no second audit entry", () => {
  const { audit, at } = school();
  completeRestriction(at("2026-11-12T08:00:00Z"), "S-02", "L-103");
  const count = audit.entries().length;
  const again = completeRestriction(at("2026-11-13T08:00:00Z"), "S-02", "L-103");
  assert.equal(again.status, "already_completed");
  assert.equal(again.status === "already_completed" && again.completedAt, "2026-11-12T08:00:00.000Z");
  assert.equal(audit.entries().length, count);
  assert.deepEqual(audit.verify(), { ok: true });
});

test("a learner with no open restriction gives not_found", () => {
  const { audit, at } = school();
  assert.equal(completeRestriction(at("2026-11-12T08:00:00Z"), "S-02", "L-999").status, "not_found");
  assert.equal(audit.entries().some((x) => x.event === "medical.restriction.completed"), false);
});

test("a later re-withdrawal opens a new restriction", () => {
  const { records, at } = school();
  completeRestriction(at("2026-11-12T08:00:00Z"), "S-02", "L-103");
  records.apply({ learnerId: "L-103", type: "Medical", from: "granted", to: "withdrawn", restrictionDueBy: "2026-12-01T00:00:00.000Z" });
  assert.equal(records.recordFor("L-103").restrictionCompletedAt, undefined);
  assert.equal(records.openRestrictions().length, 1);
});
