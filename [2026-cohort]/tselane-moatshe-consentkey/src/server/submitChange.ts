/**
 * Shared submission path for a parent's consent change. Used by the direct
 * toggle endpoint and by the PIN-confirmed draft endpoint, so both apply the
 * same rules: unverified parents refused, approval queue, one pending request
 * per type, nothing applied before a required approval.
 */

import { randomUUID } from "node:crypto";
import { getApp, persistConsent } from "./appSchool.js";
import { serializeChange } from "./serialize.js";
import type { ParentIdentity } from "./identities.js";
import type {
  ConsentChangeContext,
  ConsentState,
  ConsentType,
  VerificationMethod,
} from "../consent/model.js";
import { normalizeSouthAfricanNumber } from "../consent/phone.js";
import { requiredRole, requiresApproval, roleLabel } from "../approval/approvalRules.js";
import type { ConsentChangeRequest } from "../connector/consentConnector.js";

export interface SubmitReply {
  status: number;
  body: Record<string, unknown>;
}

function reply(body: Record<string, unknown>, init?: { status?: number }): SubmitReply {
  return { status: init?.status ?? 200, body };
}

/** 	ype and 	o must already be validated; the rest is checked here. */
export async function submitConsentChange(
  identity: ParentIdentity,
  body: {
    type: ConsentType;
    to: ConsentState;
    changeContext?: unknown;
    alternativeNumber?: unknown;
  },
  verificationMethod: VerificationMethod,
): Promise<SubmitReply> {
  const app = await getApp();
  const { learnerId } = identity;
  const type = body.type;
  const to = body.to;

  // Optional alternative number: Contact Details only, added alongside the
  // existing number, South African format (assumption A-04).
  let alternativeNumber: string | undefined;
  if (body.alternativeNumber !== undefined && body.alternativeNumber !== "") {
    if (type !== "Contact Details" || to !== "granted") {
      return reply(
        { error: "An alternative number can only be given when granting Contact Details." },
        { status: 400 },
      );
    }
    alternativeNumber =
      typeof body.alternativeNumber === "string"
        ? normalizeSouthAfricanNumber(body.alternativeNumber)
        : undefined;
    if (!alternativeNumber) {
      return reply(
        { error: "Enter the alternative number as a South African number, like 082 123 4567 or +27821234567." },
        { status: 400 },
      );
    }
  }
  // Emergency contact is only meaningful for Contact Details; ignore it
  // elsewhere so a crafted request cannot route a change to the wrong role.
  const changeContext: ConsentChangeContext =
    type === "Contact Details" && body.changeContext === "emergency_contact"
      ? "emergency_contact"
      : "standard";
  const from = app.connector.getState(learnerId, type);

  if (from === to) {
    return reply({ error: "Consent is already in that state" }, { status: 400 });
  }

  const request: ConsentChangeRequest = {
    parentId: identity.parentId,
    parentVerified: identity.verified,
    // Passed in by the caller so the audit trail says what actually happened
    // (Tselane, PR #2): "demo_login" when only the identity picker was used,
    // "separate_pin" only after a PIN was genuinely checked.
    verificationMethod,
    learnerId,
    type,
    from,
    to,
    changeContext,
    ...(alternativeNumber ? { alternativeNumber } : {}),
  };

  // Unverified parents are rejected before anything changes.
  if (!identity.verified) {
    app.audit.record("request.rejected", {
      parentId: identity.parentId,
      learnerId,
      type,
      changeContext,
      verificationMethod: request.verificationMethod,
      reason: "parent not verified",
    });
    return reply(
      {
        status: "rejected",
        error:
          "Your identity has not been verified yet. Contact the school office to verify before changing consent.",
      },
      { status: 403 },
    );
  }

  // Changes that need staff approval are queued, not applied immediately.
  if (requiresApproval(type, changeContext)) {
    // One request at a time per consent type. Without this a parent could
    // queue the same change repeatedly, leaving staff several identical
    // requests to decide and the parent several records of one intention.
    const alreadyWaiting = [...app.pending.values()].find(
      (p) => p.request.learnerId === learnerId && p.request.type === type,
    );
    if (alreadyWaiting) {
      return reply(
        {
          status: "already_pending",
          changeId: alreadyWaiting.id,
          error: `You already have a ${type} request waiting for ${roleLabel(
            requiredRole(type, alreadyWaiting.request.changeContext ?? "standard"),
          )}. It was sent on ${new Date(alreadyWaiting.createdAt).toLocaleDateString()}, and nothing has changed yet.`,
        },
        { status: 409 },
      );
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    // Stamp the id onto the request so the entries written now and the ones
    // written when staff decide it later share an identity, and the audit
    // view shows one change rather than two.
    request.changeId = id;
    // IDs only — no names are persisted (Tselane, PR #2).
    const pending = { id, request, identityId: identity.id, createdAt };
    app.pending.set(id, pending);
    app.repo.savePending(pending).catch((err) =>
      console.error("[consentkey] pending persist failed:", err),
    );
    app.audit.record("approval.requested", {
      changeId: id,
      parentId: identity.parentId,
      learnerId,
      type,
      from,
      to,
      changeContext,
      verificationMethod: request.verificationMethod,
      ...(alternativeNumber ? { alternativeNumberProvided: true } : {}),
    });
    const who = roleLabel(requiredRole(type, changeContext));
    return reply({
      status: "pending_approval",
      changeId: id,
      requiredRole: requiredRole(type, changeContext) ?? null,
      // Decision 5 in docs/legal-decisions-log.md: say where it went, that
      // nothing has changed, and that the parent will hear back.
      message: `Your request has been sent to ${who}. Nothing has changed yet. We will tell you when they respond.`,
    });
  }

  // No approval needed: apply immediately and fan out to the systems.
  const result = app.connector.process(request);
  await persistConsent(app, learnerId, type, app.connector.getState(learnerId, type));

  return reply({
    status: result.status,
    result: serializeChange(result),
  });
}
