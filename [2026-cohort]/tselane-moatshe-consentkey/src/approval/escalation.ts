/**
 * Approval time limit.
 *
 * Decision 3 in the legal log / the "Approval time limit" row in the decisions
 * sheet: a pending request is **never auto-approved**. After two working days
 * it escalates.
 *
 * This is derived on read from `createdAt`, so there is no scheduler and no
 * background job that could fire and change something on its own. Nothing here
 * approves, rejects or applies anything — it only reports how long a request
 * has been waiting and whether it is overdue.
 *
 * Escalation (plan phase 2). Decision 3 says an overdue request goes "to the
 * other staff role or a school manager". Phase 0 is unanswered, so the
 * recipient and the school calendar are configurable ASSUMPTIONS (A-01, A-02
 * in docs/legal-decisions-log.md, status: assumed, pending confirmation).
 *
 * Escalation is notification and visibility only. The recipient sees the
 * request and sees that it is escalated, but authority does NOT transfer:
 * `approvalRules.canApprove` is untouched, the request stays pending, and
 * only a human decision from the assigned role changes anything. Nothing here
 * can approve, reject or apply a change. No request type skips the wait (A-03).
 */

import type { AuditLog } from "../audit/auditLog.js";
import type {
  ConsentChangeContext,
  ConsentType,
  StaffId,
} from "../consent/model.js";
import { requiredRole, STAFF } from "./approvalRules.js";
import type { StaffRole } from "./approvalRules.js";
import { southAfricanPublicHolidaysBetween } from "./saHolidays.js";

/** South African public holidays for a window around now, computed not listed. */
function builtInHolidays(): string[] {
  const year = new Date().getUTCFullYear();
  return southAfricanPublicHolidaysBetween(year - 1, year + 3);
}

/** Working days a request may wait before it is overdue. */
export const ESCALATION_WORKING_DAYS = 2;

export type EscalationState = "within_limit" | "overdue";

/**
 * School calendar and escalation recipient.
 * ASSUMPTIONS A-01 and A-02: Monday to Friday, no holidays unless listed, and
 * the other staff role receives the escalation unless a recipient is set.
 */
export interface EscalationConfig {
  /** Non-working dates, `YYYY-MM-DD` (UTC). South African public holidays by default. */
  holidays: readonly string[];
  /** Staff id to escalate to. Unset means "the other staff role". */
  recipient?: StaffId;
}

export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = { holidays: builtInHolidays() };

/** Reads `SCHOOL_HOLIDAYS` and `ESCALATION_RECIPIENT`. Bad values are ignored. */
export function escalationConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): EscalationConfig {
  // South African public holidays are always excluded; SCHOOL_HOLIDAYS adds
  // extra dates (school closure days, holidays declared by proclamation).
  const extra = (env.SCHOOL_HOLIDAYS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
  const holidays = [...new Set([...builtInHolidays(), ...extra])].sort();
  const wanted = env.ESCALATION_RECIPIENT?.trim();
  const recipient = wanted && STAFF[wanted] ? wanted : undefined;
  return recipient ? { holidays, recipient } : { holidays };
}

/**
 * Who an overdue request is escalated to. A configured recipient is used only
 * if it is a different role from the assigned one (escalating to the same
 * role adds nobody); otherwise the other staff role is used.
 */
export function escalationRecipient(
  assignedRole: StaffRole,
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG,
): StaffId | undefined {
  const configured = config.recipient ? STAFF[config.recipient] : undefined;
  if (configured && configured.role !== assignedRole) return configured.id;
  return Object.values(STAFF).find((s) => s.role !== assignedRole)?.id;
}

export interface EscalationStatus {
  state: EscalationState;
  /** True once the request is overdue and has a recipient. */
  escalated: boolean;
  /** Who it is escalated to, or null while within the limit. */
  escalatedTo: StaffId | null;
  workingDaysWaiting: number;
  /** Always false. Kept explicit so the guarantee is visible in the payload. */
  autoApproved: false;
}

/**
 * Whole working days between two instants, counting Monday to Friday only and
 * skipping any holiday passed in (A-01). Callers use the config, which
 * includes South African public holidays; the bare default here is none.
 */
export function workingDaysBetween(
  from: Date,
  to: Date,
  holidays: readonly string[] = [],
): number {
  if (!(from instanceof Date) || Number.isNaN(from.getTime())) return 0;
  if (to.getTime() <= from.getTime()) return 0;

  let days = 0;
  // Step a day at a time from the day after `from` up to `to`, counting
  // weekdays. Day-granular is the right resolution for a "working days" rule.
  const cursor = new Date(from.getTime());
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to.getTime());
  end.setUTCHours(0, 0, 0, 0);

  while (cursor.getTime() < end.getTime()) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = cursor.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    if (holidays.includes(cursor.toISOString().slice(0, 10))) continue;
    days++;
  }
  return days;
}

export function escalationStatus(
  createdAt: string,
  now: Date = new Date(),
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG,
  /** The role assigned to decide the request; picks the escalation recipient. */
  assignedRole?: StaffRole,
): EscalationStatus {
  const created = new Date(createdAt);
  const workingDaysWaiting = workingDaysBetween(created, now, config.holidays);
  const overdue = workingDaysWaiting >= ESCALATION_WORKING_DAYS;
  const escalatedTo =
    overdue && assignedRole ? escalationRecipient(assignedRole, config) ?? null : null;
  return {
    state: overdue ? "overdue" : "within_limit",
    escalated: escalatedTo !== null,
    escalatedTo,
    workingDaysWaiting,
    autoApproved: false,
  };
}

/** The part of a pending change that escalation needs. */
export interface EscalatablePending {
  id: string;
  createdAt: string;
  request: {
    parentId: string;
    learnerId: string;
    type: ConsentType;
    changeContext?: ConsentChangeContext;
  };
}

/**
 * Write one `approval.escalated` audit entry for each overdue pending request
 * that does not have one yet. Safe to call on every read: it is idempotent,
 * and it only appends to the hash-chained audit log. It never decides,
 * approves, rejects or applies anything. Returns the change ids it escalated.
 */
export function recordEscalations(
  pending: Iterable<EscalatablePending>,
  audit: AuditLog,
  now: Date = new Date(),
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG,
): string[] {
  const already = new Set(
    audit
      .entries()
      .filter((e) => e.event === "approval.escalated")
      .map((e) => e.details.changeId),
  );
  const escalated: string[] = [];
  for (const p of pending) {
    if (already.has(p.id)) continue;
    const context = p.request.changeContext ?? "standard";
    const role = requiredRole(p.request.type, context);
    if (!role) continue;
    const status = escalationStatus(p.createdAt, now, config, role);
    if (!status.escalated || status.escalatedTo === null) continue;
    audit.record("approval.escalated", {
      changeId: p.id,
      parentId: p.request.parentId,
      learnerId: p.request.learnerId,
      type: p.request.type,
      changeContext: context,
      requiredRole: role,
      escalatedTo: status.escalatedTo,
      workingDaysWaiting: status.workingDaysWaiting,
      autoApproved: false,
    });
    escalated.push(p.id);
  }
  return escalated;
}