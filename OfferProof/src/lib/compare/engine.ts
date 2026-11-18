// Offer comparison rules. Pure TypeScript: no React, no DOM.
// Career suitability and safety are kept separate; missing data is reported, never guessed.
import type { Assessment } from "@/lib/verify/engine";

export type Period = "year" | "month" | "week" | "day" | "hour";

export interface CompareOffer {
  id: string;
  title: string;
  company: string | null;
  job_title: string | null;
  salary_amount: number | null;
  salary_currency: string | null;
  salary_period: Period | null;
  benefits: string | null;
  location: string | null;
  work_mode: string | null;
  employment_type: string | null;
  employment_terms: string | null;
  growth_rating: number | null;
  work_life_rating: number | null;
  safety: { assessment: Assessment; warnings: string[] } | null;
}

export const PERIOD_FACTOR: Record<Period, number> = {
  year: 1,
  month: 12,
  week: 52,
  day: 260,
  hour: 2080,
};

export function annualSalary(
  o: Pick<CompareOffer, "salary_amount" | "salary_period">,
): number | null {
  if (o.salary_amount == null || !o.salary_period) return null;
  return Math.round(o.salary_amount * PERIOD_FACTOR[o.salary_period]);
}

/** Parse a salary phrase found in an offer. Returns nulls for anything not clearly stated. */
export function parseSalary(s: string | null): {
  amount: number | null;
  currency: string | null;
  period: Period | null;
} {
  if (!s) return { amount: null, currency: null, period: null };
  const t = s.toLowerCase();
  const currency = /₹|rs\.?|inr|lpa|lakh/.test(t)
    ? "INR"
    : /\$|usd/.test(t)
      ? "USD"
      : /£|gbp/.test(t)
        ? "GBP"
        : /€|eur/.test(t)
          ? "EUR"
          : null;
  const num = t.match(/(\d[\d,]*(?:\.\d+)?)/);
  let amount = num?.[1] ? Number(num[1].replace(/,/g, "")) : null;
  let period: Period | null = null;
  if (/lpa|lakhs?\s*(?:per annum|p\.?a\.?|a year|per year)?/.test(t) && amount != null) {
    amount = amount * 100000;
    period = "year";
  }
  if (!period) {
    if (/per\s*month|\/\s*month|monthly|p\.?m\.?\b|a month/.test(t)) period = "month";
    else if (/per\s*(?:annum|year)|\/\s*year|annual|p\.?a\.?\b|a year|ctc/.test(t)) period = "year";
    else if (/per\s*week|weekly|\/\s*week/.test(t)) period = "week";
    else if (/per\s*day|daily|\/\s*day|a day/.test(t)) period = "day";
    else if (/per\s*hour|hourly|\/\s*h(?:ou)?r/.test(t)) period = "hour";
  }
  if (amount != null && /\d\s*k\b/.test(t)) amount *= 1000;
  return { amount: amount && amount > 0 ? amount : null, currency, period };
}

export interface CriterionRow {
  key: string;
  label: string;
  values: { id: string; display: string; missing: boolean; best: boolean }[];
  note?: string;
}

export interface Comparison {
  career: CriterionRow[];
  safety: { id: string; title: string; assessment: Assessment | null; warnings: string[] }[];
  missing: { id: string; title: string; fields: string[] }[];
  notes: string[];
}

const NP = "Not provided";
const fmt = (n: number) => n.toLocaleString("en-US");
const label = (s: string | null) =>
  s ? s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : null;

function textRow(
  key: string,
  lbl: string,
  offers: CompareOffer[],
  get: (o: CompareOffer) => string | null,
): CriterionRow {
  return {
    key,
    label: lbl,
    values: offers.map((o) => {
      const v = get(o)?.trim() || null;
      return { id: o.id, display: v ?? NP, missing: !v, best: false };
    }),
  };
}

function ratingRow(
  key: string,
  lbl: string,
  offers: CompareOffer[],
  get: (o: CompareOffer) => number | null,
): CriterionRow {
  const vals = offers.map(get);
  const known = vals.filter((v): v is number => v != null);
  const max = known.length >= 2 ? Math.max(...known) : null;
  const unique = max != null && known.filter((v) => v === max).length === 1;
  return {
    key,
    label: lbl,
    values: offers.map((o, i) => ({
      id: o.id,
      display: vals[i] != null ? `${vals[i]}/5 (your rating)` : NP,
      missing: vals[i] == null,
      best: unique && vals[i] === max,
    })),
  };
}

export function compareOffers(offers: CompareOffer[]): Comparison {
  if (offers.length < 2) throw new Error("Select at least two offers to compare.");
  const notes: string[] = [];

  const annual = offers.map(annualSalary);
  const currencies = new Set(
    offers.filter((o, i) => annual[i] != null).map((o) => o.salary_currency ?? "?"),
  );
  const comparable =
    annual.filter((a) => a != null).length >= 2 && currencies.size === 1 && !currencies.has("?");
  const maxSalary = comparable ? Math.max(...annual.filter((a): a is number => a != null)) : null;
  const salaryUnique = maxSalary != null && annual.filter((a) => a === maxSalary).length === 1;
  if (!comparable && annual.filter((a) => a != null).length >= 2)
    notes.push("Salaries use different or unknown currencies, so they are not ranked.");
  const salaryRow: CriterionRow = {
    key: "salary",
    label: "Salary (annualised)",
    values: offers.map((o, i) => ({
      id: o.id,
      display:
        annual[i] != null
          ? `${o.salary_currency ?? ""} ${fmt(annual[i]!)} / year`.trim()
          : o.salary_amount != null
            ? `${fmt(o.salary_amount)} (period not stated)`
            : NP,
      missing: annual[i] == null,
      best: salaryUnique && annual[i] === maxSalary,
    })),
    note: "Annualised from the amount and period you entered (month ×12, week ×52, day ×260, hour ×2080). Before tax; excludes benefits.",
  };

  const career = [
    textRow("role", "Role", offers, (o) => o.job_title),
    salaryRow,
    textRow("benefits", "Benefits", offers, (o) => o.benefits),
    textRow(
      "location",
      "Location & work mode",
      offers,
      (o) => [o.location, label(o.work_mode)].filter(Boolean).join(" · ") || null,
    ),
    ratingRow("growth", "Growth", offers, (o) => o.growth_rating),
    ratingRow("work_life", "Work-life balance", offers, (o) => o.work_life_rating),
    textRow(
      "terms",
      "Employment terms",
      offers,
      (o) => [label(o.employment_type), o.employment_terms].filter(Boolean).join(" · ") || null,
    ),
  ];

  const missing = offers
    .map((o) => ({
      id: o.id,
      title: o.title,
      fields: career
        .filter((r) => r.values.find((v) => v.id === o.id)?.missing)
        .map((r) => r.label),
    }))
    .filter((m) => m.fields.length);

  const safety = offers.map((o) => ({
    id: o.id,
    title: o.title,
    assessment: o.safety?.assessment ?? null,
    warnings: o.safety?.warnings ?? [],
  }));
  if (safety.some((s) => s.assessment === "high_concern"))
    notes.push(
      "At least one offer shows High Concern warning signs. Verify that employer before weighing its career benefits.",
    );
  if (safety.some((s) => s.assessment == null))
    notes.push(
      "Some offers have no saved verification report, so their safety signals are unknown.",
    );

  return { career, safety, missing, notes };
}
