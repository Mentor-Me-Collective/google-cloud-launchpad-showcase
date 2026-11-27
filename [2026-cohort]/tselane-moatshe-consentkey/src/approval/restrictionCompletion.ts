/**
 * Medical restriction completion (A-05 follow-up).
 *
 * After S-02 approves a Medical withdrawal the note is restricted and a
 * deadline is set. This is the step where S-02 confirms the restriction is
 * actually finished. Only S-02 may do it; a wrong-role attempt is refused and
 * written to the audit trail, like `approval.denied`.
 */

import type { AuditLog } from "../audit/auditLog.js";
import type { LearnerId, StaffId } from "../consent/model.js";
import type { LearnerRecords } from "../systems/learnerRecords.js";
import { canApprove, requiredRole } from "./approvalRules.js";

export type CompleteRestrictionResult =
  | { status: "completed"; completedAt: string; onTime: boolean; restrictionDueBy: string }
  | { status: "already_completed"; completedAt: string }
  | { status: "not_found" }
  | { status: "denied"; requiredRole: string | undefined };

export function completeRestriction(
  deps: { audit: AuditLog; learnerRecords: LearnerRecords; now?: () => Date },
  staffId: StaffId,
  learnerId: LearnerId,
): CompleteRestrictionResult {
  const { audit, learnerRecords } = deps;
  const now = (deps.now ?? (() => new Date()))();

  // Authorization first, and the attempt is recorded.
  if (!canApprove(staffId, "Medical")) {
    audit.record("medical.restriction.completion_denied", {
      staffId,
      learnerId,
      type: "Medical",
      requiredRole: requiredRole("Medical"),
    });
    return { status: "denied", requiredRole: requiredRole("Medical") };
  }

  const record = learnerRecords.recordFor(learnerId);
  if (record.restrictionCompletedAt && !record.restrictionDueBy) {
    return { status: "already_completed", completedAt: record.restrictionCompletedAt };
  }
  const due = record.restrictionDueBy;
  if (!due || !record.medicalNoteRestricted) return { status: "not_found" };

  const completedAt = now.toISOString();
  const onTime = now.getTime() <= new Date(due).getTime();
  const changeId = findChangeId(audit, learnerId, due);
  learnerRecords.markRestrictionCompleted(learnerId, completedAt);
  audit.record("medical.restriction.completed", {
    staffId,
    learnerId,
    changeId,
    type: "Medical",
    completedAt,
    restrictionDueBy: due,
    onTime,
  });
  return { status: "completed", completedAt, onTime, restrictionDueBy: due };
}

/** The changeId of the withdrawal that scheduled this restriction, if known. */
function findChangeId(audit: AuditLog, learnerId: LearnerId, due: string): string | null {
  const entries = audit.entries();
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i]!;
    if (
      e.event === "restriction.scheduled" &&
      e.details.learnerId === learnerId &&
      e.details.restrictionDueBy === due
    ) {
      return typeof e.details.changeId === "string" ? e.details.changeId : null;
    }
  }
  return null;
}

/** Open restrictions (restricted, not yet completed) with their due dates. */
export function openRestrictions(learnerRecords: LearnerRecords) {
  return learnerRecords.openRestrictions();
}
