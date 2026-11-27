import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getCurrentIdentity();
  return NextResponse.json({ identity: identity ?? null });
}
