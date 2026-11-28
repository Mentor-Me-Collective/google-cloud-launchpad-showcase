/**
 * Append-only, hash-chained audit log.
 *
 * Supports Thando's requirement: "log entries cannot be edited". Every entry
 * stores the hash of the previous entry, so any later edit or deletion breaks
 * the chain and is detectable via verify().
 *
 * Storage is behind AuditStore so the same logic runs locally today and can be
 * backed by Firestore later without changing the hashing rules.
 */

import { createHash } from "node:crypto";
import { retainUntil } from "./retention.js";

export interface AuditEntry {
  /** Monotonic index, starting at 0. */
  readonly index: number;
  /** ISO timestamp of when the entry was recorded. */
  readonly timestamp: string;
  /** Short machine-readable event name, e.g. "consent.recorded". */
  readonly event: string;
  /** Free-form structured details for the event. */
  readonly details: Record<string, unknown>;
  /** Hash of the previous entry ("" for the first entry). */
  readonly prevHash: string;
  /** Hash of this entry (over index, timestamp, event, details, prevHash). */
  readonly hash: string;
}

/** Pluggable storage so we can swap in Firestore later. */
export interface AuditStore {
  append(entry: AuditEntry): void;
  all(): readonly AuditEntry[];
  last(): AuditEntry | undefined;
}

export class InMemoryAuditStore implements AuditStore {
  private readonly entries: AuditEntry[] = [];

  append(entry: AuditEntry): void {
    this.entries.push(entry);
  }

  all(): readonly AuditEntry[] {
    return this.entries;
  }

  last(): AuditEntry | undefined {
    return this.entries[this.entries.length - 1];
  }
}

export function computeEntryHash(
  input: Omit<AuditEntry, "hash">,
): string {
  const payload = JSON.stringify({
    index: input.index,
    timestamp: input.timestamp,
    event: input.event,
    details: input.details,
    prevHash: input.prevHash,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export interface ChainAnchor {
  lastRemovedIndex: number;
  lastRemovedHash: string;
}

export class AuditLog {
  private anchor: ChainAnchor | undefined;

  /** Set after a retention run: the live chain now starts after this archived entry. */
  setAnchor(anchor: ChainAnchor | undefined): void {
    this.anchor = anchor;
  }

  constructor(
    private readonly store: AuditStore = new InMemoryAuditStore(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Append a new tamper-evident entry and return it. */
  record(event: string, details: Record<string, unknown> = {}): AuditEntry {
    const last = this.store.last();
    const index = last ? last.index + 1 : this.anchor ? this.anchor.lastRemovedIndex + 1 : 0;
    const prevHash = last ? last.hash : this.anchor ? this.anchor.lastRemovedHash : "";
    const at = this.now();
    const base: Omit<AuditEntry, "hash"> = {
      index,
      timestamp: at.toISOString(),
      event,
      // OD-06: the retention stamp is written into the entry, so it is covered
      // by the hash and cannot be quietly extended later. null means the team
      // has not set a period yet — it does not mean "keep forever".
      details: { ...details, retainUntil: retainUntil(at) },
      prevHash,
    };
    const entry: AuditEntry = { ...base, hash: computeEntryHash(base) };
    this.store.append(entry);
    return entry;
  }

  entries(): readonly AuditEntry[] {
    return this.store.all();
  }

  /**
   * Verify the whole chain. Returns { ok: true } if intact, otherwise the
   * index of the first broken link. Any edit, insert or delete breaks it.
   */
  verify(): { ok: true } | { ok: false; brokenAtIndex: number; reason: string } {
    const entries = this.store.all();
    let expectedPrevHash = this.anchor ? this.anchor.lastRemovedHash : "";
    const start = this.anchor ? this.anchor.lastRemovedIndex + 1 : 0;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      if (entry.index !== start + i) {
        return { ok: false, brokenAtIndex: i, reason: "index out of sequence" };
      }
      if (entry.prevHash !== expectedPrevHash) {
        return { ok: false, brokenAtIndex: i, reason: "prevHash mismatch" };
      }
      const recomputed = computeEntryHash({
        index: entry.index,
        timestamp: entry.timestamp,
        event: entry.event,
        details: entry.details,
        prevHash: entry.prevHash,
      });
      if (recomputed !== entry.hash) {
        return { ok: false, brokenAtIndex: i, reason: "hash mismatch" };
      }
      expectedPrevHash = entry.hash;
    }
    return { ok: true };
  }
}
