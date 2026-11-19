// Browser data layer. Uses the publishable Supabase client; Row Level Security limits every query to the signed-in user.
import { supabase } from "@/integrations/supabase/client";
import { analyze, type Report } from "@/lib/verify/engine";
import { parseSalary } from "@/lib/compare/engine";
import type { Json, Tables } from "@/integrations/supabase/types";

export type OfferRow = Tables<"offers">;
export type ReportRow = Tables<"verification_reports">;
export type ComparisonRow = Tables<"comparisons">;

const PENDING_KEY = "offerproof:pending-offers";

/** Guest offers waiting for sign-in. Only the text is kept; the engine re-runs deterministically. */
export function getPending(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}
export function addPending(text: string) {
  const list = getPending();
  if (!list.includes(text)) list.push(text);
  localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-10)));
  return list.length;
}
export function clearPending() {
  localStorage.removeItem(PENDING_KEY);
}

export function safeRedirect(r: unknown): string {
  return typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? r : "/history";
}

/** Save an offer plus its verification report. Career fields are only pre-filled from text actually found. */
export async function saveOfferWithReport(text: string, report: Report = analyze(text)) {
  const x = report.extracted;
  const sal = parseSalary(x.salary);
  const title =
    (x.jobTitle && x.company && x.jobTitle.toLowerCase().includes(" at ")
      ? x.jobTitle
      : [x.jobTitle, x.company].filter(Boolean).join(" at ")) ||
    `Offer saved ${new Date().toLocaleDateString()}`;
  const { data: offer, error } = await supabase
    .from("offers")
    .insert({
      title: title.slice(0, 200),
      company: x.company,
      job_title: x.jobTitle,
      location: x.location,
      offer_text: text,
      salary_amount: sal.amount,
      salary_currency: sal.currency,
      salary_period: sal.period,
    })
    .select()
    .single();
  if (error) throw error;
  const { error: e2 } = await supabase.from("verification_reports").insert({
    offer_id: offer.id,
    assessment: report.assessment,
    points: report.points,
    findings: report.findings as unknown as Json,
    extracted: report.extracted as unknown as Json,
    phrases: report.phrases as unknown as Json,
    offer_text: text,
  });
  if (e2) throw e2;
  return offer;
}

/** Move guest offers into the account after sign-in. */
export async function importPending(): Promise<number> {
  const list = getPending();
  if (!list.length) return 0;
  clearPending();
  let n = 0;
  for (const t of list) {
    try {
      await saveOfferWithReport(t);
      n++;
    } catch (e) {
      console.error(e);
    }
  }
  return n;
}

export function rowToReport(r: ReportRow): Report {
  return {
    assessment: r.assessment as Report["assessment"],
    points: r.points,
    findings: r.findings as unknown as Report["findings"],
    extracted: r.extracted as unknown as Report["extracted"],
    phrases: r.phrases as unknown as string[],
  };
}
