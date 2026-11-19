import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Columns3, Save, ScanSearch, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadEvidence } from "@/components/verify/UploadEvidence";
import { analyze, type Report } from "@/lib/verify/engine";
import { ReportView } from "@/components/verify/ReportView";
import { useSession } from "@/hooks/use-session";
import { addPending, saveOfferWithReport } from "@/lib/offers";
import { cn } from "@/lib/utils";
import {
  clearSessionState,
  getOrCreateSessionId,
  loadSessionState,
  saveSessionState,
} from "@/lib/verify/session";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify an Offer — OfferProof" },
      {
        name: "description",
        content:
          "Paste an offer or upload a PDF or screenshot to see warning signs with evidence and next steps.",
      },
      { property: "og:title", content: "Verify an Offer — OfferProof" },
      {
        property: "og:description",
        content: "Check a job or internship offer for warning signs in under a minute.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerificationFlow,
});

function VerificationFlow() {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [sessionId] = useState(() => getOrCreateSessionId());

  // Same-route links retain React state by default. A completed navigation to
  // /verify starts a new attempt for this browser session only.
  useEffect(
    () =>
      router.subscribe("onResolved", ({ toLocation }) => {
        if (toLocation.pathname === "/verify") {
          clearSessionState(sessionId);
          setAttempt((value) => value + 1);
        }
      }),
    [router, sessionId],
  );

  return (
    <VerifyPage
      key={`${sessionId}-${attempt}`}
      sessionId={sessionId}
      onResetSession={() => {
        clearSessionState(sessionId);
        setAttempt((v) => v + 1);
      }}
    />
  );
}

const SAMPLE = `Dear Candidate,

Congratulations! You have been selected for the position of Data Entry Executive (Work From Home) at GlobalTech Solutions Pvt Ltd.
Salary: ₹45,000 per month. No experience required.

To confirm your joining, kindly pay a refundable registration fee of Rs 2,999 within 24 hours, failing which the offer will be withdrawn.
Please also share your Aadhaar card and bank account details for salary processing.

Complete your onboarding form here: https://bit.ly/gt-onboard

Regards,
Rahul Verma
HR Manager
hr.globaltech.jobs@gmail.com`;

function VerifyPage({
  sessionId,
  onResetSession,
}: {
  sessionId: string;
  onResetSession: () => void;
}) {
  const savedState = useMemo(() => loadSessionState(sessionId), [sessionId]);
  const [text, setText] = useState(() => savedState?.text ?? "");
  const [busy, setBusy] = useState(false);
  const [pendingFiles, setPendingFiles] = useState(false);
  const [report, setReport] = useState<Report | null>(() => savedState?.report ?? null);
  const [isSample, setIsSample] = useState(() => savedState?.isSample ?? false);
  const session = useSession();
  const navigate = useNavigate();
  const [savedFor, setSavedFor] = useState<string | null>(() => savedState?.savedFor ?? null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"paste" | "file">(
    () => savedState?.activeTab ?? "paste",
  );
  const [uploaded, setUploaded] = useState(() => savedState?.uploaded ?? false);
  const [showExtracted, setShowExtracted] = useState(() => savedState?.showExtracted ?? false);

  useEffect(() => {
    saveSessionState(sessionId, {
      text,
      report,
      activeTab,
      uploaded,
      showExtracted,
      isSample,
      savedFor,
    });
  }, [sessionId, text, report, activeTab, uploaded, showExtracted, isSample, savedFor]);

  async function saveCurrent() {
    if (!report || savedFor === text) return true;
    setSaving(true);
    try {
      await saveOfferWithReport(text, report);
      setSavedFor(text);
      toast.success("Saved to your history.");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function keepForLater(redirect: "/compare" | "/history") {
    addPending(text);
    navigate({ to: "/login", search: { redirect } });
  }

  function addAndCheckAnother() {
    if (session) {
      void saveCurrent().then((ok) => {
        if (ok) {
          clearSessionState(sessionId);
          setReport(null);
          setText("");
        }
      });
    } else {
      const n = addPending(text);
      toast.success(`Kept for comparison (${n}). Sign in when you're ready to compare.`);
      clearSessionState(sessionId);
      setReport(null);
      setText("");
    }
  }

  function run() {
    if (busy || pendingFiles) return;
    if (text.trim().length < 30) {
      toast.error("Please provide at least a few sentences of the offer.");
      return;
    }
    setReport(analyze(text));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (report)
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {isSample && (
          <p className="mb-4 inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            Sample report · fictional offer
          </p>
        )}
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 print:hidden">
          <span className="mr-auto px-2 text-sm text-muted-foreground">
            {session
              ? "Keep this result in your account."
              : "Sign in to save results and compare offers."}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={saving || savedFor === text}
            onClick={() => (session ? saveCurrent() : keepForLater("/history"))}
          >
            <Save className="size-4" /> {savedFor === text ? "Saved" : "Save report"}
          </Button>
          <Button variant="outline" size="sm" disabled={saving} onClick={addAndCheckAnother}>
            Add & check another
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={async () => {
              if (!session) return keepForLater("/compare");
              if (await saveCurrent()) navigate({ to: "/compare" });
            }}
          >
            <Columns3 className="size-4" /> Compare Offers
          </Button>
        </div>
        <ReportView
          report={report}
          text={text}
          sessionId={sessionId}
          onReset={() => {
            clearSessionState(sessionId);
            setReport(null);
            setText("");
            setPendingFiles(false);
            setUploaded(false);
            setIsSample(false);
            onResetSession();
          }}
        />
      </div>
    );

  return (
    <div className="bg-grid min-h-[80vh]">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="eyebrow">Verify an offer</p>
        <h1 className="mt-3 text-4xl font-bold">What did they send you?</h1>
        <p className="mt-3 text-muted-foreground">
          Heuristic checks run entirely in your browser. If you request AI recommendations, redacted
          offer text is sent to NVIDIA's API.
        </p>

        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-card">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "paste" | "file")}>
            <TabsList>
              <TabsTrigger value="paste">Paste text</TabsTrigger>
              <TabsTrigger value="file">Upload PDF / image</TabsTrigger>
            </TabsList>
            <TabsContent value="file" forceMount className="mt-5 data-[state=inactive]:hidden">
              <UploadEvidence
                onText={(value) => {
                  setText(value);
                  setIsSample(false);
                  setUploaded(Boolean(value));
                  setShowExtracted(false);
                }}
                onBusy={setBusy}
                onPending={setPendingFiles}
              />
            </TabsContent>
            <TabsContent value="paste" className="mt-5" />
          </Tabs>

          {activeTab === "file" || uploaded ? (
            <div className="mt-5">
              {text ? (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Extracted text</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowExtracted((prev) => !prev)}
                      className="text-xs text-primary hover:underline gap-1.5"
                    >
                      <ChevronDown
                        className={cn(
                          "size-3.5 transition-transform",
                          showExtracted && "rotate-180",
                        )}
                      />
                      {showExtracted ? "Hide extracted text" : "Expand extracted text"}
                    </Button>
                  </div>
                  <div className={showExtracted ? "mt-3" : "hidden"}>
                    <Textarea
                      id="offer"
                      value={text}
                      onChange={(e) => {
                        setText(e.target.value);
                        setIsSample(false);
                      }}
                      rows={10}
                      placeholder="Extracted offer text…"
                      maxLength={50000}
                    />
                  </div>
                </div>
              ) : (
                <div className="hidden">
                  <Textarea
                    id="offer"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      setIsSample(false);
                    }}
                    rows={12}
                    placeholder="Paste the email, message or offer letter here…"
                    maxLength={50000}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="offer" className="text-sm font-medium">
                  Offer text{" "}
                  {text && (
                    <span className="text-muted-foreground">(review and edit before checking)</span>
                  )}
                </label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    setText(SAMPLE);
                    setIsSample(true);
                    setUploaded(false);
                  }}
                >
                  <Sparkles className="mr-1 inline size-3" />
                  Try a fictional sample
                </button>
              </div>
              <Textarea
                id="offer"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setIsSample(false);
                }}
                rows={12}
                placeholder="Paste the email, message or offer letter here…"
                maxLength={50000}
              />
            </div>
          )}
          <Button size="lg" className="mt-5 w-full" onClick={run} disabled={busy || pendingFiles}>
            <ScanSearch className="size-4" /> Check this offer
          </Button>
        </div>
      </div>
    </div>
  );
}
