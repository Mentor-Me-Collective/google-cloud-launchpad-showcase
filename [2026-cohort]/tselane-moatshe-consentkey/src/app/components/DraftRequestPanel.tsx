"use client";

/**
 * Write-what-you-want panel, backed by NVIDIA NIM.
 *
 * The model only ever produces a draft. Nothing is submitted until the parent
 * presses "Yes, submit this" — at which point it goes through the ordinary
 * consent-change endpoint and the ordinary approval rules. If the model cannot
 * tell what the parent meant, we ask instead of guessing.
 * (Decision 7, docs/legal-decisions-log.md.)
 */

import { useId, useState } from "react";
import ChangeResultView from "./ChangeResultView";
import type { SerializedChange } from "./types";
import { roleLabel } from "@/approval/approvalRules";
import type { StaffRole } from "@/approval/approvalRules";

interface Draft {
  type: string;
  from: string;
  to: string;
  changeContext: "standard" | "emergency_contact";
  summary: string;
}

interface DraftResponse {
  clear: boolean;
  draftId?: string;
  message?: string;
  draft?: Draft;
  confirmation?: string;
  requiredRole?: StaffRole | null;
  nextStep?: string;
}

type Stage =
  | { kind: "idle" }
  | { kind: "asking"; message: string }
  | { kind: "confirming"; data: DraftResponse; pinError?: string }
  | { kind: "submitted"; message: string }
  | { kind: "done"; result: SerializedChange }
  | { kind: "error"; message: string };

const MAX_LENGTH = 2000;
const AI_UNAVAILABLE = "The AI helper is unavailable, please use the manual form";
const CLIENT_TIMEOUT_MS = 20_000;

export default function DraftRequestPanel({ onChanged }: { onChanged: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState("");
  const pinId = useId();
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const fieldId = useId();
  const hintId = useId();

  async function askForDraft() {
    if (busy || !text.trim()) return;
    setBusy(true);
    setStage({ kind: "idle" });
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
      });
      const data = (await res.json()) as DraftResponse & { error?: string };
      if (!res.ok) {
        // The typed text stays in the box; the manual switches are below.
        setStage({ kind: "error", message: data.error ?? AI_UNAVAILABLE });
      } else if (!data.clear) {
        setStage({ kind: "asking", message: data.message ?? "" });
      } else {
        setStage({ kind: "confirming", data });
      }
    } catch {
      setStage({ kind: "error", message: AI_UNAVAILABLE });
    } finally {
      setBusy(false);
    }
  }

  async function confirm(data: DraftResponse) {
    if (busy || !data.draftId) return;
    setBusy(true);
    try {
      // The server holds the validated draft. Only its id and the PIN go back.
      const res = await fetch("/api/ai/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: data.draftId, pin }),
      });
      const out = await res.json();
      setPin("");
      if (!res.ok) {
        const message = out.error ?? "That change didn’t go through.";
        // A wrong PIN keeps the draft so the parent can try again.
        setStage(res.status === 403 ? { kind: "confirming", data, pinError: message } : { kind: "error", message });
      } else if (out.status === "pending_approval") {
        setStage({ kind: "submitted", message: out.message });
        setText("");
        onChanged();
      } else {
        setStage({ kind: "done", result: out.result as SerializedChange });
        setText("");
        onChanged();
      }
    } catch {
      setStage({ kind: "error", message: "Couldn’t reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="entry">
      <div className="type">Ask in your own words</div>
      <div className="affects">
        Describe the change and we will fill in the form for you. Nothing is
        submitted until you confirm it.
      </div>

      <div style={{ marginTop: 12, maxWidth: 560 }}>
        <label htmlFor={fieldId} className="muted" style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
          Your message
        </label>
        <textarea
          id={fieldId}
          className="field"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="e.g. Please stop using photos of my child on the school website."
          disabled={busy}
          maxLength={MAX_LENGTH}
          aria-describedby={hintId}
        />
        <p id={hintId} className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
          Please do not include health details. Your message is sent to NVIDIA
          NIM to draft the request and is not stored in the audit trail.
        </p>
        <div className="actions" style={{ marginTop: 10 }}>
          <button
            className="btn btn--primary btn--sm"
            disabled={busy || !text.trim()}
            onClick={askForDraft}
          >
            Draft my request
          </button>
          {busy && <span className="spinner" aria-hidden="true" />}
        </div>
      </div>

      <div className="result-slot">
        {stage.kind === "asking" && (
          <div className="note warn" role="status">
            {stage.message}
          </div>
        )}

        {stage.kind === "confirming" && stage.data.draft && (
          <div className="note info" role="status">
            <p style={{ margin: 0 }}>
              <b>{stage.data.confirmation}</b>
            </p>
            <p style={{ margin: "6px 0 0" }}>{stage.data.draft.summary}</p>
            <p style={{ margin: "6px 0 0" }} className="muted">
              {stage.data.nextStep}
              {stage.data.requiredRole
                ? ` (${roleLabel(stage.data.requiredRole)})`
                : ""}
            </p>
            <label htmlFor={pinId} className="muted" style={{ fontSize: 13, display: "block", margin: "10px 0 6px" }}>
              Your PIN (4 to 8 digits) to confirm
            </label>
            <input
              id={pinId}
              className="field"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pin}
              disabled={busy}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              style={{ maxWidth: 160 }}
            />
            {stage.pinError && (
              <div className="note bad" role="alert" style={{ marginTop: 8 }}>
                {stage.pinError}
              </div>
            )}
            <div className="actions" style={{ marginTop: 10 }}>
              <button
                className="btn btn--primary btn--sm"
                disabled={busy || pin.length < 4}
                onClick={() => confirm(stage.data)}
              >
                Confirm with PIN and submit
              </button>
              <button
                className="btn btn--quiet btn--sm"
                disabled={busy}
                onClick={() => {
                  setPin("");
                  setStage({ kind: "idle" });
                }}
              >
                No, cancel
              </button>
            </div>
          </div>
        )}

        {stage.kind === "submitted" && (
          <div className="note info" role="status">{stage.message}</div>
        )}
        {stage.kind === "error" && (
          <div className="note bad" role="alert">{stage.message}</div>
        )}
        {stage.kind === "done" && <ChangeResultView result={stage.result} />}
      </div>
    </div>
  );
}
