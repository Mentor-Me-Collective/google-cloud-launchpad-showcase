/**
 * Identity types and the seeded demo users.
 *
 * Real sign-in is by username + PIN against the user store in `users.ts`. The
 * people below are the demo identities that existed before real users: they are
 * seeded into the user store on first boot (PIN from CONSENTKEY_DEMO_PIN) so
 * the demo and the tests keep working. Each parent is bound to one learner and
 * carries a `verified` flag so the "unverified parent is rejected" path stays
 * demonstrable. Staff map to the two approval roles the connector enforces.
 *
 * An identity is what the rest of the app and the browser see. It never holds
 * a PIN or a PIN hash.
 */

import type { ConsentState, ConsentType, LearnerId } from "../consent/model.js";
import type { StaffRole } from "../approval/approvalRules.js";

export type ParentIdentity = {
  readonly kind: "parent";
  readonly id: string;
  readonly name: string;
  readonly parentId: string;
  readonly learnerId: LearnerId;
  readonly learnerName: string;
  readonly verified: boolean;
};

export type StaffIdentity = {
  readonly kind: "staff";
  readonly id: string;
  readonly name: string;
  readonly staffId: string;
  readonly role: StaffRole;
  readonly roleLabel: string;
};

/**
 * System Admin: manages user accounts only. Not an approval role, so it has no
 * staffId, can decide no consent request and can see no consent or medical
 * details.
 */
export type AdminIdentity = {
  readonly kind: "admin";
  readonly id: string;
  readonly name: string;
  readonly roleLabel: string;
};

export type Identity = ParentIdentity | StaffIdentity | AdminIdentity;

export const ADMIN_ROLE_LABEL = "System Admin";

/** A demo user as seeded. `pin` is supplied at seeding time, not stored here. */
export type DemoUser =
  | {
      kind: "parent";
      id: string;
      username: string;
      name: string;
      parentId: string;
      learnerId: LearnerId;
      learnerName: string;
      verified: boolean;
    }
  | {
      kind: "staff";
      id: string;
      username: string;
      name: string;
      staffId: string;
      role: StaffRole;
    };

export const DEMO_USERS: readonly DemoUser[] = [
  {
    kind: "parent",
    id: "parent-amara",
    username: "amara",
    name: "Amara Okafor",
    parentId: "P-001",
    learnerId: "L-101",
    learnerName: "Zola Okafor",
    verified: true,
  },
  {
    kind: "parent",
    id: "parent-ben",
    username: "ben",
    name: "Ben Dlamini",
    parentId: "P-002",
    learnerId: "L-102",
    learnerName: "Kayla Dlamini",
    verified: true,
  },
  {
    kind: "parent",
    id: "parent-chen",
    username: "chen",
    name: "Chen Wei",
    parentId: "P-003",
    learnerId: "L-103",
    learnerName: "Mei Chen",
    verified: true,
  },
  {
    kind: "parent",
    id: "parent-unverified",
    username: "dumi",
    name: "Dumi Nkosi (identity not verified)",
    parentId: "P-009",
    learnerId: "L-104",
    learnerName: "Sipho Nkosi",
    verified: false,
  },
  // Fictional staff names only - never real team members.
  {
    kind: "staff",
    id: "staff-admin",
    username: "naledi",
    name: "Naledi Khumalo",
    staffId: "S-01",
    role: "admin_officer",
  },
  {
    kind: "staff",
    id: "staff-info",
    username: "johan",
    name: "Johan Meyer",
    staffId: "S-02",
    role: "information_officer",
  },
];

/** Starting consent states seeded on first boot (per the scenarios draft). */
export const SEED_CONSENT: ReadonlyArray<{
  learnerId: LearnerId;
  type: ConsentType;
  state: ConsentState;
}> = [
  { learnerId: "L-101", type: "Photos", state: "granted" },
  { learnerId: "L-102", type: "School Trips", state: "not_set" },
  { learnerId: "L-103", type: "Medical", state: "granted" },
];
