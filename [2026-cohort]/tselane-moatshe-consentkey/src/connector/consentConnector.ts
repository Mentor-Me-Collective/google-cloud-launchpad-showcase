/**
 * Consent connector / orchestrator.
 *
 * Takes a verified parent's consent change, records it, enforces staff
 * approval where required, fans the change out to every affected system, and
 * records each step in the task completion history and the audit log.
 *
 * This is the integration layer Manoj owns. It is storage-agnostic: swap the
 * in-memory systems and audit store for Firestore-backed ones later without
 * changing this orchestration.
 */

import type {
  ApprovalReason,
  ApprovalStatus,
  ConsentChangeContext,
  ConsentRequestRecord,
  ConsentState,
  ConsentType,
  LearnerId,
  ParentId,
  StaffId,
  VerificationMethod,
} from "../consent/model.js";
import { AuditLog } from "../audit/auditLog.js";
import {
  canApprove,
  requiredRole,
} from "../approval/approvalRules.js";
import { normalizeSouthAfricanNumber } from "../consent/phone.js";
import {
  DEFAULT_MEDICAL_RESTRICTION_DAYS,
  restrictionDeadline,
} from "../approval/medicalRestriction.js";
import { CompletionHistory } from "../history/completionHistory.js";
import type { ConsentChange, SimulatedSystem } from "../systems/system.js";

export interface ConsentChangeRequest {
  parentId: ParentId;
  /** Set by the trusted parent-verification layer, not by a client form. */
  parentVerified: boolean;
  verificationMethod: VerificationMethod;
  learnerId: LearnerId;
  type: ConsentType;
  from: ConsentState;
  to: ConsentState;
  changeContext?: ConsentChangeContext;
  /**
   * Optional alternative number (Contact Details only), E.164. Added alongside
   * the existing number and reviewed by S-01 with the rest of the request.
   * The number itself is never written to the audit trail; only the fact that
   * one was supplied.
   */
  alternativeNumber?: string;
  /**
   * Stable id for one change across its whole life.
   *
   * A queued change is logged once when it is submitted and again when staff
   * decide it — the second batch comes from here, hours later. Without a
   * shared id the audit view cannot tell they are the same change, and shows
   * the parent one request twice: "waiting" and "complete".
   */
  changeId?: string;
}

export interface ApprovalDecision {
  staffId: StaffId;
  approved: boolean;
  /** Free-text note. Must not contain health details (OD-07). */
  reason?: string;
  /**
   * Code from the short list in `decisionReasons`. Recorded on approval as
   * well as rejection — OD-07 requires a reason for every Medical review, and
   * previously only rejections stored one.
   */
  reasonCode?: string;
}

export interface ChangeResult {
  status: ReturnType<CompletionHistory["status"]>;
  history: CompletionHistory;
  impactSummary: ReturnType<CompletionHistory["impactSummary"]>;
  request: ConsentRequestRecord;
}

/** Settings that are configuration rather than rules. */
export interface ConnectorOptions {
  /** Calendar days allowed to finish restricting medical data (A-05). */
  medicalRestrictionDays?: number;
  /** Clock, injectable for tests. */
  now?: () => Date;
}

export class UnverifiedParentError extends Error {}
export class PermissionDeniedError extends Error {}
export class InvalidAlternativeNumberError extends Error {}

export class ConsentConnector {
  constructor(
    private readonly systems: readonly SimulatedSystem[],
    private readonly audit: AuditLog,
    /** Current consent state per learner+type. */
    private readonly state = new Map<string, ConsentState>(),
    private readonly options: ConnectorOptions = {},
  ) {}

  private requestSequence = 0;

  private key(learnerId: LearnerId, type: ConsentType): string {
    return `${learnerId}:${type}`;
  }

  getState(learnerId: LearnerId, type: ConsentType): ConsentState {
    return this.state.get(this.key(learnerId, type)) ?? "not_set";
  }

  setState(learnerId: LearnerId, type: ConsentType, s: ConsentState): void {
    this.state.set(this.key(learnerId, type), s);
  }

  private affectedSystems(type: ConsentType): SimulatedSystem[] {
    return this.systems.filter((sys) => sys.handles(type));
  }

  private nextRequestId(): string {
    return `REQ-${String(++this.requestSequence).padStart(6, "0")}`;
  }

  /**
   * Process a consent change. If the change needs approval, `decision` must be
   * supplied; the connector enforces that the approver holds the correct role.
   */
  process(
    request: ConsentChangeRequest,
    decision?: ApprovalDecision,
  ): ChangeResult {
    return this.processRequest(request, decision, false);
  }

  private processRequest(
    request: ConsentChangeRequest,
    decision: ApprovalDecision | undefined,
    isRetry: boolean,
  ): ChangeResult {
    if (request.alternativeNumber !== undefined) {
      // Defence in depth: the API validates first, but the connector is the
      // layer that applies the change, so it refuses anything malformed too.
      if (
        request.type !== "Contact Details" ||
        normalizeSouthAfricanNumber(request.alternativeNumber) !==
          request.alternativeNumber
      ) {
        throw new InvalidAlternativeNumberError(
          "Alternative number must be a South African number in E.164 form and only applies to Contact Details",
        );
      }
    }
    const requestId = this.nextRequestId();
    const auditStartIndex = this.audit.entries().length;
    const context = request.changeContext ?? "standard";
    const history = new CompletionHistory();
    const approvalRole = requiredRole(request.type, context);
    const needsApproval = approvalRole !== undefined;
    const approvalReason: ApprovalReason | undefined =
      request.type === "School Trips"
        ? "school_trip"
        : request.type === "Medical"
          ? "medical"
          : request.type === "Contact Details"
            ? context === "emergency_contact"
              ? "emergency_contact"
              : "contact_details"
            : undefined;
    let approvalStatus: ApprovalStatus = needsApproval
      ? "pending"
      : "not_needed";
    const commonAuditDetails = {
      requestId,
      // Carried so the audit view can join these entries to the
      // "sent for approval" entry written when the change was queued.
      changeId: request.changeId ?? null,
      parentId: request.parentId,
      learnerId: request.learnerId,
      type: request.type,
      from: request.from,
      to: request.to,
      changeContext: context,
      needsApproval,
      approvalReason: approvalReason ?? null,
      verificationMethod: request.verificationMethod,
      // The number is personal data and stays out of the audit trail.
      ...(request.alternativeNumber !== undefined
        ? { alternativeNumberProvided: true }
        : {}),
    };
    if (isRetry) {
      this.audit.record("change.retry", commonAuditDetails);
    }
    const result = (): ChangeResult => ({
      status: history.status(),
      history,
      impactSummary: history.impactSummary(),
      request: {
        requestId,
        parentId: request.parentId,
        learnerId: request.learnerId,
        type: request.type,
        from: request.from,
        to: request.to,
        currentState: this.getState(request.learnerId, request.type),
        changeContext: context,
        needsApproval,
        ...(approvalReason ? { approvalReason } : {}),
        approvalStatus,
        verificationMethod: request.verificationMethod,
        auditEntryIndexes: this.audit
          .entries()
          .slice(auditStartIndex)
          .map((entry) => entry.index),
      },
    });
    // A queued change was already logged as received when the parent
    // submitted it. This pass is the staff decision, possibly one of several
    // (a wrong-role attempt, then the real one), so re-logging "request
    // received" and "change requested" each time told the parent their single
    // request had been received three times. Log them only on the pass that
    // actually represents the submission.
    const isDecisionPass = request.changeId !== undefined && decision !== undefined;

    // Step 1: request received from a verified parent.
    history.addStep("request", `Request received from ${request.parentId}`);
    if (!request.parentVerified) {
      history.setStep("request", "failed", "parent not verified");
      this.audit.record("request.rejected", {
        ...commonAuditDetails,
        reason: "parent not verified",
      });
      throw new UnverifiedParentError(
        `Parent ${request.parentId} is not verified`,
      );
    }
    history.setStep("request", "complete", `${request.parentId} (verified)`);
    if (!isDecisionPass) {
      this.audit.record("request.received", commonAuditDetails);
    }

    // Step 2: record the requested state change; it is applied after approval.
    history.addStep(
      "consent",
      `Consent change requested: ${request.type}, ${request.from} to ${request.to}`,
    );
    history.setStep("consent", "complete");
    if (!isDecisionPass) {
      this.audit.record("consent.change_requested", commonAuditDetails);
    }

    // Step 3: staff approval, if required.
    if (needsApproval) {
      history.addStep(
        "approval",
        `Awaiting staff approval (${approvalReason})`,
      );

      if (!decision) {
        // Left pending: no decision supplied yet.
        this.audit.record("approval.pending", commonAuditDetails);
        return result();
      }

      // Enforce the permission rule (Thando's test depends on this).
      if (!canApprove(decision.staffId, request.type, context)) {
        history.setStep(
          "approval",
          "failed",
          `${decision.staffId} not permitted to approve ${request.type}`,
        );
        this.audit.record("approval.denied", {
          ...commonAuditDetails,
          staffId: decision.staffId,
          requiredRole: approvalRole,
        });
        throw new PermissionDeniedError(
          `${decision.staffId} may not approve ${request.type} changes`,
        );
      }

      if (!decision.approved) {
        approvalStatus = "rejected";
        // Rejected: nothing changes in any system.
        history.setStep(
          "approval",
          "rejected",
          `${decision.staffId} rejected${decision.reason ? `: ${decision.reason}` : ""}`,
        );
        this.audit.record("approval.rejected", {
          ...commonAuditDetails,
          staffId: decision.staffId,
          reasonCode: decision.reasonCode ?? null,
          reason: decision.reason ?? null,
        });
        return result();
      }

      approvalStatus = "approved";
      history.setStep("approval", "complete", `${decision.staffId} approved`);
      // The reason is recorded on approval too, not only on rejection. OD-07
      // requires S-02 to record a reason for every Medical review, and an
      // approval that stored nothing could not satisfy that.
      this.audit.record("approval.approved", {
        ...commonAuditDetails,
        staffId: decision.staffId,
        reasonCode: decision.reasonCode ?? null,
        reason: decision.reason ?? null,
      });
    }

    // Medical withdrawal: the school restricts (blocks from use, keeps) the
    // medical note, and the deadline for finishing that is recorded. A
    // rejection never reaches this point, so it changes nothing.
    let restrictionDueBy: string | undefined;
    if (request.type === "Medical" && request.to === "withdrawn") {
      const days =
        this.options.medicalRestrictionDays ?? DEFAULT_MEDICAL_RESTRICTION_DAYS;
      restrictionDueBy = restrictionDeadline(
        (this.options.now ?? (() => new Date()))(),
        days,
      );
      this.audit.record("restriction.scheduled", {
        ...commonAuditDetails,
        restrictionDueBy,
        restrictionDays: days,
        restrictionMethod: "restrict_not_delete",
      });
    }

    // Change is cleared to apply. Persist the new consent state.
    this.setState(request.learnerId, request.type, request.to);

    // Step 4: fan out to every affected system; log each update.
    const change: ConsentChange = {
      learnerId: request.learnerId,
      type: request.type,
      from: request.from,
      to: request.to,
      ...(request.alternativeNumber !== undefined
        ? { alternativeNumber: request.alternativeNumber }
        : {}),
      ...(restrictionDueBy ? { restrictionDueBy } : {}),
    };
    const affected = this.affectedSystems(request.type);
    for (const sys of affected) {
      history.expectSystem(sys.name);
    }

    for (const sys of affected) {
      const stepKey = `system:${sys.name}`;
      history.addStep(stepKey, `${sys.name} updated`);
      const result = sys.apply(change);
      if (result.ok) {
        history.setStep(stepKey, "complete", result.summary);
        history.markSystem(sys.name, "updated", result.summary);
        this.audit.record("system.updated", {
          ...commonAuditDetails,
          system: sys.name,
          summary: result.summary,
        });
      } else {
        history.setStep(stepKey, "failed", result.summary);
        history.markSystem(sys.name, "failed", result.summary);
        this.audit.record("system.update_failed", {
          ...commonAuditDetails,
          system: sys.name,
          summary: result.summary,
        });
      }
    }

    // Step 5: final completion step, only complete if everything succeeded.
    history.addStep("complete", "Change complete");
    if (history.impactMap().every((e) => e.status === "updated")) {
      history.setStep("complete", "complete");
      this.audit.record("change.complete", {
        ...commonAuditDetails,
      });
    } else {
      history.setStep("complete", "failed", "one or more systems not updated");
      this.audit.record("change.incomplete", {
        ...commonAuditDetails,
        impact: history.impactMap(),
      });
    }

    return result();
  }

  /**
   * Retry a change whose systems previously failed. Re-runs the full process
   * now that the transient failure flags have been cleared.
   */
  retry(request: ConsentChangeRequest, decision?: ApprovalDecision): ChangeResult {
    return this.processRequest(request, decision, true);
  }
}
