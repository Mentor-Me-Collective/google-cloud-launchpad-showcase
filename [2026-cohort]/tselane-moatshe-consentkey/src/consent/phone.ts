/**
 * South African phone numbers, for the optional alternative contact number.
 *
 * ASSUMPTION (docs/legal-decisions-log.md, A-04): accepted formats are E.164
 * (+27XXXXXXXXX) or national (0XXXXXXXXX). Spaces, hyphens and brackets are
 * ignored. The stored form is always E.164. Nothing here verifies that the
 * number reaches the parent; that is a staff review step.
 */

/** Returns the E.164 form, or undefined if the input is not a SA number. */
export function normalizeSouthAfricanNumber(input: string): string | undefined {
  const compact = input.trim().replace(/[\s\-()]/g, "");
  if (/^\+27[1-9]\d{8}$/.test(compact)) return compact;
  if (/^0[1-9]\d{8}$/.test(compact)) return `+27${compact.slice(1)}`;
  return undefined;
}

export function isValidSouthAfricanNumber(input: string): boolean {
  return normalizeSouthAfricanNumber(input) !== undefined;
}
