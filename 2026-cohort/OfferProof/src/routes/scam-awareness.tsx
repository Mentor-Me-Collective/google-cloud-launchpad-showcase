import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  Database,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
} from "lucide-react";
import { PageHero } from "@/components/site/SiteShell";
import { ARTICLES } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/scam-awareness")({
  head: () => ({
    meta: [
      { title: "Scam Awareness Centre — OfferProof" },
      {
        name: "description",
        content:
          "Learn the signs of fake recruiters, payment scams, suspicious domains and fraudulent internships. Explore real job postings from our BigQuery analytics dataset.",
      },
      { property: "og:title", content: "Scam Awareness Centre — OfferProof" },
      { property: "og:description", content: "Spot job scams before they cost you." },
    ],
  }),
  component: Awareness,
});

interface DatasetSummary {
  total: number;
  fraudulent: number;
  legitimate: number;
  fraudulentRate: number;
}

interface JobPostingRecord {
  job_id?: string | number;
  title?: string;
  company_profile?: string;
  description?: string;
  requirements?: string;
  benefits?: string;
  location?: string;
  department?: string;
  salary_range?: string;
  employment_type?: string;
  required_experience?: string;
  required_education?: string;
  industry?: string;
  function?: string;
  fraudulent?: string | number | boolean;
  [key: string]: unknown;
}

function isFraudulentValue(val: unknown): boolean {
  if (val === 1 || val === "1" || val === true) return true;
  if (typeof val === "string" && (val.toLowerCase() === "true" || val.trim() === "1")) return true;
  return false;
}

function normalizeFraudulent(val: unknown): 0 | 1 {
  return isFraudulentValue(val) ? 1 : 0;
}

function JobPostingsExplorer() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "fraudulent" | "legitimate">("all");
  const [records, setRecords] = useState<JobPostingRecord[]>([]);
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const reqIdRef = useRef(0);

  const loadData = useCallback(
    async (searchQuery: string, filterValue: "all" | "fraudulent" | "legitimate") => {
      const currentReq = ++reqIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "offerproof-job-postings",
          {
            body: {
              search: searchQuery.trim(),
              filter: filterValue,
              limit: 30,
              includeSummary: true,
            },
          },
        );

        if (currentReq !== reqIdRef.current) return;

        if (fnError) {
          throw new Error(fnError.message || "Failed to query job postings Edge Function.");
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        if (data?.summary) {
          setSummary(data.summary);
        }

        if (Array.isArray(data?.records)) {
          const normalized = data.records.map((r: JobPostingRecord) => ({
            ...r,
            fraudulent: normalizeFraudulent(r.fraudulent),
          }));
          setRecords(normalized);
        } else {
          setRecords([]);
        }
      } catch (err: unknown) {
        if (currentReq !== reqIdRef.current) return;
        const msg =
          err instanceof Error ? err.message : "Unable to retrieve BigQuery job postings.";
        setError(msg);
      } finally {
        if (currentReq === reqIdRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      void loadData(search, filter);
    }, 350);
    return () => clearTimeout(handler);
  }, [search, filter, loadData]);

  const displayedRecords = useMemo(() => {
    if (filter === "fraudulent") {
      return records.filter((r) => isFraudulentValue(r.fraudulent));
    }
    if (filter === "legitimate") {
      return records.filter((r) => !isFraudulentValue(r.fraudulent));
    }
    return records;
  }, [records, filter]);

  return (
    <div className="space-y-8">
      {/* Dataset Context Banner */}
      <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Database className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">Job Postings Analytics Dataset</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Live preview of real postings from BigQuery table{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                  xenon-hub-514707-f9.offerproof_analytics.job_postings
                </code>{" "}
                (region: <span className="font-semibold text-foreground">asia-south1</span>)
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            BigQuery · asia-south1
          </Badge>
        </div>

        {/* Dataset Breakdown */}
        {summary && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Total records in dataset</p>
              <p className="mt-1 text-2xl font-bold">{summary.total.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">Historical job listings</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Legitimate postings (0)</p>
                <CheckCircle2 className="size-3.5 text-low" />
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {summary.legitimate.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.total > 0 ? ((summary.legitimate / summary.total) * 100).toFixed(1) : 0}%
                of dataset
              </p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Fraudulent postings (1)</p>
                <AlertTriangle className="size-3.5 text-high" />
              </div>
              <p className="mt-1 text-2xl font-bold text-high">
                {summary.fraudulent.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.fraudulentRate}% flagged scam listings
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search job title, company, industry or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className="text-xs"
          >
            All Postings
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "fraudulent" ? "default" : "outline"}
            onClick={() => setFilter("fraudulent")}
            className="text-xs gap-1.5"
          >
            <AlertTriangle className="size-3 text-high" /> Fraudulent (1)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "legitimate" ? "default" : "outline"}
            onClick={() => setFilter("legitimate")}
            className="text-xs gap-1.5"
          >
            <CheckCircle2 className="size-3 text-low" /> Legitimate (0)
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => void loadData(search, filter)}
            title="Refresh from BigQuery"
            aria-label="Refresh from BigQuery"
            className="size-8"
            disabled={loading}
          >
            <RotateCcw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-12 text-center"
          role="status"
        >
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Querying BigQuery dataset…</p>
          <p className="text-xs text-muted-foreground">
            Fetching records from xenon-hub-514707-f9.offerproof_analytics.job_postings
            (asia-south1)
          </p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold text-foreground">
                BigQuery dataset preview unavailable
              </h4>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="rounded-lg bg-background p-3 text-xs text-muted-foreground">
                <p>
                  Ensure the Supabase Edge Function{" "}
                  <code className="font-semibold text-foreground">offerproof-job-postings</code> is
                  deployed with the configured{" "}
                  <code className="font-semibold text-foreground">GOOGLE_SERVICE_ACCOUNT_JSON</code>{" "}
                  secret.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadData(search, filter)}
                className="mt-3 gap-1.5 text-xs"
              >
                <RotateCcw className="size-3.5" /> Retry query
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && displayedRecords.length === 0 && (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <Database className="mx-auto size-8 text-muted-foreground" />
          <h4 className="mt-3 font-semibold">No job postings found</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            No records matched your search query or selected label filter.
          </p>
          {(search || filter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className="mt-4 text-xs"
            >
              Reset search & filters
            </Button>
          )}
        </div>
      )}

      {/* Records Preview List */}
      {!loading && !error && displayedRecords.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Showing {displayedRecords.length} records matching your filter
          </p>
          <div className="grid gap-4">
            {displayedRecords.map((r, idx) => {
              const isFraud = isFraudulentValue(r.fraudulent);
              const recordKey = String(r.job_id ?? idx);
              const isExpanded = expandedId === recordKey;

              return (
                <article
                  key={recordKey}
                  className={`rounded-xl border bg-card p-5 shadow-card transition-colors ${
                    isFraud ? "border-l-4 border-l-high" : "border-l-4 border-l-low"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {r.title ? String(r.title) : "Untitled Job Posting"}
                        </h3>
                        {isFraud ? (
                          <Badge
                            variant="destructive"
                            className="bg-high text-high-foreground gap-1 text-[11px]"
                          >
                            <AlertTriangle className="size-3" /> Fraudulent (1)
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-low-soft text-low font-medium gap-1 text-[11px]"
                          >
                            <CheckCircle2 className="size-3" /> Legitimate (0)
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {r.job_id !== undefined && <span>ID: #{String(r.job_id)}</span>}
                        {r.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" /> {String(r.location)}
                          </span>
                        )}
                        {r.industry && (
                          <span className="flex items-center gap-1">
                            <Building2 className="size-3" /> {String(r.industry)}
                          </span>
                        )}
                        {r.employment_type && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="size-3" /> {String(r.employment_type)}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : recordKey)}
                      className="text-xs gap-1.5"
                    >
                      <ChevronDown
                        className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                      {isExpanded ? "Hide details" : "View details"}
                    </Button>
                  </div>

                  {/* Summary Snippet */}
                  {r.description && !isExpanded && (
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {String(r.description).replace(/<[^>]*>/g, "")}
                    </p>
                  )}

                  {/* Expanded Full Details */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t pt-4 text-xs">
                      {r.company_profile && (
                        <div>
                          <h4 className="font-semibold text-foreground">Company Profile</h4>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                            {String(r.company_profile).replace(/<[^>]*>/g, "")}
                          </p>
                        </div>
                      )}
                      {r.description && (
                        <div>
                          <h4 className="font-semibold text-foreground">Job Description</h4>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                            {String(r.description).replace(/<[^>]*>/g, "")}
                          </p>
                        </div>
                      )}
                      {r.requirements && (
                        <div>
                          <h4 className="font-semibold text-foreground">Requirements</h4>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                            {String(r.requirements).replace(/<[^>]*>/g, "")}
                          </p>
                        </div>
                      )}
                      {r.benefits && (
                        <div>
                          <h4 className="font-semibold text-foreground">Benefits</h4>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                            {String(r.benefits).replace(/<[^>]*>/g, "")}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-[11px] sm:grid-cols-4">
                        <div>
                          <span className="text-muted-foreground">Experience: </span>
                          <span className="font-medium text-foreground">
                            {r.required_experience
                              ? String(r.required_experience)
                              : "Not specified"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Education: </span>
                          <span className="font-medium text-foreground">
                            {r.required_education ? String(r.required_education) : "Not specified"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Department: </span>
                          <span className="font-medium text-foreground">
                            {r.department ? String(r.department) : "Not specified"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Salary Range: </span>
                          <span className="font-medium text-foreground">
                            {r.salary_range ? String(r.salary_range) : "Not disclosed"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Awareness() {
  const [activeTab, setActiveTab] = useState<"learn" | "data">("learn");

  return (
    <>
      <PageHero eyebrow="Scam Awareness Centre" title="Know the patterns.">
        Most job scams follow a few predictable scripts. Here's how to recognise them. All examples
        are fictional.
      </PageHero>

      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "learn" | "data")}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="learn">Learn</TabsTrigger>
            <TabsTrigger value="data">Explore Data</TabsTrigger>
          </TabsList>

          {/* Tab 1: Learn - All existing scam awareness content preserved exactly */}
          <TabsContent
            value="learn"
            forceMount
            className="mt-8 space-y-10 pb-16 data-[state=inactive]:hidden"
          >
            <nav className="flex flex-wrap gap-2">
              {ARTICLES.map((a) => (
                <a
                  key={a.slug}
                  href={`#${a.slug}`}
                  className="rounded-full border px-4 py-1.5 text-sm hover:border-primary"
                >
                  {a.category}
                </a>
              ))}
            </nav>
            {ARTICLES.map((a) => (
              <article
                key={a.slug}
                id={a.slug}
                className="scroll-mt-24 rounded-2xl border bg-card p-6 shadow-card sm:p-8"
              >
                <p className="eyebrow">{a.category}</p>
                <h2 className="mt-2 text-2xl font-bold">{a.title}</h2>
                <p className="mt-3 text-muted-foreground">{a.summary}</p>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold">Warning signs</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {a.signs.map((s) => (
                        <li key={s} className="flex gap-2">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <blockquote className="rounded-lg border-l-4 border-high bg-high-soft/40 p-4 text-sm italic">
                    {a.example}
                  </blockquote>
                </div>
              </article>
            ))}
            <div className="rounded-2xl bg-ink p-8 text-ink-foreground">
              <h2 className="text-2xl font-bold">Already paid or shared details?</h2>
              <p className="mt-2 text-ink-muted">
                Contact your bank right away, keep all screenshots, stop replying, and report the
                incident to your national cybercrime portal (India: cybercrime.gov.in or call 1930).
              </p>
              <Button asChild variant="secondary" className="mt-6">
                <Link to="/verify">Check another offer</Link>
              </Button>
            </div>
          </TabsContent>

          {/* Tab 2: Explore Data - Clean interactive preview of real BigQuery records */}
          <TabsContent value="data" forceMount className="mt-8 pb-16 data-[state=inactive]:hidden">
            <JobPostingsExplorer />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
