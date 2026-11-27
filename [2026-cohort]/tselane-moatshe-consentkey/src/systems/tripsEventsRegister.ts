/**
 * Simulated system: Trips and Events Register.
 *
 * Holds trip lists and permission slips. Follows School Trips and Contact
 * Details (used as emergency contacts for trips), and also reacts to Medical
 * changes by adding/removing a medical flag on trip lists (per Scenario 3).
 */

import type { ConsentType, LearnerId } from "../consent/model.js";
import type {
  ConsentChange,
  SimulatedSystem,
  SystemUpdateResult,
} from "./system.js";

interface TripMembership {
  learnerId: LearnerId;
  onTripList: boolean;
  emergencyContactFlagged: boolean;
  medicalFlag: boolean;
}

export class TripsEventsRegister implements SimulatedSystem {
  readonly name = "Trips and Events Register";
  readonly follows: readonly ConsentType[] = [
    "School Trips",
    "Contact Details",
    "Medical",
  ];

  failNext = false;

  private readonly memberships = new Map<LearnerId, TripMembership>();

  membershipFor(learnerId: LearnerId): TripMembership {
    return (
      this.memberships.get(learnerId) ?? {
        learnerId,
        onTripList: false,
        emergencyContactFlagged: false,
        medicalFlag: false,
      }
    );
  }

  handles(type: ConsentType): boolean {
    return this.follows.includes(type);
  }

  apply(change: ConsentChange): SystemUpdateResult {
    if (this.failNext) {
      this.failNext = false;
      return { system: this.name, ok: false, summary: "update failed (simulated)" };
    }

    const current = this.membershipFor(change.learnerId);
    let summary: string;

    switch (change.type) {
      case "School Trips": {
        const onList = change.to === "granted";
        this.memberships.set(change.learnerId, {
          ...current,
          onTripList: onList,
          emergencyContactFlagged: onList ? current.emergencyContactFlagged : false,
        });
        summary = onList ? "added to trip list" : "removed from trip list";
        break;
      }
      case "Contact Details": {
        const flagged = change.to === "granted";
        this.memberships.set(change.learnerId, {
          ...current,
          emergencyContactFlagged: flagged,
        });
        summary = flagged
          ? "emergency contact flagged for trip"
          : "emergency contact cleared";
        break;
      }
      case "Medical": {
        const medicalFlag = change.to === "granted";
        this.memberships.set(change.learnerId, {
          ...current,
          medicalFlag,
        });
        summary = medicalFlag
          ? "medical flag set on trip lists"
          : "medical flag removed from trip lists";
        break;
      }
      default:
        summary = "no change";
    }

    return { system: this.name, ok: true, summary };
  }
}
