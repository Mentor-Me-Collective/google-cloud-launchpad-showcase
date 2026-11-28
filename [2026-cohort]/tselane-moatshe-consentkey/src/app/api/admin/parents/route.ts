import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { adminCreateParent } from "@/server/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Role check (System Admin only) is done inside adminCreateParent.
export async function POST(req: Request) {
  const identity = await getCurrentIdentity();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await adminCreateParent(identity, body);
  return NextResponse.json(result.body, { status: result.status });
}
