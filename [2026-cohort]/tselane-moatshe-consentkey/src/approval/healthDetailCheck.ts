/**
 * Health-detail screen for free-text decision notes (OD-07).
 *
 * The note for a Medical decision is written to the audit trail and shown to
 * the parent, so it must not contain health details. This is a keyword screen,
 * NOT a guarantee: it is case-insensitive and deliberately conservative, so it
 * will sometimes refuse a harmless note and can miss unusual wording (a
 * misspelt or rare condition). The reason list and the form text remain the
 * primary control; this catches the common slips.
 */

const PATTERNS: readonly RegExp[] = [
  // Stems: diagnosis, medication, prescription, allergy, treatment, symptoms...
  /diagnos/i,
  /medicat/i,
  /prescri/i,
  /allerg/i,
  /anaphyla/i,
  /\bepipen\b/i,
  /symptom/i,
  /\btherap(y|ist|ies)\b/i,
  /\bsurger(y|ies)\b/i,
  /\binhaler\b/i,
  /\binsulin\b/i,
  /\bchronic\b/i,
  /\bdisorder\b/i,
  /\bsyndrome\b/i,
  /\bdisabilit/i,
  // Dosage: "mg", "5mg", "10 ml"
  /\bmg\b|\d\s?mg\b|\d\s?ml\b|\bmcg\b/i,
  // Common conditions
  /\basthma/i,
  /\bdiabet/i,
  /\bepilep/i,
  /\bseizure/i,
  /\bhiv\b/i,
  /\baids\b/i,
  /\badhd\b|\badd\b/i,
  /\bautis/i,
  /\bcancer|\bleukemi|\bleukaemi|\bchemo/i,
  /\btuberculosis\b|\btb\b/i,
  /\bdepress(ion|ed)\b|\banxiety\b|\bbipolar\b|\bschizo/i,
  /\bsickle\b|\bhaemophil|\bhemophil/i,
  /\bcystic fibrosis\b/i,
  /\bheart (condition|disease|defect)\b/i,
  /\beczema\b|\bmigraine/i,
  /\bcovid\b/i,
];

/** True when the note appears to contain health details. */
export function containsHealthDetail(note: string): boolean {
  return PATTERNS.some((p) => p.test(note));
}

export const HEALTH_DETAIL_MESSAGE =
  "The note looks like it contains health details. Remove them and keep the note to a short administrative explanation.";
