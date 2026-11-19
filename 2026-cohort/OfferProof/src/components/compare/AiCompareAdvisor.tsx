import { useState, useMemo, useCallback } from "react";
import {
  AlertCircle,
  Bot,
  Compass,
  GitCompare,
  HelpCircle,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { CompareOffer } from "@/lib/compare/engine";
import { getOrCreateSessionId } from "@/lib/verify/session";
import {
  parseCompareAdvisorRecommendations,
  type CompareAdvisorSections,
} from "@/lib/compare/advisor-parser";

interface AiCompareAdvisorProps {
  offers: CompareOffer[];
  sessionId?: string;
}

const PRIORITIES = [
  { id: "balanced", label: "Balanced Evaluation" },
  { id: "compensation", label: "Maximize Compensation" },
  { id: "growth", label: "Career Growth & Learning" },
  { id: "wlb", label: "Work-Life Balance" },
  { id: "flexibility", label: "Remote & Flexibility" },
] as const;

export function AiCompareAdvisor({ offers, sessionId }: AiCompareAdvisorProps) {
  const [priority, setPriority] = useState<string>("balanced");
  const [careerGoals, setCareerGoals] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawOutput, setRawOutput] = useState<string | null>(null);

  const analyzeOffers = useCallback(
    async (force = false) => {
      if (offers.length < 2) return;
      if (loading && !force) return;

      setLoading(true);
      setError(null);

      const effectiveSessionId = sessionId || getOrCreateSessionId();

      try {
        const payload = {
          mode: "compare",
          sessionId: effectiveSessionId,
          offers: offers.map((o) => ({
            id: o.id,
            title: o.title,
            company: o.company,
            job_title: o.job_title,
            salary_amount: o.salary_amount,
            salary_currency: o.salary_currency,
            salary_period: o.salary_period,
            location: o.location,
            work_mode: o.work_mode,
            employment_type: o.employment_type,
            employment_terms: o.employment_terms,
            benefits: o.benefits,
            growth_rating: o.growth_rating,
            work_life_rating: o.work_life_rating,
            safety: o.safety,
          })),
          preferences: {
            priority,
            careerGoals: careerGoals.trim() || undefined,
          },
        };

        const { data, error: fnError } = await supabase.functions.invoke(
          "offerproof-ai-recommendations",
          {
            body: payload,
          },
        );

        if (fnError) {
          throw new Error(fnError.message || "Failed to generate AI career comparison.");
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        if (typeof data?.recommendations === "string" && data.recommendations.trim()) {
          setRawOutput(data.recommendations.trim());
        } else {
          throw new Error("No career advice received from NVIDIA Nemotron.");
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to generate AI career recommendations at this time.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [offers, sessionId, loading, priority, careerGoals],
  );

  const sections: CompareAdvisorSections | null = useMemo(() => {
    return rawOutput ? parseCompareAdvisorRecommendations(rawOutput) : null;
  }, [rawOutput]);

  return (
    <section
      aria-label="AI Career Advisor"
      className="rounded-2xl border bg-card p-5 sm:p-7 shadow-card flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Bot className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold">AI Career Advisor</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
                <Sparkles className="size-3 text-primary" /> NVIDIA Nemotron AI
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Objective career fit, salary analysis, and recruiter questions powered by NVIDIA.
            </p>
          </div>
        </div>
      </div>

      {/* User Preferences Bar */}
      <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Your Decision Priority
          </label>
          <span className="text-[11px] text-muted-foreground">
            Select what matters most to tailor NVIDIA Nemotron’s evaluation
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPriority(p.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                priority === p.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background border border-input text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Input
            value={careerGoals}
            onChange={(e) => setCareerGoals(e.target.value)}
            placeholder="Specific goal or constraint? (e.g., target senior role in 2 yrs, need health coverage for family)"
            className="text-xs h-9"
            maxLength={180}
            aria-label="Career goals or constraints"
          />
          <Button
            onClick={() => void analyzeOffers(true)}
            disabled={loading}
            className="gap-2 text-xs shrink-0 h-9"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Analyzing…
              </>
            ) : rawOutput ? (
              <>
                <RotateCcw className="size-3.5" /> Re-analyze Offers
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" /> Analyze with NVIDIA AI
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          className="flex flex-col items-center justify-center gap-3 py-12 text-center"
          role="status"
        >
          <Loader2 className="size-8 animate-spin text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Evaluating offers with NVIDIA Nemotron…
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Synthesizing compensation, career progression, pros/cons, and recruiter questions.
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-destructive">Unable to generate AI career advice</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void analyzeOffers(true)}
            className="shrink-0 text-xs"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Initial Empty State before generation */}
      {!loading && !error && !sections && (
        <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
          <Sparkles className="mx-auto size-8 text-primary/70 mb-2" />
          <h3 className="font-semibold text-foreground text-sm sm:text-base">
            Get personalized advice across your {offers.length} selected offers
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Click &ldquo;Analyze with NVIDIA AI&rdquo; above to receive a side-by-side synthesis
            covering best career fit, trade-offs, salary progression, and questions to ask
            recruiters.
          </p>
        </div>
      )}

      {/* Output Sections */}
      {!loading && !error && sections && (
        <div className="space-y-4">
          {sections.summaryIntro && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/50 pl-3">
              {sections.summaryIntro}
            </p>
          )}

          {/* 1. Best Career Fit */}
          {sections.bestCareerFit.length > 0 && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-primary font-bold text-sm sm:text-base">
                <Trophy className="size-4 sm:size-5 shrink-0 text-primary" />
                <h3>Best Career Fit</h3>
              </div>
              <ul className="mt-3 space-y-2 text-xs sm:text-sm text-foreground/90">
                {sections.bestCareerFit.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-primary mt-1 font-bold">•</span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 2. Comparison Summary & Pros/Cons */}
          {sections.prosAndCons.length > 0 && (
            <div className="rounded-xl border bg-card p-4 sm:p-5">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm sm:text-base border-b pb-2.5">
                <GitCompare className="size-4 shrink-0 text-primary" />
                <h3>Comparison Summary & Pros/Cons</h3>
              </div>
              <ul className="mt-3 space-y-2 text-xs sm:text-sm text-foreground/90">
                {sections.prosAndCons.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-primary mt-1 font-bold">•</span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 3. Salary & Career Growth Insights */}
          {sections.salaryAndGrowth.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm sm:text-base border-b border-emerald-500/20 pb-2.5">
                <TrendingUp className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <h3>Salary & Career Growth Insights</h3>
              </div>
              <ul className="mt-3 space-y-2 text-xs sm:text-sm text-foreground/90">
                {sections.salaryAndGrowth.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-emerald-600 dark:text-emerald-400 mt-1 font-bold">•</span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. Missing Information & Recruiter Questions */}
          {sections.missingAndQuestions.length > 0 && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm sm:text-base border-b border-blue-500/20 pb-2.5">
                <HelpCircle className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <h3>Missing Information & Recruiter Questions</h3>
              </div>
              <ul className="mt-3 space-y-2 text-xs sm:text-sm text-foreground/90">
                {sections.missingAndQuestions.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-blue-600 dark:text-blue-400 mt-1 font-bold">•</span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 5. Personalized Recommendations */}
          {sections.personalizedRecommendations.length > 0 && (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-sm sm:text-base border-b border-purple-500/20 pb-2.5">
                <Compass className="size-4 shrink-0 text-purple-600 dark:text-purple-400" />
                <h3>Personalized Recommendations</h3>
              </div>
              <ul className="mt-3 space-y-2 text-xs sm:text-sm text-foreground/90">
                {sections.personalizedRecommendations.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-purple-600 dark:text-purple-400 mt-1 font-bold">•</span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Advisory Note */}
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Lightbulb className="size-4 text-primary shrink-0 mt-0.5" />
            <p>
              <b>Advisory note:</b> AI Career Advisor recommendations are generated by NVIDIA
              Nemotron as supplemental decision guidance. Career suitability is evaluated
              independently from safety verification. AI insights never declare an offer genuine or
              fraudulent.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
