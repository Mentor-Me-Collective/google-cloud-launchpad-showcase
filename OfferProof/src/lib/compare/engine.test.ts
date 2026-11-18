import { describe, expect, it } from "vitest";
import { annualSalary, compareOffers, parseSalary, type CompareOffer } from "./engine";

const base = (p: Partial<CompareOffer>): CompareOffer => ({
  id: "x",
  title: "X",
  company: null,
  job_title: null,
  salary_amount: null,
  salary_currency: null,
  salary_period: null,
  benefits: null,
  location: null,
  work_mode: null,
  employment_type: null,
  employment_terms: null,
  growth_rating: null,
  work_life_rating: null,
  safety: null,
  ...p,
});

describe("compare engine", () => {
  it("annualises monthly salary ×12", () => {
    expect(annualSalary({ salary_amount: 45000, salary_period: "month" })).toBe(540000);
  });

  it("parses ₹45,000 per month", () => {
    expect(parseSalary("₹45,000 per month")).toEqual({
      amount: 45000,
      currency: "INR",
      period: "month",
    });
  });

  it("parses 6 LPA as 600000 per year", () => {
    expect(parseSalary("6 LPA")).toEqual({ amount: 600000, currency: "INR", period: "year" });
  });

  it("marks the higher salary as best when currencies match", () => {
    const c = compareOffers([
      base({ id: "a", salary_amount: 50000, salary_currency: "INR", salary_period: "month" }),
      base({ id: "b", salary_amount: 500000, salary_currency: "INR", salary_period: "year" }),
    ]);
    const row = c.career.find((r) => r.key === "salary")!;
    expect(row.values.find((v) => v.best)?.id).toBe("a");
  });

  it("does not rank salaries in different currencies", () => {
    const c = compareOffers([
      base({ id: "a", salary_amount: 50000, salary_currency: "INR", salary_period: "month" }),
      base({ id: "b", salary_amount: 5000, salary_currency: "USD", salary_period: "month" }),
    ]);
    expect(c.career.find((r) => r.key === "salary")!.values.some((v) => v.best)).toBe(false);
  });

  it("reports missing fields instead of inventing them", () => {
    const c = compareOffers([
      base({ id: "a", title: "A", job_title: "Dev" }),
      base({ id: "b", title: "B" }),
    ]);
    expect(c.missing.find((m) => m.id === "b")?.fields).toContain("Role");
    expect(c.career.find((r) => r.key === "benefits")!.values[0]!.display).toBe("Not provided");
  });

  it("keeps safety separate and flags high concern", () => {
    const c = compareOffers([
      base({
        id: "a",
        safety: { assessment: "high_concern", warnings: ["Payment or fee requested"] },
      }),
      base({ id: "b", safety: { assessment: "low_concern", warnings: [] } }),
    ]);
    expect(c.safety[0]!.warnings).toEqual(["Payment or fee requested"]);
    expect(c.career.some((r) => r.key === "safety")).toBe(false);
    expect(c.notes.join(" ")).toMatch(/High Concern/);
  });

  it("requires at least two offers", () => {
    expect(() => compareOffers([base({})])).toThrow();
  });
});
