/**
 * Persistence repository.
 *
 * Durable mirror of the things that must survive a restart: the audit log
 * (append-only, hash-chained), the current consent state per learner+type, and
 * the queue of changes awaiting staff approval.
 *
 * Backed by Firestore when configured (the emulator today, real Firestore via
 * env later). When Firestore is not configured the repo is a no-op and the app
 * runs purely in memory, so local `next dev` works with zero setup.
 */

import type { AuditEntry } from "../audit/auditLog.js";
import type { ArchiveRecord } from "../audit/archive.js";
import type { ConsentState, ConsentType, LearnerId } from "../consent/model.js";
import type { ConsentChangeRequest } from "../connector/consentConnector.js";
import { getFirestore } from "./firestore.js";
import type { UserRecord } from "./users.js";

/**
 * A change waiting for staff sign-off.
 *
 * IDs only — no parent or learner names are persisted (Tselane, PR #2). The
 * staff queue resolves display names from the login roster at render time via
 * `identityId`, so nothing identifying is written to Firestore.
 */
export interface PendingChange {
  id: string;
  request: ConsentChangeRequest;
  identityId: string;
  createdAt: string;
}

const AUDIT = "audit";
const CONSENT = "consent";
const PENDING = "pending";
const USERS = "users";
const AUDIT_ARCHIVE = "audit_archive";

function consentDocId(learnerId: LearnerId, type: ConsentType): string {
  return `${learnerId}__${type}`.replace(/\//g, "-");
}

export interface Repo {
  readonly enabled: boolean;
  loadAudit(): Promise<AuditEntry[]>;
  appendAudit(entry: AuditEntry): Promise<void>;
  /** Retention: store an archive record (entries + anchor) before they are removed. */
  saveAuditArchive?(record: ArchiveRecord): Promise<void>;
  /** Retention: delete live audit entries with index <= throughIndex. */
  deleteAuditThrough?(throughIndex: number): Promise<void>;
  /** Retention: archive records, oldest first. */
  loadAuditArchives?(): Promise<ArchiveRecord[]>;
  loadConsent(): Promise<Array<{ learnerId: LearnerId; type: ConsentType; state: ConsentState }>>;
  saveConsent(learnerId: LearnerId, type: ConsentType, state: ConsentState): Promise<void>;
  loadPending(): Promise<PendingChange[]>;
  savePending(p: PendingChange): Promise<void>;
  deletePending(id: string): Promise<void>;
  loadUsers(): Promise<UserRecord[]>;
  saveUser(user: UserRecord): Promise<void>;
}

class NullRepo implements Repo {
  readonly enabled = false;
  async loadAudit(): Promise<AuditEntry[]> {
    return [];
  }
  async appendAudit(): Promise<void> {}
  async saveAuditArchive(): Promise<void> {}
  async deleteAuditThrough(): Promise<void> {}
  async loadAuditArchives(): Promise<ArchiveRecord[]> {
    return [];
  }
  async loadConsent() {
    return [];
  }
  async saveConsent(): Promise<void> {}
  async loadPending(): Promise<PendingChange[]> {
    return [];
  }
  async savePending(): Promise<void> {}
  async deletePending(): Promise<void> {}
  async loadUsers(): Promise<UserRecord[]> {
    return [];
  }
  async saveUser(): Promise<void> {}
}

class FirestoreRepo implements Repo {
  readonly enabled = true;
  constructor(private readonly db = getFirestore()!) {}

  async loadAudit(): Promise<AuditEntry[]> {
    const snap = await this.db.collection(AUDIT).get();
    return snap.docs
      .map((d) => d.data() as AuditEntry)
      .sort((a, b) => a.index - b.index);
  }

  async appendAudit(entry: AuditEntry): Promise<void> {
    const id = String(entry.index).padStart(12, "0");
    await this.db.collection(AUDIT).doc(id).set(entry);
  }

  async saveAuditArchive(record: ArchiveRecord): Promise<void> {
    const id = String(record.lastRemovedIndex).padStart(12, "0");
    await this.db.collection(AUDIT_ARCHIVE).doc(id).set(record);
  }

  async deleteAuditThrough(throughIndex: number): Promise<void> {
    const snap = await this.db.collection(AUDIT).get();
    const docs = snap.docs.filter(
      (d) => (d.data() as AuditEntry).index <= throughIndex,
    );
    // Firestore batches are limited to 500 writes.
    for (let i = 0; i < docs.length; i += 400) {
      const batch = this.db.batch();
      for (const d of docs.slice(i, i + 400)) batch.delete(d.ref);
      await batch.commit();
    }
  }

  async loadAuditArchives(): Promise<ArchiveRecord[]> {
    const snap = await this.db.collection(AUDIT_ARCHIVE).get();
    return snap.docs
      .map((d) => d.data() as ArchiveRecord)
      .sort((a, b) => a.lastRemovedIndex - b.lastRemovedIndex);
  }

  async loadConsent() {
    const snap = await this.db.collection(CONSENT).get();
    return snap.docs.map((d) => {
      const data = d.data() as {
        learnerId: LearnerId;
        type: ConsentType;
        state: ConsentState;
      };
      return data;
    });
  }

  async saveConsent(
    learnerId: LearnerId,
    type: ConsentType,
    state: ConsentState,
  ): Promise<void> {
    await this.db
      .collection(CONSENT)
      .doc(consentDocId(learnerId, type))
      .set({ learnerId, type, state });
  }

  async loadPending(): Promise<PendingChange[]> {
    const snap = await this.db.collection(PENDING).get();
    return snap.docs
      .map((d) => {
        // Documents written before names were dropped may still carry them;
        // rebuild from the known fields so they never re-enter the app.
        const { id, request, identityId, createdAt } = d.data() as PendingChange;
        return { id, request, identityId, createdAt };
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async savePending(p: PendingChange): Promise<void> {
    // Written field by field so a future caller cannot smuggle extra
    // identifying data into the collection by widening PendingChange.
    await this.db.collection(PENDING).doc(p.id).set({
      id: p.id,
      request: p.request,
      identityId: p.identityId,
      createdAt: p.createdAt,
    });
  }

  async deletePending(id: string): Promise<void> {
    await this.db.collection(PENDING).doc(id).delete();
  }

  async loadUsers(): Promise<UserRecord[]> {
    const snap = await this.db.collection(USERS).get();
    return snap.docs.map((d) => d.data() as UserRecord);
  }

  async saveUser(user: UserRecord): Promise<void> {
    // Firestore rejects undefined fields, so drop them. The record holds a
    // salted PIN hash only, never a PIN.
    const clean = JSON.parse(JSON.stringify(user)) as UserRecord;
    await this.db.collection(USERS).doc(user.id).set(clean);
  }
}

let cached: Repo | undefined;

export function getRepo(): Repo {
  if (cached) return cached;
  cached = getFirestore() ? new FirestoreRepo() : new NullRepo();
  return cached;
}
