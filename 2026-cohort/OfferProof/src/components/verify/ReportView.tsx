import { useEffect, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  Printer,
  Sparkles,
} from "lucide-react";
import { ASSESSMENT_META, type Report, type Severity } from "@/lib/verify/engine";
import { Button } from "@/components/ui/button";
import { Checklist } from "./Checklist";
import { AiRecommendations } from "./AiRecommendations";
import { parseSalary } from "@/lib/compare/engine";
import { supabase } from "@/integrations/supabase/client";
import { buildExtractedDetails, type ExtractedDetailsData } from "@/lib/verify/extraction";

export function getEvidenceSnippet(
  fullText: string,
  evidenceItem: string,
): { prefix: string; highlight: string; suffix: string } | null {
  if (!fullText || !evidenceItem) return null;

  // Clean metadata labels so the exact target can be matched in the original uploaded offer
  const cleanTarget = evidenceItem
    .replace(/^(?:Company|Domain|Free email|Sender|URL|Not found):\s*/i, "")
    .trim();
  if (!cleanTarget) return null;

  const lowerText = fullText.toLowerCase();
  const lowerEv = cleanTarget.toLowerCase();

  let idx = lowerText.indexOf(lowerEv);
  if (idx === -1) {
    const words = lowerEv.split(/\s+/).filter((w) => w.length >= 3);
    if (words.length > 0) {
      for (const word of words) {
        const found = lowerText.indexOf(word);
        if (found !== -1) {
          idx = found;
          break;
        }
      }
    }
  }
  if (idx === -1) return null;

  // Search backwards for the line or sentence boundary in the uploaded text
  let start = idx;
  while (start > 0 && !/[\n]/.test(fullText.charAt(start - 1))) {
    if (idx - start >= 140 && /[.!?]/.test(fullText.charAt(start - 1))) break;
    start--;
  }
  while (start < idx && /[\s\-*•]/.test(fullText.charAt(start))) {
    start++;
  }

  // Search forwards for the line or sentence boundary in the uploaded text
  let end = idx + cleanTarget.length;
  while (end < fullText.length && !/[\n]/.test(fullText.charAt(end))) {
    if (end - idx >= 140 && /[.!?]/.test(fullText.charAt(end))) {
      end++;
      break;
    }
    end++;
  }
  if (end < fullText.length && /[.!?]/.test(fullText.charAt(end))) {
    end++;
  }

  const rawSentence = fullText.slice(start, end).trim();
  const matchInSentence = rawSentence.toLowerCase().indexOf(lowerEv);
  if (matchInSentence === -1) {
    return {
      prefix: "",
      highlight: rawSentence,
      suffix: "",
    };
  }

  return {
    prefix: rawSentence.slice(0, matchInSentence),
    highlight: rawSentence.slice(matchInSentence, matchInSentence + cleanTarget.length),
    suffix: rawSentence.slice(matchInSentence + cleanTarget.length),
  };
}

const SEV: Record<Severity, { label: string; cls: string; bar: string }> = {
  high: { label: "High", cls: "bg-high-soft text-high", bar: "border-high" },
  medium: { label: "Medium", cls: "bg-warn-soft text-foreground", bar: "border-warn" },
  low: { label: "Low", cls: "bg-muted text-muted-foreground", bar: "border-border" },
};

export function ReportView({
  report,
  text,
  onReset,
  sessionId,
}: {
  report: Report;
  text: string;
  onReset: () => void;
  sessionId?: string | undefined;
}) {
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());
  const toggleEvidence = (id: string) => {
    setExpandedEvidence((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const meta = ASSESSMENT_META[report.assessment];
  const tone =
    report.assessment === "high_concern"
      ? { Icon: AlertOctagon, cls: "border-high bg-high-soft", ic: "text-high" }
      : report.assessment === "needs_review"
        ? { Icon: AlertTriangle, cls: "border-warn bg-warn-soft", ic: "text-warn" }
        : { Icon: CheckCircle2, cls: "border-low bg-low-soft", ic: "text-low" };

  const [extractionData, setExtractionData] = useState<ExtractedDetailsData>(() =>
    buildExtractedDetails(text, report.extracted, null),
  );
  const [extractionLoading, setExtractionLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const trimmed = text.trim();
    if (!trimmed) return;

    setExtractionLoading(true);
    supabase.functions
      .invoke("offerproof-ai-recommendations", {
        body: {
          mode: "extract",
          offerText: trimmed,
          sessionId,
        },
      })
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.extracted) {
          setExtractionLoading(false);
          return;
        }
        if (data.sessionId && data.sessionId !== sessionId) {
          return;
        }
        const validated = buildExtractedDetails(text, report.extracted, data.extracted);
        setExtractionData(validated);
        setExtractionLoading(false);
      })
      .catch(() => {
        if (active) setExtractionLoading(false);
      });

    return () => {
      active = false;
    };
  }, [text, report.extracted, sessionId]);

  const salary = parseSalary(extractionData.salary.value);
  const salaryPeriods: Record<string, string> = {
    year: "annual",
    month: "monthly",
    week: "weekly",
    day: "daily",
    hour: "hourly",
  };
  const salaryDisplay =
    salary.amount !== null
      ? [
          salary.amount.toLocaleString(salary.currency === "INR" ? "en-IN" : "en-US"),
          salary.currency,
          salary.period ? salaryPeriods[salary.period] : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : extractionData.salary.value;

  const details: {
    label: string;
    value: string | null;
  }[] = [
    {
      label: "Company",
      value: extractionData.company.value,
    },
    {
      label: "Recruiter",
      value: extractionData.recruiter.value,
    },
    {
      label: "Job title",
      value: extractionData.jobTitle.value,
    },
    {
      label: "Salary / stipend",
      value: salaryDisplay,
    },
    {
      label: "Joining date",
      value: extractionData.joiningDate.value,
    },
    {
      label: "Location",
      value: extractionData.location.value,
    },
    {
      label: "Applicant emails",
      value: extractionData.applicantEmails.values.join(", ") || null,
    },
    {
      label: "Recruiter / contact emails",
      value: extractionData.recruiterEmails.values.join(", ") || null,
    },
    {
      label: "Emails (owner unclear)",
      value: extractionData.unknownEmails.values.join(", ") || null,
    },
    {
      label: "Phone numbers",
      value: extractionData.phones.values.join(", ") || null,
    },
    {
      label: "Domains",
      value: extractionData.domains.values.join(", ") || null,
    },
    {
      label: "Web links",
      value: extractionData.urls.values.join(", ") || null,
    },
  ];

  const presentDetails = details.filter((item): item is { label: string; value: string } =>
    Boolean(item.value && item.value.trim().length > 0),
  );

  return (
    <div className="space-y-6 sm:space-y-8" id="report">
      {/* 1. Overall Assessment Banner */}
      <div className={`rounded-2xl border-l-4 p-5 sm:p-7 ${tone.cls}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3.5 sm:gap-4">
            <tone.Icon className={`mt-1 size-7 sm:size-8 shrink-0 ${tone.ic}`} />
            <div>
              <p className="eyebrow">Overall assessment</p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-bold">{meta.label}</h2>
              <p className="mt-2 max-w-2xl text-xs sm:text-sm">{meta.summary}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {report.findings.length} concern signal(s) found · heuristic result, not a validated
                probability
              </p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4" /> Download PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={onReset}>
              Check another
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Side-by-side: Concern Signals & AI Recommendations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* Concern Signals */}
        <section
          aria-label="Concern Signals"
          className="rounded-2xl border bg-card p-5 sm:p-6 shadow-card flex flex-col"
        >
          <div className="flex items-center justify-between pb-3.5 border-b">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Concern Signals</h3>
              <p className="text-xs text-muted-foreground">
                Heuristic indicators detected in the offer.
              </p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {report.findings.length} {report.findings.length === 1 ? "signal" : "signals"}
            </span>
          </div>

          <div className="mt-4 max-h-[420px] overflow-y-auto print:max-h-none print:overflow-visible pr-1 space-y-3">
            {report.findings.length === 0 && (
              <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mx-auto size-8 text-low mb-2" />
                <p className="font-semibold text-foreground">No common warning signs detected</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Absence of warnings is not proof the offer is genuine. Use the AI recommendations
                  and checklist below to verify.
                </p>
              </div>
            )}
            {report.findings.map((f) => (
              <article
                key={f.id}
                className={`rounded-xl border border-l-4 bg-card p-4 shadow-sm ${SEV[f.severity].bar}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold text-sm">{f.name}</h4>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEV[f.severity].cls}`}
                  >
                    {SEV[f.severity].label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {f.explanation}
                </p>
                <p className="mt-2 flex gap-1.5 text-xs">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>
                    <b>What to do:</b> {f.action}
                  </span>
                </p>

                {(() => {
                  // "Missing key details" represents absent fields (not phrases found in the document).
                  // Do not show a "View Evidence" dropdown for missing details.
                  if (f.id === "missing_details") return null;

                  const visibleEvidence = f.evidence
                    .map((e) => e.replace(/^(?:Not found:\s*|Not found\b\s*)/i, "").trim())
                    .filter((e) => e.length > 0 && e.toLowerCase() !== "not found");

                  if (visibleEvidence.length === 0) return null;

                  return (
                    <div className="mt-2.5 border-t border-border/40 pt-2">
                      <button
                        type="button"
                        onClick={() => toggleEvidence(f.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline focus:outline-none print:hidden cursor-pointer"
                        aria-expanded={expandedEvidence.has(f.id)}
                        aria-label={`View evidence for ${f.name}`}
                      >
                        <ChevronDown
                          className={`size-3.5 transition-transform duration-200 ${
                            expandedEvidence.has(f.id) ? "rotate-180" : ""
                          }`}
                        />
                        <span>
                          {expandedEvidence.has(f.id)
                            ? "Hide Evidence"
                            : `View Evidence (${visibleEvidence.length})`}
                        </span>
                      </button>

                      <div
                        className={`mt-2 space-y-1.5 ${
                          expandedEvidence.has(f.id) ? "block" : "hidden print:block"
                        }`}
                      >
                        {visibleEvidence.map((e, idx) => {
                          const snippet = getEvidenceSnippet(text, e);
                          return (
                            <div
                              key={`${f.id}-ev-${idx}`}
                              className="rounded-lg border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-foreground break-words"
                            >
                              {snippet ? (
                                <span>
                                  “{snippet.prefix}
                                  <mark
                                    className={f.severity === "high" ? "mark-high" : "mark-warn"}
                                  >
                                    {snippet.highlight}
                                  </mark>
                                  {snippet.suffix}”
                                </span>
                              ) : (
                                <span className="font-medium">
                                  <mark
                                    className={f.severity === "high" ? "mark-high" : "mark-warn"}
                                  >
                                    {e}
                                  </mark>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </article>
            ))}
          </div>
        </section>

        {/* AI Recommendations */}
        <AiRecommendations text={text} report={report} sessionId={sessionId} />
      </div>

      {/* 3. Extracted Details below in a compact two-column grid */}
      <section
        aria-label="Extracted Details"
        className="rounded-2xl border bg-card p-5 sm:p-6 shadow-card print:hidden"
      >
        <div className="border-b pb-3.5 flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              Extracted Details
              {extractionData.isAiEnhanced && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                  <Sparkles className="size-3" /> NVIDIA Nemotron
                </span>
              )}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Details found in the offer; employer identity has not been independently verified.
            </p>
          </div>
          {extractionLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span>Analyzing details...</span>
            </div>
          )}
        </div>

        {presentDetails.length > 0 ? (
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5 text-sm">
            {presentDetails.map((item) => (
              <div
                key={item.label}
                className="flex flex-col border-b border-border/30 pb-2.5 sm:border-0 sm:pb-0"
              >
                <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
                <dd className="mt-0.5 font-medium text-foreground break-words text-xs sm:text-sm">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-4 text-xs italic text-muted-foreground">
            No specific offer details could be extracted from the document.
          </p>
        )}
      </section>

      {/* 4. OfferProof Action Guide */}
      <div className="rounded-2xl bg-ink p-6 text-ink-foreground sm:p-8">
        <p className="eyebrow !text-electric">OfferProof Action Guide</p>
        <h3 className="mt-2 text-2xl font-bold">Before you accept</h3>
        <ol className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          {[
            "Find the company's official website yourself and compare its domain with the offer.",
            "Call or email HR using contact details from the official site, quoting the offer.",
            "Never pay a fee, deposit or purchase anything to secure a job.",
            "Never share OTPs, PINs, CVVs or passwords. Share ID only via official HR portals.",
            "Compare the salary with published ranges for the same role and city.",
            "If you already paid, contact your bank immediately and report to your cybercrime portal.",
          ].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-display font-bold text-electric">0{i + 1}</span>
              <span className="text-ink-muted leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 5. Checklist */}
      <div className="print:hidden">
        <Checklist />
      </div>

      {/* 6. Disclaimer */}
      <p className="text-xs text-muted-foreground">
        Disclaimer: OfferProof uses rule-based heuristics to highlight common warning signs. It
        cannot confirm that an offer is genuine or fraudulent, and the concern score is not a
        validated measure of fraud likelihood. Always verify directly with the employer.
      </p>
    </div>
  );
}
