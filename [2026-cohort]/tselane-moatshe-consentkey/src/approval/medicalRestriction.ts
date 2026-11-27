/**
 * Medical withdrawal restriction deadline (plan phase 3).
 *
 * ASSUMPTION A-05 (docs/legal-decisions-log.md, status: assumed, pending
 * confirmation): the deadline is 7 CALENDAR days from the day S-02 approves,
 * and is configurable with MEDICAL_RESTRICTION_DAYS. Whether the real rule
 * counts calendar or working days is open detail 6, not decided.
 *
 * Restricting is not deleting: the medical note is blocked from use and kept.
 */

export const DEFAULT_MEDICAL_RESTRICTION_DAYS = 7;

/** Reads MEDICAL_RESTRICTION_DAYS. Anything but a positive whole number falls back to the default. */
export function medicalRestrictionDaysFromEnv(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.MEDICAL_RESTRICTION_DAYS?.trim();
  if (!raw || !/^\d+$/.test(raw)) return DEFAULT_MEDICAL_RESTRICTION_DAYS;
  const n = Number(raw);
  return n >= 1 && n <= 365 ? n : DEFAULT_MEDICAL_RESTRICTION_DAYS;
}

/** ISO timestamp `days` calendar days after `from`. */
export function restrictionDeadline(from: Date, days: number): string {
  const due = new Date(from.getTime());
  due.setUTCDate(due.getUTCDate() + days);
  return due.toISOString();
}