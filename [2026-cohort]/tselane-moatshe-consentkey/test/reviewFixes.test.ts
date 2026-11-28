/**
 * Tests for the PR #2 review fixes requested by Tselane on 15 Nov.
 *
 * Each test names the review point it covers so the next reviewer can match
 * them to the thread.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { AuditLog } from "../src/audit/auditLog.js";
import { entriesForFamily, isVisibleToFamily } from "../src/audit/visibility.js";
import {
  canApprove,
  requiredRole,
  REASON_MAX_LENGTH,
  roleLabel,
} from "../src/approval/approvalRules.js";
import { VERIFICATION_METHODS } from "../src/consent/model.js";
import {
  NvidiaDraftService,
  NvidiaDraftUnclearError,
} from "../src/ai/nvidiaDraftService.js";

function nimReturning(content: string): NvidiaDraftService {
  return new NvidiaDraftService(
    "test-api-key",
    "test-model",
    async () =>
      new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
        status: 200,
      }),
  );
}

test("review item 3: a parent sees only their own family's audit entries", () => {
  const audit = new AuditLog();
  audit.record("system.seeded", { states: 3 });
  audit.record("consent.change_requested", { parentId: "P-001", learnerId: "L-101" });
  audit.record("consent.change_requested", { parentId: "P-002", learnerId: "L-102" });
  audit.record("request.rejected", { parentId: "P-001", reason: "parent not verified" });

  const mine = entriesForFamily(audit.entries(), {
    parentId: "P-001",
    learnerId: "L-101",
  });

  assert.equal(mine.length, 2);
  assert.ok(mine.every((e) => e.details.parentId === "P-001"));
  // The other family's entry and the school-wide seed event are both withheld.
  assert.ok(!mine.some((e) => e.details.parentId === "P-002"));
  assert.ok(!mine.some((e) => e.event === "system.seeded"));
});

test("review item 3: an entry naming only the learner is still the family's", () => {
  const audit = new AuditLog();
  const entry = audit.record("system.updated", { learnerId: "L-101", system: "Photo and Media Library" });

  assert.equal(isVisibleToFamily(entry, { parentId: "P-999", learnerId: "L-101" }), true);
  assert.equal(isVisibleToFamily(entry, { parentId: "P-999", learnerId: "L-102" }), false);
});

test("review item 3: filtering the view does not weaken chain verification", () => {
  const audit = new AuditLog();
  audit.record("system.seeded", { states: 3 });
  audit.record("consent.change_requested", { parentId: "P-001", learnerId: "L-101" });
  audit.record("consent.change_requested", { parentId: "P-002", learnerId: "L-102" });

  // verify() always runs over the whole chain, never the filtered subset.
  assert.deepEqual(audit.verify(), { ok: true });
  assert.equal(
    entriesForFamily(audit.entries(), { parentId: "P-001", learnerId: "L-101" }).length,
    1,
  );
  assert.equal(audit.entries().length, 3);
});

test("review item 2: demo_login is an allowed verification method", () => {
  // The audit must be able to say "demo login" rather than claim a PIN check
  // that never happened. separate_pin stays for when a real PIN exists.
  assert.ok(VERIFICATION_METHODS.includes("demo_login"));
  assert.ok(VERIFICATION_METHODS.includes("separate_pin"));
});

test("emergency contact: every Contact Details change goes to S-01 (plan phase 1)", () => {
  assert.equal(requiredRole("Contact Details"), "admin_officer");
  assert.equal(requiredRole("Contact Details", "standard"), "admin_officer");
  assert.equal(requiredRole("Contact Details", "emergency_contact"), "admin_officer");
});

test("emergency contact: the queue must carry the context or nobody can approve", () => {
  // The bug this guards: /api/approvals used to call requiredRole(type)
  // without the context, so an emergency-contact request showed as needing
  // nobody and S-01 could not act on it.
  assert.equal(canApprove("S-01", "Contact Details", "emergency_contact"), true);
  assert.equal(canApprove("S-02", "Contact Details", "emergency_contact"), false);
  // Since phase 1 the context no longer decides who may approve.
  assert.equal(canApprove("S-01", "Contact Details"), true);
});

test("role wording names the staff code the team uses", () => {
  assert.match(roleLabel("admin_officer"), /Admin Officer \(S-01\)/);
  assert.match(roleLabel("information_officer"), /Information Officer \(S-02\)/);
  assert.equal(roleLabel(null), "a staff member");
});

test("review item 4: the decline reason has a short, shared limit", () => {
  assert.equal(typeof REASON_MAX_LENGTH, "number");
  assert.ok(REASON_MAX_LENGTH > 0 && REASON_MAX_LENGTH <= 300);
});

test("NVIDIA: an unclear message asks the parent instead of guessing", async () => {
  // Decision 7 in docs/legal-decisions-log.md. The prompt tells the model to
  // return {} rather than guess; that must surface as "ask", not as an error.
  await assert.rejects(
    nimReturning("{}").createDraft("something about the school"),
    NvidiaDraftUnclearError,
  );
});

test("NVIDIA: a clear message becomes a draft the parent can confirm", async () => {
  const draft = await nimReturning(
    '{"type":"Photos","to":"withdrawn","changeContext":"standard","summary":"Withdraw photo consent"}',
  ).createDraft("Please stop using photos of my child");

  assert.equal(draft.type, "Photos");
  assert.equal(draft.to, "withdrawn");
  assert.equal(draft.changeContext, "standard");
  // The draft is data only — nothing here applies a change.
  assert.deepEqual(Object.keys(draft).sort(), [
    "changeContext",
    "summary",
    "to",
    "type",
  ]);
});
