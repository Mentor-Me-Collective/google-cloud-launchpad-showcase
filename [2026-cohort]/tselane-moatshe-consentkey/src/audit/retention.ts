/**
 * Audit retention (OD-06 / decision 2 in the legal log).
 *
 * Two separable things, and only one of them is a legal question:
 *
 * 1. **How long to keep an entry.** Still "Tselane to decide" — the period
 *    depends on POPIA and school rules. So no period is hard-coded here. With
 *    no period configured, `retainUntil` is `null`, which reads as "retention
 *    not yet set" rather than "keep forever". Set `AUDIT_RETENTION_MONTHS` to
 *    switch it on.
 *
 * 2. **How to delete from a hash chain without destroying it.** That is an
 *    engineering question and it has to be answered before anyone can act on
 *    (1), because deleting entries from an append-only chain breaks every link
 *    after the gap. The method below is proposed for the team to review.
 *
 * ## Proposed archive method
 *
 * To remove entries 0..n, replace them with a single `audit.archived`
 * checkpoint that records how many were removed and the hash of the last
 * removed entry. Verification then starts from the checkpoint and still proves
 * that nothing has been altered since. What the checkpoint cannot prove is
 * what the removed entries said — so the digest should be exported and stored
 * separately (signed, or written to Cloud Storage with object retention)
 * before the entries go.
 *
 * This keeps the chain verifiable, makes the deletion itself auditable, and
 * leaves a record that a deletion happened. It is a proposal, not a decision.
 */

import type { AuditEntry } from "./auditLog.js";

/** Months to keep an entry, or null when the team has not set a period. */
export function retentionMonths(): number | null {
  const raw = process.env.AUDIT_RETENTION_MONTHS;
  if (!raw) return null;
  const months = Number(raw);
  return Number.isFinite(months) && months > 0 ? months : null;
}

/**
 * The retain-until stamp for an entry recorded now, or null when no period is
 * configured. Stored on the entry so the policy in force at write time travels
 * with the record, rather than being recomputed later from a policy that may
 * since have changed.
 */
export function retainUntil(
  recordedAt: Date = new Date(),
  months: number | null = retentionMonths(),
): string | null {
  if (months === null) return null;
  const until = new Date(recordedAt.getTime());
  until.setUTCMonth(until.getUTCMonth() + months);
  return until.toISOString();
}

export interface ArchiveCheckpoint {
  /** How many entries the checkpoint stands in for. */
  removedCount: number;
  /** Index of the last entry removed. */
  lastRemovedIndex: number;
  /** Hash of the last entry removed — the anchor the chain continues from. */
  lastRemovedHash: string;
  /** When the archive ran. */
  archivedAt: string;
}

/**
 * Work out what a checkpoint would contain for the entries up to and including
 * `throughIndex`. Pure: it computes the digest and removes nothing. Actually
 * performing an archive needs the export step above and a team decision first.
 */
export function planArchive(
  entries: readonly AuditEntry[],
  throughIndex: number,
  now: Date = new Date(),
): ArchiveCheckpoint | null {
  const removed = entries.filter((e) => e.index <= throughIndex);
  if (removed.length === 0) return null;
  const last = removed[removed.length - 1]!;
  return {
    removedCount: removed.length,
    lastRemovedIndex: last.index,
    lastRemovedHash: last.hash,
    archivedAt: now.toISOString(),
  };
}

/**
 * Entries whose retention period has passed, given the clock. Entries with no
 * `retainUntil` are never selected — an unset policy must not delete anything.
 */
export function expiredEntries(
  entries: readonly AuditEntry[],
  now: Date = new Date(),
): AuditEntry[] {
  return entries.filter((entry) => {
    const until = entry.details.retainUntil;
    if (typeof until !== "string") return false;
    const parsed = Date.parse(until);
    return Number.isFinite(parsed) && parsed <= now.getTime();
  });
}
