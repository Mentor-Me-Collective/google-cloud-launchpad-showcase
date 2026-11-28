"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "../components/Nav";
import ConsentCard from "../components/ConsentCard";
import DraftRequestPanel from "../components/DraftRequestPanel";
import NotificationBell from "../components/NotificationBell";
import type { ConsentItem } from "../components/ConsentCard";
import type { MeParent } from "../components/types";
import { roleLabel } from "@/approval/approvalRules";
import type { StaffRole } from "@/approval/approvalRules";

interface PendingItem {
  id: string;
  type: string;
  from: string;
  to: string;
  changeContext: "standard" | "emergency_contact";
  requiredRole: StaffRole | null;
  createdAt: string;
  escalation: {
    state: "within_limit" | "overdue";
    escalated: boolean;
    escalatedTo: string | null;
    workingDaysWaiting: number;
  };
}

interface ConsentResponse {
  identity: MeParent;
  items: ConsentItem[];
  pending: PendingItem[];
  firestoreEnabled: boolean;
  aiDraftEnabled: boolean;
}

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8.5 6.5 12 13 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Dot() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <circle cx="8" cy="8" r="4" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<ConsentResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/consent");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    setData((await res.json()) as ConsentResponse);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main id="main" className="doc">
      <Nav />
      <NotificationBell />

      {loading || !data ? (
        <div className="loading-row" aria-live="polite">
          <span className="spinner" aria-hidden="true" /> Loading your record…
        </div>
      ) : (
        <>
          <section className="record">
            <p className="record-kicker">Consent record</p>
            <h1>{data.identity.learnerName}</h1>
            <p className="lede">
              Everything {data.identity.learnerName.split(" ")[0]}’s school asks
              your permission for. Flip a switch to grant or withdraw — the change
              is recorded across every system below.
            </p>
            <div className="stamps">
              {data.identity.verified ? (
                <span className="stamp ok"><Check /> Identity verified</span>
              ) : (
                <span className="stamp warn"><Dot /> Identity not verified</span>
              )}
              <span className={`stamp ${data.firestoreEnabled ? "ok" : "off"}`}>
                {data.firestoreEnabled ? <Check /> : <Dot />}
                {data.firestoreEnabled ? "Saved to Firestore" : "In-memory only"}
              </span>
            </div>
          </section>

          {!data.identity.verified && (
            <div className="note warn" role="status">
              Your identity isn’t verified yet, so changes will be declined. Ask
              the school office to verify you first. (This parent shows how the
              declined path works.)
            </div>
          )}

          {data.pending.length > 0 && (
            <div className="note info" role="status">
              {/* Wording follows decision 5 in docs/legal-decisions-log.md:
                  say where it went, that nothing has changed, and that the
                  parent will hear back. */}
              <b>Waiting for approval.</b> Nothing has changed yet. We will tell
              you when they respond.
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {data.pending.map((p) => (
                  <li key={p.id}>
                    {p.type}
                    {p.changeContext === "emergency_contact" && " (emergency contact)"}{" "}
                    to {p.to === "not_set" ? "not set" : p.to} — sent to{" "}
                    {roleLabel(p.requiredRole)} on {dateFmt.format(new Date(p.createdAt))}
                    {p.escalation.state === "overdue" && (
                      <>
                        {" "}
                        <b>
                          (waiting {p.escalation.workingDaysWaiting} working days — we
                          have flagged it for the school)
                        </b>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="section">
            <h2>What you’re asked to consent to</h2>
          </div>
          <div className="register">
            {data.items.map((item) => (
              <ConsentCard key={item.type} item={item} onChanged={load} />
            ))}
            {data.aiDraftEnabled && data.identity.verified && (
              <DraftRequestPanel onChanged={load} />
            )}
          </div>
        </>
      )}
    </main>
  );
}
