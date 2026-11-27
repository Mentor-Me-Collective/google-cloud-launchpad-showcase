import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { adminOverview } from "@/server/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Role check (System Admin only) is done inside adminOverview.
export async function GET() {
  const identity = await getCurrentIdentity();
  const result = await adminOverview(identity);
  return NextResponse.json(result.body, { status: result.status });
}
