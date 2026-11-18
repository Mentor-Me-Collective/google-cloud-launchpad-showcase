import { act, fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

import { AiCompareAdvisor } from "@/components/compare/AiCompareAdvisor";
import { parseCompareAdvisorRecommendations } from "@/lib/compare/advisor-parser";
import type { CompareOffer } from "@/lib/compare/engine";

const sampleOffers: CompareOffer[] = [
  {
    id: "offer-1",
    title: "Senior Full Stack Engineer",
    company: "TechNova Inc.",
    job_title: "Full Stack Engineer",
    salary_amount: 140000,
    salary_currency: "USD",
    salary_period: "year",
    benefits: "Health insurance, 401k match 5%, 25 days PTO",
    location: "San Francisco, CA",
    work_mode: "hybrid",
    employment_type: "full_time",
    employment_terms: "At-will employment, standard 3-month probation",
    growth_rating: 4,
    work_life_rating: 4,
    safety: {
      assessment: "low_concern",
      warnings: [],
    },
  },
  {
    id: "offer-2",
    title: "Lead Backend Developer",
    company: "CloudScale Labs",
    job_title: "Backend Lead",
    salary_amount: 160000,
    salary_currency: "USD",
    salary_period: "year",
    benefits: "Stock options, remote stipend, unlimited PTO",
    location: "Remote",
    work_mode: "remote",
    employment_type: "full_time",
    employment_terms: "Annual contract with performance review",
    growth_rating: 5,
    work_life_rating: 3,
    safety: {
      assessment: "needs_review",
      warnings: ["Personal recruiter email (medium)"],
    },
  },
];

const sampleNvidiaResponse = `
### Best Career Fit
* CloudScale Labs offers higher technical scope as Backend Lead and higher base pay ($160k).
* TechNova Inc. provides better stability and established benefits structure.

### Comparison Summary & Pros/Cons
* TechNova Pros: Solid 401k match, reliable hybrid routine, low concern safety assessment.
* TechNova Cons: Lower base salary than CloudScale by $20,000.
* CloudScale Pros: 100% remote flexibility, higher title, equity upside.
* CloudScale Cons: Less structured PTO policy, lower work-life balance rating (3/5).

### Salary & Career Growth Insights
* The $20k salary difference translates to roughly +14% immediate cash earnings at CloudScale.
* Career growth is rated 5/5 at CloudScale Labs, which is ideal if rapid promotion to engineering management is your objective.

### Missing Information & Recruiter Questions
* Ask CloudScale recruiter about vesting schedule and strike price for equity grants.
* Ask TechNova hiring manager about their criteria for performance-based salary reviews.

### Personalized Recommendations
* If your top priority is maximizing total compensation and remote freedom, select CloudScale Labs.
* Verify the recruiter's official domain before signing CloudScale given the needs review safety signal.
`;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Advisor Parser: parseCompareAdvisorRecommendations", () => {
  it("parses all 5 structured sections correctly", () => {
    const parsed = parseCompareAdvisorRecommendations(sampleNvidiaResponse);

    expect(parsed.bestCareerFit.length).toBe(2);
    expect(parsed.bestCareerFit[0]).toContain("CloudScale Labs");

    expect(parsed.prosAndCons.length).toBe(4);
    expect(parsed.prosAndCons[0]).toContain("TechNova Pros");

    expect(parsed.salaryAndGrowth.length).toBe(2);
    expect(parsed.salaryAndGrowth[0]).toContain("$20k salary difference");

    expect(parsed.missingAndQuestions.length).toBe(2);
    expect(parsed.missingAndQuestions[0]).toContain("vesting schedule");

    expect(parsed.personalizedRecommendations.length).toBe(2);
    expect(parsed.personalizedRecommendations[0]).toContain("CloudScale Labs");
  });

  it("handles fallback keyword classification when headings are missing", () => {
    const unformattedText = `
    CloudScale Labs represents the best career fit for your goals.
    A major pro of TechNova is strong retirement matching.
    Salary growth potential is significantly higher in the remote lead role.
    You should ask the hiring manager about on-call rotations.
    We recommend confirming all contingency dates before submitting formal acceptance.
    `;

    const parsed = parseCompareAdvisorRecommendations(unformattedText);
    expect(parsed.bestCareerFit.length).toBeGreaterThan(0);
    expect(parsed.prosAndCons.length).toBeGreaterThan(0);
    expect(parsed.salaryAndGrowth.length).toBeGreaterThan(0);
    expect(parsed.missingAndQuestions.length).toBeGreaterThan(0);
    expect(parsed.personalizedRecommendations.length).toBeGreaterThan(0);
  });
});

describe("AiCompareAdvisor Component", () => {
  it("renders initial state with priority options and empty prompt", () => {
    render(<AiCompareAdvisor offers={sampleOffers} sessionId="test-session-123" />);

    expect(screen.getByText("AI Career Advisor")).toBeInTheDocument();
    expect(screen.getByText(/NVIDIA Nemotron AI/i)).toBeInTheDocument();
    expect(screen.getByText("Balanced Evaluation")).toBeInTheDocument();
    expect(screen.getByText("Maximize Compensation")).toBeInTheDocument();
    expect(screen.getByText("Career Growth & Learning")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Analyze with NVIDIA AI/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Get personalized advice across your 2 selected offers/i),
    ).toBeInTheDocument();
  });

  it("invokes offerproof-ai-recommendations with mode='compare' and selected preferences", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { recommendations: sampleNvidiaResponse, model: "nvidia/nemotron-3.5-bolt-e4b" },
      error: null,
    });

    render(<AiCompareAdvisor offers={sampleOffers} sessionId="test-session-123" />);

    // Change priority to Maximize Compensation
    const compButton = screen.getByRole("button", { name: "Maximize Compensation" });
    fireEvent.click(compButton);

    // Enter career goal
    const goalInput = screen.getByPlaceholderText(/Specific goal or constraint/i);
    fireEvent.change(goalInput, {
      target: { value: "Aiming for engineering management in 2 years" },
    });

    // Click Analyze
    const analyzeBtn = screen.getByRole("button", { name: /Analyze with NVIDIA AI/i });
    fireEvent.click(analyzeBtn);

    expect(screen.getByText(/Evaluating offers with NVIDIA Nemotron/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    expect(mockInvoke).toHaveBeenCalledWith("offerproof-ai-recommendations", {
      body: expect.objectContaining({
        mode: "compare",
        sessionId: "test-session-123",
        preferences: {
          priority: "compensation",
          careerGoals: "Aiming for engineering management in 2 years",
        },
        offers: expect.arrayContaining([
          expect.objectContaining({
            title: "Senior Full Stack Engineer",
            company: "TechNova Inc.",
            salary_amount: 140000,
          }),
          expect.objectContaining({
            title: "Lead Backend Developer",
            company: "CloudScale Labs",
            salary_amount: 160000,
          }),
        ]),
      }),
    });

    // Check that all 5 sections are rendered
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Best Career Fit" })).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Comparison Summary & Pros/Cons" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Salary & Career Growth Insights" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Missing Information & Recruiter Questions" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Personalized Recommendations" }),
      ).toBeInTheDocument();
    });

    // Advisory disclaimer must be present
    expect(
      screen.getByText(/Career suitability is evaluated independently from safety verification/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AI insights never declare an offer genuine or fraudulent/i),
    ).toBeInTheDocument();
  });

  it("handles error state and allows retry", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: "NVIDIA API rate limit exceeded" },
    });

    render(<AiCompareAdvisor offers={sampleOffers} sessionId="test-session-123" />);

    const analyzeBtn = screen.getByRole("button", { name: /Analyze with NVIDIA AI/i });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(screen.getByText("Unable to generate AI career advice")).toBeInTheDocument();
      expect(screen.getByText("NVIDIA API rate limit exceeded")).toBeInTheDocument();
    });

    // Retry should be available
    const retryBtn = screen.getByRole("button", { name: "Retry" });
    expect(retryBtn).toBeInTheDocument();

    mockInvoke.mockResolvedValueOnce({
      data: { recommendations: sampleNvidiaResponse },
      error: null,
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Best Career Fit" })).toBeInTheDocument();
    });
  });
});
