/**
 * Who may read which audit entries.
 *
 * OD-09: "A parent sees the history of their own requests only. Staff see
 * requests assigned to their role."
 *
 * - A parent may read an entry that names their learner or themselves.
 * - A staff member may read an entry for a request their role is responsible
 *   for approving, plus any entry recording their own action.
 * - School-wide operational events (`system.seeded`) carry no personal data
 *   and are shown to staff, not to parents.
 *
 * Note this filters the *view*. Chain verification always runs over the
 * complete chain — a filtered list has gaps in the hash links by design.
 *
 * CONSEQUENCE WORTH CONFIRMING (Tselane/Thando): read literally, OD-09 means
 * that because Photos and ordinary Contact Details changes are assigned to no
 * role, **no staff member can see them in the audit trail at all**. That is
 * what this implements. If the school needs an officer who can audit every
 * change, that is a fourth role and a change to OD-03, not a tweak here.
 */

import type { AuditEntry } from "./auditLog.js";
import { requiredRole } from "../approval/approvalRules.js";
import type { StaffRole } from "../approval/approvalRules.js";
import { isConsentType } from "../consent/model.js";
import type { ConsentChangeContext } from "../consent/model.js";

export interface FamilyScope {
  parentId: string;
  learnerId: string;
}

export interface StaffScope {
  staffId: string;
  role: StaffRole;
}

/** Operational events with no personal data in them. */
const SCHOOL_WIDE_EVENTS = new Set(["system.seeded", "audit.archived"]);

export function isVisibleToFamily(entry: AuditEntry, scope: FamilyScope): boolean {
  const { learnerId, parentId } = entry.details as {
    learnerId?: unknown;
    parentId?: unknown;
  };
  return learnerId === scope.learnerId || parentId === scope.parentId;
}

export function isVisibleToStaff(entry: AuditEntry, scope: StaffScope): boolean {
  if (SCHOOL_WIDE_EVENTS.has(entry.event)) return true;

  // Anything this officer did themselves is always theirs to see.
  if (entry.details.staffId === scope.staffId) return true;

  // An escalation names the officer it was escalated to (A-02). They may read
  // that entry, which is visibility only; it does not give them the decision.
  if (entry.details.escalatedTo === scope.staffId) return true;

  const { type, changeContext } = entry.details as {
    type?: unknown;
    changeContext?: unknown;
  };
  if (typeof type !== "string" || !isConsentType(type)) return false;

  const context: ConsentChangeContext =
    changeContext === "emergency_contact" ? "emergency_contact" : "standard";
  return requiredRole(type, context) === scope.role;
}

export function entriesForFamily(
  entries: readonly AuditEntry[],
  scope: FamilyScope,
): AuditEntry[] {
  return entries.filter((entry) => isVisibleToFamily(entry, scope));
}

export function entriesForStaff(
  entries: readonly AuditEntry[],
  scope: StaffScope,
): AuditEntry[] {
  return entries.filter((entry) => isVisibleToStaff(entry, scope));
}
