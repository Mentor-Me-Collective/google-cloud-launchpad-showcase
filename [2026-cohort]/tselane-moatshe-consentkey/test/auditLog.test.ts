import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AuditLog,
  InMemoryAuditStore,
  computeEntryHash,
  type AuditEntry,
} from "../src/audit/auditLog.js";

test("audit log chains entries and verifies as intact", () => {
  const log = new AuditLog();
  log.record("request.received", { parentId: "P-001" });
  log.record("consent.recorded", { type: "Photos" });
  log.record("change.complete", {});

  const entries = log.entries();
  assert.equal(entries.length, 3);
  assert.equal(entries[0]!.prevHash, "");
  assert.equal(entries[1]!.prevHash, entries[0]!.hash);
  assert.equal(entries[2]!.prevHash, entries[1]!.hash);
  assert.deepEqual(log.verify(), { ok: true });
});

test("editing an entry breaks the hash chain (tamper-evident)", () => {
  const store = new InMemoryAuditStore();
  const log = new AuditLog(store);
  log.record("request.received", { parentId: "P-001" });
  log.record("approval.approved", { staffId: "S-02" });

  // Tamper: rewrite the approver on entry 1 without recomputing hashes.
  const tampered = store.all() as AuditEntry[];
  (tampered[1] as { details: Record<string, unknown> }).details = {
    staffId: "S-99",
  };

  const result = log.verify();
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.brokenAtIndex, 1);
});

test("hash is deterministic for identical input", () => {
  const base = {
    index: 0,
    timestamp: "2026-11-03T00:00:00.000Z",
    event: "x",
    details: { a: 1 },
    prevHash: "",
  };
  assert.equal(computeEntryHash(base), computeEntryHash({ ...base }));
});
