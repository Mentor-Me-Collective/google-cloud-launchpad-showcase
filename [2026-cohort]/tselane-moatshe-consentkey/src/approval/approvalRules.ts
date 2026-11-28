/**
 * Approval rules: which consent changes need staff approval, and which staff
 * role may approve them.
 *
 * Team-confirmed MVP rules:
 *  - Photos              -> no approval required
 *  - School Trips        -> S-01 (Admin officer)
 *  - Medical             -> S-02 (Information officer)
 *  - Emergency contacts  -> S-01 (Admin officer)
 *  - Contact Details     -> S-01 for every change, not only emergency contacts
 *                           (implementation plan, phase 1)
 */

import type {
  ConsentChangeContext,
  ConsentType,
  StaffId,
} from "../consent/model.js";

export type StaffRole = "admin_officer" | "information_officer";

export interface StaffMember {
  id: StaffId;
  role: StaffRole;
}

/**
 * Longest decline reason a staff member may give. The reason is written to the
 * audit trail and shown to the parent, so it is a short explanation, not case
 * notes — and never health details (Tselane, PR #2). Shared by the staff form
 * and the API so both enforce the same limit.
 */
export const REASON_MAX_LENGTH = 200;

/** The fictional school's test staff. */
export const STAFF: Record<StaffId, StaffMember> = {
  "S-01": { id: "S-01", role: "admin_officer" },
  "S-02": { id: "S-02", role: "information_officer" },
};

export function requiredRole(
  type: ConsentType,
  context: ConsentChangeContext = "standard",
): StaffRole | undefined {
  switch (type) {
    case "Photos":
      return undefined;
    case "School Trips":
      return "admin_officer";
    case "Medical":
      return "information_officer";
    case "Contact Details":
      // `context` no longer changes the role; it stays on the request so the
      // audit trail still says whether it was an emergency contact.
      return "admin_officer";
  }
}

export function requiresApproval(
  type: ConsentType,
  context: ConsentChangeContext = "standard",
): boolean {
  return requiredRole(type, context) !== undefined;
}

/**
 * Plain-language name for a role, for parent- and staff-facing wording.
 * One definition so the dashboard, the staff queue and the API agree.
 */
export function roleLabel(role: StaffRole | undefined | null): string {
  if (role === "admin_officer") return "an Admin Officer (S-01)";
  if (role === "information_officer") return "the Information Officer (S-02)";
  return "a staff member";
}

/**
 * Whether the given staff member is permitted to approve a change to this
 * consent type. Returns false for unknown staff or wrong role.
 */
export function canApprove(
  staffId: StaffId,
  type: ConsentType,
  context: ConsentChangeContext = "standard",
): boolean {
  const needed = requiredRole(type, context);
  if (needed === undefined) return false; // nothing to approve
  const staff = STAFF[staffId];
  if (!staff) return false;
  return staff.role === needed;
}
