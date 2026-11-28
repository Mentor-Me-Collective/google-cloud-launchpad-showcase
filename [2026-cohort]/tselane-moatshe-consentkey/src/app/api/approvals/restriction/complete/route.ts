import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { requireStaff } from "@/server/guards";
import { getApp } from "@/server/appSchool";
import { completeRestriction } from "@/approval/restrictionCompletion";
import { roleLabel, requiredRole } from "@/approval/approvalRules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Open medical restrictions with due dates. S-02 only. */
export async function GET() {
  const identity = await getCurrentIdentity();
  const refusal = requireStaff(identity);
  if (refusal || !identity || identity.kind !== "staff") {
    return NextResponse.json(
      { error: refusal?.error ?? "Not signed in as staff" },
      { status: refusal?.status ?? 401 },
    );
  }
  if (identity.staffId !== "S-02") {
    return NextResponse.json({ restrictions: [] });
  }
  const app = await getApp();
  const now = Date.now();
  const names = new Map(app.users.parentLearners().map((l) => [l.learnerId, l.learnerName]));
  const restrictions = app.learnerRecords.openRestrictions().map((r) => ({
    learnerId: r.learnerId,
    learnerName: names.get(r.learnerId) ?? r.learnerId,
    restrictionDueBy: r.restrictionDueBy,
    overdue: new Date(r.restrictionDueBy).getTime() < now,
  }));
  return NextResponse.json({ restrictions });
}

/** S-02 marks a restricted medical note as completed. */
export async function POST(req: Request) {
  const identity = await getCurrentIdentity();
  const refusal = requireStaff(identity);
  if (refusal || !identity || identity.kind !== "staff") {
    return NextResponse.json(
      { error: refusal?.error ?? "Not signed in as staff" },
      { status: refusal?.status ?? 401 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { learnerId?: unknown };
  const learnerId = typeof body.learnerId === "string" ? body.learnerId : undefined;
  if (!learnerId) {
    return NextResponse.json({ error: "Missing learnerId" }, { status: 400 });
  }

  const app = await getApp();
  const result = completeRestriction(
    { audit: app.audit, learnerRecords: app.learnerRecords },
    identity.staffId,
    learnerId,
  );
  switch (result.status) {
    case "denied":
      return NextResponse.json(
        {
          error: `${identity.name} (${identity.roleLabel}) may not complete medical restrictions. It needs ${roleLabel(requiredRole("Medical"))}.`,
        },
        { status: 403 },
      );
    case "not_found":
      return NextResponse.json(
        { error: "No open medical restriction for that learner." },
        { status: 404 },
      );
    case "already_completed":
      return NextResponse.json({ status: "already_completed", completedAt: result.completedAt });
    case "completed":
      return NextResponse.json({
        status: "completed",
        completedAt: result.completedAt,
        onTime: result.onTime,
        restrictionDueBy: result.restrictionDueBy,
      });
  }
}
