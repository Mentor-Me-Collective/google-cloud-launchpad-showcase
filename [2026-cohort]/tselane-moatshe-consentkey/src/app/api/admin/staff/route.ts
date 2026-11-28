import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { adminCreateStaff } from "@/server/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Role check (System Admin only) is done inside adminCreateStaff.
export async function POST(req: Request) {
  const identity = await getCurrentIdentity();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await adminCreateStaff(identity, body);
  return NextResponse.json(result.body, { status: result.status });
}
