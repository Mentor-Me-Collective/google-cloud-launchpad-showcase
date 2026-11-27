"use client";

import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { homeFor } from "./components/types";
import type { Me } from "./components/types";

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<Me | null>(null);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const userId = useId();
  const pinId = useId();

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: { identity: Me | null }) => setCurrent(d.identity))
      .catch(() => {});
  }, []);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; identity?: Me };
      setPin("");
      if (!res.ok || !data.identity) {
        setError(data.error ?? "We could not sign you in. Try again.");
        setBusy(false);
        return;
      }
      router.push(homeFor(data.identity));
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <main id="main" className="doc">
      <p className="record-kicker">A school&apos;s consent register</p>
      <h1 style={{ fontSize: "clamp(32px, 7vw, 54px)", maxWidth: "15ch" }}>
        Know exactly what you&apos;ve agreed to.
      </h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Grant or withdraw consent for your child&apos;s photos, school trips, medical
        information and contact details. Change it once here and the whole school
        updates together, with a record you can check.
      </p>

      {current && (
        <div className="note info" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span>
            You are signed in as <b>{current.name}</b>.
          </span>
          <button className="btn btn--primary btn--sm" onClick={() => router.push(homeFor(current))}>
            Continue
          </button>
        </div>
      )}

      <div className="section">
        <h2>Sign in</h2>
      </div>
      <form className="form" onSubmit={signIn} noValidate>
        <div>
          <label htmlFor={userId}>Username</label>
          <input
            id={userId}
            className="field"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            disabled={busy}
            maxLength={32}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={pinId}>PIN</label>
          <input
            id={pinId}
            className="field"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={8}
            value={pin}
            disabled={busy}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            style={{ maxWidth: 180 }}
          />
          <span className="hint">4 to 8 digits. The school office gave you this PIN.</span>
        </div>
        {error && (
          <div className="note bad" role="alert" style={{ margin: 0 }}>
            {error}
          </div>
        )}
        <div>
          <button className="btn btn--primary" type="submit" disabled={busy || !username.trim() || pin.length < 4}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>

      <p className="note info" style={{ marginTop: 20, fontSize: 13.5 }}>
        Forgotten your PIN? Ask the school office. They can set a new one for you.
      </p>
      <p className="note warn" style={{ marginTop: 12, fontSize: 13.5 }}>
        All names and data here are fictional. No real school, parent, learner or
        staff member appears. In the demo, the sample users share one PIN set by
        the person running it (see docs/USER-GUIDE.md).
      </p>
    </main>
  );
}
