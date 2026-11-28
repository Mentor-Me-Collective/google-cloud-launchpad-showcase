/**
 * Logic behind the /api/admin/* routes. Each function takes the signed-in
 * identity and re-checks it is a System Admin before touching anything, so a
 * route cannot skip the role check. No function here ever returns a PIN or a
 * PIN hash.
 */

import { getApp } from "./appSchool.js";
import { requireAdmin } from "./guards.js";
import { getSessionStore } from "./sessions.js";
import type { SubmitReply } from "./submitChange.js";
import type { AdminIdentity, Identity } from "./identities.js";
import type { AuditEntry } from "../audit/auditLog.js";

const ACTIVITY_LIMIT = 30;

function refuse(identity: Identity | undefined): SubmitReply | AdminIdentity {
  const refusal = requireAdmin(identity);
  if (refusal) return { status: refusal.status, body: { error: refusal.error } };
  return identity as AdminIdentity;
}

function isReply(x: SubmitReply | AdminIdentity): x is SubmitReply {
  return "status" in x && "body" in x;
}

/** Plain-language line for a user-management audit entry. */
export function describeAdminEntry(e: AuditEntry): string {
  const d = e.details as Record<string, unknown>;
  const by = typeof d.actorName === "string" ? d.actorName : "The system";
  const who = typeof d.targetUsername === "string" ? d.targetUsername : "a user";
  switch (e.event) {
    case "user.created":
      return `${by} created ${d.targetKind === "staff" ? "a staff user" : "a parent"}: ${who}`;
    case "user.pin_reset":
      return `${by} reset the PIN for ${who}`;
    case "user.deactivated":
      return `${by} deactivated ${who}`;
    case "user.admin_seeded":
      return `The default System Admin (${who}) was created`;
    case "user.demo_seeded":
      return "Demo users were created";
    case "auth.admin_login":
      return "A System Admin signed in";
    default:
      return e.event;
  }
}

export async function adminOverview(identity: Identity | undefined): Promise<SubmitReply> {
  const who = refuse(identity);
  if (isReply(who)) return who;
  const app = await getApp();
  const activity = app.audit
    .entries()
    .filter((e) => e.event.startsWith("user.") || e.event === "auth.admin_login")
    .slice(-ACTIVITY_LIMIT)
    .reverse()
    .map((e) => ({ index: e.index, timestamp: e.timestamp, text: describeAdminEntry(e) }));
  return {
    status: 200,
    body: {
      users: app.users.list(),
      learners: app.users.parentLearners(),
      activity,
      chain: { valid: app.audit.verify().ok, length: app.audit.entries().length },
    },
  };
}

type Body = Record<string, unknown>;

export async function adminCreateParent(
  identity: Identity | undefined,
  body: Body,
): Promise<SubmitReply> {
  const who = refuse(identity);
  if (isReply(who)) return who;
  const app = await getApp();
  const r = await app.users.createParent(who, body);
  return r.ok
    ? { status: 201, body: { user: r.user, message: `Parent account created for ${r.user.name}.` } }
    : { status: r.status, body: { error: r.error } };
}

export async function adminCreateStaff(
  identity: Identity | undefined,
  body: Body,
): Promise<SubmitReply> {
  const who = refuse(identity);
  if (isReply(who)) return who;
  const app = await getApp();
  const r = await app.users.createStaff(who, body);
  return r.ok
    ? { status: 201, body: { user: r.user, message: `Staff account created for ${r.user.name}.` } }
    : { status: r.status, body: { error: r.error } };
}

export async function adminResetPin(
  identity: Identity | undefined,
  body: Body,
): Promise<SubmitReply> {
  const who = refuse(identity);
  if (isReply(who)) return who;
  const app = await getApp();
  const r = await app.users.resetPin(who, { userId: body.userId, pin: body.pin });
  if (!r.ok) return { status: r.status, body: { error: r.error } };
  // Anyone signed in with the old PIN is signed out.
  getSessionStore().revokeUser(r.user.id);
  return { status: 200, body: { user: r.user, message: `PIN reset for ${r.user.name}. Give them the new PIN in person.` } };
}

export async function adminDeactivate(
  identity: Identity | undefined,
  body: Body,
): Promise<SubmitReply> {
  const who = refuse(identity);
  if (isReply(who)) return who;
  const app = await getApp();
  const r = await app.users.deactivate(who, { userId: body.userId });
  if (!r.ok) return { status: r.status, body: { error: r.error } };
  getSessionStore().revokeUser(r.user.id);
  return { status: 200, body: { user: r.user, message: `${r.user.name} is deactivated and can no longer sign in.` } };
}
