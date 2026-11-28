/**
 * Open the stored record of one audit entry. Controlled by role and logged:
 * every attempt, allowed or refused, becomes an audit entry recording who,
 * when and why (plan phase 3). See src/audit/viewControl.ts.
 */

import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { refuseAdminAudit } from "@/server/guards";
import { getApp } from "@/server/appSchool";
import { isValidViewReason, viewAuditEntry } from "@/audit/viewControl";
import type { Viewer } from "@/audit/viewControl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const refusal = refuseAdminAudit(identity);
  if (refusal) return NextResponse.json({ error: refusal.error }, { status: refusal.status });
  if (identity.kind === "admin") return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    entryIndex?: unknown;
    reasonCode?: unknown;
  };
  if (!Number.isInteger(body.entryIndex) || (body.entryIndex as number) < 0) {
    return NextResponse.json({ error: "Missing entry number" }, { status: 400 });
  }
  if (!isValidViewReason(body.reasonCode)) {
    return NextResponse.json(
      { error: "Choose a reason for opening this record." },
      { status: 400 },
    );
  }

  const viewer: Viewer =
    identity.kind === "parent"
      ? { kind: "parent", parentId: identity.parentId, learnerId: identity.learnerId }
      : { kind: "staff", staffId: identity.staffId, role: identity.role };

  const app = await getApp();
  const outcome = viewAuditEntry(
    app.audit,
    viewer,
    body.entryIndex as number,
    body.reasonCode,
  );
  if (!outcome.ok) {
    // Same answer whether the entry is missing or not theirs, so the
    // response does not reveal which entries exist.
    return NextResponse.json(
      { error: "You do not have access to that record." },
      { status: 403 },
    );
  }
  return NextResponse.json({ entry: outcome.entry });
}
