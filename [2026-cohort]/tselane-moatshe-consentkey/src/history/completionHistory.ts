/**
 * Task completion history and impact map.
 *
 * A consent change is "followed" only when:
 *   1. the request is recorded (who, what, when),
 *   2. staff approval is recorded, if the scenario needs it,
 *   3. every affected system has updated, and each update is logged,
 *   4. the completion history shows every step complete.
 * If any system has not updated, the impact map shows the change as incomplete.
 */

export type StepStatus = "pending" | "complete" | "failed" | "rejected";

export interface HistoryStep {
  key: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

export interface ImpactEntry {
  system: string;
  status: "pending" | "updated" | "failed";
  detail?: string;
}

export type ChangeStatus = "in_progress" | "complete" | "incomplete" | "rejected";

export class CompletionHistory {
  private readonly steps: HistoryStep[] = [];
  private readonly impact = new Map<string, ImpactEntry>();

  addStep(key: string, label: string): void {
    this.steps.push({ key, label, status: "pending" });
  }

  setStep(key: string, status: StepStatus, detail?: string): void {
    const step = this.steps.find((s) => s.key === key);
    if (!step) throw new Error(`Unknown history step: ${key}`);
    step.status = status;
    if (detail !== undefined) step.detail = detail;
  }

  /** Register a system that this change is expected to update. */
  expectSystem(system: string): void {
    if (!this.impact.has(system)) {
      this.impact.set(system, { system, status: "pending" });
    }
  }

  markSystem(system: string, status: ImpactEntry["status"], detail?: string): void {
    this.impact.set(system, { system, status, detail });
  }

  listSteps(): readonly HistoryStep[] {
    return this.steps;
  }

  /** The impact map: which systems a change touches, and their status. */
  impactMap(): readonly ImpactEntry[] {
    return [...this.impact.values()];
  }

  /** "2 of 2 systems updated" style summary. */
  impactSummary(): { updated: number; total: number; text: string } {
    const total = this.impact.size;
    const updated = [...this.impact.values()].filter(
      (e) => e.status === "updated",
    ).length;
    return { updated, total, text: `${updated} of ${total} system(s) updated` };
  }

  status(): ChangeStatus {
    if (this.steps.some((s) => s.status === "rejected")) return "rejected";
    const allStepsComplete = this.steps.every((s) => s.status === "complete");
    const allSystemsUpdated = [...this.impact.values()].every(
      (e) => e.status === "updated",
    );
    if (allStepsComplete && allSystemsUpdated) return "complete";
    if (
      this.steps.some((s) => s.status === "failed") ||
      [...this.impact.values()].some((e) => e.status === "failed")
    ) {
      return "incomplete";
    }
    return "in_progress";
  }
}
