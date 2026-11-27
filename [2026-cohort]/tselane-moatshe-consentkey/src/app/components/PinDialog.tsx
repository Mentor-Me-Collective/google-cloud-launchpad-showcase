"use client";

/**
 * Confirmation dialog that asks for a PIN.
 *
 * The PIN lives only in this component's state while the dialog is open. It is
 * handed to `onConfirm` once and cleared right after. Uses the native <dialog>
 * element, so focus is trapped and Escape closes it, with no extra library.
 */

import { useEffect, useId, useRef, useState } from "react";

export default function PinDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  pinLabel = "Your PIN (4 to 8 digits)",
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  /** Label above the PIN box. Defaults to asking for the signed-in person's PIN. */
  pinLabel?: string;
  busy: boolean;
  error?: string | null;
  onConfirm: (pin: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pin, setPin] = useState("");
  const pinId = useId();
  const titleId = useId();

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      setPin("");
      dlg.showModal();
    } else if (!open && dlg.open) {
      dlg.close();
    }
  }, [open]);

  function submit() {
    if (busy || pin.length < 4) return;
    const entered = pin;
    setPin("");
    onConfirm(entered);
  }

  return (
    <dialog
      ref={ref}
      className="pin-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2 id={titleId}>{title}</h2>
        <p style={{ margin: "0 0 12px" }}>{description}</p>
        <label htmlFor={pinId} className="muted" style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
          {pinLabel}
        </label>
        <input
          id={pinId}
          className="field"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          autoFocus
          value={pin}
          disabled={busy}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          style={{ maxWidth: 180 }}
        />
        {error && (
          <div className="note bad" role="alert" style={{ marginTop: 10 }}>
            {error}
          </div>
        )}
        <div className="actions">
          <button type="submit" className="btn btn--primary" disabled={busy || pin.length < 4}>
            {busy ? "Checking..." : confirmLabel}
          </button>
          <button type="button" className="btn btn--quiet" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
