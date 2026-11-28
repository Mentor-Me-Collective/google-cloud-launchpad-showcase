/**
 * Controlled, logged viewing of a stored audit record (plan phase 3).
 *
 * Opening the stored record of an audit entry is itself written to the audit
 * trail: who opened it, when (the entry's own timestamp) and why (a code from a
 * short fixed list, never free text, so no health details can enter it).
 *
 * Access follows the same role rules as the audit list (`visibility.ts`).
 * A refused attempt is logged too, so the trail shows someone tried.
 * Logging appends to the hash chain like any other entry, so verification
 * keeps passing.
 */

import type { AuditEntry, AuditLog } from "./auditLog.js";
import { isVisibleToFamily, isVisibleToStaff } from "./visibility.js";
import type { FamilyScope, StaffScope } from "./visibility.js";

export interface ViewReason {
  code: string;
  label: string;
}

/** Why someone opens a stored record. A fixed list, validated server-side. */
export const VIEW_REASONS: readonly ViewReason[] = [
  { code: "check_my_request", label: "Checking the status of a request" },
  { code: "check_decision", label: "Checking a decision that was made" },
  { code: "verify_record", label: "Checking the record is accurate" },
  { code: "query_or_complaint", label: "A query or complaint" },
  { code: "audit_check", label: "Routine audit check" },
];

export function isValidViewReason(code: unknown): code is string {
  return typeof code === "string" && VIEW_REASONS.some((r) => r.code === code);
}

export type Viewer =
  | ({ kind: "parent" } & FamilyScope)
  | ({ kind: "staff" } & StaffScope);

export type ViewOutcome =
  | { ok: true; entry: AuditEntry }
  | { ok: false; reason: "not_found" | "forbidden" };

function viewerDetails(viewer: Viewer): Record<string, unknown> {
  // Parent entries carry parentId and learnerId so the family can see their
  // own views in their trail. Staff entries carry staffId, which staff already
  // see as "their own actions". Neither carries the viewed entry's content.
  return viewer.kind === "parent"
    ? { viewerKind: "parent", parentId: viewer.parentId, learnerId: viewer.learnerId }
    : { viewerKind: "staff", staffId: viewer.staffId, viewerRole: viewer.role };
}

/**
 * Check access, log the attempt, and return the entry only if allowed.
 * `reasonCode` must already be validated with `isValidViewReason`.
 */
export function viewAuditEntry(
  audit: AuditLog,
  viewer: Viewer,
  entryIndex: number,
  reasonCode: string,
): ViewOutcome {
  const entry = audit.entries().find((e) => e.index === entryIndex);
  if (!entry) return { ok: false, reason: "not_found" };

  const allowed =
    viewer.kind === "parent"
      ? isVisibleToFamily(entry, viewer)
      : isVisibleToStaff(entry, viewer);

  audit.record(allowed ? "audit.viewed" : "audit.view_denied", {
    ...viewerDetails(viewer),
    viewedIndex: entryIndex,
    viewedEvent: allowed ? entry.event : null,
    reasonCode,
  });

  return allowed ? { ok: true, entry } : { ok: false, reason: "forbidden" };
}
