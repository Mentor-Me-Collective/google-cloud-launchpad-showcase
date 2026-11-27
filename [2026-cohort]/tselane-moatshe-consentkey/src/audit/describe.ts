/**
 * Turns raw audit entries into something a parent can actually read.
 *
 * The trail is only useful as accountability if the person it protects can
 * understand it. Dumping the stored JSON on screen technically shows
 * everything and communicates nothing, so every event gets a plain-language
 * title, a one-line summary and — where it matters — a sentence saying what it
 * means for the reader.
 *
 * The raw entry is still shown behind a disclosure, because "show me the
 * actual record" is a reasonable thing to ask of an audit trail.
 */

import type { AuditEntry } from "./auditLog.js";

export type Tone = "neutral" | "good" | "warn" | "bad";

export interface DescribedEntry {
  entry: AuditEntry;
  title: string;
  summary?: string;
  /** What this means for the reader. Only where it is not obvious. */
  meaning?: string;
  tone: Tone;
}

/** A consent state in words rather than code. */
export function stateWords(value: unknown): string {
  if (value === "not_set") return "not set";
  if (value === "granted") return "granted";
  if (value === "withdrawn") return "withdrawn";
  return typeof value === "string" ? value : "unknown";
}

export function verificationWords(value: unknown): string {
  if (value === "demo_login") return "demo login (no PIN was checked)";
  if (value === "separate_pin") return "a separate PIN";
  return typeof value === "string" ? value : "not recorded";
}

function roleWords(value: unknown): string {
  if (value === "admin_officer") return "an Admin Officer";
  if (value === "information_officer") return "the Information Officer";
  return "a staff member";
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** The consent change an entry is about, as "Medical, not set to granted". */
function changeWords(d: Record<string, unknown>): string | undefined {
  const type = str(d.type);
  if (!type) return undefined;
  const from = d.from === undefined ? undefined : stateWords(d.from);
  const to = d.to === undefined ? undefined : stateWords(d.to);
  const emergency = d.changeContext === "emergency_contact" ? " (emergency contact)" : "";
  if (from && to) return `${type}${emergency}: ${from} to ${to}`;
  return `${type}${emergency}`;
}

export function describeEntry(entry: AuditEntry): DescribedEntry {
  const d = entry.details;
  const change = changeWords(d);
  const base = { entry };

  switch (entry.event) {
    case "system.seeded":
      return {
        ...base,
        title: "Demo data set up",
        summary: `${d.states ?? "Some"} starting consent settings were created`,
        meaning: "This is the fictional data the prototype starts with.",
        tone: "neutral",
      };

    case "request.received":
      return {
        ...base,
        title: "Request received",
        summary: change,
        tone: "neutral",
      };

    case "request.rejected":
      return {
        ...base,
        title: "Request refused",
        summary: str(d.reason) ?? change,
        meaning: "Nothing was changed in any system.",
        tone: "bad",
      };

    case "consent.change_requested":
      return {
        ...base,
        title: "Change requested",
        summary: change,
        tone: "neutral",
      };

    case "approval.requested":
    case "approval.pending":
      return {
        ...base,
        title: "Sent for staff approval",
        summary: change,
        meaning: "Nothing has changed yet. It is waiting for a decision.",
        tone: "warn",
      };

    case "approval.approved":
      return {
        ...base,
        title: `Approved by ${str(d.staffId) ?? "staff"}`,
        summary: change,
        meaning: str(d.reasonCode)
          ? `Reason recorded: ${String(d.reasonCode).replace(/_/g, " ")}`
          : undefined,
        tone: "good",
      };

    case "approval.rejected":
      return {
        ...base,
        title: `Declined by ${str(d.staffId) ?? "staff"}`,
        summary: str(d.reason) ?? change,
        meaning: "Nothing was changed in any system.",
        tone: "bad",
      };

    case "restriction.scheduled":
      return {
        ...base,
        title: "Medical restriction scheduled",
        summary: change,
        meaning: `The medical note is restricted, not deleted. The restriction must be complete by ${String(d.restrictionDueBy ?? "the deadline").slice(0, 10)} (${String(d.restrictionDays ?? "")} calendar days).`,
        tone: "good",
      };

    case "medical.restriction.completed":
      return {
        ...base,
        title: "Medical restriction completed",
        summary: `${str(d.staffId) ?? "Staff"} confirmed the medical note is restricted`,
        meaning:
          d.onTime === true
            ? "The restriction was finished on time. The note is restricted, not deleted."
            : `The restriction was finished after the deadline (${String(d.restrictionDueBy ?? "").slice(0, 10)}). The note is restricted, not deleted.`,
        tone: d.onTime === true ? "good" : "warn",
      };

    case "medical.restriction.completion_denied":
      return {
        ...base,
        title: "Blocked - wrong role",
        summary: `${str(d.staffId) ?? "A staff member"} tried to mark a medical restriction completed. It needs ${roleWords(d.requiredRole)}.`,
        meaning: "The system stopped them. Nothing was changed.",
        tone: "warn",
      };

    case "audit.viewed":
      return {
        ...base,
        title: "A stored record was opened",
        summary: `Entry ${String(d.viewedIndex ?? "?")} opened by ${str(d.staffId) ?? str(d.parentId) ?? "a user"}`,
        meaning: `Reason recorded: ${String(d.reasonCode ?? "not given").replace(/_/g, " ")}.`,
        tone: "neutral",
      };

    case "audit.view_denied":
      return {
        ...base,
        title: "Opening a record was refused",
        summary: `${str(d.staffId) ?? str(d.parentId) ?? "A user"} tried to open entry ${String(d.viewedIndex ?? "?")}`,
        meaning: "That record is not available to their role. Nothing was shown.",
        tone: "warn",
      };

    case "approval.escalated":
      return {
        ...base,
        title: `Escalated to ${str(d.escalatedTo) ?? "another officer"}`,
        summary: change,
        meaning: `Waiting ${String(d.workingDaysWaiting ?? "2+")} working days. It is still pending and has not been approved. Only ${roleWords(d.requiredRole)} can decide it.`,
        tone: "warn",
      };

    case "approval.denied":
      return {
        ...base,
        title: "Blocked — wrong role",
        summary: `${str(d.staffId) ?? "A staff member"} tried to decide this. It needs ${roleWords(d.requiredRole)}.`,
        // Must not read as a refusal: the request is untouched and still live.
        meaning: `The system stopped them. Nothing was changed, and the request is still waiting for ${roleWords(d.requiredRole)}.`,
        tone: "warn",
      };

    case "system.updated":
      return {
        ...base,
        title: `${str(d.system) ?? "A system"} updated`,
        summary: str(d.summary),
        tone: "good",
      };

    case "system.update_failed":
      return {
        ...base,
        title: `${str(d.system) ?? "A system"} did not update`,
        summary: str(d.summary),
        meaning: "The change is not complete until every system has followed.",
        tone: "bad",
      };

    case "change.complete":
      return {
        ...base,
        title: "Change complete",
        summary: change,
        meaning: "Every affected system followed this change.",
        tone: "good",
      };

    case "change.incomplete":
      return {
        ...base,
        title: "Change not complete",
        summary: change,
        meaning: "At least one system did not update.",
        tone: "bad",
      };

    case "change.retry":
      return {
        ...base,
        title: "Change retried",
        summary: change,
        tone: "neutral",
      };

    case "ai.draft_created":
      return {
        ...base,
        title: "Draft prepared from a message",
        summary: change,
        meaning:
          "Only a draft. Nothing was submitted until the parent confirmed it. The message itself is not stored.",
        tone: "neutral",
      };

    case "ai.draft_confirmed":
      return {
        ...base,
        title: "Draft confirmed with a PIN",
        summary: change,
        meaning: "The parent confirmed the drafted request with their PIN. It was then submitted like any other request.",
        tone: "neutral",
      };

    case "ai.draft_pin_failed":
      return {
        ...base,
        title: "Wrong PIN entered",
        summary: change,
        meaning: "A drafted request was not submitted because the PIN was wrong.",
        tone: "warn",
      };

    case "consent.pin_failed":
      return {
        ...base,
        title: "Wrong PIN entered",
        summary: change,
        meaning: "A consent switch was not applied because the PIN was wrong.",
        tone: "warn",
      };

    case "audit.archived":
      return {
        ...base,
        title: "Older entries archived",
        summary: `${d.removedCount ?? "Some"} entries were moved out of this record`,
        tone: "neutral",
      };

    default:
      return {
        ...base,
        title: entry.event.replace(/[._]/g, " "),
        summary: change,
        tone: "neutral",
      };
  }
}

/**
 * A group of entries that belong to the same consent change.
 *
 * One change produces up to six entries. Showing them as six unrelated rows
 * makes the reader reassemble the story themselves; grouping tells it.
 */
export interface EntryGroup {
  key: string;
  /** Headline for the whole group, e.g. "Contact Details: not set to granted". */
  heading?: string;
  learnerId?: string;
  parentId?: string;
  verificationMethod?: string;
  /** Latest timestamp in the group. */
  at: string;
  steps: DescribedEntry[];
  /** Overall outcome, taken from the strongest signal in the group. */
  outcome:
    | "complete"
    | "waiting"
    | "refused"
    | "incomplete"
    | "blocked"
    | "other";
  /**
   * "change" is something a parent asked for. "system" is housekeeping — the
   * demo seed, an archive run. Both belong in the record, but housekeeping is
   * not a consent decision and must not sit alongside them as an equal.
   */
  kind: "change" | "system";
  /**
   * Whether this group contains the parent's own request. The verification
   * footer describes how the *parent* was checked, so it must not appear on a
   * card that only shows a staff action — it reads as if the staff member was
   * verified that way.
   */
  hasParentRequest: boolean;
}

/** Events that are housekeeping rather than a consent decision. */
const SYSTEM_EVENTS = new Set(["system.seeded", "audit.archived"]);

/** Events that represent the parent asking for something. */
const PARENT_REQUEST_EVENTS = new Set([
  "request.received",
  "request.rejected",
  "consent.change_requested",
  "approval.requested",
  "approval.pending",
  "ai.draft_created",
]);

function outcomeOf(steps: DescribedEntry[]): EntryGroup["outcome"] {
  const events = new Set(steps.map((s) => s.entry.event));
  if (events.has("change.complete")) return "complete";

  // A genuine refusal: the parent was not verified, or the officer whose
  // decision it actually was declined it.
  //
  // `approval.denied` is NOT a refusal — it means the WRONG role tried to
  // decide and the system stopped them. The request itself is untouched and
  // still waiting. Treating the two the same told a parent their medical
  // consent change had been refused when nobody had decided anything.
  if (events.has("request.rejected") || events.has("approval.rejected"))
    return "refused";

  if (events.has("change.incomplete") || events.has("system.update_failed"))
    return "incomplete";
  if (events.has("approval.requested") || events.has("approval.pending"))
    return "waiting";
  // Only a blocked attempt is visible here (a staff member seeing their own
  // action on a request that is not theirs). Still waiting, nothing changed.
  if (events.has("approval.denied")) return "blocked";
  // An escalated request is still pending: escalation decides nothing.
  if (events.has("approval.escalated")) return "waiting";
  return "other";
}

export function groupEntries(entries: readonly AuditEntry[]): EntryGroup[] {
  const groups = new Map<string, EntryGroup>();
  const order: string[] = [];

  for (const entry of entries) {
    const d = entry.details;
    // changeId first: a queued change is logged when it is submitted and
    // again when staff decide it, and only changeId spans both. requestId
    // covers immediate changes, which have no changeId. Anything with
    // neither stands on its own.
    const key =
      str(d.changeId) ?? str(d.requestId) ?? `single:${entry.index}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        heading: changeWords(d),
        learnerId: str(d.learnerId),
        parentId: str(d.parentId),
        verificationMethod: str(d.verificationMethod),
        at: entry.timestamp,
        steps: [],
        outcome: "other",
        kind: "change",
        hasParentRequest: false,
      };
      groups.set(key, group);
      order.push(key);
    }
    group.steps.push(describeEntry(entry));
    group.heading ??= changeWords(d);
    group.learnerId ??= str(d.learnerId);
    group.parentId ??= str(d.parentId);
    group.verificationMethod ??= str(d.verificationMethod);
    if (SYSTEM_EVENTS.has(entry.event)) group.kind = "system";
    if (PARENT_REQUEST_EVENTS.has(entry.event)) group.hasParentRequest = true;
    if (entry.timestamp > group.at) group.at = entry.timestamp;
  }

  for (const group of groups.values()) {
    group.outcome = outcomeOf(group.steps);
  }

  // Newest first.
  return order.map((k) => groups.get(k)!).reverse();
}

