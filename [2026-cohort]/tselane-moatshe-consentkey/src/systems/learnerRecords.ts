/**
 * Simulated system: Learner Records.
 *
 * Holds medical notes and contact details. Follows Medical and Contact
 * Details. When Medical consent is withdrawn the medical note is restricted;
 * when Contact Details change, the stored contact details are updated.
 */

import type { ConsentType, LearnerId } from "../consent/model.js";
import type {
  ConsentChange,
  SimulatedSystem,
  SystemUpdateResult,
} from "./system.js";

interface LearnerRecord {
  learnerId: LearnerId;
  medicalNoteRestricted: boolean;
  contactDetailsActive: boolean;
  tripEmergencyContactFlagged: boolean;
  /** Optional alternative number (E.164), kept alongside the existing number. */
  alternativeNumber?: string;
  /** Set while the medical note is restricted: when the restriction must be complete. */
  restrictionDueBy?: string;
  /** Set when S-02 confirms the restriction is finished; restrictionDueBy is cleared then. */
  restrictionCompletedAt?: string;
}

export class LearnerRecords implements SimulatedSystem {
  readonly name = "Learner Records";
  readonly follows: readonly ConsentType[] = [
    "Medical",
    "Contact Details",
    "School Trips",
  ];

  failNext = false;

  private readonly records = new Map<LearnerId, LearnerRecord>();

  /** Seed a learner record with a test medical note present. */
  seedRecord(learnerId: LearnerId): void {
    this.records.set(learnerId, {
      learnerId,
      medicalNoteRestricted: false,
      contactDetailsActive: true,
      tripEmergencyContactFlagged: false,
    });
  }

  recordFor(learnerId: LearnerId): LearnerRecord {
    return (
      this.records.get(learnerId) ?? {
        learnerId,
        medicalNoteRestricted: false,
        contactDetailsActive: false,
        tripEmergencyContactFlagged: false,
      }
    );
  }

  /** Mark a restriction finished: record when, and clear the open deadline. */
  markRestrictionCompleted(learnerId: LearnerId, completedAt: string): void {
    const { restrictionDueBy: _due, ...rest } = this.recordFor(learnerId);
    this.records.set(learnerId, { ...rest, restrictionCompletedAt: completedAt });
  }

  /** Restricted medical notes whose restriction is not yet completed. */
  openRestrictions(): { learnerId: LearnerId; restrictionDueBy: string }[] {
    return [...this.records.values()]
      .filter((r) => r.medicalNoteRestricted && r.restrictionDueBy)
      .map((r) => ({ learnerId: r.learnerId, restrictionDueBy: r.restrictionDueBy! }))
      .sort((a, b) => a.restrictionDueBy.localeCompare(b.restrictionDueBy));
  }

  handles(type: ConsentType): boolean {
    return this.follows.includes(type);
  }

  apply(change: ConsentChange): SystemUpdateResult {
    if (this.failNext) {
      this.failNext = false;
      return { system: this.name, ok: false, summary: "update failed (simulated)" };
    }

    const current = this.recordFor(change.learnerId);
    let summary: string;

    switch (change.type) {
      case "Medical": {
        const restricted = change.to === "withdrawn";
        // Restricted means blocked from use, not deleted: the note stays.
        const { restrictionDueBy: _previous, restrictionCompletedAt: _done, ...rest } = current;
        this.records.set(change.learnerId, {
          ...rest,
          medicalNoteRestricted: restricted,
          ...(restricted && change.restrictionDueBy
            ? { restrictionDueBy: change.restrictionDueBy }
            : {}),
        });
        summary = restricted
          ? "medical note restricted (kept, not deleted)"
          : "medical note active";
        break;
      }
      case "Contact Details": {
        const active = change.to === "granted";
        const alt = active ? change.alternativeNumber : undefined;
        this.records.set(change.learnerId, {
          ...current,
          contactDetailsActive: active,
          // Added alongside the existing number; an absent value leaves any
          // number already stored untouched.
          ...(alt !== undefined ? { alternativeNumber: alt } : {}),
        });
        summary = active
          ? alt !== undefined
            ? "contact details active, alternative number added"
            : "contact details active"
          : "contact details restricted";
        break;
      }
      case "School Trips": {
        const flagged = change.to === "granted";
        this.records.set(change.learnerId, {
          ...current,
          tripEmergencyContactFlagged: flagged,
        });
        summary = flagged
          ? "emergency contact flagged for trip"
          : "emergency contact cleared for trip";
        break;
      }
      default:
        summary = "no change";
    }

    return { system: this.name, ok: true, summary };
  }
}

