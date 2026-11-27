import { latestAnchor } from "@/audit/archive";
/**
 * Process-wide application singleton.
 *
 * Builds the live integration layer (three simulated systems + connector +
 * hash-chained audit log) once per server process, hydrating consent state, the
 * audit chain and the pending-approval queue from the repository (Firestore when
 * configured). New audit entries are mirrored back to the repo in the
 * background, so the in-memory objects stay the source of truth for a request
 * while Firestore is the durable copy that survives restarts.
 */

import { AuditLog } from "../audit/auditLog.js";
import type { AuditEntry, AuditStore } from "../audit/auditLog.js";
import { ConsentConnector } from "../connector/consentConnector.js";
import type { ConsentState, ConsentType, LearnerId } from "../consent/model.js";
import { PhotoMediaLibrary } from "../systems/photoMediaLibrary.js";
import { TripsEventsRegister } from "../systems/tripsEventsRegister.js";
import { LearnerRecords } from "../systems/learnerRecords.js";
import { medicalRestrictionDaysFromEnv } from "../approval/medicalRestriction.js";
import {
  escalationConfigFromEnv,
  recordEscalations,
} from "../approval/escalation.js";
import { SEED_CONSENT } from "./identities.js";
import { PIN_PATTERN } from "./pin.js";
import { UserService } from "./users.js";
import { getRepo } from "./repo.js";
import type { PendingChange, Repo } from "./repo.js";

/** Audit store seeded from the repo; mirrors every append back to it. */
class HydratingAuditStore implements AuditStore {
  private readonly entries: AuditEntry[];
  constructor(
    seed: AuditEntry[],
    private readonly repo: Repo,
  ) {
    this.entries = [...seed];
  }
  append(entry: AuditEntry): void {
    this.entries.push(entry);
    this.repo.appendAudit(entry).catch((err) => {
      console.error("[consentkey] audit mirror failed:", err);
    });
  }
  all(): readonly AuditEntry[] {
    return this.entries;
  }
  last(): AuditEntry | undefined {
    return this.entries[this.entries.length - 1];
  }
}

export interface App {
  connector: ConsentConnector;
  audit: AuditLog;
  photoLibrary: PhotoMediaLibrary;
  tripsRegister: TripsEventsRegister;
  learnerRecords: LearnerRecords;
  repo: Repo;
  users: UserService;
  pending: Map<string, PendingChange>;
  firestoreEnabled: boolean;
}

function stateKey(learnerId: LearnerId, type: ConsentType): string {
  return `${learnerId}:${type}`;
}

async function init(): Promise<App> {
  const repo = getRepo();

  const [auditEntries, consentRows, pendingRows] = await Promise.all([
    repo.loadAudit(),
    repo.loadConsent(),
    repo.loadPending(),
  ]);

  const auditStore = new HydratingAuditStore(auditEntries, repo);
  const audit = new AuditLog(auditStore);
  // After a retention run the live chain starts after the last archived entry.
  const archives = (await repo.loadAuditArchives?.()) ?? [];
  const anchor = latestAnchor(archives);
  if (anchor) audit.setAnchor(anchor);

  const photoLibrary = new PhotoMediaLibrary();
  const tripsRegister = new TripsEventsRegister();
  const learnerRecords = new LearnerRecords();

  // Seed the simulated systems' internal data for each learner so the
  // dashboards have something concrete to show. This is ephemeral simulation
  // detail (re-seeded each boot); the durable data is consent state + audit.
  let photoCount = 5;
  const seedLearner = (learnerId: string) => {
    photoLibrary.seedPhotos(learnerId, photoCount);
    learnerRecords.seedRecord(learnerId);
    photoCount = photoCount > 2 ? photoCount - 1 : 3;
  };

  // Users: load from the repo, then seed the demo users and the default admin
  // when missing. The admin is not seeded in production without
  // CONSENTKEY_ADMIN_PIN (see UserService.seedAdmin).
  const users = new UserService(repo, audit, undefined, { onNewLearner: seedLearner });
  await users.load();
  if (process.env.CONSENTKEY_SEED_DEMO?.trim().toLowerCase() !== "false") {
    const configured = process.env.CONSENTKEY_DEMO_PIN?.trim();
if (configured && PIN_PATTERN.test(configured)) {
  await users.seedDemoUsers(configured);
} else {
  console.warn("[consentkey] Demo users not seeded: configure CONSENTKEY_DEMO_PIN.");
}
  const adminSeed = await users.seedAdmin();
  if (!adminSeed.seeded && adminSeed.reason?.includes("CONSENTKEY_ADMIN")) {
    console.error(`[consentkey] System Admin NOT created: ${adminSeed.reason}.`);
  }
  for (const l of users.parentLearners()) seedLearner(l.learnerId);

  const state = new Map<string, ConsentState>();
  for (const row of consentRows) {
    state.set(stateKey(row.learnerId, row.type), row.state);
  }

  const connector = new ConsentConnector(
    [photoLibrary, tripsRegister, learnerRecords],
    audit,
    state,
    { medicalRestrictionDays: medicalRestrictionDaysFromEnv() },
  );

  // Fresh database: apply and persist the starting consent states.
  if (consentRows.length === 0) {
    for (const seed of SEED_CONSENT) {
      connector.setState(seed.learnerId, seed.type, seed.state);
      await repo.saveConsent(seed.learnerId, seed.type, seed.state);
    }
    audit.record("system.seeded", {
      states: SEED_CONSENT.length,
      firestore: repo.enabled,
    });
  }

  const pending = new Map<string, PendingChange>();
  for (const p of pendingRows) pending.set(p.id, p);

  return {
    connector,
    audit,
    photoLibrary,
    tripsRegister,
    learnerRecords,
    repo,
    users,
    pending,
    firestoreEnabled: repo.enabled,
  };
}

let appPromise: Promise<App> | null = null;

export function getApp(): Promise<App> {
  if (!appPromise) {
    appPromise = init().catch((err) => {
      // Reset so a later request can retry initialization.
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

/**
 * Escalate pending requests that are past the working-day limit (plan phase
 * 2). Derived on read from `createdAt`, so there is no scheduler. It only
 * appends `approval.escalated` audit entries; it never decides anything.
 */
export function runEscalationCheck(app: App, now: Date = new Date()): void {
  recordEscalations(app.pending.values(), app.audit, now, escalationConfigFromEnv());
}

/** Persist a consent state change to the durable store (best-effort). */
export async function persistConsent(
  app: App,
  learnerId: LearnerId,
  type: ConsentType,
  state: ConsentState,
): Promise<void> {
  try {
    await app.repo.saveConsent(learnerId, type, state);
  } catch (err) {
    console.error("[consentkey] consent persist failed:", err);
  }
}
