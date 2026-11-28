/**
 * Real users, PIN on consent switches, and the System Admin role.
 *
 * These run against the real app singleton (in memory, no Firestore) through
 * the same handler functions the API routes call.
 */

// Set before the app is created. No Firestore, a known admin PIN, default demo PIN.
for (const k of [
  "FIRESTORE_EMULATOR_HOST",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_CLOUD_PROJECT",
  "FIRESTORE_PROJECT_ID",
  "GCLOUD_PROJECT",
  "CONSENTKEY_DEMO_PIN",
  "CONSENTKEY_SEED_DEMO",
  "CONSENTKEY_ADMIN_USER",
]) {
  delete process.env[k];
}
process.env.CONSENTKEY_DEMO_PIN = "0000";
process.env.CONSENTKEY_ADMIN_PIN = "00000";

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adminCreateParent,
  adminCreateStaff,
  adminDeactivate,
  adminOverview,
  adminResetPin,
} from "../src/server/adminApi.js";
import { getApp } from "../src/server/appSchool.js";
import { handleConsentChange, handleLogin } from "../src/server/handlers.js";
import { refuseAdminAudit, requireAdmin, requireStaff } from "../src/server/guards.js";
import { getSessionStore } from "../src/server/sessions.js";
import { UserService } from "../src/server/users.js";
import { PermissionDeniedError } from "../src/connector/consentConnector.js";
import { canApprove } from "../src/approval/approvalRules.js";
import type { Identity } from "../src/server/identities.js";
import type { Repo } from "../src/server/repo.js";
import { AuditLog } from "../src/audit/auditLog.js";

const DEMO_PIN = "0000";
const ADMIN_PIN = "00000";

async function who(id: string): Promise<Identity> {
  const app = await getApp();
  const i = app.users.identityFor(id);
  assert.ok(i, `${id} should exist`);
  return i;
}

async function admin(): Promise<Identity> {
  return who("admin-default");
}

async function login(username: string, pin: string) {
  return handleLogin({ username, pin });
}

// ------------------------------------------------------------ sign-in

test("demo users are seeded and sign in with username and the demo PIN", async () => {
  const r = await login("amara", DEMO_PIN);
  assert.equal(r.status, 200);
  assert.equal(r.identity?.kind, "parent");
  const s = await login("naledi", DEMO_PIN);
  assert.equal(s.identity?.kind, "staff");
  // Usernames are not case sensitive.
  assert.equal((await login("  AMARA ", DEMO_PIN)).status, 200);
});

test("the default admin is seeded from the environment and signs in", async () => {
  const r = await login("admin", ADMIN_PIN);
  assert.equal(r.status, 200);
  assert.equal(r.identity?.kind, "admin");
  assert.equal(r.identity?.roleLabel, "System Admin");
});

test("an identity never carries a PIN or hash", async () => {
  const r = await login("amara", DEMO_PIN);
  const text = JSON.stringify(r.body);
  assert.doesNotMatch(text, /pin|hash|salt/i);
  const app = await getApp();
  assert.doesNotMatch(JSON.stringify(app.users.list()), /pin|hash|salt/i);
});

test("wrong PIN, unknown user and missing fields all get the same refusal", async () => {
  const wrong = await login("ben", "1111");
  const unknown = await login("nobody-here", "1111");
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.body, unknown.body);
  assert.equal((await handleLogin({})).status, 400);
});

test("login is locked after repeated wrong PINs, even for the right PIN", async () => {
  for (let i = 0; i < 4; i++) assert.equal((await login("chen", "1111")).status, 401);
  const fifth = await login("chen", "1111");
  assert.equal(fifth.status, 429);
  assert.equal((await login("chen", DEMO_PIN)).status, 429);
  // An unknown name is limited the same way, so it does not reveal existence.
  for (let i = 0; i < 4; i++) await login("ghost", "0000");
  assert.equal((await login("ghost", "0000")).status, 429);
});

// ------------------------------------------------- PIN on direct switches

test("a consent switch without a PIN is refused and nothing changes", async () => {
  const app = await getApp();
  const amara = await who("parent-amara");
  assert.equal(amara.kind, "parent");
  const before = app.connector.getState("L-101", "Photos");
  for (const body of [
    { type: "Photos", to: "withdrawn" },
    { type: "Photos", to: "withdrawn", pin: "" },
    { type: "Photos", to: "withdrawn", pin: "12" },
    { type: "Photos", to: "withdrawn", pin: 0000 },
  ]) {
    const r = await handleConsentChange(amara, body);
    assert.equal(r.status, 400, JSON.stringify(body));
  }
  assert.equal(app.connector.getState("L-101", "Photos"), before);
});

test("a wrong PIN on a switch is rejected, audited without the PIN, and nothing changes", async () => {
  const app = await getApp();
  const amara = await who("parent-amara");
  const before = app.connector.getState("L-101", "Photos");
  const r = await handleConsentChange(amara, { type: "Photos", to: "withdrawn", pin: "1111" });
  assert.equal(r.status, 403);
  assert.equal(app.connector.getState("L-101", "Photos"), before);
  const failed = app.audit.entries().filter((e) => e.event === "consent.pin_failed");
  assert.ok(failed.length >= 1);
  assert.doesNotMatch(JSON.stringify(app.audit.entries()), /1111/);
  assert.doesNotMatch(JSON.stringify(r.body), /1111/);
});

test("repeated wrong PINs on switches lock the parent out", async () => {
  const app = await getApp();
  const ben = await who("parent-ben");
  let last = 0;
  for (let i = 0; i < 5; i++) {
    last = (await handleConsentChange(ben, { type: "Photos", to: "granted", pin: "0001" })).status;
  }
  assert.equal(last, 429);
  const r = await handleConsentChange(ben, { type: "Photos", to: "granted", pin: DEMO_PIN });
  assert.equal(r.status, 429);
  assert.equal(app.connector.getState("L-102", "Photos"), "not_set");
});

test("the right PIN applies a no-approval change, recorded as a separate PIN", async () => {
  const app = await getApp();
  const amara = await who("parent-amara");
  const r = await handleConsentChange(amara, { type: "Photos", to: "withdrawn", pin: DEMO_PIN });
  assert.equal(r.status, 200);
  assert.equal(app.connector.getState("L-101", "Photos"), "withdrawn");
  const entry = app.audit
    .entries()
    .filter((e) => e.details.parentId === "P-001" && e.details.type === "Photos" && e.details.verificationMethod)
    .at(-1);
  assert.equal(entry?.details.verificationMethod, "separate_pin");
  assert.doesNotMatch(JSON.stringify(app.audit.entries()), new RegExp(`"pin"`));
});

test("a sensitive change with the right PIN is queued, never auto-approved", async () => {
  const app = await getApp();
  const amara = await who("parent-amara");
  const r = await handleConsentChange(amara, { type: "School Trips", to: "granted", pin: DEMO_PIN });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "pending_approval");
  assert.equal(app.connector.getState("L-101", "School Trips"), "not_set");
  assert.equal([...app.pending.values()].filter((p) => p.request.learnerId === "L-101").length, 1);
});

test("a parent who is not verified is still refused after a correct PIN", async () => {
  const dumi = await who("parent-unverified");
  const r = await handleConsentChange(dumi, { type: "Photos", to: "granted", pin: DEMO_PIN });
  assert.equal(r.status, 403);
});

test("staff and admin cannot use the parent switch endpoint", async () => {
  for (const id of ["staff-admin", "admin-default"]) {
    const r = await handleConsentChange(await who(id), { type: "Photos", to: "granted", pin: DEMO_PIN });
    assert.equal(r.status, 401);
  }
  assert.equal((await handleConsentChange(undefined, { type: "Photos", to: "granted", pin: DEMO_PIN })).status, 401);
});

// ------------------------------------------------------------ admin

test("an admin can create a parent who can then sign in and change consent", async () => {
  const a = await admin();
  const created = await adminCreateParent(a, {
    name: "Lerato Mokoena",
    username: "Lerato",
    pin: "73918246",
    verified: true,
    learnerName: "Thabo Mokoena",
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.doesNotMatch(JSON.stringify(created.body), /73918246/);

  const l = await login("lerato", "73918246");
  assert.equal(l.status, 200);
  assert.equal(l.identity?.kind, "parent");
  if (l.identity?.kind !== "parent") return;
  assert.equal(l.identity.learnerName, "Thabo Mokoena");
  assert.equal(l.identity.verified, true);
  assert.match(l.identity.learnerId, /^L-\d{3}$/);

  const app = await getApp();
  const r = await handleConsentChange(l.identity, { type: "Photos", to: "granted", pin: "73918246" });
  assert.equal(r.status, 200);
  assert.equal(app.connector.getState(l.identity.learnerId, "Photos"), "granted");
  // The wrong PIN does not work for this user.
  assert.equal((await handleConsentChange(l.identity, { type: "Photos", to: "withdrawn", pin: DEMO_PIN })).status, 403);
});

test("a second parent can be linked to an existing learner", async () => {
  const a = await admin();
  const app = await getApp();
  const learner = app.users.parentLearners().find((x) => x.learnerName === "Zola Okafor");
  assert.ok(learner);
  const r = await adminCreateParent(a, {
    name: "Femi Okafor",
    username: "femi.okafor",
    pin: "4455",
    verified: false,
    learnerId: learner.learnerId,
  });
  assert.equal(r.status, 201);
  const who2 = (await login("femi.okafor", "4455")).identity;
  assert.equal(who2?.kind === "parent" && who2.learnerId, learner.learnerId);
  assert.equal(who2?.kind === "parent" && who2.verified, false);
});

test("an admin can create staff in either approval role, who can then decide", async () => {
  const a = await admin();
  const r = await adminCreateStaff(a, {
    name: "Pieter Smit",
    username: "pieter",
    pin: "6060",
    role: "information_officer",
  });
  assert.equal(r.status, 201);
  const l = await login("pieter", "6060");
  assert.equal(l.identity?.kind, "staff");
  if (l.identity?.kind !== "staff") return;
  assert.equal(l.identity.staffId, "S-02");
  assert.equal(canApprove(l.identity.staffId, "Medical"), true);
  assert.equal(canApprove(l.identity.staffId, "School Trips"), false);
  assert.equal((await adminCreateStaff(a, { name: "X Y", username: "xy1", pin: "6060", role: "admin" })).status, 400);
});

test("user creation validates names, usernames, PINs and uniqueness", async () => {
  const a = await admin();
  const ok = { name: "Test Person", username: "testperson", pin: "1234", role: "admin_officer" };
  assert.equal((await adminCreateStaff(a, { ...ok, name: "  " })).status, 400);
  assert.equal((await adminCreateStaff(a, { ...ok, username: "a" })).status, 400);
  assert.equal((await adminCreateStaff(a, { ...ok, username: "has space" })).status, 400);
  for (const pin of ["123", "123456789", "12a4", "", undefined, 1234]) {
    assert.equal((await adminCreateStaff(a, { ...ok, pin })).status, 400, String(pin));
  }
  assert.equal((await adminCreateStaff(a, ok)).status, 201);
  // Same username again, in any case, and a demo username.
  assert.equal((await adminCreateStaff(a, { ...ok, username: "TESTPERSON" })).status, 409);
  assert.equal((await adminCreateStaff(a, { ...ok, username: "amara" })).status, 409);
  // Parent: needs the verified flag and a learner.
  assert.equal((await adminCreateParent(a, { name: "P Q", username: "pq1", pin: "1234", learnerName: "L" })).status, 400);
  assert.equal((await adminCreateParent(a, { name: "P Q", username: "pq1", pin: "1234", verified: true })).status, 400);
  assert.equal((await adminCreateParent(a, { name: "P Q", username: "pq1", pin: "1234", verified: true, learnerId: "L-999" })).status, 400);
});

test("only an admin passes the admin routes; everyone else is refused", async () => {
  const app = await getApp();
  const before = app.users.list().length;
  const callers: Array<[string, Identity | undefined, number]> = [
    ["no session", undefined, 401],
    ["parent", await who("parent-amara"), 403],
    ["admin officer", await who("staff-admin"), 403],
    ["information officer", await who("staff-info"), 403],
  ];
  for (const [label, identity, status] of callers) {
    const body = { name: "Sneaky Person", username: "sneaky", pin: "1234", role: "admin_officer", verified: true, learnerName: "X", userId: "parent-amara" };
    for (const [route, call] of [
      ["overview", () => adminOverview(identity)],
      ["create parent", () => adminCreateParent(identity, body)],
      ["create staff", () => adminCreateStaff(identity, body)],
      ["reset pin", () => adminResetPin(identity, body)],
      ["deactivate", () => adminDeactivate(identity, body)],
    ] as const) {
      const r = await call();
      assert.equal(r.status, status, `${label} / ${route}`);
    }
    assert.equal(requireAdmin(identity)?.status, status, label);
  }
  assert.equal(app.users.list().length, before);
  // Nothing was changed for the targeted user: their PIN still works.
  assert.equal((await login("amara", DEMO_PIN)).status, 200);
  // The service itself refuses a non-admin actor even if a route forgot to.
  const rogue = await app.users.createStaff(
    (await who("staff-admin")) as never,
    { name: "Sneaky Person", username: "sneaky", pin: "1234", role: "admin_officer" },
  );
  assert.equal(rogue.ok, false);
});

test("a System Admin cannot decide approvals or read consent history", async () => {
  const app = await getApp();
  const a = await admin();
  assert.equal(a.kind, "admin");
  assert.equal(requireStaff(a)?.status, 403);
  assert.equal(requireStaff(await who("staff-admin")), null);
  assert.equal(requireStaff(undefined)?.status, 401);
  assert.equal(refuseAdminAudit(a)?.status, 403);
  assert.equal(refuseAdminAudit(await who("staff-admin")), null);

  // Even if a decision reached the connector in the admin's name, it is refused.
  const pending = [...app.pending.values()].find((p) => p.request.type === "School Trips");
  assert.ok(pending, "a School Trips request should be waiting from the earlier test");
  for (const staffId of [a.id, "admin", "ADMIN", ""]) {
    assert.throws(
      () => app.connector.process(pending.request, { staffId, approved: true }),
      PermissionDeniedError,
    );
  }
  assert.equal(app.connector.getState(pending.request.learnerId, "School Trips"), "not_set");
  assert.equal(canApprove(a.id, "School Trips"), false);
  assert.equal(canApprove(a.id, "Medical"), false);
  // The admin overview never carries consent details.
  const overview = await adminOverview(a);
  assert.doesNotMatch(JSON.stringify(overview.body), /Medical|School Trips|Photos/);
});

test("resetting a PIN replaces it, signs the user out and clears a lockout", async () => {
  const a = await admin();
  const app = await getApp();
  // chen was locked out earlier in this file.
  assert.equal((await login("chen", DEMO_PIN)).status, 429);
  const chen = app.users.list().find((u) => u.username === "chen");
  assert.ok(chen);
  const token = getSessionStore().create(chen.id);
  assert.equal(getSessionStore().userIdFor(token), chen.id);

  assert.equal((await adminResetPin(a, { userId: chen.id, pin: "12" })).status, 400);
  const r = await adminResetPin(a, { userId: chen.id, pin: "86420137" });
  assert.equal(r.status, 200);
  assert.doesNotMatch(JSON.stringify(r.body), /86420137/);
  assert.equal(getSessionStore().userIdFor(token), undefined);
  assert.equal((await login("chen", DEMO_PIN)).status, 401);
  assert.equal((await login("chen", "86420137")).status, 200);
  assert.equal((await adminResetPin(a, { userId: "no-such-user", pin: "1234" })).status, 404);
});

test("a deactivated user cannot sign in, and their session stops working", async () => {
  const a = await admin();
  const app = await getApp();
  await adminCreateParent(a, { name: "Gone Soon", username: "gonesoon", pin: "5050", verified: true, learnerName: "Child G" });
  const u = app.users.list().find((x) => x.username === "gonesoon");
  assert.ok(u);
  assert.equal((await login("gonesoon", "5050")).status, 200);
  const token = getSessionStore().create(u.id);

  assert.equal((await adminDeactivate(a, { userId: u.id })).status, 200);
  const after = await login("gonesoon", "5050");
  assert.equal(after.status, 401);
  assert.equal(after.identity, undefined);
  assert.equal(getSessionStore().userIdFor(token), undefined);
  assert.equal(app.users.identityFor(u.id), undefined);
  // Deactivating again, resetting their PIN, and self-deactivation are refused.
  assert.equal((await adminDeactivate(a, { userId: u.id })).status, 409);
  assert.equal((await adminResetPin(a, { userId: u.id, pin: "1234" })).status, 409);
  assert.equal((await adminDeactivate(a, { userId: a.id })).status, 409);
  // Still listed, now inactive.
  assert.equal(app.users.list().find((x) => x.id === u.id)?.active, false);
});

test("the audit chain verifies after admin actions, with who/what/when and no PIN", async () => {
  const app = await getApp();
  const a = await admin();
  await adminCreateStaff(a, { name: "Audit Check", username: "auditcheck", pin: "12345678", role: "admin_officer" });
  const target = app.users.list().find((u) => u.username === "auditcheck");
  assert.ok(target);
  await adminResetPin(a, { userId: target.id, pin: "12345678" });
  await adminDeactivate(a, { userId: target.id });

  const v = app.audit.verify();
  assert.equal(v.ok, true);

  const events = app.audit.entries().filter((e) => e.event.startsWith("user."));
  for (const name of ["user.created", "user.pin_reset", "user.deactivated"]) {
    const e = events.filter((x) => x.event === name).at(-1);
    assert.ok(e, name);
    assert.equal(e.details.actorId, a.id);
    assert.equal(e.details.targetUsername, "auditcheck");
    assert.ok(Date.parse(e.timestamp) > 0);
    assert.equal(e.details.pin, undefined);
  }
  const whole = JSON.stringify(app.audit.entries());
  for (const pin of ["24681357", "13572468", "73918246", "86420137", "97531", "5050", "12345678"]) {
    assert.equal(whole.includes(`"${pin}"`), false, pin);
    assert.equal(whole.includes(pin), false, pin);
  }
  // User-management entries do not appear in a family's or staff member's view.
  const { entriesForFamily, entriesForStaff } = await import("../src/audit/visibility.js");
  assert.equal(entriesForFamily(app.audit.entries(), { parentId: "P-001", learnerId: "L-101" }).some((e) => e.event.startsWith("user.")), false);
  assert.equal(entriesForStaff(app.audit.entries(), { staffId: "S-01", role: "admin_officer" }).some((e) => e.event.startsWith("user.")), false);
  // The admin overview lists the activity and reports the chain as intact.
  const overview = await adminOverview(a);
  const body = overview.body as { chain: { valid: boolean }; activity: Array<{ text: string }> };
  assert.equal(body.chain.valid, true);
  assert.ok(body.activity.some((x) => /deactivated auditcheck/.test(x.text)));
});

// ------------------------------------------------------- admin seeding

function memoryRepo(saved: unknown[] = []): Repo {
  return {
    enabled: false,
    loadAudit: async () => [],
    appendAudit: async () => {},
    loadConsent: async () => [],
    saveConsent: async () => {},
    loadPending: async () => [],
    savePending: async () => {},
    deletePending: async () => {},
    loadUsers: async () => [],
    saveUser: async (u) => {
      saved.push(JSON.parse(JSON.stringify(u)));
    },
  };
}

test("admin seeding refuses to run without CONSENTKEY_ADMIN_PIN", async () => {
  const svc = new UserService(memoryRepo(), new AuditLog());

  const r = await svc.seedAdmin({ NODE_ENV: "production" });

  assert.equal(r.seeded, false);
  assert.match(r.reason ?? "", /CONSENTKEY_ADMIN_PIN/);
  assert.equal(svc.list().length, 0);
});

test("admin seeding requires a valid configured PIN in development", async () => {
  const dev = new UserService(memoryRepo(), new AuditLog());

  const missing = await dev.seedAdmin({ NODE_ENV: "development" });
  assert.equal(missing.seeded, false);
  assert.match(missing.reason ?? "", /CONSENTKEY_ADMIN_PIN/);

  const bad = new UserService(memoryRepo(), new AuditLog());
  const invalid = await bad.seedAdmin({
    NODE_ENV: "development",
    CONSENTKEY_ADMIN_PIN: "abc",
  });
  assert.equal(invalid.seeded, false);
  assert.equal(bad.list().length, 0);

  const valid = new UserService(memoryRepo(), new AuditLog());
  const result = await valid.seedAdmin({
    NODE_ENV: "development",
    CONSENTKEY_ADMIN_PIN: "246810",
  });
  assert.deepEqual(result, { seeded: true });
  assert.equal(valid.authenticate("admin", "246810").ok, true);
});

test("a configured admin PIN and username are used, hashed in storage, and not re-seeded", async () => {
  const saved: unknown[] = [];
  const svc = new UserService(memoryRepo(saved), new AuditLog());
  const env = { NODE_ENV: "production", CONSENTKEY_ADMIN_USER: "Head.Office", CONSENTKEY_ADMIN_PIN: "80808080" };
  assert.equal((await svc.seedAdmin(env)).seeded, true);
  assert.equal(svc.authenticate("head.office", "80808080").ok, true);
  assert.equal(svc.authenticate("admin", "80808080").ok, false);
  // What reached the repo holds a salted hash, not the PIN.
  assert.equal(saved.length, 1);
  assert.equal(JSON.stringify(saved).includes("80808080"), false);
  assert.match(JSON.stringify(saved), /"salt":"[0-9a-f]{32}"/);
  // A second boot never replaces an existing admin's PIN.
  assert.deepEqual(await svc.seedAdmin({ ...env, CONSENTKEY_ADMIN_PIN: "11112222" }), {
    seeded: false,
    reason: "an admin already exists",
  });
  assert.equal(svc.authenticate("head.office", "80808080").ok, true);
});

test("users survive a restart: a new service loads them from the repo and PINs still work", async () => {
  const store: unknown[] = [];
  const repo = memoryRepo(store);
  const svc = new UserService(repo, new AuditLog());
  await svc.seedAdmin({ NODE_ENV: "production", CONSENTKEY_ADMIN_PIN: "80808080" });
  const a = svc.identityFor("admin-default");
  assert.equal(a?.kind, "admin");
  if (a?.kind !== "admin") return;
  await svc.createStaff(a, { name: "Kept Person", username: "kept", pin: "3333", role: "admin_officer" });
  await svc.resetPin(a, { userId: svc.list().find((u) => u.username === "kept")!.id, pin: "4444" });

  // Last write per id wins, as in Firestore.
  const byId = new Map<string, unknown>();
  for (const u of store as Array<{ id: string }>) byId.set(u.id, u);
  const reloaded = new UserService({ ...repo, loadUsers: async () => [...byId.values()] as never }, new AuditLog());
  await reloaded.load();
  assert.equal(reloaded.authenticate("kept", "4444").ok, true);
  assert.equal(reloaded.authenticate("kept", "3333").ok, false);
  assert.equal(reloaded.authenticate("admin", "80808080").ok, true);
});