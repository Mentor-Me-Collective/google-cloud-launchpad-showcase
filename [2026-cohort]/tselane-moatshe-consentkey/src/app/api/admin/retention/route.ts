import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { getApp } from "@/server/appSchool";
import { retentionHandler } from "@/audit/archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// System Admin only (checked in retentionHandler). Body { "mode": "apply" }
// changes the log; anything else is a dry run.
export async function POST(req: Request) {
  const identity = await getCurrentIdentity();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const app = await getApp();
  // Without a durable store the archive record would be lost with the process,
  // so applying is refused rather than deleting entries with no copy.
  if (body.mode === "apply" && !app.repo.enabled || !app.repo.saveAuditArchive || !app.repo.deleteAuditThrough) {
    return NextResponse.json(
      { error: "Applying retention needs durable storage (Firestore) to hold the archive." },
      { status: 409 },
    );
  }
  const result = await retentionHandler(identity, body, {
    audit: app.audit,
    saveArchive: (r) => app.repo.saveAuditArchive!(r),
    deleteDurable: (i) => app.repo.deleteAuditThrough!(i),
  });
  return NextResponse.json(result.body, { status: result.status });
}
