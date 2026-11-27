import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { refuseAdminAudit } from "@/server/guards";
import { getApp, runEscalationCheck } from "@/server/appSchool";
import { entriesForFamily, entriesForStaff } from "@/audit/visibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const refusal = refuseAdminAudit(identity);
  if (refusal) return NextResponse.json({ error: refusal.error }, { status: refusal.status });
  if (identity.kind === "admin") return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const app = await getApp();
  runEscalationCheck(app);
  const all = [...app.audit.entries()];

  // Verification always runs over the whole chain. A filtered view has gaps in
  // the hash links by design, so the parent could not check it themselves —
  // the server checks the complete chain and reports the verdict.
  const verify = app.audit.verify();

  // OD-09: a parent sees their own requests; a staff member sees requests
  // assigned to their role, plus anything they did themselves.
  const scoped =
    identity.kind === "parent"
      ? entriesForFamily(all, {
          parentId: identity.parentId,
          learnerId: identity.learnerId,
        })
      : entriesForStaff(all, {
          staffId: identity.staffId,
          role: identity.role,
        });

  return NextResponse.json({
    entries: scoped,
    verify,
    firestoreEnabled: app.firestoreEnabled,
    // Tells the page whether it is showing a filtered view, and how much of
    // the chain is hidden, so the count on screen is not misleading.
    scope: identity.kind === "parent" ? "family" : "role",
    roleLabel: identity.kind === "staff" ? identity.roleLabel : null,
    shown: scoped.length,
    chainLength: all.length,
  });
}
