/**
 * Audit retention job (OD-06).
 *
 * Finds entries past their retention date, archives them, removes them from the
 * live log and leaves the remaining chain verifiable from an anchor.
 *
 * - No configured period (AUDIT_RETENTION_MONTHS unset): nothing expires.
 * - Only a leading run of expired entries is removed. Removing an entry from
 *   the middle would break the chain, so an unexpired entry holds back
 *   everything after it.
 * - The archive record holds the removed entries (it may contain personal
 *   data and must be stored accordingly) plus the hash of the last one, which
 *   is the anchor the live chain continues from.
 * - The audit entry `audit.retention.run` and API responses carry counts only.
 */

import { computeEntryHash } from "./auditLog.js";
import type { AuditEntry, AuditLog } from "./auditLog.js";
import { expiredEntries, retentionMonths } from "./retention.js";
import { requireAdmin } from "../server/guards.js";
import type { Identity } from "../server/identities.js";

export interface ArchiveRecord {
  archivedAt: string;
  removedCount: number;
  firstRemovedIndex: number;
  lastRemovedIndex: number;
  /** Hash of the last removed entry; the first live entry's prevHash. */
  lastRemovedHash: string;
  entries: AuditEntry[];
}

export interface Anchor {
  lastRemovedIndex: number;
  lastRemovedHash: string;
}

export interface RetentionPlan {
  /** Entries past their date, wherever they sit in the log. */
  expiredCount: number;
  /** Leading expired entries that can be removed without breaking the chain. */
  removableCount: number;
  /** Expired entries kept because an unexpired entry sits before them. */
  heldBackCount: number;
  removable: AuditEntry[];
}

/** Pure: what a run would remove. Null months means nothing expires. */
export function planRetention(
  entries: readonly AuditEntry[],
  months: number | null,
  now: Date = new Date(),
): RetentionPlan {
  if (months === null) {
    return { expiredCount: 0, removableCount: 0, heldBackCount: 0, removable: [] };
  }
  const expired = new Set(expiredEntries(entries, now).map((e) => e.index));
  let n = 0;
  while (n < entries.length && expired.has(entries[n]!.index)) n++;
  return {
    expiredCount: expired.size,
    removableCount: n,
    heldBackCount: expired.size - n,
    removable: entries.slice(0, n),
  };
}

/** Build the archive record for a non-empty list of leading entries. */
export function buildArchiveRecord(
  removable: readonly AuditEntry[],
  now: Date = new Date(),
): ArchiveRecord | null {
  if (removable.length === 0) return null;
  const first = removable[0]!;
  const last = removable[removable.length - 1]!;
  return {
    archivedAt: now.toISOString(),
    removedCount: removable.length,
    firstRemovedIndex: first.index,
    lastRemovedIndex: last.index,
    lastRemovedHash: last.hash,
    entries: removable.map((e) => ({ ...e })),
  };
}

/** The anchor to verify against: the most recent archive. */
export function latestAnchor(archives: readonly ArchiveRecord[]): Anchor | undefined {
  let best: ArchiveRecord | undefined;
  for (const a of archives) {
    if (!best || a.lastRemovedIndex > best.lastRemovedIndex) best = a;
  }
  return best && {
    lastRemovedIndex: best.lastRemovedIndex,
    lastRemovedHash: best.lastRemovedHash,
  };
}

/**
 * Verify a live chain that may start after an archive. With an anchor the first
 * entry must be index anchor+1 and point at the anchor hash; without one it
 * must start at 0 like AuditLog.verify().
 */
export function verifyAnchored(
  entries: readonly AuditEntry[],
  anchor?: Anchor,
): { ok: true } | { ok: false; brokenAtIndex: number; reason: string } {
  let expectedPrev = anchor ? anchor.lastRemovedHash : "";
  const startIndex = anchor ? anchor.lastRemovedIndex + 1 : 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    if (e.index !== startIndex + i) {
      return { ok: false, brokenAtIndex: e.index, reason: "index out of sequence" };
    }
    if (e.prevHash !== expectedPrev) {
      return { ok: false, brokenAtIndex: e.index, reason: "prevHash mismatch" };
    }
    const { hash, ...rest } = e;
    if (computeEntryHash(rest) !== hash) {
      return { ok: false, brokenAtIndex: e.index, reason: "hash mismatch" };
    }
    expectedPrev = hash;
  }
  return { ok: true };
}

export interface RetentionDeps {
  audit: AuditLog;
  /** Persist the archive record. Must resolve before anything is removed. */
  saveArchive(record: ArchiveRecord): Promise<void>;
  /** Remove entries with index <= throughIndex from the durable copy. */
  deleteDurable(throughIndex: number): Promise<void>;
  now?: Date;
  months?: number | null;
}

export interface RetentionResult {
  mode: "dry-run" | "apply";
  periodConfigured: boolean;
  expiredCount: number;
  removableCount: number;
  heldBackCount: number;
  removedCount: number;
  anchorHash: string | null;
}

/**
 * Run retention. Dry run (default) computes and reports only. Apply archives,
 * removes and records `audit.retention.run` (counts only).
 *
 * The run entry is recorded before the removal so the live log is never left
 * empty (the next entry would otherwise restart the chain at index 0).
 */
export async function runRetention(
  deps: RetentionDeps,
  apply: boolean,
): Promise<RetentionResult> {
  const now = deps.now ?? new Date();
  const months = deps.months === undefined ? retentionMonths() : deps.months;
  const live = deps.audit.entries();
  const plan = planRetention(live, months, now);
  const record = buildArchiveRecord(plan.removable, now);

  const result: RetentionResult = {
    mode: apply ? "apply" : "dry-run",
    periodConfigured: months !== null,
    expiredCount: plan.expiredCount,
    removableCount: plan.removableCount,
    heldBackCount: plan.heldBackCount,
    removedCount: 0,
    anchorHash: record ? record.lastRemovedHash : null,
  };
  if (!apply || !record) {
    if (apply) recordRun(deps.audit, result);
    return result;
  }

  try {
    await deps.saveArchive(record);
    await deps.deleteDurable(record.lastRemovedIndex);
  } catch (err) {
    deps.audit.record("audit.retention.failed", {
      removableCount: plan.removableCount,
    });
    throw err;
  }
  // The live array is the store's own (both stores return it from all()).
  const arr = deps.audit.entries() as AuditEntry[];
  arr.splice(0, record.removedCount);
  deps.audit.setAnchor({
    lastRemovedIndex: record.lastRemovedIndex,
    lastRemovedHash: record.lastRemovedHash,
  });
  result.removedCount = record.removedCount;
  recordRun(deps.audit, result);
  return result;
}

function recordRun(audit: AuditLog, r: RetentionResult): void {
  audit.record("audit.retention.run", {
    mode: r.mode,
    periodConfigured: r.periodConfigured,
    expiredCount: r.expiredCount,
    removedCount: r.removedCount,
    heldBackCount: r.heldBackCount,
  });
}

export interface HandlerReply {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Admin-only entry point behind /api/admin/retention. `apply` must be exactly
 * true to change anything; anything else is a dry run. A refused caller is
 * logged by role kind only.
 */
export async function retentionHandler(
  identity: Identity | undefined,
  body: Record<string, unknown>,
  deps: RetentionDeps,
): Promise<HandlerReply> {
  const refusal = requireAdmin(identity);
  if (refusal) {
    deps.audit.record("audit.retention.refused", {
      callerKind: identity ? identity.kind : "anonymous",
    });
    return { status: refusal.status, body: { error: refusal.error } };
  }
  const apply = body.mode === "apply";
  try {
    const result = await runRetention(deps, apply);
    return { status: 200, body: { ...result } };
  } catch {
    return { status: 500, body: { error: "Retention run failed. Nothing was removed from the live log." } };
  }
}
