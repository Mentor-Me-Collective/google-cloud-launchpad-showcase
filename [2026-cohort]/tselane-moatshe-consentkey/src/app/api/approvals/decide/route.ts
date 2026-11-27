import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { requireStaff } from "@/server/guards";
import { getApp, persistConsent } from "@/server/appSchool";
import { serializeChange } from "@/server/serialize";
import { PermissionDeniedError } from "@/connector/consentConnector";
import { canApprove, REASON_MAX_LENGTH } from "@/approval/approvalRules";
import { containsHealthDetail, HEALTH_DETAIL_MESSAGE } from "@/approval/healthDetailCheck";
import { isValidReasonCode, reasonCodeRequired } from "@/approval/decisionReasons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const identity = await getCurrentIdentity();
  const refusal = requireStaff(identity);
  if (refusal || !identity || identity.kind !== "staff") {
    return NextResponse.json(
      { error: refusal?.error ?? "Not signed in as staff" },
      { status: refusal?.status ?? 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    changeId?: unknown;
    approved?: unknown;
    reason?: unknown;
    reasonCode?: unknown;
  };
  const changeId = typeof body.changeId === "string" ? body.changeId : undefined;
  const approved = body.approved === true;
  const rawReason = typeof body.reason === "string" ? body.reason.trim() : "";
  const reason = rawReason === "" ? undefined : rawReason;
  const reasonCode = typeof body.reasonCode === "string" ? body.reasonCode : undefined;

  if (!changeId) {
    return NextResponse.json({ error: "Missing changeId" }, { status: 400 });
  }
  // The reason is written to the audit trail and shown to the parent, so keep
  // it short — it is for a short explanation, not case notes (Tselane, PR #2).
  if (reason && reason.length > REASON_MAX_LENGTH) {
    return NextResponse.json(
      {
        error: `Keep the reason under ${REASON_MAX_LENGTH} characters, and do not include health details.`,
      },
      { status: 400 },
    );
  }

  const app = await getApp();
  const pending = app.pending.get(changeId);
  if (!pending) {
    return NextResponse.json({ error: "No such pending change (already decided?)" }, { status: 404 });
  }

  const type = pending.request.type;
  const context = pending.request.changeContext ?? "standard";

  // Authorization BEFORE input validation.
  //
  // A staff member who may not decide this must be refused as such, and the
  // attempt must reach the connector so it is written to the audit trail as
  // `approval.denied`. Validating the reason first meant the wrong role got
  // "choose a reason" instead of "you may not approve this" — and, worse, the
  // attempt was never recorded at all. Skipping these checks here is safe:
  // the connector refuses the decision regardless.
  if (canApprove(identity.staffId, type, context)) {
    // OD-07: a reason from the short list is required for every Medical
    // review, and any code sent must be one the list actually offers.
    if (reasonCode !== undefined && !isValidReasonCode(type, approved, reasonCode)) {
      return NextResponse.json(
        { error: "That reason is not one of the options for this request." },
        { status: 400 },
      );
    }
    if (reasonCodeRequired(type) && !reasonCode) {
      return NextResponse.json(
        { error: `Choose a reason for this ${type} decision before recording it.` },
        { status: 400 },
      );
    }
    // OD-07: the Medical note must not carry health details. This is a
    // keyword screen (see healthDetailCheck), not a guarantee.
    if (type === "Medical" && reason && containsHealthDetail(reason)) {
      return NextResponse.json({ error: HEALTH_DETAIL_MESSAGE }, { status: 400 });
    }
    if (reasonCode === "other" && !reason) {
      return NextResponse.json(
        { error: "Choosing “Other” needs a short note explaining it." },
        { status: 400 },
      );
    }
  }

  let result;
  try {
    result = app.connector.process(pending.request, {
      staffId: identity.staffId,
      approved,
      reason,
      reasonCode,
    });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      // Keep the item in the queue so the correct role can still act on it.
      return NextResponse.json(
        {
          error: `${identity.name} (${identity.roleLabel}) may not approve ${pending.request.type} changes.`,
        },
        { status: 403 },
      );
    }
    throw err;
  }

  // Decision made: remove from the queue and persist the resulting state.
  app.pending.delete(changeId);
  app.repo.deletePending(changeId).catch((e) =>
    console.error("[consentkey] pending delete failed:", e),
  );

  if (approved) {
    await persistConsent(
      app,
      pending.request.learnerId,
      pending.request.type,
      app.connector.getState(pending.request.learnerId, pending.request.type),
    );
  }

  return NextResponse.json({
    status: result.status,
    result: serializeChange(result),
  });
}
