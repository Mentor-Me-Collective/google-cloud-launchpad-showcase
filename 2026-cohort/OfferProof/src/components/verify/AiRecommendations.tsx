import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  HelpCircle,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Report } from "@/lib/verify/engine";
import { getOrCreateSessionId } from "@/lib/verify/session";

interface AiRecommendationsProps {
  text: string;
  report: Report;
  sessionId?: string | undefined;
}

export interface StructuredSections {
  verificationSteps: string[];
  recruiterQuestions: string[];
  precautions: string[];
  summaryIntro?: string;
}

export function parseStructuredRecommendations(raw: string): StructuredSections {
  const lines = raw.split("\n");
  const result: StructuredSections = {
    verificationSteps: [],
    recruiterQuestions: [],
    precautions: [],
  };

  type SectionKey = "verificationSteps" | "recruiterQuestions" | "precautions" | "none";
  let currentSection: SectionKey = "none";
  const introLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect Verification Steps heading
    if (
      /^(?:#+\s*|\*{1,2}\s*|\d+[.)]\s*)?verification\s*(?:steps|procedures|checks)?(?::|\*{1,2})?$/i.test(
        line,
      ) ||
      (/verification\s+steps/i.test(line) &&
        line.length < 50 &&
        (line.startsWith("#") || line.startsWith("*") || line.endsWith(":")))
    ) {
      currentSection = "verificationSteps";
      continue;
    }

    // Detect Recruiter Questions heading
    if (
      /^(?:#+\s*|\*{1,2}\s*|\d+[.)]\s*)?(?:recruiter\s+questions|questions\s+(?:for\s+the\s+|to\s+ask\s+(?:the\s+)?)?recruiter)(?::|\*{1,2})?$/i.test(
        line,
      ) ||
      (/(?:recruiter\s+questions|questions\s+for\s+the\s+recruiter)/i.test(line) &&
        line.length < 60 &&
        (line.startsWith("#") || line.startsWith("*") || line.endsWith(":")))
    ) {
      currentSection = "recruiterQuestions";
      continue;
    }

    // Detect Important Precautions heading
    if (
      /^(?:#+\s*|\*{1,2}\s*|\d+[.)]\s*)?(?:important\s+)?precautions|safety\s+precautions|warning\s+precautions(?::|\*{1,2})?$/i.test(
        line,
      ) ||
      (/(?:important\s+precautions|precautions)/i.test(line) &&
        line.length < 50 &&
        (line.startsWith("#") || line.startsWith("*") || line.endsWith(":")))
    ) {
      currentSection = "precautions";
      continue;
    }

    // Clean bullet markers: "- ", "* ", "1. ", "• "
    const cleaned = line
      .replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, "")
      .replace(/^\*{1,2}|\*{1,2}$/g, "")
      .trim();
    if (!cleaned) continue;

    if (currentSection === "verificationSteps") {
      result.verificationSteps.push(cleaned);
    } else if (currentSection === "recruiterQuestions") {
      result.recruiterQuestions.push(cleaned);
    } else if (currentSection === "precautions") {
      result.precautions.push(cleaned);
    } else {
      introLines.push(cleaned);
    }
  }

  // Fallback: if no section headers were found in raw text (e.g. plain list from tests or simple model reply)
  if (
    result.verificationSteps.length === 0 &&
    result.recruiterQuestions.length === 0 &&
    result.precautions.length === 0
  ) {
    for (const item of introLines) {
      const lower = item.toLowerCase();
      if (/ask|question|inquire|clarify|confirm with|discuss/i.test(lower)) {
        result.recruiterQuestions.push(item);
      } else if (/never|caution|warning|precaution|danger|do not|avoid|beware|scam/i.test(lower)) {
        result.precautions.push(item);
      } else {
        result.verificationSteps.push(item);
      }
    }
  } else if (introLines.length > 0) {
    result.summaryIntro = introLines.join(" ");
  }

  return result;
}

export function AiRecommendations({ text, report, sessionId }: AiRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchingRef = useRef(false);
  const lastFetchedKeyRef = useRef<string | null>(null);

  const fetchRecommendations = useCallback(
    async (force = false) => {
      const trimmedText = text?.trim() ?? "";
      if (!trimmedText) return;

      const effectiveSessionId = sessionId || getOrCreateSessionId();
      const cacheKey = `${effectiveSessionId}::${trimmedText}::${report.assessment}::${report.findings.length}`;
      if (!force && (fetchingRef.current || lastFetchedKeyRef.current === cacheKey)) {
        return;
      }

      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "offerproof-ai-recommendations",
          {
            body: {
              sessionId: effectiveSessionId,
              offerText: trimmedText,
              context: {
                sessionId: effectiveSessionId,
                assessment: report.assessment,
                findings: report.findings,
                company: report.extracted.company,
                jobTitle: report.extracted.jobTitle,
                salary: report.extracted.salary,
              },
            },
          },
        );

        if (fnError) {
          throw new Error(fnError.message || "Failed to load AI recommendations.");
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        if (data?.sessionId && data.sessionId !== effectiveSessionId) {
          return;
        }

        if (typeof data?.recommendations === "string" && data.recommendations.trim()) {
          setRecommendations(data.recommendations.trim());
          lastFetchedKeyRef.current = cacheKey;
        } else {
          throw new Error("No recommendations returned.");
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unable to generate recommendations right now.";
        setError(message);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    },
    [text, report, sessionId],
  );

  useEffect(() => {
    void fetchRecommendations();
  }, [fetchRecommendations]);

  const sections = useMemo(() => {
    return recommendations ? parseStructuredRecommendations(recommendations) : null;
  }, [recommendations]);

  return (
    <section
      aria-label="OfferProof AI Recommendations"
      className="rounded-2xl border bg-card p-5 sm:p-6 shadow-card flex flex-col"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 sm:size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Bot className="size-4 sm:size-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="text-lg sm:text-xl font-bold">OfferProof AI Recommendations</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-accent-foreground">
                <Sparkles className="size-3 text-primary" /> NVIDIA AI
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tailored next steps and recruiter questions.
            </p>
          </div>
        </div>
        {!loading && error && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchRecommendations(true)}
            className="gap-1.5 text-xs h-8"
          >
            <RotateCcw className="size-3.5" /> Retry
          </Button>
        )}
      </div>

      {loading && (
        <div
          className="flex flex-col items-center justify-center gap-3 py-10 text-center"
          role="status"
        >
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Analyzing offer details and generating tailored advice…
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-border/70 bg-muted/40 p-4 text-sm">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 space-y-1">
            <p className="font-medium text-foreground">AI recommendations unavailable</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchRecommendations(true)}
            className="shrink-0 text-xs"
          >
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && sections && (
        <div className="mt-4 flex flex-col flex-1">
          {sections.summaryIntro && (
            <p className="mb-2 text-xs text-muted-foreground italic">{sections.summaryIntro}</p>
          )}

          <div className="max-h-[420px] overflow-y-auto print:max-h-none print:overflow-visible pr-1 space-y-3">
            {/* Section 1: Verification Steps */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs sm:text-sm">
                <ShieldCheck className="size-4 shrink-0 text-primary" />
                <h4>Verification Steps</h4>
                <span className="ml-auto text-[10px] font-medium rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                  {sections.verificationSteps.length}
                </span>
              </div>
              {sections.verificationSteps.length > 0 ? (
                <ul className="mt-2.5 space-y-1.5 text-xs text-foreground/90">
                  {sections.verificationSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 font-bold">•</span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground italic">
                  Follow official company website & domain verification steps.
                </p>
              )}
            </div>

            {/* Section 2: Recruiter Questions */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs sm:text-sm">
                <HelpCircle className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <h4>Recruiter Questions</h4>
                <span className="ml-auto text-[10px] font-medium rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-400">
                  {sections.recruiterQuestions.length}
                </span>
              </div>
              {sections.recruiterQuestions.length > 0 ? (
                <ul className="mt-2.5 space-y-1.5 text-xs text-foreground/90">
                  {sections.recruiterQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-0.5 font-bold">•</span>
                      <span className="leading-relaxed">{q}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground italic">
                  Ask for official team hierarchy and contract documentation.
                </p>
              )}
            </div>

            {/* Section 3: Important Precautions */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs sm:text-sm">
                <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <h4>Important Precautions</h4>
                <span className="ml-auto text-[10px] font-medium rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
                  {sections.precautions.length}
                </span>
              </div>
              {sections.precautions.length > 0 ? (
                <ul className="mt-2.5 space-y-1.5 text-xs text-foreground/90">
                  {sections.precautions.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 mt-0.5 font-bold">•</span>
                      <span className="leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground italic">
                  Never transfer money or share confidential financial credentials.
                </p>
              )}
            </div>
          </div>

          <p className="mt-3 text-[10px] text-muted-foreground">
            Advisory note: AI recommendations are supplemental career guidance and do not modify
            OfferProof’s verification findings or risk scores.
          </p>
        </div>
      )}
    </section>
  );
}
