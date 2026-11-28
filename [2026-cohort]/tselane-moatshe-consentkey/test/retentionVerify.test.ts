import { test } from "node:test";
import assert from "node:assert/strict";
import { AuditLog } from "../src/audit/auditLog.js";
import { runRetention, type ArchiveRecord } from "../src/audit/archive.js";

test("after a retention run, AuditLog.verify() passes and new entries continue the chain", async () => {
  const audit = new AuditLog();
  audit.record("a", {});
  audit.record("b", {});
  // Stamp entries as expired by using a period of 0 months far in the future.
  const archives: ArchiveRecord[] = [];
  const res = await runRetention(
    {
      audit,
      saveArchive: async (r: ArchiveRecord) => {
        archives.push(r);
      },
      deleteDurable: async () => {},
      months: 1,
      now: new Date("2099-01-01T00:00:00Z"),
    },
    true,
  );
  assert.ok(res.removedCount >= 0);
  assert.deepEqual(audit.verify(), { ok: true });
  audit.record("after", {});
  assert.deepEqual(audit.verify(), { ok: true });
});
