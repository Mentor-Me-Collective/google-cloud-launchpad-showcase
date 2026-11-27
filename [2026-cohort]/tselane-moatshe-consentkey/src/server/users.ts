/**
 * The user store: who can sign in, and the admin actions that change it.
 *
 * Users are persisted through the repo (Firestore when configured). A record
 * holds a salted PIN hash, never a PIN. Every management action (create, reset
 * a PIN, deactivate) is written to the hash-chained audit log with who did it,
 * what and when. The entry never holds a PIN, and never uses the keys the
 * family and staff audit views match on (`parentId`, `learnerId`, `staffId`,
 * `type`), so these entries stay out of those views.
 *
 * Callers must pass the acting `AdminIdentity`. Each management method also
 * re-checks `actor.kind === "admin"`, so a route that forgot its own check
 * still cannot change users.
 */

import { ADMIN_ROLE_LABEL, DEMO_USERS } from "./identities.js";
import type { AdminIdentity, Identity } from "./identities.js";
import { PIN_PATTERN, PinService } from "./pin.js";
import type { PinHash } from "./pin.js";
import type { Repo } from "./repo.js";
import type { AuditLog } from "../audit/auditLog.js";
import type { StaffRole } from "../approval/approvalRules.js";

export type UserKind = "parent" | "staff" | "admin";

/** What is persisted. `pin` is a salted hash. */
export interface UserRecord {
  id: string;
  username: string;
  name: string;
  kind: UserKind;
  active: boolean;
  createdAt: string;
  pin: PinHash;
  // parent
  verified?: boolean;
  parentId?: string;
  learnerId?: string;
  learnerName?: string;
  // staff
  role?: StaffRole;
  staffId?: string;
}

/** What the admin screen may see about a user. No hash. */
export interface UserSummary {
  id: string;
  username: string;
  name: string;
  kind: UserKind;
  roleLabel: string;
  active: boolean;
  createdAt: string;
  verified?: boolean;
  learnerName?: string;
}

export interface LearnerOption {
  learnerId: string;
  learnerName: string;
}

export type Failure = { ok: false; status: number; error: string };
export type UserResult<T = Record<string, never>> = ({ ok: true } & T) | Failure;

export type LoginResult =
  | { ok: true; identity: Identity }
  | { ok: false; locked: boolean; attemptsLeft: number; retryAfterSeconds: number };

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const NAME_MAX_LENGTH = 80;
export const PIN_RULE_TEXT = "The PIN must be 4 to 8 digits.";
export const STAFF_ROLES: readonly StaffRole[] = ["admin_officer", "information_officer"];

const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  admin_officer: "Admin Officer",
  information_officer: "Information Officer",
};
const STAFF_ID_FOR_ROLE: Record<StaffRole, string> = {
  admin_officer: "S-01",
  information_officer: "S-02",
};

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

export function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function fail(status: number, error: string): Failure {
  return { ok: false, status, error };
}

function nextNumber(values: Array<string | undefined>, prefix: string, floor: number): string {
  let max = floor - 1;
  for (const v of values) {
    const m = v && v.startsWith(prefix) ? Number(v.slice(prefix.length)) : NaN;
    if (Number.isInteger(m) && m > max) max = m;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

function newUserId(prefix: string): string {
  // crypto.randomUUID is fine here; ids are opaque and not secret.
  return `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
}

export interface UserServiceHooks {
  /** Called when a user creation introduces a learner the systems have not seen. */
  onNewLearner?: (learnerId: string) => void;
}

export class UserService {
  private readonly users = new Map<string, UserRecord>();
  private readonly byUsername = new Map<string, string>();

  constructor(
    private readonly repo: Repo,
    private readonly audit: AuditLog,
    readonly pins: PinService = new PinService(),
    private readonly hooks: UserServiceHooks = {},
  ) {}

  // ------------------------------------------------------------ loading

  async load(): Promise<void> {
    for (const rec of await this.repo.loadUsers()) this.remember(rec);
  }

  private remember(rec: UserRecord): void {
    this.users.set(rec.id, rec);
    this.byUsername.set(rec.username, rec.id);
    this.pins.loadHash(rec.id, rec.pin);
  }

  // ------------------------------------------------------------ seeding

  /** Seed the demo users that are missing. Returns how many were added. */
  async seedDemoUsers(demoPin: string): Promise<number> {
    let added = 0;
    for (const d of DEMO_USERS) {
      if (this.users.has(d.id) || this.byUsername.has(d.username)) continue;
      const pin = this.pins.setPin(d.id, demoPin);
      const rec: UserRecord =
        d.kind === "parent"
          ? {
              id: d.id,
              username: d.username,
              name: d.name,
              kind: "parent",
              active: true,
              createdAt: new Date().toISOString(),
              pin,
              verified: d.verified,
              parentId: d.parentId,
              learnerId: d.learnerId,
              learnerName: d.learnerName,
            }
          : {
              id: d.id,
              username: d.username,
              name: d.name,
              kind: "staff",
              active: true,
              createdAt: new Date().toISOString(),
              pin,
              role: d.role,
              staffId: d.staffId,
            };
      await this.repo.saveUser(rec);
      this.remember(rec);
      added++;
    }
    if (added > 0) this.audit.record("user.demo_seeded", { count: added });
    return added;
  }

  /**
   * Seed the default System Admin. `env` is passed in so this is testable.
   *
   * The PIN comes from CONSENTKEY_ADMIN_PIN. If it is unset (or malformed) the
   * admin is NOT seeded in a non-dev environment: there is no known default to
   * fall back on. In dev (NODE_ENV not "production") a documented default is
   * allowed so `npm run dev` works with no setup.
   */
  async seedAdmin(
    env: Record<string, string | undefined> = process.env,
  ): Promise<{ seeded: boolean; reason?: string; usedDevDefault?: boolean }> {
    const username = normalizeUsername(env.CONSENTKEY_ADMIN_USER?.trim() || "admin");
    if (!USERNAME_PATTERN.test(username)) {
      return { seeded: false, reason: "CONSENTKEY_ADMIN_USER is not a valid username" };
    }
    // An admin account already exists (earlier boot): never overwrite its PIN.
    if ([...this.users.values()].some((u) => u.kind === "admin")) {
      return { seeded: false, reason: "an admin already exists" };
    }
    if (this.byUsername.has(username)) {
      return { seeded: false, reason: `username "${username}" is already taken by another user` };
    }

    const configured = env.CONSENTKEY_ADMIN_PIN?.trim();
    let pin: string;
    let usedDevDefault = false;
    if (configured) {
      if (!PIN_PATTERN.test(configured)) {
        return { seeded: false, reason: "CONSENTKEY_ADMIN_PIN must be 4 to 8 digits" };
      }
      pin = configured;
    } else if (env.NODE_ENV !== "production") {
      pin = DEV_ADMIN_PIN;
      usedDevDefault = true;
    } else {
      return {
        seeded: false,
        reason: "CONSENTKEY_ADMIN_PIN is not set, and there is no default outside development",
      };
    }

    const id = "admin-default";
    const rec: UserRecord = {
      id,
      username,
      name: "System Admin",
      kind: "admin",
      active: true,
      createdAt: new Date().toISOString(),
      pin: this.pins.setPin(id, pin),
    };
    await this.repo.saveUser(rec);
    this.remember(rec);
    this.audit.record("user.admin_seeded", {
      targetUserId: id,
      targetUsername: username,
      usedDevDefault,
    });
    return { seeded: true, usedDevDefault };
  }

  // ------------------------------------------------------------ sign-in

  authenticate(usernameInput: unknown, pin: unknown): LoginResult {
    const username = normalizeUsername(usernameInput);
    const user = this.users.get(this.byUsername.get(username) ?? "");
    const usable = user !== undefined && user.active;
    // Limits are counted per username, known or not, so the answer does not
    // say whether the account exists. An inactive user is checked against no
    // hash at all, so even the right PIN cannot get in.
    const check = this.pins.verify(`login:${username}`, pin, usable ? user.id : "\u0000none");
    if (check.ok && usable) {
      if (user.kind === "admin") {
        this.audit.record("auth.admin_login", { userId: user.id });
      }
      return { ok: true, identity: this.toIdentity(user) };
    }
    if (user) {
      this.audit.record("auth.login_failed", {
        userId: user.id,
        reason: user.active ? "wrong_pin_or_locked" : "inactive",
      });
    }
    return check.ok
      ? { ok: false, locked: false, attemptsLeft: 0, retryAfterSeconds: 0 }
      : check;
  }

  /** Check a signed-in user's PIN (consent switch, draft confirmation). */
  verifyUserPin(userId: string, pin: unknown) {
    return this.pins.verify(userId, pin);
  }

  // ------------------------------------------------------------ lookup

  /** The identity for a user id. Inactive users have none unless asked for. */
  identityFor(id: string | undefined | null, opts: { includeInactive?: boolean } = {}): Identity | undefined {
    if (!id) return undefined;
    const rec = this.users.get(id);
    if (!rec || (!rec.active && !opts.includeInactive)) return undefined;
    return this.toIdentity(rec);
  }

  private toIdentity(rec: UserRecord): Identity {
    if (rec.kind === "parent") {
      return {
        kind: "parent",
        id: rec.id,
        name: rec.name,
        parentId: rec.parentId!,
        learnerId: rec.learnerId!,
        learnerName: rec.learnerName!,
        verified: rec.verified === true,
      };
    }
    if (rec.kind === "staff") {
      return {
        kind: "staff",
        id: rec.id,
        name: rec.name,
        staffId: rec.staffId!,
        role: rec.role!,
        roleLabel: STAFF_ROLE_LABEL[rec.role!],
      };
    }
    return { kind: "admin", id: rec.id, name: rec.name, roleLabel: ADMIN_ROLE_LABEL };
  }

  parentLearners(): LearnerOption[] {
    const seen = new Map<string, string>();
    for (const u of this.users.values()) {
      if (u.kind === "parent" && u.learnerId && !seen.has(u.learnerId)) {
        seen.set(u.learnerId, u.learnerName ?? u.learnerId);
      }
    }
    return [...seen].map(([learnerId, learnerName]) => ({ learnerId, learnerName }));
  }

  list(): UserSummary[] {
    return [...this.users.values()]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.username.localeCompare(b.username))
      .map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        kind: u.kind,
        roleLabel:
          u.kind === "parent"
            ? "Parent"
            : u.kind === "staff"
              ? STAFF_ROLE_LABEL[u.role!]
              : ADMIN_ROLE_LABEL,
        active: u.active,
        createdAt: u.createdAt,
        ...(u.kind === "parent"
          ? { verified: u.verified === true, learnerName: u.learnerName }
          : {}),
      }));
  }

  // ------------------------------------------------------ admin actions

  private checkActor(actor: AdminIdentity): Failure | undefined {
    if (!actor || actor.kind !== "admin") return fail(403, "Only a System Admin can manage users.");
    return undefined;
  }

  private validateCommon(input: {
    name?: unknown;
    username?: unknown;
    pin?: unknown;
  }): UserResult<{ name: string; username: string; pin: string }> {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name) return fail(400, "Enter the person's full name.");
    if (name.length > NAME_MAX_LENGTH) {
      return fail(400, `Keep the name under ${NAME_MAX_LENGTH} characters.`);
    }
    const username = normalizeUsername(input.username);
    if (!USERNAME_PATTERN.test(username)) {
      return fail(
        400,
        "The username must be 3 to 32 characters: lowercase letters, numbers, dots, dashes or underscores, starting with a letter or number.",
      );
    }
    if (this.byUsername.has(username)) {
      return fail(409, `The username "${username}" is already taken. Choose another.`);
    }
    if (typeof input.pin !== "string" || !PIN_PATTERN.test(input.pin)) {
      return fail(400, PIN_RULE_TEXT);
    }
    return { ok: true, name, username, pin: input.pin };
  }

  async createParent(
    actor: AdminIdentity,
    input: {
      name?: unknown;
      username?: unknown;
      pin?: unknown;
      verified?: unknown;
      learnerId?: unknown;
      learnerName?: unknown;
    },
  ): Promise<UserResult<{ user: UserSummary }>> {
    const denied = this.checkActor(actor);
    if (denied) return denied;
    const common = this.validateCommon(input);
    if (!common.ok) return common;
    if (typeof input.verified !== "boolean") {
      return fail(400, "Say whether the parent's identity has been verified (yes or no).");
    }

    // Link to an existing learner, or create a new one from a name.
    let learnerId: string;
    let learnerName: string;
    let newLearner = false;
    const existing = typeof input.learnerId === "string" ? input.learnerId.trim() : "";
    if (existing) {
      const match = this.parentLearners().find((l) => l.learnerId === existing);
      if (!match) return fail(400, "That learner was not found. Pick one from the list, or add a new learner.");
      learnerId = match.learnerId;
      learnerName = match.learnerName;
    } else {
      const ln = typeof input.learnerName === "string" ? input.learnerName.trim() : "";
      if (!ln) return fail(400, "Pick the learner this parent is linked to, or enter the new learner's name.");
      if (ln.length > NAME_MAX_LENGTH) {
        return fail(400, `Keep the learner's name under ${NAME_MAX_LENGTH} characters.`);
      }
      learnerId = nextNumber(
        [...this.users.values()].map((u) => u.learnerId).concat(["L-100"]),
        "L-",
        101,
      );
      learnerName = ln;
      newLearner = true;
    }

    const id = newUserId("parent");
    const parentId = nextNumber(
      [...this.users.values()].map((u) => u.parentId),
      "P-",
      10,
    );
    const rec: UserRecord = {
      id,
      username: common.username,
      name: common.name,
      kind: "parent",
      active: true,
      createdAt: new Date().toISOString(),
      pin: this.pins.setPin(id, common.pin),
      verified: input.verified,
      parentId,
      learnerId,
      learnerName,
    };
    await this.persistOrRollback(rec);
    if (newLearner) this.hooks.onNewLearner?.(learnerId);
    this.audit.record("user.created", {
      ...this.who(actor),
      targetUserId: id,
      targetUsername: rec.username,
      targetKind: "parent",
      verified: rec.verified,
      linkedLearner: learnerId,
      newLearner,
    });
    return { ok: true, user: this.summary(rec) };
  }

  async createStaff(
    actor: AdminIdentity,
    input: { name?: unknown; username?: unknown; pin?: unknown; role?: unknown },
  ): Promise<UserResult<{ user: UserSummary }>> {
    const denied = this.checkActor(actor);
    if (denied) return denied;
    const common = this.validateCommon(input);
    if (!common.ok) return common;
    if (!isStaffRole(input.role)) {
      return fail(400, "Choose a role: Admin Officer (S-01) or Information Officer (S-02).");
    }
    const role = input.role;
    const id = newUserId("staff");
    const rec: UserRecord = {
      id,
      username: common.username,
      name: common.name,
      kind: "staff",
      active: true,
      createdAt: new Date().toISOString(),
      pin: this.pins.setPin(id, common.pin),
      role,
      staffId: STAFF_ID_FOR_ROLE[role],
    };
    await this.persistOrRollback(rec);
    this.audit.record("user.created", {
      ...this.who(actor),
      targetUserId: id,
      targetUsername: rec.username,
      targetKind: "staff",
      targetRole: role,
    });
    return { ok: true, user: this.summary(rec) };
  }

  async resetPin(
    actor: AdminIdentity,
    input: { userId?: unknown; pin?: unknown },
  ): Promise<UserResult<{ user: UserSummary }>> {
    const denied = this.checkActor(actor);
    if (denied) return denied;
    const rec = typeof input.userId === "string" ? this.users.get(input.userId) : undefined;
    if (!rec) return fail(404, "That user was not found.");
    if (!rec.active) return fail(409, "That user is deactivated. A PIN cannot be reset for them.");
    if (typeof input.pin !== "string" || !PIN_PATTERN.test(input.pin)) {
      return fail(400, PIN_RULE_TEXT);
    }
    const previous = rec.pin;
    const pin = this.pins.setPin(rec.id, input.pin);
    const updated: UserRecord = { ...rec, pin };
    try {
      await this.repo.saveUser(updated);
    } catch (err) {
      this.pins.loadHash(rec.id, previous);
      throw err;
    }
    this.users.set(rec.id, updated);
    // A locked-out user gets a fresh start with the new PIN.
    this.pins.unlock(`login:${rec.username}`);
    this.audit.record("user.pin_reset", {
      ...this.who(actor),
      targetUserId: rec.id,
      targetUsername: rec.username,
    });
    return { ok: true, user: this.summary(updated) };
  }

  async deactivate(
    actor: AdminIdentity,
    input: { userId?: unknown },
  ): Promise<UserResult<{ user: UserSummary }>> {
    const denied = this.checkActor(actor);
    if (denied) return denied;
    const rec = typeof input.userId === "string" ? this.users.get(input.userId) : undefined;
    if (!rec) return fail(404, "That user was not found.");
    if (rec.id === actor.id) return fail(409, "You cannot deactivate your own account.");
    if (!rec.active) return fail(409, "That user is already deactivated.");
    const updated: UserRecord = { ...rec, active: false };
    await this.repo.saveUser(updated);
    this.users.set(rec.id, updated);
    this.audit.record("user.deactivated", {
      ...this.who(actor),
      targetUserId: rec.id,
      targetUsername: rec.username,
      targetKind: rec.kind,
    });
    return { ok: true, user: this.summary(updated) };
  }

  // ------------------------------------------------------------ helpers

  private who(actor: AdminIdentity): Record<string, unknown> {
    return { actorId: actor.id, actorName: actor.name };
  }

  private summary(rec: UserRecord): UserSummary {
    return this.list().find((u) => u.id === rec.id)!;
  }

  private async persistOrRollback(rec: UserRecord): Promise<void> {
    try {
      await this.repo.saveUser(rec);
    } catch (err) {
      this.pins.clear(rec.id);
      throw err;
    }
    this.remember(rec);
  }
}

/**
 * Admin PIN used only when CONSENTKEY_ADMIN_PIN is unset in development
 * (NODE_ENV is not "production"). Documented in docs/RUNNING.md. Never used
 * in production.
 */
export const DEV_ADMIN_PIN = "135790";
