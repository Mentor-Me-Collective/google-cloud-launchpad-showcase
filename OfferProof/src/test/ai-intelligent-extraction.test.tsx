import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

import { ReportView, getEvidenceSnippet } from "@/components/verify/ReportView";
import {
  extractSentenceContaining,
  validateExtractedField,
  validateExtractedList,
  buildExtractedDetails,
} from "@/lib/verify/extraction";
import type { Finding, Report } from "@/lib/verify/engine";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const SAMPLE_OFFER = `Dear Alex,

Congratulations! We are delighted to extend an offer for the position of Cloud DevOps Engineer at NexaCorp Technologies Pvt Ltd.
Your annual compensation will be ₹18,00,000 per annum (CTC).
Reporting location: Cyber City, Gurugram (Hybrid).
Your official joining date is scheduled for December 1, 2026.

Please submit your confirmation to hr.talent@nexacorp.com or call our HR desk at +91 98765 43210.
Candidate portal and document upload: https://careers.nexacorp.com/onboard

To confirm your slot, kindly pay a refundable security registration fee of Rs 3,500 within 48 hours.

Warm regards,
Vikram Malhotra
Head of Talent Acquisition
NexaCorp Technologies Pvt Ltd`;

const SAMPLE_REPORT: Report = {
  assessment: "high_concern",
  points: 10,
  findings: [
    {
      id: "fee_required",
      name: "Payment requested",
      severity: "high",
      evidence: ["refundable security registration fee"],
      explanation: "Legitimate employers never ask candidates to pay an upfront fee.",
      action: "Do not pay.",
    },
    {
      id: "domain_mismatch",
      name: "Company domain check",
      severity: "medium",
      evidence: ["Company: NexaCorp Technologies Pvt Ltd", "Domain: nexacorp.com"],
      explanation: "Verify recruiter email domain matches official company website.",
      action: "Confirm domain authenticity.",
    },
  ],
  extracted: {
    company: "NexaCorp Technologies Pvt Ltd",
    recruiter: "Vikram Malhotra",
    jobTitle: "Cloud DevOps Engineer",
    salary: "₹18,00,000 per annum",
    joiningDate: "December 1, 2026",
    location: "Cyber City, Gurugram",
    emails: ["hr.talent@nexacorp.com"],
    applicantEmails: [],
    recruiterEmails: ["hr.talent@nexacorp.com"],
    unknownEmails: [],
    domains: ["nexacorp.com"],
    urls: ["https://careers.nexacorp.com/onboard"],
    phones: ["+91 98765 43210"],
  },
  phrases: ["refundable security registration fee"],
};

describe("NVIDIA-Powered Intelligent Extraction & Verification", () => {
  describe("validateExtractedField & extractSentenceContaining", () => {
    it("validates fields present in original text and extracts exact supporting sentence", () => {
      const res = validateExtractedField(
        SAMPLE_OFFER,
        "Cloud DevOps Engineer",
        "We are delighted to extend an offer for the position of Cloud DevOps Engineer at NexaCorp Technologies Pvt Ltd.",
      );

      expect(res.value).toBe("Cloud DevOps Engineer");
      expect(res.sentence).not.toBeNull();
      expect(res.sentence).toContain(
        "position of Cloud DevOps Engineer at NexaCorp Technologies Pvt Ltd.",
      );
      // Ensures the sentence is sliced verbatim from SAMPLE_OFFER
      expect(SAMPLE_OFFER).toContain(res.sentence!);
    });

    it("rejects hallucinated AI values that do not appear in the original offer text", () => {
      const hallucinated = validateExtractedField(
        SAMPLE_OFFER,
        "Google Alphabet Inc.", // Not in text
        "Welcome to Google Alphabet Inc.",
      );

      expect(hallucinated.value).toBeNull();
      expect(hallucinated.sentence).toBeNull();
    });

    it("validates list values against original text and extracts verbatim sentences", () => {
      const list = validateExtractedList(SAMPLE_OFFER, [
        "hr.talent@nexacorp.com",
        "fake.hallucination@scam.com", // Not in text
      ]);

      expect(list.values).toEqual(["hr.talent@nexacorp.com"]);
      expect(list.sentences.length).toBeGreaterThan(0);
      expect(list.sentences[0]).toContain("hr.talent@nexacorp.com");
      expect(SAMPLE_OFFER).toContain(list.sentences[0]);
    });

    it("builds combined extracted details and flags isAiEnhanced when valid AI fields are incorporated", () => {
      const aiData = {
        company: "NexaCorp Technologies Pvt Ltd",
        recruiter: "Vikram Malhotra",
        jobTitle: "Cloud DevOps Engineer",
        salary: "₹18,00,000 per annum",
        joiningDate: "December 1, 2026",
        location: "Cyber City, Gurugram",
        applicantEmails: [],
        recruiterEmails: ["hr.talent@nexacorp.com"],
        phones: ["+91 98765 43210"],
        domains: ["nexacorp.com"],
        urls: ["https://careers.nexacorp.com/onboard"],
      };

      const result = buildExtractedDetails(SAMPLE_OFFER, SAMPLE_REPORT.extracted, aiData);
      expect(result.isAiEnhanced).toBe(true);
      expect(result.company.value).toBe("NexaCorp Technologies Pvt Ltd");
      expect(result.company.sentence).toContain("NexaCorp Technologies Pvt Ltd");
      expect(result.salary.value).toBe("₹18,00,000 per annum");
      expect(result.salary.sentence).toContain("₹18,00,000 per annum");
      expect(result.recruiter.value).toBe("Vikram Malhotra");
      expect(result.recruiter.sentence).toContain("Vikram Malhotra");
    });
  });

  describe("Warning Signal Exact Supporting Lines (getEvidenceSnippet)", () => {
    it("returns exact supporting line from the original uploaded offer for warning signals", () => {
      const snippet = getEvidenceSnippet(SAMPLE_OFFER, "refundable security registration fee");

      expect(snippet).not.toBeNull();
      expect(snippet?.highlight).toBe("refundable security registration fee");
      expect(snippet?.prefix).toContain("To confirm your slot, kindly pay a");
      expect(snippet?.suffix).toContain("within 48 hours.");
      // Full reconstructed line matches original text verbatim
      const fullReconstructed = `${snippet?.prefix}${snippet?.highlight}${snippet?.suffix}`;
      expect(SAMPLE_OFFER).toContain(fullReconstructed);
    });

    it("strips metadata prefix like 'Company:' and returns exact supporting line from uploaded offer", () => {
      const snippet = getEvidenceSnippet(SAMPLE_OFFER, "Company: NexaCorp Technologies Pvt Ltd");

      expect(snippet).not.toBeNull();
      expect(snippet?.highlight).toBe("NexaCorp Technologies Pvt Ltd");
      expect(snippet?.prefix).toContain("position of Cloud DevOps Engineer at");
      expect(SAMPLE_OFFER).toContain(`${snippet?.prefix}${snippet?.highlight}`);
    });

    it("strips metadata prefix like 'Domain:' and returns exact supporting line from uploaded offer", () => {
      const snippet = getEvidenceSnippet(SAMPLE_OFFER, "Domain: nexacorp.com");

      expect(snippet).not.toBeNull();
      expect(snippet?.highlight).toBe("nexacorp.com");
      expect(SAMPLE_OFFER).toContain(snippet!.highlight);
    });
  });

  describe("ReportView Extracted Details UI with NVIDIA Nemotron API", () => {
    it("invokes offerproof-ai-recommendations in extract mode and renders validated details with supporting lines", async () => {
      mockInvoke.mockImplementation(
        async (fnName: string, options: { body: { mode?: string } }) => {
          if (options?.body?.mode === "extract") {
            return {
              data: {
                extracted: {
                  company: "NexaCorp Technologies Pvt Ltd",
                  companyQuote:
                    "We are delighted to extend an offer for the position of Cloud DevOps Engineer at NexaCorp Technologies Pvt Ltd.",
                  recruiter: "Vikram Malhotra",
                  recruiterQuote: "Vikram Malhotra\nHead of Talent Acquisition",
                  jobTitle: "Cloud DevOps Engineer",
                  jobTitleQuote:
                    "position of Cloud DevOps Engineer at NexaCorp Technologies Pvt Ltd.",
                  salary: "₹18,00,000 per annum",
                  salaryQuote: "Your annual compensation will be ₹18,00,000 per annum (CTC).",
                  joiningDate: "December 1, 2026",
                  joiningDateQuote: "Your official joining date is scheduled for December 1, 2026.",
                  location: "Cyber City, Gurugram",
                  locationQuote: "Reporting location: Cyber City, Gurugram (Hybrid).",
                  applicantEmails: [],
                  recruiterEmails: ["hr.talent@nexacorp.com"],
                  phones: ["+91 98765 43210"],
                  domains: ["nexacorp.com"],
                  urls: ["https://careers.nexacorp.com/onboard"],
                },
              },
              error: null,
            };
          }
          // AI recommendations call
          return {
            data: {
              recommendations:
                "### Verification Steps\n- Step 1\n### Recruiter Questions\n- Question 1\n### Important Precautions\n- Precaution 1",
            },
            error: null,
          };
        },
      );

      render(
        <ReportView
          report={SAMPLE_REPORT}
          text={SAMPLE_OFFER}
          sessionId="test-session-123"
          onReset={() => {}}
        />,
      );

      // Verify that the edge function was invoked with mode: "extract"
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          "offerproof-ai-recommendations",
          expect.objectContaining({
            body: expect.objectContaining({
              mode: "extract",
              sessionId: "test-session-123",
            }),
          }),
        );
      });

      // Extracted Details section exists with 2-column grid
      const section = screen.getByRole("region", { name: "Extracted Details" });
      expect(section).toBeInTheDocument();

      const dl = section.querySelector("dl");
      expect(dl?.className).toContain("sm:grid-cols-2");

      const utils = within(section);

      // Verify fields are rendered in Extracted Details
      expect(utils.getByText("NexaCorp Technologies Pvt Ltd")).toBeInTheDocument();
      expect(utils.getByText("Vikram Malhotra")).toBeInTheDocument();
      expect(utils.getByText("Cloud DevOps Engineer")).toBeInTheDocument();
      expect(utils.getByText("Cyber City, Gurugram")).toBeInTheDocument();
      expect(utils.getByText("December 1, 2026")).toBeInTheDocument();

      // Verify that supporting lines are not rendered under extracted details
      await waitFor(() => {
        expect(utils.queryByText(/Supporting line:/i)).toBeNull();
      });

      // Verify that details not present in the offer are not shown (no "Not found" placeholders)
      expect(utils.queryByText(/Not found/i)).toBeNull();
      expect(utils.queryByText("Emails (owner unclear)")).toBeNull();

      // Verify NVIDIA Nemotron badge is rendered
      expect(utils.getByText("NVIDIA Nemotron")).toBeInTheDocument();
    });

    it("falls back gracefully to baseline heuristic extraction if edge function returns an error", async () => {
      mockInvoke.mockImplementation(
        async (fnName: string, options: { body: { mode?: string } }) => {
          if (options?.body?.mode === "extract") {
            return { data: null, error: new Error("Network timeout") };
          }
          return {
            data: {
              recommendations:
                "### Verification Steps\n- S1\n### Recruiter Questions\n- Q1\n### Important Precautions\n- P1",
            },
            error: null,
          };
        },
      );

      render(
        <ReportView
          report={SAMPLE_REPORT}
          text={SAMPLE_OFFER}
          sessionId="test-session-err"
          onReset={() => {}}
        />,
      );

      // Even on failure, heuristic extracted details remain visible
      const section = screen.getByRole("region", { name: "Extracted Details" });
      expect(section).toBeInTheDocument();
      const utils = within(section);
      expect(utils.getByText("NexaCorp Technologies Pvt Ltd")).toBeInTheDocument();
      expect(utils.getByText("Cloud DevOps Engineer")).toBeInTheDocument();
    });
  });
});
