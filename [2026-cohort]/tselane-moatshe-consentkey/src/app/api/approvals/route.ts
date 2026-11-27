import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { requireStaff } from "@/server/guards";
import { getApp, runEscalationCheck } from "@/server/appSchool";
import { canApprove, requiredRole } from "@/approval/approvalRules";
import { decisionReasons, reasonCodeRequired } from "@/approval/decisionReasons";
import { escalationConfigFromEnv, escalationStatus } from "@/approval/escalation";
import { medicalRestrictionDaysFromEnv } from "@/approval/medicalRestriction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getCurrentIdentity();
  const refusal = requireStaff(identity);
  if (refusal || !identity || identity.kind !== "staff") {
    return NextResponse.json(
      { error: refusal?.error ?? "Not signed in as staff" },
      { status: refusal?.status ?? 401 },
    );
  }

  const app = await getApp();
  runEscalationCheck(app);
  const all = [...app.pending.values()];
  const now = new Date();
  const config = escalationConfigFromEnv();
  const escalatedToMe = (p: (typeof all)[number]) => {
    const role = requiredRole(p.request.type, p.request.changeContext ?? "standard");
    return (
      role !== undefined &&
      escalationStatus(p.createdAt, now, config, role).escalatedTo === identity.staffId
    );
  };

  const queue = all
    // OD-04 / OD-09: "a staff member sees only requests assigned to their
    // role". Previously the whole queue was returned with a canApprove flag,
    // so an officer could read requests — and parent and learner names — for
    // changes that were never theirs to handle.
    //
    // Phase 2: a request escalated to this officer is also shown, read-only.
    // Escalation gives visibility, not authority (assumption A-02).
    .filter(
      (p) =>
        canApprove(identity.staffId, p.request.type, p.request.changeContext ?? "standard") ||
        escalatedToMe(p),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((p) => {
      // The stored record holds IDs only; display names come from the login
      // roster at render time (Tselane, PR #2).
      const requester = app.users.identityFor(p.identityId, { includeInactive: true });
      const context = p.request.changeContext ?? "standard";
      return {
        id: p.id,
        type: p.request.type,
        from: p.request.from,
        to: p.request.to,
        changeContext: context,
        learnerId: p.request.learnerId,
        learnerName:
          requester?.kind === "parent" ? requester.learnerName : p.request.learnerId,
        parentName: requester?.kind === "parent" ? requester.name : p.request.parentId,
        parentId: p.request.parentId,
        createdAt: p.createdAt,
        requiredRole: requiredRole(p.request.type, context) ?? null,
        // False for a request that was only escalated to this officer.
        canApprove: canApprove(identity.staffId, p.request.type, context),
        escalation: escalationStatus(
          p.createdAt,
          now,
          config,
          requiredRole(p.request.type, context),
        ),
        // Medical withdrawal: days allowed to finish restricting the note (A-05).
        restrictionDays:
          p.request.type === "Medical" && p.request.to === "withdrawn"
            ? medicalRestrictionDaysFromEnv()
            : null,
        reasonRequired: reasonCodeRequired(p.request.type),
        // Only the role that decides the request sees the number.
        alternativeNumber: canApprove(identity.staffId, p.request.type, context)
          ? (p.request.alternativeNumber ?? null)
          : null,
        approveReasons: decisionReasons(p.request.type, true),
        declineReasons: decisionReasons(p.request.type, false),
      };
    });

  return NextResponse.json({
    identity,
    queue,
    firestoreEnabled: app.firestoreEnabled,
    // How many requests exist that this role may not see, so the screen can
    // say "3 others are with another officer" instead of implying the school
    // has no other work outstanding.
    withOtherRoles: all.length - queue.length,
  });
}
