"use client";

/**
 * System Admin: manage who can sign in. Nothing here shows consent data. The
 * server checks the role on every call; this page only reflects the answer.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Nav from "../components/Nav";
import PinDialog from "../components/PinDialog";

interface UserRow {
  id: string;
  username: string;
  name: string;
  kind: "parent" | "staff" | "admin";
  roleLabel: string;
  active: boolean;
  verified?: boolean;
  learnerName?: string;
}
interface Learner {
  learnerId: string;
  learnerName: string;
}
interface Overview {
  users: UserRow[];
  learners: Learner[];
  activity: { index: number; timestamp: string; text: string }[];
  chain: { valid: boolean; length: number };
}

type Feedback = { kind: "ok" | "bad"; text: string } | null;

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

async function post(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: "We could not reach the server. Check your connection and try again." } };
  }
}

function Message({ fb }: { fb: Feedback }) {
  if (!fb) return null;
  return (
    <div className={`note ${fb.kind === "ok" ? "good" : "bad"}`} role={fb.kind === "ok" ? "status" : "alert"} style={{ margin: "10px 0 0" }}>
      {fb.text}
    </div>
  );
}

function ParentForm({ learners, onDone }: { learners: Learner[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [learnerId, setLearnerId] = useState("");
  const [learnerName, setLearnerName] = useState("");
  const [verified, setVerified] = useState("yes");
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState<Feedback>(null);
  const ids = [useId(), useId(), useId(), useId(), useId(), useId()];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFb(null);
    const r = await post("/api/admin/parents", {
      name,
      username,
      pin,
      verified: verified === "yes",
      learnerId,
      learnerName,
    });
    setBusy(false);
    setPin("");
    if (r.ok) {
      setFb({ kind: "ok", text: String(r.data.message) });
      setName("");
      setUsername("");
      setLearnerId("");
      setLearnerName("");
      onDone();
    } else {
      setFb({ kind: "bad", text: String(r.data.error ?? "That did not work. Try again.") });
    }
  }

  return (
    <form className="card-block form" onSubmit={submit} noValidate>
      <h3>Create a parent</h3>
      <div>
        <label htmlFor={ids[0]}>Full name</label>
        <input id={ids[0]} className="field" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label htmlFor={ids[1]}>Username</label>
        <input id={ids[1]} className="field" value={username} maxLength={32} autoCapitalize="none" spellCheck={false} onChange={(e) => setUsername(e.target.value)} />
        <span className="hint">3 to 32 letters, numbers, dots, dashes or underscores. Must be unique.</span>
      </div>
      <div>
        <label htmlFor={ids[2]}>Starting PIN</label>
        <input id={ids[2]} className="field" type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} style={{ maxWidth: 180 }} />
        <span className="hint">4 to 8 digits. Tell the parent in person.</span>
      </div>
      <div>
        <label htmlFor={ids[3]}>Learner</label>
        <select id={ids[3]} className="field" value={learnerId} onChange={(e) => setLearnerId(e.target.value)}>
          <option value="">New learner (enter the name below)</option>
          {learners.map((l) => (
            <option key={l.learnerId} value={l.learnerId}>
              {l.learnerName} ({l.learnerId})
            </option>
          ))}
        </select>
      </div>
      {learnerId === "" && (
        <div>
          <label htmlFor={ids[4]}>New learner&apos;s full name</label>
          <input id={ids[4]} className="field" value={learnerName} maxLength={80} onChange={(e) => setLearnerName(e.target.value)} />
        </div>
      )}
      <div>
        <label htmlFor={ids[5]}>Has the parent&apos;s identity been verified?</label>
        <select id={ids[5]} className="field" value={verified} onChange={(e) => setVerified(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="yes">Yes, verified</option>
          <option value="no">No, not yet</option>
        </select>
        <span className="hint">A parent who is not verified cannot change consent.</span>
      </div>
      <div>
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? "Creating..." : "Create parent"}
        </button>
      </div>
      <Message fb={fb} />
    </form>
  );
}

function StaffForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("admin_officer");
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState<Feedback>(null);
  const ids = [useId(), useId(), useId(), useId()];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFb(null);
    const r = await post("/api/admin/staff", { name, username, pin, role });
    setBusy(false);
    setPin("");
    if (r.ok) {
      setFb({ kind: "ok", text: String(r.data.message) });
      setName("");
      setUsername("");
      onDone();
    } else {
      setFb({ kind: "bad", text: String(r.data.error ?? "That did not work. Try again.") });
    }
  }

  return (
    <form className="card-block form" onSubmit={submit} noValidate>
      <h3>Create a staff user</h3>
      <div>
        <label htmlFor={ids[0]}>Full name</label>
        <input id={ids[0]} className="field" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label htmlFor={ids[1]}>Username</label>
        <input id={ids[1]} className="field" value={username} maxLength={32} autoCapitalize="none" spellCheck={false} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div>
        <label htmlFor={ids[2]}>Starting PIN</label>
        <input id={ids[2]} className="field" type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} style={{ maxWidth: 180 }} />
        <span className="hint">4 to 8 digits. Tell them in person.</span>
      </div>
      <div>
        <label htmlFor={ids[3]}>Role</label>
        <select id={ids[3]} className="field" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="admin_officer">Admin Officer (S-01): school trips and contact details</option>
          <option value="information_officer">Information Officer (S-02): medical</option>
        </select>
      </div>
      <div>
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? "Creating..." : "Create staff user"}
        </button>
      </div>
      <Message fb={fb} />
    </form>
  );
}

function ConfirmDialog({
  user,
  busy,
  onConfirm,
  onCancel,
}: {
  user: UserRow | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (user && !d.open) d.showModal();
    else if (!user && d.open) d.close();
  }, [user]);
  return (
    <dialog
      ref={ref}
      className="pin-dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2>Deactivate {user?.name}?</h2>
      <p>
        They will be signed out and will not be able to sign in again. Their
        past records stay in the audit trail. This cannot be undone here.
      </p>
      <div className="actions">
        <button className="btn btn--danger" disabled={busy} onClick={onConfirm}>
          {busy ? "Working..." : "Yes, deactivate"}
        </button>
        <button className="btn btn--quiet" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </dialog>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fb, setFb] = useState<Feedback>(null);
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [deactivateFor, setDeactivateFor] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    if (res.status === 403) {
      setRefusal(((await res.json()) as { error?: string }).error ?? "Only a System Admin can open this page.");
      setLoading(false);
      return;
    }
    setData((await res.json()) as Overview);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function doReset(pin: string) {
    if (!resetFor) return;
    setBusy(true);
    setResetError(null);
    const r = await post("/api/admin/pin-reset", { userId: resetFor.id, pin });
    setBusy(false);
    if (r.ok) {
      setFb({ kind: "ok", text: String(r.data.message) });
      setResetFor(null);
      load();
    } else {
      setResetError(String(r.data.error ?? "That did not work. Try again."));
    }
  }

  async function doDeactivate() {
    if (!deactivateFor) return;
    setBusy(true);
    const r = await post("/api/admin/deactivate", { userId: deactivateFor.id });
    setBusy(false);
    setDeactivateFor(null);
    setFb(r.ok ? { kind: "ok", text: String(r.data.message) } : { kind: "bad", text: String(r.data.error ?? "That did not work.") });
    if (r.ok) load();
  }

  return (
    <main id="main" className="doc">
      <Nav />
      {refusal ? (
        <div className="note bad" role="alert" style={{ marginTop: 20 }}>
          <b>You cannot open this page.</b> {refusal}
        </div>
      ) : loading || !data ? (
        <div className="loading-row" aria-live="polite">
          <span className="spinner" aria-hidden="true" /> Loading users.
        </div>
      ) : (
        <>
          <section className="record">
            <p className="record-kicker">System Admin</p>
            <h1>Manage users</h1>
            <p className="lede">
              Create accounts, set a new PIN for someone who forgot theirs, or
              stop someone signing in. You cannot see or decide consent requests.
            </p>
            <div className="stamps">
              <span className={`stamp ${data.chain.valid ? "ok" : "warn"}`}>
                {data.chain.valid
                  ? `Audit record intact (${data.chain.length} entries)`
                  : "Audit record check failed. Tell the school's technical contact."}
              </span>
            </div>
          </section>

          <Message fb={fb} />

          <div className="section">
            <h2>Add someone</h2>
          </div>
          <div className="admin-grid">
            <ParentForm learners={data.learners} onDone={load} />
            <StaffForm onDone={load} />
          </div>

          <div className="section">
            <h2>Everyone who can sign in</h2>
          </div>
          <div className="table-wrap">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.name}
                      {u.kind === "parent" && (
                        <span className="muted" style={{ display: "block", fontSize: 12.5 }}>
                          Parent of {u.learnerName}, {u.verified ? "verified" : "not verified"}
                        </span>
                      )}
                    </td>
                    <td>{u.username}</td>
                    <td>{u.roleLabel}</td>
                    <td>{u.active ? "Active" : "Deactivated"}</td>
                    <td>
                      {u.active && (
                        <div className="row-actions">
                          <button className="btn btn--quiet btn--sm" onClick={() => { setResetError(null); setResetFor(u); }}>
                            Reset PIN
                          </button>
                          <button className="btn btn--quiet btn--sm" onClick={() => setDeactivateFor(u)}>
                            Deactivate
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section">
            <h2>Recent admin activity</h2>
          </div>
          {data.activity.length === 0 ? (
            <p className="muted">Nothing yet.</p>
          ) : (
            <ul className="activity">
              {data.activity.map((a) => (
                <li key={a.index}>
                  {a.text} <time dateTime={a.timestamp}>{dateFmt.format(new Date(a.timestamp))}</time>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <PinDialog
        open={resetFor !== null}
        title={`Set a new PIN for ${resetFor?.name ?? ""}`}
        description="They will be signed out. Give them the new PIN in person. It is not shown again."
        confirmLabel="Set new PIN"
        pinLabel="New PIN (4 to 8 digits)"
        busy={busy}
        error={resetError}
        onConfirm={doReset}
        onCancel={() => setResetFor(null)}
      />
      <ConfirmDialog user={deactivateFor} busy={busy} onConfirm={doDeactivate} onCancel={() => setDeactivateFor(null)} />
    </main>
  );
}
