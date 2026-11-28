"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "../components/Nav";
import Pill from "../components/Pill";
import NotificationBell from "../components/NotificationBell";
import ChangeResultView from "../components/ChangeResultView";
import type { SerializedChange, MeStaff } from "../components/types";
import { REASON_MAX_LENGTH, roleLabel } from "@/approval/approvalRules";
import type { StaffRole } from "@/approval/approvalRules";
import type { ReasonOption } from "@/approval/decisionReasons";
import { ESCALATION_WORKING_DAYS } from "@/approval/escalation";

interface QueueItem {
  id: string;
  type: string;
  from: string;
  to: string;
  changeContext: "standard" | "emergency_contact";
  learnerId: string;
  learnerName: string;
  parentName: string;
  parentId: string;
  createdAt: string;
  requiredRole: StaffRole | null;
  canApprove: boolean;
  escalation: {
    state: "within_limit" | "overdue";
    escalated: boolean;
    escalatedTo: string | null;
    workingDaysWaiting: number;
  };
  reasonRequired: boolean;
  restrictionDays: number | null;
  alternativeNumber: string | null;
  approveReasons: ReasonOption[];
  declineReasons: ReasonOption[];
}

interface ApprovalsResponse {
  identity: MeStaff;
  queue: QueueItem[];
  firestoreEnabled: boolean;
  withOtherRoles: number;
}

const words = (s: string) => (s === "not_set" ? "not set" : s);

function RequestRow({ item, onDecided }: { item: QueueItem; onDecided: () => void }) {
  const [reason, setReason] = useState("");
  // Which way the officer is leaning decides which reason list to show.
  const [intent, setIntent] = useState<"approve" | "decline">("approve");
  const [reasonCode, setReasonCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SerializedChange | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reasonId = useId();
  const hintId = useId();
  const codeId = useId();

  const options = intent === "approve" ? item.approveReasons : item.declineReasons;

  async function decide(approved: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/approvals/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeId: item.id,
          approved,
          reason,
          reasonCode: reasonCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "That didn’t go through. Try again.");
      else {
        setResult(data.result as SerializedChange);
        setTimeout(onDecided, 1400);
      }
    } catch {
      setError("Couldn’t reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="entry">
      <div className="type">
        {item.type}
        {item.changeContext === "emergency_contact" && (
          <span className="meta" style={{ marginLeft: 8 }}>emergency contact</span>
        )}
      </div>
      <div className="affects">
        Change from {words(item.from)} to {words(item.to)}, for {item.learnerName}
      </div>
      <div className="rule-note">
        Requested by {item.parentName}. Needs {roleLabel(item.requiredRole)}’s sign-off.
      </div>

      {item.restrictionDays !== null && item.canApprove && (
        <div className="rule-note">
          If you approve, the medical note is restricted (kept, not deleted) and
          the medical flag is removed from trip lists. The restriction must be
          complete within {item.restrictionDays} calendar days.
        </div>
      )}

      {item.alternativeNumber && (
        <div className="rule-note">
          Alternative number given: {item.alternativeNumber}. It is added
          alongside the existing number if you approve.
        </div>
      )}

      {item.escalation.state === "overdue" && (
        <div className="note warn" role="status" style={{ marginTop: 8 }}>
          <b>Overdue{item.escalation.escalatedTo ? `, escalated to ${item.escalation.escalatedTo}` : ""}.</b>{" "}
          Waiting {item.escalation.workingDaysWaiting} working
          days, past the {ESCALATION_WORKING_DAYS}-day limit. It has not been
          approved and never will be automatically — it still needs your
          decision.
        </div>
      )}

      <div className="control">
        <Pill status="pending_approval" />
      </div>

      <div className="result-slot">
        {!result && !item.canApprove && (
          <div className="note info" role="status" style={{ marginTop: 12 }}>
            Escalated to you for visibility. It stays with {roleLabel(item.requiredRole)}
            , who must decide it. You cannot approve or decline it.
          </div>
        )}
        {!result && item.canApprove && (
          <div style={{ marginTop: 12, maxWidth: 440 }}>
            <fieldset style={{ border: 0, padding: 0, margin: "0 0 12px" }}>
              <legend className="muted" style={{ fontSize: 13, padding: 0, marginBottom: 6 }}>
                Deciding to
              </legend>
              <div className="actions">
                {(["approve", "decline"] as const).map((v) => (
                  <label key={v} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="radio"
                      name={`intent-${item.id}`}
                      checked={intent === v}
                      disabled={busy}
                      onChange={() => {
                        setIntent(v);
                        setReasonCode("");
                      }}
                    />
                    <span>{v === "approve" ? "Approve" : "Decline"}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label htmlFor={codeId} className="muted" style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
              Reason{item.reasonRequired ? " (required)" : " (optional)"}
            </label>
            <select
              id={codeId}
              className="field"
              value={reasonCode}
              disabled={busy}
              onChange={(e) => setReasonCode(e.target.value)}
              style={{ marginBottom: 12 }}
            >
              <option value="">
                {item.reasonRequired ? "Choose a reason…" : "No reason given"}
              </option>
              {options.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>

            <label htmlFor={reasonId} className="muted" style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
              Note{reasonCode === "other" ? " (required)" : " (optional)"} — shown to the parent if you decline
            </label>
            <input
              id={reasonId}
              className="field"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX_LENGTH))}
              placeholder="e.g. trip is already full…"
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
              maxLength={REASON_MAX_LENGTH}
              aria-describedby={hintId}
            />
            <p id={hintId} className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
              Do not include health details or any other personal information.
              {item.type === "Medical" &&
                " For Medical decisions the server checks the note and refuses it if it looks like it names a condition, medication or allergy."}
              {" "}This reason is written to the audit trail and shown to the parent.
              <span className="tnum"> {reason.length}/{REASON_MAX_LENGTH}</span>
            </p>
            <div className="actions" style={{ marginTop: 10 }}>
              {intent === "approve" ? (
                <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => decide(true)}>
                  Record approval
                </button>
              ) : (
                <button className="btn btn--danger btn--sm" disabled={busy} onClick={() => decide(false)}>
                  Record decline
                </button>
              )}
              {busy && <span className="spinner" aria-hidden="true" />}
            </div>
          </div>
        )}
        {error && <div className="note bad" role="alert">{error}</div>}
        {result && <ChangeResultView result={result} />}
      </div>
    </div>
  );
}

interface OpenRestriction {
  learnerId: string;
  learnerName: string;
  restrictionDueBy: string;
  overdue: boolean;
}

/** S-02 only: restricted medical notes still waiting to be marked completed. */
function RestrictionsSection({ staffId }: { staffId: string }) {
  const [items, setItems] = useState<OpenRestriction[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/approvals/restriction/complete");
    if (res.ok) setItems(((await res.json()) as { restrictions: OpenRestriction[] }).restrictions);
  }, []);

  useEffect(() => {
    if (staffId === "S-02") load();
  }, [staffId, load]);

  if (staffId !== "S-02") return null;

  async function complete(learnerId: string) {
    if (busyId) return;
    setBusyId(learnerId);
    setMessage(null);
    try {
      const res = await fetch("/api/approvals/restriction/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerId }),
      });
      const data = (await res.json()) as { error?: string; onTime?: boolean; status?: string };
      if (!res.ok) setMessage({ tone: "bad", text: data.error ?? "That did not go through." });
      else
        setMessage({
          tone: "good",
          text:
            data.status === "already_completed"
              ? "That restriction was already marked completed."
              : data.onTime
                ? "Restriction marked completed, on time."
                : "Restriction marked completed, after the deadline.",
        });
      await load();
    } catch {
      setMessage({ tone: "bad", text: "Could not reach the server. Try again." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="section">
        <h2>Open medical restrictions</h2>
        <span className="meta tnum">{items.length} open</span>
      </div>
      {message && (
        <div className={`note ${message.tone}`} role="status">{message.text}</div>
      )}
      {items.length === 0 ? (
        <div className="note good" role="status">No medical restrictions are waiting to be completed.</div>
      ) : (
        <div className="register">
          {items.map((r) => (
            <div className="entry" key={r.learnerId}>
              <div className="type">{r.learnerName}</div>
              <div className="rule-note">
                Restriction due by {r.restrictionDueBy.slice(0, 10)}
                {r.overdue ? " (overdue)" : ""}. The note is restricted, not deleted.
              </div>
              <div className="actions" style={{ marginTop: 10 }}>
                <button
                  className="btn btn--primary btn--sm"
                  disabled={busyId !== null}
                  onClick={() => complete(r.learnerId)}
                >
                  Mark restriction completed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function StaffPage() {
  const router = useRouter();
  const [data, setData] = useState<ApprovalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refusal, setRefusal] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/approvals");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    if (res.status === 403) {
      setRefusal(((await res.json()) as { error?: string }).error ?? "Your role cannot open this page.");
      setLoading(false);
      return;
    }
    setData((await res.json()) as ApprovalsResponse);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main id="main" className="doc">
      <Nav />
      <NotificationBell />

      {refusal ? (
        <div className="note bad" role="alert" style={{ marginTop: 20 }}>{refusal}</div>
      ) : loading || !data ? (
        <div className="loading-row" aria-live="polite">
          <span className="spinner" aria-hidden="true" /> Loading requests…
        </div>
      ) : (
        <>
          <section className="record">
            <p className="record-kicker">Awaiting your sign-off</p>
            <h1>Consent requests</h1>
            <p className="lede">
              You’re {data.identity.name}, {data.identity.roleLabel}. You see and
              sign off only the consent types your role is responsible for.
              Requests for other roles are not shown to you.
            </p>
          </section>

          <div className="section">
            <h2>Requests</h2>
            <span className="meta tnum">
              {data.queue.length} {data.queue.length === 1 ? "request" : "requests"}
            </span>
          </div>

          {data.withOtherRoles > 0 && (
            <div className="note" role="status">
              {data.withOtherRoles === 1
                ? "1 other request is with a different role"
                : `${data.withOtherRoles} other requests are with a different role`}{" "}
              and is not shown to you.
            </div>
          )}

          {data.queue.length === 0 ? (
            <div className="note good" role="status">
              Nothing to sign off right now. New requests that need your role will
              appear here.
            </div>
          ) : (
            <div className="register">
              {data.queue.map((item) => (
                <RequestRow key={item.id} item={item} onDecided={load} />
              ))}
            </div>
          )}

          <RestrictionsSection staffId={data.identity.staffId} />
        </>
      )}
    </main>
  );
}
