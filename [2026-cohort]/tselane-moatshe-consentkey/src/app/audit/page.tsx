"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "../components/Nav";
import { groupEntries, verificationWords } from "@/audit/describe";
import type { DescribedEntry, EntryGroup, Tone } from "@/audit/describe";
import type { AuditEntry } from "@/audit/auditLog";
import { VIEW_REASONS } from "@/audit/viewControl";

interface AuditResponse {
  entries: AuditEntry[];
  verify: { ok: true } | { ok: false; brokenAtIndex: number; reason: string };
  firestoreEnabled: boolean;
  scope: "family" | "role";
  roleLabel: string | null;
  shown: number;
  chainLength: number;
}

const OUTCOME: Record<EntryGroup["outcome"], { label: string; tone: Tone }> = {
  complete: { label: "Complete", tone: "good" },
  waiting: { label: "Waiting for approval", tone: "warn" },
  refused: { label: "Refused", tone: "bad" },
  incomplete: { label: "Not complete", tone: "bad" },
  // Nobody has decided this yet — it is still live, so it must not look
  // like a refusal.
  blocked: { label: "Still waiting", tone: "warn" },
  other: { label: "Recorded", tone: "neutral" },
};

function StepIcon({ tone }: { tone: Tone }) {
  if (tone === "good")
    return (
      <svg className="trail-step-icon" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 8.5 6.5 12 13 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (tone === "bad")
    return (
      <svg className="trail-step-icon" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
      </svg>
    );
  if (tone === "warn")
    return (
      <svg className="trail-step-icon" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 5v3.5l2 1.5" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg className="trail-step-icon" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <circle cx="8" cy="8" r="3" />
    </svg>
  );
}

function Step({
  step,
  fmt,
  heading,
  hideTitle = false,
}: {
  step: DescribedEntry;
  /** Formats this step's time. Every step gets one — on an audit trail,
   *  when each action happened is the point, so it is never omitted. */
  fmt: (iso: string) => string;
  /** The group's headline, so a step doesn't repeat what's already above it. */
  heading?: string;
  /** True when the card header already says this step's title. */
  hideTitle?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Opening the stored record is controlled and logged (plan phase 3): the
  // server checks access, records who/when/why, and returns the record.
  const [reasonCode, setReasonCode] = useState("");
  const [record, setRecord] = useState<AuditEntry | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const { entry: listed } = step;
  const entry = record ?? listed;

  async function openRecord() {
    if (!reasonCode || viewing) return;
    setViewing(true);
    setViewError(null);
    try {
      const res = await fetch("/api/audit/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryIndex: listed.index, reasonCode }),
      });
      const data = await res.json();
      if (!res.ok) setViewError(data.error ?? "That record could not be opened.");
      else setRecord(data.entry as AuditEntry);
    } catch {
      setViewError("Could not reach the server. Try again.");
    } finally {
      setViewing(false);
    }
  }
  const summary = step.summary === heading ? undefined : step.summary;

  return (
    <li className={`trail-step trail-step--${step.tone}`}>
      <span className="trail-step-marker" aria-hidden="true">
        <StepIcon tone={step.tone} />
      </span>
      <div className="trail-step-body">
        {!hideTitle && (
          <p className="trail-step-title">
            {step.title}
            <time className="trail-step-when" dateTime={entry.timestamp}>
              {fmt(entry.timestamp)}
            </time>
          </p>
        )}
        {summary && <p className="trail-step-summary">{summary}</p>}
        {step.meaning && <p className="trail-step-meaning">{step.meaning}</p>}

        <button
          type="button"
          className="trail-step-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide" : "Show"} the stored record
        </button>

        {open && !record && (
          <div className="trail-step-raw">
            <label className="muted" style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
              Why are you opening this record? Opening it is written to the audit trail.
              <select
                className="field"
                value={reasonCode}
                disabled={viewing}
                onChange={(e) => setReasonCode(e.target.value)}
                style={{ display: "block", marginTop: 6 }}
              >
                <option value="">Choose a reason</option>
                {VIEW_REASONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={!reasonCode || viewing}
              onClick={openRecord}
              style={{ marginTop: 8 }}
            >
              Open the record
            </button>
            {viewError && <div className="note bad" role="alert">{viewError}</div>}
          </div>
        )}

        {open && record && (
          <div className="trail-step-raw">
            <dl>
              <dt>Entry number</dt>
              <dd className="tnum">{entry.index}</dd>
              <dt>Event name</dt>
              <dd translate="no">{entry.event}</dd>
              <dt>Recorded at</dt>
              <dd>{entry.timestamp}</dd>
              <dt>Fingerprint</dt>
              <dd className="mono-wrap">{entry.hash}</dd>
              <dt>Links back to</dt>
              <dd className="mono-wrap">{entry.prevHash || "— first entry in the chain"}</dd>
            </dl>
            <p className="trail-step-raw-label">Stored details</p>
            <pre>{JSON.stringify(entry.details, null, 2)}</pre>
          </div>
        )}
      </div>
    </li>
  );
}

function Group({
  group,
  fmt,
  fmtTime,
}: {
  group: EntryGroup;
  /** Full date and time, for the card header and the first step. */
  fmt: Intl.DateTimeFormat;
  /** Time only, to the second — later steps in the same change happen
   *  seconds apart, so the date would repeat but the time genuinely differs. */
  fmtTime: Intl.DateTimeFormat;
}) {
  const outcome = OUTCOME[group.outcome];
  // Housekeeping entries (one step, no consent change behind them) borrow the
  // step's own title as the card heading, so it must not be printed twice.
  const singleStep = group.steps.length === 1 && !group.heading;
  const heading = group.heading ?? group.steps[0]?.title ?? "Record";

  return (
    <article
      className={`trail-group trail-group--${outcome.tone}${singleStep ? " trail-group--quiet" : ""}`}
    >
      <header className="trail-head">
        <div>
          <h3>{heading}</h3>
          <p className="trail-meta">
            {group.parentId && <>Requested by {group.parentId}</>}
            {group.parentId && group.learnerId && " · "}
            {group.learnerId && <>for {group.learnerId}</>}
            {(group.parentId || group.learnerId) && " · "}
            {fmt.format(new Date(group.at))}
          </p>
        </div>
        {!singleStep && (
          <span className={`trail-outcome trail-outcome--${outcome.tone}`}>
            {outcome.label}
          </span>
        )}
      </header>

      <ol className="trail-steps">
        {group.steps.map((s, i) => (
          <Step
            key={s.entry.index}
            step={s}
            // The first step carries the full date; the rest are seconds
            // apart on the same day, so only the time needs repeating.
            fmt={(iso) =>
              (i === 0 ? fmt : fmtTime).format(new Date(iso))
            }
            heading={group.heading}
            hideTitle={singleStep}
          />
        ))}
      </ol>

      {/* Describes how the PARENT was checked, so it only belongs on a card
          that actually contains the parent's request. */}
      {group.verificationMethod && group.hasParentRequest && (
        <p className="trail-foot">
          Identity checked using {verificationWords(group.verificationMethod)}
        </p>
      )}
    </article>
  );
}

export default function AuditPage() {
  const router = useRouter();
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refusal, setRefusal] = useState<string | null>(null);

  const fmt = useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }),
    [],
  );
  // Steps within one change are seconds apart, so seconds are what make them
  // distinguishable — "7:40:55" vs "7:40:56", not two identical "7:40 PM".
  const fmtTime = useMemo(
    () => new Intl.DateTimeFormat(undefined, { timeStyle: "medium" }),
    [],
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/audit");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    if (res.status === 403) {
      setRefusal(((await res.json()) as { error?: string }).error ?? "Your role cannot open this page.");
      setLoading(false);
      return;
    }
    setData((await res.json()) as AuditResponse);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(
    () => (data ? groupEntries(data.entries) : []),
    [data],
  );
  // Consent decisions lead the page. Housekeeping (the demo seed, archive
  // runs) is still part of the record but is not a consent decision, so it
  // does not sit among them or inflate the count.
  const records = useMemo(() => groups.filter((g) => g.kind === "change"), [groups]);
  const systemEvents = useMemo(() => groups.filter((g) => g.kind === "system"), [groups]);

  return (
    <main id="main" className="doc">
      <Nav />

      {refusal ? (
        <div className="note bad" role="alert" style={{ marginTop: 20 }}>{refusal}</div>
      ) : loading || !data ? (
        <div className="loading-row" aria-live="polite">
          <span className="spinner" aria-hidden="true" /> Loading the record…
        </div>
      ) : (
        <>
          <section className="record">
            <p className="record-kicker">Tamper-evident record</p>
            {/* Staff are not parents — do not tell an Admin Officer this is
                "your consent". */}
            <h1>
              {data.scope === "family"
                ? "What happened to your consent"
                : "Consent audit trail"}
            </h1>
            <p className="lede">
              {data.scope === "family"
                ? "Every action on your child’s consent is written here and sealed to the one before it. If any line were changed or removed, the seal would break and this page would say so."
                : "Every consent action is written here and sealed to the one before it. If any line were changed or removed, the seal would break and this page would say so."}
            </p>

            <div className="stamps">
              {data.verify.ok ? (
                <span className="stamp ok">
                  <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8.5 6.5 12 13 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Nothing has been tampered with
                </span>
              ) : (
                <span className="stamp" style={{ color: "var(--withdrawn)" }}>
                  Seal broken at entry {data.verify.brokenAtIndex}
                </span>
              )}
              <span className={`stamp ${data.firestoreEnabled ? "ok" : "off"}`}>
                {data.firestoreEnabled ? "Saved permanently" : "Not saved (in-memory only)"}
              </span>
            </div>

            <div className="note" role="note">
              {data.scope === "family" ? (
                <>
                  <b>You are seeing your family&rsquo;s record only.</b> Other
                  families&rsquo; entries are never shown to you. The check
                  above still covers the entire record — all{" "}
                  <span className="tnum">{data.chainLength}</span> entries — not
                  just the <span className="tnum">{data.shown}</span> you can
                  see here.
                </>
              ) : (
                <>
                  <b>
                    You are seeing the requests your role handles
                    {data.roleLabel ? ` as ${data.roleLabel}` : ""}, plus your
                    own actions.
                  </b>{" "}
                  The check above still covers the entire record — all{" "}
                  <span className="tnum">{data.chainLength}</span> entries — not
                  just the <span className="tnum">{data.shown}</span> shown.
                </>
              )}
            </div>
          </section>

          {!data.verify.ok && (
            <div className="note bad" role="alert">
              <b>Tamper detected.</b> The record was altered at entry{" "}
              {data.verify.brokenAtIndex} ({data.verify.reason}). Everything
              from that point on can no longer be trusted.
            </div>
          )}

          <div className="section">
            <h2>
              {records.length === 1 ? "1 consent record" : `${records.length} consent records`}
            </h2>
            <button className="btn btn--quiet btn--sm" onClick={load}>
              Refresh
            </button>
          </div>

          {records.length === 0 ? (
            <div className="note" role="status">
              No consent changes have been recorded yet. Change a consent
              setting and it will appear here.
            </div>
          ) : (
            <div className="trail">
              {records.map((g) => (
                <Group key={g.key} group={g} fmt={fmt} fmtTime={fmtTime} />
              ))}
            </div>
          )}

          {systemEvents.length > 0 && (
            <details className="system-events">
              <summary>
                {systemEvents.length === 1
                  ? "1 system event"
                  : `${systemEvents.length} system events`}{" "}
                <span className="muted">
                  — set-up and housekeeping, not consent decisions
                </span>
              </summary>
              <div className="trail">
                {systemEvents.map((g) => (
                  <Group key={g.key} group={g} fmt={fmt} fmtTime={fmtTime} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </main>
  );
}
