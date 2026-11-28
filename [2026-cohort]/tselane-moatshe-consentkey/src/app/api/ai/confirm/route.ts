/**
 * Confirm a drafted request with the parent's PIN (plan phase 4).
 *
 * This is the only way a model-drafted request is submitted. The submitted
 * type and state come from the draft the server validated, not from the
 * browser. The PIN is checked (hashed, constant-time, rate-limited) before
 * anything is submitted, and is never logged or audited. After a correct PIN
 * the request goes through the ordinary submission path, so approval rules
 * are unchanged: nothing is auto-approved and nothing is applied before a
 * required staff decision.
 */

import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { getApp } from "@/server/appSchool";
import { getDraftStore } from "@/server/draftStore";
import { PIN_PATTERN } from "@/server/pin";
import { submitConsentChange } from "@/server/submitChange";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const identity = await getCurrentIdentity();
  if (!identity || identity.kind !== "parent") {
    return NextResponse.json({ error: "Not signed in as a parent" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    draftId?: unknown;
    pin?: unknown;
  };
  if (typeof body.draftId !== "string") {
    return NextResponse.json({ error: "Missing draft" }, { status: 400 });
  }
  if (typeof body.pin !== "string" || !PIN_PATTERN.test(body.pin)) {
    return NextResponse.json({ error: "Enter your PIN (4 to 8 digits)." }, { status: 400 });
  }

  const store = getDraftStore();
  const draft = store.peek(body.draftId, identity.parentId);
  if (!draft) {
    return NextResponse.json(
      { error: "That draft has expired or is not yours. Please write your request again." },
      { status: 410 },
    );
  }

  const app = await getApp();
  const check = app.users.verifyUserPin(identity.id, body.pin);
  if (!check.ok) {
    // The attempt is recorded; the PIN itself never is.
    app.audit.record("ai.draft_pin_failed", {
      parentId: identity.parentId,
      learnerId: identity.learnerId,
      type: draft.type,
      locked: check.locked,
    });
    return NextResponse.json(
      {
        error: check.locked
          ? `Too many wrong PINs. Try again in ${Math.ceil(check.retryAfterSeconds / 60)} minutes.`
          : `That PIN is not right. ${check.attemptsLeft} ${check.attemptsLeft === 1 ? "try" : "tries"} left.`,
        locked: check.locked,
      },
      { status: check.locked ? 429 : 403 },
    );
  }

  store.consume(body.draftId);
  app.audit.record("ai.draft_confirmed", {
    parentId: identity.parentId,
    learnerId: identity.learnerId,
    type: draft.type,
    to: draft.to,
    changeContext: draft.changeContext,
    verificationMethod: "separate_pin",
  });

  const result = await submitConsentChange(
    identity,
    { type: draft.type, to: draft.to, changeContext: draft.changeContext },
    "separate_pin",
  );
  return NextResponse.json(result.body, { status: result.status });
}
