/**
 * Turn a parent's free-text message into a *draft* consent request.
 *
 * This endpoint never changes anything. It returns a draft plus a
 * plain-language summary; the parent then confirms it, which goes through the
 * ordinary /api/consent/change path with the ordinary approval rules. That is
 * decision 7 in docs/legal-decisions-log.md: "the model only drafts a request
 * ... The model never approves or applies a change. If the message is unclear,
 * the system asks the parent instead of guessing."
 *
 * The NVIDIA key is read from the server environment and is never sent to the
 * browser. The parent's message is not written to the audit trail — it is free
 * text that could contain health details — only the structured draft is.
 */

import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { getApp } from "@/server/appSchool";
import {
  createNvidiaDraftService,
  isNvidiaDraftConfigured,
  nvidiaModelId,
  NvidiaDraftConfigurationError,
  NvidiaDraftRequestError,
  NvidiaDraftUnclearError,
  AI_UNAVAILABLE_MESSAGE,
} from "@/ai/nvidiaDraftService";
import { requiredRole, roleLabel } from "@/approval/approvalRules";
import { getDraftStore } from "@/server/draftStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNCLEAR_MESSAGE =
  "We could not tell which consent you meant. Please say which one (Photos, School Trips, Medical or Contact Details) and whether you want to grant or withdraw it — or just use the switches below.";

export async function POST(req: Request) {
  const identity = await getCurrentIdentity();
  if (!identity || identity.kind !== "parent") {
    return NextResponse.json({ error: "Not signed in as a parent" }, { status: 401 });
  }
  if (!isNvidiaDraftConfigured()) {
    return NextResponse.json({ error: AI_UNAVAILABLE_MESSAGE, fallback: true }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { text?: unknown };
  if (typeof body.text !== "string") {
    return NextResponse.json({ error: "Missing message text" }, { status: 400 });
  }

  const service = createNvidiaDraftService();
  let draft;
  try {
    draft = await service.createDraft(body.text);
  } catch (err) {
    if (err instanceof NvidiaDraftUnclearError) {
      // Not an error path for the parent: we ask rather than guess.
      return NextResponse.json({ clear: false, message: UNCLEAR_MESSAGE });
    }
    // Every other failure (no key, timeout, 429, 5xx, unreadable reply, or
    // something unexpected) sends the parent to the manual form. Log the
    // error class and HTTP status only: never the message text, headers or key.
    const status = err instanceof NvidiaDraftRequestError ? err.status : undefined;
    console.error(
      `[ai/draft] NVIDIA helper failed: ${err instanceof Error ? err.name : "unknown"}${status ? ` (HTTP ${status})` : ""}`,
    );
    return NextResponse.json(
      { error: AI_UNAVAILABLE_MESSAGE, fallback: true },
      { status: err instanceof NvidiaDraftConfigurationError ? 503 : 502 },
    );
  }

  const app = await getApp();
  const from = app.connector.getState(identity.learnerId, draft.type);
  if (from === draft.to) {
    return NextResponse.json({
      clear: false,
      message: `${draft.type} is already ${draft.to === "granted" ? "granted" : "withdrawn"} for ${identity.learnerName}, so there is nothing to change.`,
    });
  }

  const role = requiredRole(draft.type, draft.changeContext);

  // Record that a draft was produced — structured fields only, never the
  // parent's free text, and clearly marked as not yet applied.
  app.audit.record("ai.draft_created", {
    parentId: identity.parentId,
    learnerId: identity.learnerId,
    type: draft.type,
    from,
    to: draft.to,
    changeContext: draft.changeContext,
    model: nvidiaModelId(),
    applied: false,
    awaitingParentConfirmation: true,
  });

  // The validated draft is held on the server. The browser gets an opaque id
  // and must send the parent PIN with it to /api/ai/confirm; nothing is
  // submitted until then.
  const draftId = getDraftStore().create(identity.parentId, draft);

  return NextResponse.json({
    clear: true,
    draftId,
    pinRequired: true,
    draft: {
      type: draft.type,
      from,
      to: draft.to,
      changeContext: draft.changeContext,
      summary: draft.summary,
    },
    // The question the parent answers before anything happens.
    confirmation: `You asked to ${draft.to === "granted" ? "grant" : "withdraw"} ${draft.type} consent${draft.changeContext === "emergency_contact" ? " (emergency contact)" : ""} for ${identity.learnerId}. Is this right?`,
    requiredRole: role ?? null,
    nextStep: (role
      ? `If you confirm, this goes to ${roleLabel(role)} for sign-off before anything changes.`
      : "If you confirm, this applies straight away and every affected system is updated.") +
      " You confirm with your PIN.",
  });
}
