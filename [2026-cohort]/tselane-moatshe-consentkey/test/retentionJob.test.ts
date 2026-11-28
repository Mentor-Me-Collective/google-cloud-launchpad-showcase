import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AuditLog } from "../src/audit/auditLog.js";
import type { AuditEntry } from "../src/audit/auditLog.js";
import {
  latestAnchor,
  retentionHandler,
  verifyAnchored,
} from "../src/audit/archive.js";
import type { ArchiveRecord, RetentionDeps } from "../src/audit/archive.js";
import type { Identity } from "../src/server/identities.js";

const NOW = new Date("2027-06-01T00:00:00Z");

afterEach(() => {
  delete process.env.AUDIT_RETENTION_MONTHS;
});

/** Log with `old` entries written in 2025 and `fresh` entries written just before NOW. */
function buildLog(old: number, fresh: number): AuditLog {
  process.env.AUDIT_RETENTION_MONTHS = "12";
  let at = new Date("2025-01-01T00:00:00Z");
  const log = new AuditLog(undefined, () => at);
  for (let i = 0; i < old; i++) log.record("consent.recorded", { n: i, secret: "personal" });
  at = new Date("2027-05-31T00:00:00Z");
  for (let i = 0; i < fresh; i++) log.record("consent.recorded", { n: i });
  return log;
}

function harness(log: AuditLog, months: number | null = 12) {
  const archives: ArchiveRecord[] = [];
  const deleted: number[] = [];
  const deps: RetentionDeps = {
    audit: log,
    saveArchive: async (r) => {
      archives.push(r);
    },
    deleteDurable: async (i) => {
      deleted.push(i);
    },
    now: NOW,
    months,
  };
  return { deps, archives, deleted };
}

const admin = { kind: "admin" } as unknown as Identity;
const staff = { kind: "staff", role: "admin_officer" } as unknown as Identity;
const admin_body = (mode?: string) => (mode ? { mode } : {});

test("no period configured: nothing expires, even apply removes nothing", async () => {
  const log = buildLog(3, 1);
  const h = harness(log, null);
  const r = await retentionHandler(admin, admin_body("apply"), h.deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.removedCount, 0);
  assert.equal(r.body.periodConfigured, false);
  assert.equal(h.archives.length, 0);
  assert.equal(log.entries().filter((e) => e.event === "consent.recorded").length, 4);
});

test("expired entries are archived with an anchor and removed from the live log", async () => {
  const log = buildLog(3, 2);
  const originalHashes = log.entries().map((e) => e.hash);
  const h = harness(log);
  const r = await retentionHandler(admin, admin_body("apply"), h.deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.removedCount, 3);
  assert.equal(h.archives.length, 1);
  assert.equal(h.archives[0]!.entries.length, 3);
  assert.equal(h.archives[0]!.lastRemovedHash, originalHashes[2]);
  assert.deepEqual(h.deleted, [2]);
  assert.equal(log.entries()[0]!.index, 3);
});

test("chain verifies after removal with the anchor, and fails without it", async () => {
  const log = buildLog(3, 2);
  const h = harness(log);
  await retentionHandler(admin, admin_body("apply"), h.deps);
  const anchor = latestAnchor(h.archives);
  assert.deepEqual(verifyAnchored(log.entries(), anchor), { ok: true });
  assert.equal(verifyAnchored(log.entries()).ok, false);
  // Appending afterwards keeps it verifiable.
  log.record("consent.recorded", {});
  assert.deepEqual(verifyAnchored(log.entries(), anchor), { ok: true });
  // Tampering is still caught.
  const tampered = log.entries().map((e) => ({ ...e }));
  (tampered[1] as { event: string }).event = "forged";
  assert.equal(verifyAnchored(tampered, anchor).ok, false);
  // A wrong anchor is caught.
  assert.equal(
    verifyAnchored(log.entries(), { lastRemovedIndex: 2, lastRemovedHash: "bad" }).ok,
    false,
  );
});

test("run entry records counts only, no personal data", async () => {
  const log = buildLog(2, 1);
  const h = harness(log);
  await retentionHandler(admin, admin_body("apply"), h.deps);
  const run = log.entries().find((e) => e.event === "audit.retention.run")!;
  assert.equal(run.details.removedCount, 2);
  assert.equal(run.details.expiredCount, 2);
  assert.ok(!JSON.stringify(run).includes("personal"));
  for (const v of Object.values(run.details)) {
    assert.ok(["number", "boolean", "string"].includes(typeof v) || v === null);
  }
});

test("dry run (the default) changes nothing", async () => {
  const log = buildLog(3, 1);
  const before = JSON.stringify(log.entries());
  const h = harness(log);
  for (const body of [admin_body(), admin_body("dry-run"), admin_body("garbage")]) {
    const r = await retentionHandler(admin, body, h.deps);
    assert.equal(r.status, 200);
    assert.equal(r.body.mode, "dry-run");
    assert.equal(r.body.removableCount, 3);
    assert.equal(r.body.removedCount, 0);
  }
  assert.equal(JSON.stringify(log.entries()), before);
  assert.equal(h.archives.length, 0);
  assert.equal(h.deleted.length, 0);
});

test("an unexpired entry holds back later expired ones", async () => {
  process.env.AUDIT_RETENTION_MONTHS = "12";
  const times = ["2025-01-01", "2027-05-31", "2025-02-01", "2027-05-31"].map((d) => new Date(d + "T00:00:00Z"));
  let i = 0;
  const log = new AuditLog(undefined, () => times[i++]!);
  for (let k = 0; k < 3; k++) log.record("x", {});
  const h = harness(log);
  const r = await retentionHandler(admin, admin_body("apply"), h.deps);
  assert.equal(r.body.removedCount, 1);
  assert.equal(r.body.heldBackCount, 1);
  assert.deepEqual(verifyAnchored(log.entries(), latestAnchor(h.archives)), { ok: true });
});

test("non-admin and signed-out callers are refused and logged", async () => {
  const log = buildLog(3, 1);
  const h = harness(log);
  const a = await retentionHandler(staff, admin_body("apply"), h.deps);
  const b = await retentionHandler(undefined, admin_body("apply"), h.deps);
  assert.equal(a.status, 403);
  assert.equal(b.status, 401);
  assert.equal(h.archives.length, 0);
  assert.equal(h.deleted.length, 0);
  const refused = log.entries().filter((e) => e.event === "audit.retention.refused");
  assert.equal(refused.length, 2);
  assert.deepEqual(refused.map((e) => e.details.callerKind), ["staff", "anonymous"]);
  assert.equal(log.entries().filter((e) => e.event === "consent.recorded").length, 4);
});

test("failure to persist the archive removes nothing", async () => {
  const log = buildLog(2, 1);
  const h = harness(log);
  h.deps.saveArchive = async () => {
    throw new Error("down");
  };
  const r = await retentionHandler(admin, admin_body("apply"), h.deps);
  assert.equal(r.status, 500);
  assert.equal(log.entries().filter((e: AuditEntry) => e.event === "consent.recorded").length, 3);
  assert.equal(log.entries().at(-1)!.event, "audit.retention.failed");
});
