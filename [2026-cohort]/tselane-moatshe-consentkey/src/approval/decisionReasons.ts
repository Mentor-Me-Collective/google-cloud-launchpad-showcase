/**
 * The short list of reasons a staff member picks when deciding a request.
 *
 * OD-07 / decision 1 in the legal log: "S-02 reviews each request and records a
 * reason from a short list, plus a note that must not contain health details."
 *
 * A code from the list is what goes in the audit trail. The free-text note is
 * optional, capped, and explicitly must not carry health details — the list
 * exists so the common cases never need free text at all.
 */

import type { ConsentType } from "../consent/model.js";

export interface ReasonOption {
  code: string;
  label: string;
}

/** Reasons for approving any request. */
const APPROVE_COMMON: readonly ReasonOption[] = [
  { code: "routine", label: "Routine change, nothing to query" },
  { code: "checked_with_parent", label: "Checked with the parent or guardian" },
  { code: "checked_with_office", label: "Checked against the school office records" },
];

/**
 * Extra approval reasons for Medical, from decision 1 option B: the school
 * restricts medical information except what it is permitted or required to
 * keep, and S-02 records which of those applies.
 */
const APPROVE_MEDICAL: readonly ReasonOption[] = [
  { code: "restrict_all", label: "Restrict all medical information" },
  {
    code: "restrict_except_required",
    label: "Restrict, except what the school is permitted or required to keep",
  },
];

/** Reasons for declining any request. */
const DECLINE_COMMON: readonly ReasonOption[] = [
  { code: "not_recorded_parent", label: "Requester is not the recorded parent or guardian" },
  { code: "needs_more_information", label: "More information needed from the parent" },
  { code: "conflicts_with_duty", label: "Conflicts with something the school must do" },
  { code: "sent_to_wrong_role", label: "Should be handled by a different role" },
];

/**
 * Extra decline reason for Medical (assumption A-06, pending confirmation):
 * the school may need to keep a record, so the withdrawal is not carried out.
 * The note must not contain health details.
 */
const DECLINE_MEDICAL: readonly ReasonOption[] = [
  {
    code: "must_keep_record",
    label: "School must keep this record (explain in the note, no health details)",
  },
];

/** Always available, and the only one that expects the note to be used. */
const OTHER: ReasonOption = { code: "other", label: "Other (explain in the note)" };

/**
 * The reasons offered for this consent type and decision. The same list is
 * used to build the form and to validate what comes back, so the two cannot
 * drift apart.
 */
export function decisionReasons(
  type: ConsentType,
  approved: boolean,
): readonly ReasonOption[] {
  if (!approved) {
    return type === "Medical"
      ? [...DECLINE_COMMON, ...DECLINE_MEDICAL, OTHER]
      : [...DECLINE_COMMON, OTHER];
  }
  return type === "Medical"
    ? [...APPROVE_MEDICAL, ...APPROVE_COMMON, OTHER]
    : [...APPROVE_COMMON, OTHER];
}

export function isValidReasonCode(
  type: ConsentType,
  approved: boolean,
  code: string,
): boolean {
  return decisionReasons(type, approved).some((r) => r.code === code);
}

/**
 * Consent types where a reason code is required rather than optional.
 *
 * OD-07 requires one for every Medical review. Everywhere else it is offered
 * but not forced, so routine School Trips sign-offs stay quick.
 */
export function reasonCodeRequired(type: ConsentType): boolean {
  return type === "Medical";
}

/** Human-readable label for a stored code, for the audit view. */
export function reasonLabel(
  type: ConsentType,
  approved: boolean,
  code: string,
): string {
  return decisionReasons(type, approved).find((r) => r.code === code)?.label ?? code;
}
