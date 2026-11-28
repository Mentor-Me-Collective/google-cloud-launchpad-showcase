import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { getApp, runEscalationCheck } from "@/server/appSchool";
import { CONSENT_TYPES } from "@/consent/model";
import { requiredRole, requiresApproval } from "@/approval/approvalRules";
import { isNvidiaDraftConfigured } from "@/ai/nvidiaDraftService";
import { escalationConfigFromEnv, escalationStatus } from "@/approval/escalation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getCurrentIdentity();
  if (!identity || identity.kind !== "parent") {
    return NextResponse.json({ error: "Not signed in as a parent" }, { status: 401 });
  }

  const app = await getApp();
  const systems = [app.photoLibrary, app.tripsRegister, app.learnerRecords];
  const { learnerId } = identity;
  runEscalationCheck(app);
  const escalationConfig = escalationConfigFromEnv();

  const items = CONSENT_TYPES.map((type) => ({
    type,
    state: app.connector.getState(learnerId, type),
    requiresApproval: requiresApproval(type),
    requiredRole: requiredRole(type) ?? null,
    // Non-null only where marking the change as an emergency contact is
    // offered (Contact Details). The role is now the same either way.
    emergencyContactRole:
      type === "Contact Details" ? requiredRole(type, "emergency_contact") ?? null : null,
    systems: systems.filter((s) => s.handles(type)).map((s) => s.name),
  }));

  const pendingForLearner = [...app.pending.values()]
    .filter((p) => p.request.learnerId === learnerId)
    .map((p) => ({
      id: p.id,
      type: p.request.type,
      from: p.request.from,
      to: p.request.to,
      changeContext: p.request.changeContext ?? "standard",
      requiredRole:
        requiredRole(p.request.type, p.request.changeContext ?? "standard") ?? null,
      createdAt: p.createdAt,
      // Decision 3: never auto-approved; overdue after two working days.
      escalation: escalationStatus(
        p.createdAt,
        new Date(),
        escalationConfig,
        requiredRole(p.request.type, p.request.changeContext ?? "standard"),
      ),
    }));

  return NextResponse.json({
    identity,
    items,
    pending: pendingForLearner,
    firestoreEnabled: app.firestoreEnabled,
    // Whether the NVIDIA draft feature can be offered. The key itself stays
    // on the server.
    aiDraftEnabled: isNvidiaDraftConfigured(),
  });
}
