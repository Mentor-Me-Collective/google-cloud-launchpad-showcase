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

import { AiRecommendations } from "@/components/verify/AiRecommendations";
import type { Report } from "@/lib/verify/engine";

const sampleReport: Report = {
  assessment: "needs_review",
  points: 4,
  findings: [
    {
      id: "personal_email",
      name: "Personal recruiter email",
      severity: "medium",
      evidence: ["recruiter@gmail.com"],
      explanation: "Uses free email",
      action: "Check official careers site",
    },
  ],
  extracted: {
    company: "Acme Corp",
    recruiter: "John Doe",
    jobTitle: "Software Engineer",
    salary: "$120,000",
    joiningDate: null,
    location: null,
    emails: ["recruiter@gmail.com"],
    domains: [],
    urls: [],
    phones: [],
  },
  phrases: [],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AiRecommendations component", () => {
  it("invokes offerproof-ai-recommendations with offer text and verification context", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { recommendations: "1. Clarify probation terms.\n2. Confirm remote allowance." },
      error: null,
    });

    render(<AiRecommendations text="Offer letter text content" report={sampleReport} />);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith("offerproof-ai-recommendations", {
      body: {
        sessionId: expect.any(String),
        offerText: "Offer letter text content",
        context: {
          sessionId: expect.any(String),
          assessment: "needs_review",
          findings: sampleReport.findings,
          company: "Acme Corp",
          jobTitle: "Software Engineer",
          salary: "$120,000",
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Clarify probation terms/)).toBeDefined();
    });
    expect(screen.getByText("OfferProof AI Recommendations")).toBeDefined();
  });

  it("handles non-blocking error state and allows retry", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: "Network connection lost" },
    });

    render(<AiRecommendations text="Offer text for error test" report={sampleReport} />);

    await waitFor(() => {
      expect(screen.getByText("AI recommendations unavailable")).toBeDefined();
    });
    expect(screen.getByText("Network connection lost")).toBeDefined();

    // Retry
    mockInvoke.mockResolvedValueOnce({
      data: { recommendations: "Recovered recommendations" },
      error: null,
    });

    const [retryBtn] = screen.getAllByRole("button", { name: /retry/i });
    if (!retryBtn) throw new Error("Retry button not found");
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText(/Recovered recommendations/)).toBeDefined();
    });
  });

  it("prevents duplicate invocations for identical offer text", async () => {
    mockInvoke.mockResolvedValue({
      data: { recommendations: "Stable recommendation" },
      error: null,
    });

    const { rerender } = render(
      <AiRecommendations text="Same text content" report={sampleReport} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Stable recommendation")).toBeDefined();
    });
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    // Re-render with same text
    rerender(<AiRecommendations text="Same text content" report={sampleReport} />);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});
