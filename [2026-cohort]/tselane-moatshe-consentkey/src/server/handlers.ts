/**
 * Request logic for the sign-in and consent-switch endpoints, kept apart from
 * the route files (which only read the cookie and write the response) so the
 * rules can be tested without a running Next.js server.
 */

import { getApp } from "./appSchool.js";
import { PIN_PATTERN } from "./pin.js";
import { submitConsentChange } from "./submitChange.js";
import type { SubmitReply } from "./submitChange.js";
import type { Identity } from "./identities.js";
import { isConsentState, isConsentType } from "../consent/model.js";

/** Wrong-PIN wording shared by the switch and draft flows. */
export function wrongPinMessage(check: {
  locked: boolean;
  attemptsLeft: number;
  retryAfterSeconds: number;
}): string {
  return check.locked
    ? `Too many wrong PINs. Try again in ${Math.max(1, Math.ceil(check.retryAfterSeconds / 60))} minutes.`
    : `That PIN is not right. ${check.attemptsLeft} ${check.attemptsLeft === 1 ? "try" : "tries"} left.`;
}

export async function handleLogin(
  body: { username?: unknown; pin?: unknown },
): Promise<SubmitReply & { identity?: Identity }> {
  const app = await getApp();
  if (typeof body.username !== "string" || typeof body.pin !== "string") {
    return { status: 400, body: { error: "Enter your username and PIN." } };
  }
  const result = app.users.authenticate(body.username, body.pin);
  if (result.ok) {
    return { status: 200, body: { identity: result.identity }, identity: result.identity };
  }
  // One message for unknown user, wrong PIN and deactivated account.
  return {
    status: result.locked ? 429 : 401,
    body: {
      error: result.locked
        ? `Too many wrong tries. Try again in ${Math.max(1, Math.ceil(result.retryAfterSeconds / 60))} minutes.`
        : "That username and PIN do not match. Check them and try again.",
      locked: result.locked,
    },
  };
}

/**
 * A parent flips a consent switch. The PIN is checked first (same service,
 * hashing, constant-time compare and lockout as the draft flow); only then does
 * the request go through the ordinary submission path, so approval rules are
 * unchanged. The PIN is never logged, audited or returned.
 */
export async function handleConsentChange(
  identity: Identity | undefined,
  body: {
    type?: unknown;
    to?: unknown;
    changeContext?: unknown;
    alternativeNumber?: unknown;
    pin?: unknown;
  },
): Promise<SubmitReply> {
  if (!identity || identity.kind !== "parent") {
    return { status: 401, body: { error: "Not signed in as a parent" } };
  }
  if (typeof body.type !== "string" || !isConsentType(body.type)) {
    return { status: 400, body: { error: "Invalid consent type" } };
  }
  if (typeof body.to !== "string" || !isConsentState(body.to)) {
    return { status: 400, body: { error: "Invalid target state" } };
  }
  if (
    body.changeContext !== undefined &&
    body.changeContext !== "standard" &&
    body.changeContext !== "emergency_contact"
  ) {
    return { status: 400, body: { error: "Invalid change context" } };
  }
  if (typeof body.pin !== "string" || !PIN_PATTERN.test(body.pin)) {
    return { status: 400, body: { error: "Enter your PIN (4 to 8 digits) to confirm this change." } };
  }

  const app = await getApp();
  const check = app.users.verifyUserPin(identity.id, body.pin);
  if (!check.ok) {
    // The attempt is recorded; the PIN itself never is.
    app.audit.record("consent.pin_failed", {
      parentId: identity.parentId,
      learnerId: identity.learnerId,
      type: body.type,
      locked: check.locked,
    });
    return {
      status: check.locked ? 429 : 403,
      body: { error: wrongPinMessage(check), locked: check.locked, pinError: true },
    };
  }

  return submitConsentChange(
    identity,
    {
      type: body.type,
      to: body.to,
      changeContext: body.changeContext,
      alternativeNumber: body.alternativeNumber,
    },
    "separate_pin",
  );
}
