import { NextResponse } from "next/server";
import { setSession } from "@/server/auth";
import { handleLogin } from "@/server/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await handleLogin(body);
  if (!result.identity) {
    return NextResponse.json(result.body, { status: result.status });
  }
  await setSession(result.identity.id);
  // The identity carries no PIN or hash.
  return NextResponse.json({ identity: result.identity });
}
