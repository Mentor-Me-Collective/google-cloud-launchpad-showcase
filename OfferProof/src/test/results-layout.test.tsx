import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock Supabase invoke for AiRecommendations
const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

import { ReportView } from "@/components/verify/ReportView";
import { parseStructuredRecommendations } from "@/components/verify/AiRecommendations";
import type { Finding, Report } from "@/lib/verify/engine";

function createMockReport(numFindings: number): Report {
  const findings: Finding[] = Array.from({ length: numFindings }, (_, idx) => ({
    id: `finding_${idx + 1}`,
    name: `Warning Signal ${idx + 1}`,
    severity: (idx % 3 === 0 ? "high" : idx % 3 === 1 ? "medium" : "low") as
      "high" | "medium" | "low",
    evidence: [`evidence_${idx + 1}@example.com`],
    explanation: `Detailed explanation for indicator #${idx + 1}`,
    action: `Actionable step to verify indicator #${idx + 1}`,
  }));

  return {
    assessment:
      numFindings >= 5 ? "high_concern" : numFindings >= 1 ? "needs_review" : "low_concern",
    points: numFindings * 3,
    findings,
    extracted: {
      company: "Acme Global Solutions",
      recruiter: "Sarah Jenkins",
      jobTitle: "Senior Analyst",
      salary: "$95,000 / year",
      joiningDate: "1st of next month",
      location: "Remote / Hybrid",
      emails: ["sarah.recruiter@gmail.com", "applicant@personal.me"],
      domains: ["acmeglobal-careers.net"],
      urls: ["https://acmeglobal-careers.net/apply"],
      phones: ["+1 555-0199"],
    },
    phrases: ["fee required", "urgent response"],
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("OfferProof Results Page Layout & Warning Signal Scenarios", () => {
  it("renders correctly with 0 warning signals (clear state)", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        recommendations:
          "### Verification Steps\n- Check official website domain.\n\n### Recruiter Questions\n- Ask about reporting manager.\n\n### Important Precautions\n- Never share banking passwords.",
      },
      error: null,
    });

    const report = createMockReport(0);
    render(<ReportView report={report} text="Sample offer text" onReset={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Verification Steps")).toBeDefined();
    });

    // Concern signals section exists and shows 0 signals
    expect(screen.getByText("Concern Signals")).toBeDefined();
    expect(screen.getByText("0 signals")).toBeDefined();
    expect(screen.getByText("No common warning signs detected")).toBeDefined();

    // Scrollable container exists with max-h-[420px]
    const scrollContainer = document.querySelector(".max-h-\\[420px\\]");
    expect(scrollContainer).not.toBeNull();

    // AI Recommendations is side by side with Concern Signals
    expect(screen.getByText("OfferProof AI Recommendations")).toBeDefined();

    // Extracted details is present in compact two-column grid
    expect(screen.getByText("Extracted Details")).toBeDefined();
    const grid = document.querySelector("dl.grid");
    expect(grid?.className).toContain("sm:grid-cols-2");

    // Action guide follows extracted details
    expect(screen.getByText("OfferProof Action Guide")).toBeDefined();

    // Highlighted document section is completely removed
    expect(screen.queryByText("Highlighted document")).toBeNull();
  });

  it("renders correctly with 1 warning signal", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        recommendations:
          "### Verification Steps\n- Step 1\n### Recruiter Questions\n- Q1\n### Important Precautions\n- P1",
      },
      error: null,
    });

    const report = createMockReport(1);
    render(<ReportView report={report} text="Sample offer text" onReset={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("1 signal")).toBeDefined();
    });
    expect(screen.getByText("Warning Signal 1")).toBeDefined();
    expect(screen.getByText("Detailed explanation for indicator #1")).toBeDefined();
  });

  it("renders correctly with 3 warning signals", async () => {
    mockInvoke.mockResolvedValue({
      data: { recommendations: "Standard recommendations" },
      error: null,
    });

    const report = createMockReport(3);
    render(<ReportView report={report} text="Sample offer text" onReset={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("3 signals")).toBeDefined();
    });
    expect(screen.getByText("Warning Signal 1")).toBeDefined();
    expect(screen.getByText("Warning Signal 2")).toBeDefined();
    expect(screen.getByText("Warning Signal 3")).toBeDefined();
  });

  it("renders correctly with 5 warning signals", async () => {
    mockInvoke.mockResolvedValue({
      data: { recommendations: "Standard recommendations" },
      error: null,
    });

    const report = createMockReport(5);
    render(<ReportView report={report} text="Sample offer text" onReset={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("5 signals")).toBeDefined();
    });
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`Warning Signal ${i}`)).toBeDefined();
    }
  });

  it("renders correctly with 10+ warning signals inside 420px vertically scrollable container", async () => {
    mockInvoke.mockResolvedValue({
      data: { recommendations: "Standard recommendations" },
      error: null,
    });

    const report = createMockReport(12); // 12 signals (10+)
    render(<ReportView report={report} text="Sample offer text" onReset={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("12 signals")).toBeDefined();
    });

    // All 12 signals rendered inside the DOM
    for (let i = 1; i <= 12; i++) {
      expect(screen.getByText(`Warning Signal ${i}`)).toBeDefined();
    }

    // Container has max-h-[420px] and overflow-y-auto
    const scrollContainer = document.querySelector(".max-h-\\[420px\\].overflow-y-auto");
    expect(scrollContainer).not.toBeNull();
  });

  it("structures AI recommendations into Verification Steps, Recruiter Questions, and Important Precautions", () => {
    const rawAiText = `
Here are the recommendations:
### Verification Steps
- Search MCA registry for corporate CIN
- Cross-check domain whois records

### Recruiter Questions
- Ask for official appointment letter signed by Director
- Clarify whether training requires any monetary deposit

### Important Precautions
- Never transfer onboarding fees via personal UPI
- Keep records of all email correspondence
`;

    const parsed = parseStructuredRecommendations(rawAiText);
    expect(parsed.verificationSteps).toHaveLength(2);
    expect(parsed.verificationSteps[0]).toContain("Search MCA registry");
    expect(parsed.recruiterQuestions).toHaveLength(2);
    expect(parsed.recruiterQuestions[0]).toContain("Ask for official appointment letter");
    expect(parsed.precautions).toHaveLength(2);
    expect(parsed.precautions[0]).toContain("Never transfer onboarding fees");
  });

  it("intelligently parses unstructured fallback text into the three categories", () => {
    const unstructured = `
1. Check corporate registration on official portal.
2. Ask the recruiter about team structure.
3. Inquire about the office reporting location.
4. Beware of requests for upfront laptop security money.
5. Never provide debit card CVV or OTP.
`;

    const parsed = parseStructuredRecommendations(unstructured);
    expect(parsed.verificationSteps.length).toBeGreaterThan(0);
    expect(parsed.recruiterQuestions.length).toBeGreaterThan(0);
    expect(parsed.precautions.length).toBeGreaterThan(0);
  });
});
