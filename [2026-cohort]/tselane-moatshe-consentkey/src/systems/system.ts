/**
 * Shared contract for the three simulated systems.
 *
 * Each system holds some data and "follows" one or more consent types. When a
 * consent change arrives, the connector asks each affected system to apply it.
 * A system returns an update result that is logged; a change is only complete
 * when every affected system reports success.
 */

import type { ConsentState, ConsentType, LearnerId } from "../consent/model.js";

export interface ConsentChange {
  learnerId: LearnerId;
  type: ConsentType;
  from: ConsentState;
  to: ConsentState;
  /** Contact Details only: optional alternative number (E.164), already approved. */
  alternativeNumber?: string;
  /** Medical withdrawal only: ISO deadline for finishing the restriction. */
  restrictionDueBy?: string;
}

export interface SystemUpdateResult {
  system: string;
  ok: boolean;
  /** Human-readable summary of what changed, e.g. "photos blocked". */
  summary: string;
}

export interface SimulatedSystem {
  /** Stable name used in logs and the impact map. */
  readonly name: string;

  /** Which consent types cause this system to update. */
  readonly follows: readonly ConsentType[];

  /** True if this system should react to the given consent type. */
  handles(type: ConsentType): boolean;

  /**
   * Apply a consent change. May throw / return ok:false to simulate a failed
   * system so the completion history can show the change as incomplete.
   */
  apply(change: ConsentChange): SystemUpdateResult;
}
