/**
 * Plain-JSON shapes sent to the browser, and helpers to build them from the
 * in-memory domain objects (which carry methods the client can't receive).
 */

import type { ChangeResult } from "../connector/consentConnector.js";
import type {
  ChangeStatus,
  HistoryStep,
  ImpactEntry,
} from "../history/completionHistory.js";

export interface SerializedChange {
  status: ChangeStatus;
  steps: HistoryStep[];
  impact: ImpactEntry[];
  impactSummary: { updated: number; total: number; text: string };
}

export function serializeChange(result: ChangeResult): SerializedChange {
  return {
    status: result.status,
    steps: [...result.history.listSteps()],
    impact: [...result.history.impactMap()],
    impactSummary: result.impactSummary,
  };
}
