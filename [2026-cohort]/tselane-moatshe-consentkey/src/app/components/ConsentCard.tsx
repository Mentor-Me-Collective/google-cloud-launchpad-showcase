"use client";

import { useId, useState } from "react";
import Pill from "./Pill";
import ChangeResultView from "./ChangeResultView";
import PinDialog from "./PinDialog";
import type { SerializedChange } from "./types";
import { roleLabel } from "@/approval/approvalRules";
import type { StaffRole } from "@/approval/approvalRules";

export interface ConsentItem {
  type: string;
  state: string;
  requiresApproval: boolean;
  requiredRole: StaffRole | null;
  /** Role needed when the parent marks the change as an emergency contact. */
  emergencyContactRole: StaffRole | null;
  systems: string[];
}

type Outcome =
  | { kind: "none" }
  | { kind: "pending"; message: string }
  | { kind: "error"; message: string }
  | { kind: "done"; result: SerializedChange };

/** One ruled entry in the consent register. */
export default function ConsentCard({
  item,
  onChanged,
}: {
  item: ConsentItem;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  // The switch only opens this dialog. Nothing is sent until a PIN is entered.
  const [asking, setAsking] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "none" });
  const [emergency, setEmergency] = useState(false);
  const emergencyId = useId();
  const altId = useId();
  const [altNumber, setAltNumber] = useState("");

  const granted = item.state === "granted";
  const target = granted ? "withdrawn" : "granted";
  // Contact Details is the only type where the context changes the rule:
  // an emergency contact needs an Admin Officer, an ordinary change does not.
  const offersEmergencyOption = item.emergencyContactRole !== null;
  const effectiveRole = emergency ? item.emergencyContactRole : item.requiredRole;
  // The alternative number is added alongside the existing one, so it is only
  // offered on Contact Details, and only when granting.
  const offersAlternativeNumber = item.type === "Contact Details" && !granted;

  async function submit(to: string, pin: string) {
    if (busy) return;
    setBusy(true);
    setOutcome({ kind: "none" });
    try {
      const res = await fetch("/api/consent/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: item.type,
          to,
          pin,
          changeContext: emergency ? "emergency_contact" : "standard",
          ...(offersAlternativeNumber && to === "granted" && altNumber.trim()
            ? { alternativeNumber: altNumber.trim() }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok && data.pinError) {
        // Wrong or locked PIN: keep the dialog open so they can try again.
        setPinError(data.error);
      } else if (!res.ok) {
        setAsking(null);
        setOutcome({ kind: "error", message: data.error ?? "That change didn’t go through. Try again." });
      } else if (data.status === "pending_approval") {
        setAsking(null);
        setOutcome({ kind: "pending", message: data.message });
        onChanged();
      } else {
        setAsking(null);
        setOutcome({ kind: "done", result: data.result as SerializedChange });
        onChanged();
      }
    } catch {
      setPinError(null);
      setAsking(null);
      setOutcome({ kind: "error", message: "Couldn’t reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="entry">
      <div className="type">{item.type}</div>
      <div className="affects">
        {item.systems.length
          ? `Updates: ${item.systems.join(", ")}`
          : "No connected systems"}
      </div>
      {effectiveRole && (
        <div className="rule-note">
          Needs {roleLabel(effectiveRole)}’s sign-off before it takes effect.
        </div>
      )}
      {offersEmergencyOption && (
        <div className="rule-note">
          <label htmlFor={emergencyId} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <input
              id={emergencyId}
              type="checkbox"
              checked={emergency}
              disabled={busy}
              onChange={(e) => setEmergency(e.target.checked)}
            />
            <span>
              This is an emergency contact.{" "}
              <span className="muted">
                Emergency contacts are safety-critical, so {roleLabel(item.emergencyContactRole)}{" "}
                checks the change before it takes effect. Every contact
                change needs that check.
              </span>
            </span>
          </label>
        </div>
      )}
      {offersAlternativeNumber && (
        <div className="rule-note">
          <label htmlFor={altId} className="muted" style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
            Alternative number (optional)
          </label>
          <input
            id={altId}
            className="field"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="082 123 4567 or +27821234567"
            value={altNumber}
            disabled={busy}
            maxLength={20}
            onChange={(e) => setAltNumber(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          <span className="muted" style={{ display: "block", fontSize: 12.5, marginTop: 6 }}>
            Added alongside your existing number. The Admin Officer reviews it
            with your request.
          </span>
        </div>
      )}

      <div className="control">
        <Pill status={item.state} />
        <div className="actions">
          <button
            className="toggle"
            role="switch"
            aria-checked={granted}
            aria-label={
              granted
                ? `${item.type}: granted. Withdraw consent.`
                : `${item.type}: not granted. Grant consent.`
            }
            disabled={busy}
            onClick={() => {
              setPinError(null);
              setAsking(target);
            }}
          >
            <span className="dot" aria-hidden="true" />
          </button>
          {busy && <span className="spinner" aria-hidden="true" />}
        </div>
      </div>

      <PinDialog
        open={asking !== null}
        title={asking === "granted" ? `Grant ${item.type} consent?` : `Withdraw ${item.type} consent?`}
        description={
          effectiveRole
            ? `Enter your PIN to send this request. It will go to ${roleLabel(effectiveRole)} and nothing changes until they approve it.`
            : "Enter your PIN to confirm. The change is applied straight away and recorded."
        }
        confirmLabel={asking === "granted" ? "Confirm and grant" : "Confirm and withdraw"}
        busy={busy}
        error={pinError}
        onConfirm={(pin) => asking && submit(asking, pin)}
        onCancel={() => {
          setAsking(null);
          setPinError(null);
        }}
      />

      <div className="result-slot">
        {outcome.kind === "pending" && (
          <div className="note info" role="status">
            {outcome.message}
          </div>
        )}
        {outcome.kind === "error" && (
          <div className="note bad" role="alert">
            {outcome.message}
          </div>
        )}
        {outcome.kind === "done" && <ChangeResultView result={outcome.result} />}
      </div>
    </div>
  );
}
