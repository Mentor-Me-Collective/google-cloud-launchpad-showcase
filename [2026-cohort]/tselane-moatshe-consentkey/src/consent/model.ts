/**
 * Consent model for ConsentKey.
 *
 * Four consent types and three states, per the kickoff drafts.
 * Tselane (Lead) owns the authoritative definitions; this file encodes the
 * proposed model so the integration layer has something concrete to build on.
 */

/** The four data types a parent can give or withdraw consent for. */
export const CONSENT_TYPES = [
  "Photos",
  "School Trips",
  "Medical",
  "Contact Details",
] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number];

/** A consent setting is always in exactly one of these states. */
export const CONSENT_STATES = ["not_set", "granted", "withdrawn"] as const;

export type ConsentState = (typeof CONSENT_STATES)[number];

/**
 * How the parent behind a change was verified.
 *
 * `demo_login` is what the prototype actually does: the identity picker sets a
 * cookie and nothing is checked. The audit trail must say that rather than
 * claim a PIN check that never happened (Tselane, PR #2).
 * `separate_pin` is reserved for the real control and is only recorded once a
 * PIN is genuinely stored, validated and rate-limited.
 */
export const VERIFICATION_METHODS = ["demo_login", "separate_pin"] as const;

export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

/** Plain-language label for a verification method, for parent-facing screens. */
export const VERIFICATION_METHOD_LABELS: Record<VerificationMethod, string> = {
  demo_login: "demo login (no PIN was checked)",
  separate_pin: "separate PIN",
};

export const CONSENT_CHANGE_CONTEXTS = ["standard", "emergency_contact"] as const;

export type ConsentChangeContext = (typeof CONSENT_CHANGE_CONTEXTS)[number];

export type ApprovalReason =
  | "school_trip"
  | "medical"
  | "emergency_contact"
  | "contact_details";

export type ApprovalStatus =
  | "not_needed"
  | "pending"
  | "approved"
  | "rejected";

/** Identifiers used across the fictional school (no real PII). */
export type ParentId = string; // e.g. "P-001"
export type LearnerId = string; // e.g. "L-101"
export type StaffId = string; // e.g. "S-01"

/** A single consent setting for one learner and one consent type. */
export interface ConsentSetting {
  learnerId: LearnerId;
  type: ConsentType;
  state: ConsentState;
}

/** A request record linked to its append-only audit entries. */
export interface ConsentRequestRecord {
  requestId: string;
  parentId: ParentId;
  learnerId: LearnerId;
  type: ConsentType;
  from: ConsentState;
  to: ConsentState;
  currentState: ConsentState;
  changeContext: ConsentChangeContext;
  needsApproval: boolean;
  approvalReason?: ApprovalReason;
  approvalStatus: ApprovalStatus;
  verificationMethod: VerificationMethod;
  auditEntryIndexes: readonly number[];
}

export function isConsentType(value: string): value is ConsentType {
  return (CONSENT_TYPES as readonly string[]).includes(value);
}

export function isConsentState(value: string): value is ConsentState {
  return (CONSENT_STATES as readonly string[]).includes(value);
}
