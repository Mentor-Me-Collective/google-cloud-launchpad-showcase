/**
 * In-app notifications, derived from the audit log.
 *
 * Nothing here writes to the audit log or touches the connector. Every
 * notification is computed on read from entries the system already records,
 * and is limited to what the reader may see under OD-09 (visibility.ts).
 *
 * IN-APP ONLY. There is no email or SMS delivery; that is out of scope.
 *
 * Wording carries no names and no health details. It never states the consent
 * type for Medical changes, never includes a decline reason, and names no
 * learner, parent or staff member.
 */

import type { AuditEntry } from "../audit/auditLog.js";
import { isVisibleToFamily } from "../audit/visibility.js";
import type { FamilyScope, StaffScope } from "../audit/visibility.js";
import { requiredRole } from "../approval/approvalRules.js";
import { workingDaysBetween, ESCALATION_WORKING_DAYS } from "../approval/escalation.js";
import { isConsentType } from "../consent/model.js";
import type { ConsentChangeContext } from "../consent/model.js";

export type NotificationKind =
  | "change_complete"
  | "change_declined"
  | "needs_approval"
  | "escalated"
  | "near_deadline";

export interface Notification {
  /** Stable per user and event, so read state survives recomputation. */
  id: string;
  kind: NotificationKind;
  text: string;
  /** ISO time of the audit entry (or of "now" for a deadline warning). */
  at: string;
  read: boolean;
}

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Consent type as safe text. Medical is never named. */
function safeLabel(type: unknown): string {
  if (typeof type !== "string" || !isConsentType(type) || type === "Medical") {
    return "a consent change";
  }
  return `your ${type} change`;
}

function keyOf(e: AuditEntry): string {
  return str(e.details.changeId) ?? str(e.details.requestId) ?? `i${e.index}`;
}

export function parentNotifications(
  entries: readonly AuditEntry[],
  scope: FamilyScope,
): Omit<Notification, "read">[] {
  const out: Omit<Notification, "read">[] = [];
  for (const e of entries) {
    if (!isVisibleToFamily(e, scope)) continue;
    const label = safeLabel(e.details.type);
    const key = keyOf(e);
    const base = { at: e.timestamp };
    switch (e.event) {
      case "change.complete":
        out.push({ ...base, id: `complete:${key}`, kind: "change_complete",
          text: `Done: ${label} has been updated in every school system.` });
        break;
      case "approval.rejected":
      case "request.rejected":
        out.push({ ...base, id: `declined:${key}`, kind: "change_declined",
          text: `Declined: ${label} was not made. Nothing was changed.` });
        break;
      case "approval.pending":
      case "approval.requested":
        out.push({ ...base, id: `pending:${key}`, kind: "needs_approval",
          text: `Waiting: ${label} needs staff approval. Nothing has changed yet.` });
        break;
      case "approval.escalated":
        out.push({ ...base, id: `escalated:${key}`, kind: "escalated",
          text: `Update: ${label} has waited longer than expected and has been flagged for the school. It is still waiting for a decision.` });
        break;
    }
  }
  return out;
}

export function staffNotifications(
  entries: readonly AuditEntry[],
  scope: StaffScope,
  now: Date,
  holidays: readonly string[] = [],
): Omit<Notification, "read">[] {
  const out: Omit<Notification, "read">[] = [];
  const decided = new Set<string>();
  for (const e of entries) {
    if (e.event === "approval.approved" || e.event === "approval.rejected") {
      decided.add(keyOf(e));
    }
  }

  for (const e of entries) {
    const { type, changeContext } = e.details as { type?: unknown; changeContext?: unknown };
    if (typeof type !== "string" || !isConsentType(type)) continue;
    const context: ConsentChangeContext =
      changeContext === "emergency_contact" ? "emergency_contact" : "standard";
    const assigned = requiredRole(type, context) === scope.role;
    const key = keyOf(e);

    if (e.event === "approval.escalated") {
      // Assigned role, or the officer it was escalated to (visibility only).
      if (!assigned && e.details.escalatedTo !== scope.staffId) continue;
      if (decided.has(key)) continue;
      out.push({ id: `escalated:${key}`, kind: "escalated", at: e.timestamp,
        text: "A request has been escalated after waiting two working days. It still needs a decision." });
    } else if (e.event === "approval.pending" || e.event === "approval.requested") {
      if (!assigned || decided.has(key)) continue;
      const waited = workingDaysBetween(new Date(e.timestamp), now, holidays);
      // Within one working day of the limit, and not yet at it.
      if (waited >= ESCALATION_WORKING_DAYS - 1 && waited < ESCALATION_WORKING_DAYS) {
        out.push({ id: `deadline:${key}`, kind: "near_deadline", at: now.toISOString(),
          text: "A request assigned to your role is within one working day of its two-day deadline." });
      }
    }
  }
  return out;
}

/** Per-user read state. In-memory; not persisted (repo has no hook for it). */
export class ReadStore {
  private readonly read = new Map<string, Set<string>>();

  isRead(userId: string, id: string): boolean {
    return this.read.get(userId)?.has(id) ?? false;
  }

  markRead(userId: string, ids: readonly string[]): void {
    let set = this.read.get(userId);
    if (!set) this.read.set(userId, (set = new Set()));
    for (const id of ids) set.add(id);
  }

  apply(userId: string, items: Omit<Notification, "read">[]): Notification[] {
    return items
      .map((n) => ({ ...n, read: this.isRead(userId, n.id) }))
      .sort((a, b) => b.at.localeCompare(a.at));
  }
}

export const readStore = new ReadStore();
