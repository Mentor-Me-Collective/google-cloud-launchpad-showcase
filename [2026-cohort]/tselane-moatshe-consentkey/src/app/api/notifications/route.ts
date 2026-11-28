import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/server/auth";
import { getApp, runEscalationCheck } from "@/server/appSchool";
import { escalationConfigFromEnv } from "@/approval/escalation";
import {
  parentNotifications,
  staffNotifications,
  readStore,
} from "@/notifications/notifications";
import type { Identity } from "@/server/identities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function userKey(identity: Identity): string | null {
  if (identity.kind === "parent") return `parent:${identity.parentId}`;
  if (identity.kind === "staff") return `staff:${identity.staffId}`;
  return null;
}

async function compute(identity: Identity) {
  const key = userKey(identity);
  if (!key) return null;
  const app = await getApp();
  runEscalationCheck(app);
  const all = [...app.audit.entries()];
  const items =
    identity.kind === "parent"
      ? parentNotifications(all, {
          parentId: identity.parentId,
          learnerId: identity.learnerId,
        })
      : identity.kind === "staff"
        ? staffNotifications(
            all,
            { staffId: identity.staffId, role: identity.role },
            new Date(),
            escalationConfigFromEnv().holidays,
          )
        : [];
  return { key, notifications: readStore.apply(key, items) };
}

/** Own notifications only. In-app only: no email or SMS. */
export async function GET() {
  const identity = await getCurrentIdentity();
  if (!identity) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const result = await compute(identity);
  if (!result) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json({
    notifications: result.notifications,
    unread: result.notifications.filter((n) => !n.read).length,
  });
}

/** Body: { ids: string[] } or { all: true }. Marks the caller's own only. */
export async function POST(req: Request) {
  const identity = await getCurrentIdentity();
  if (!identity) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const result = await compute(identity);
  if (!result) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  let body: { ids?: unknown; all?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const own = new Set(result.notifications.map((n) => n.id));
  const ids =
    body.all === true
      ? [...own]
      : Array.isArray(body.ids)
        ? body.ids.filter((i): i is string => typeof i === "string" && own.has(i))
        : [];
  readStore.markRead(result.key, ids);
  return NextResponse.json({ marked: ids.length });
}
