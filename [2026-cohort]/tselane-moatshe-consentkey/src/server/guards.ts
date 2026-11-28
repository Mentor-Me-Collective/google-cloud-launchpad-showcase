/**
 * Role checks shared by the API routes. Each returns null when the caller may
 * proceed, or the refusal to send. 401 means "not signed in"; 403 means
 * "signed in, but this role may not do that".
 */

import type { Identity } from "./identities.js";

export interface Refusal {
  status: 401 | 403;
  error: string;
}

export function requireAdmin(identity: Identity | undefined): Refusal | null {
  if (!identity) return { status: 401, error: "Please sign in." };
  if (identity.kind !== "admin") {
    return {
      status: 403,
      error: "Only a System Admin can open this. Your role does not include managing users.",
    };
  }
  return null;
}

/** Approval queue and decisions: the two approval roles only. */
export function requireStaff(identity: Identity | undefined): Refusal | null {
  if (!identity) return { status: 401, error: "Not signed in as staff" };
  if (identity.kind === "admin") {
    return {
      status: 403,
      error:
        "A System Admin manages users only and cannot see or decide consent requests.",
    };
  }
  if (identity.kind !== "staff") return { status: 401, error: "Not signed in as staff" };
  return null;
}

/** The audit trail shows consent history, which a System Admin may not read. */
export function refuseAdminAudit(identity: Identity | undefined): Refusal | null {
  if (identity?.kind === "admin") {
    return {
      status: 403,
      error:
        "A System Admin cannot read the consent audit trail. User-management activity is on the Admin page.",
    };
  }
  return null;
}
