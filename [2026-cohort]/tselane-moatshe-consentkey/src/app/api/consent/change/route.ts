import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { handleConsentChange } from "@/server/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const identity = await getCurrentIdentity();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // The handler checks the parent session and the PIN before anything is
  // submitted. The PIN is read from the body and never echoed back.
  const result = await handleConsentChange(identity, body);
  return NextResponse.json(result.body, { status: result.status });
}
