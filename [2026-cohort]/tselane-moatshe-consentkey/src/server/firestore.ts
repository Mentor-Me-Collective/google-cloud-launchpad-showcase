/**
 * Firestore client factory.
 *
 * Today this points at the Firestore emulator that docker-compose starts
 * (via FIRESTORE_EMULATOR_HOST). For real Firestore later, drop the emulator
 * env var and provide GOOGLE_APPLICATION_CREDENTIALS + GOOGLE_CLOUD_PROJECT /
 * FIRESTORE_PROJECT_ID — the @google-cloud/firestore client picks those up with
 * no code change.
 *
 * If nothing is configured (plain `next dev` with no emulator), `getFirestore`
 * returns null and the app falls back to in-memory state, so it always runs.
 */

import { Firestore } from "@google-cloud/firestore";

let cached: Firestore | null | undefined;

export function firestoreProjectId(): string {
  return (
    process.env.FIRESTORE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    "consentkey-local"
  );
}

/** True when either the emulator or a real project is configured. */
export function isFirestoreConfigured(): boolean {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.FIRESTORE_PROJECT_ID,
  );
}

export function getFirestore(): Firestore | null {
  if (cached !== undefined) return cached;

  if (!isFirestoreConfigured()) {
    cached = null;
    return cached;
  }

  try {
    cached = new Firestore({
      projectId: firestoreProjectId(),
      // The emulator needs no real credentials. The client reads
      // FIRESTORE_EMULATOR_HOST automatically and talks plaintext to it.
      ...(process.env.FIRESTORE_EMULATOR_HOST
        ? { ssl: false }
        : {}),
    });
  } catch (err) {
    console.error("[consentkey] Firestore init failed, using in-memory:", err);
    cached = null;
  }
  return cached;
}
