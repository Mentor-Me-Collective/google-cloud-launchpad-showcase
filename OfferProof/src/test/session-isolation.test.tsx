import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import {
  getOrCreateSessionId,
  loadSessionState,
  saveSessionState,
  clearSessionState,
} from "@/lib/verify/session";
import { AiRecommendations } from "@/components/verify/AiRecommendations";
import type { Report } from "@/lib/verify/engine";

// Mock Supabase client
const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

// Mock tanstack router and sonner
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  useNavigate: () => vi.fn(),
  useRouter: () => ({
    subscribe: vi.fn(() => () => {}),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function createMockReport(company = "Acme Corp"): Report {
  return {
    assessment: "needs_review",
    points: 15,
    findings: [
      {
        id: "urgency",
        name: "Urgent pressure",
        severity: "medium",
        evidence: ["reply within 24 hours"],
        explanation: "Scammers often rush applicants.",
        action: "Take your time to verify.",
      },
    ],
    extracted: {
      company,
      recruiter: "John Doe",
      jobTitle: "Remote Assistant",
      salary: "$50/hr",
      joiningDate: null,
      location: "Remote",
      emails: ["hr@fakecorp.com"],
      domains: ["fakecorp.com"],
      urls: [],
      phones: [],
    },
    phrases: ["urgent response"],
  };
}

describe("OfferProof Multi-User Session Isolation", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  describe("Session Storage Scoping & State Isolation", () => {
    it("generates a unique session ID and persists it within the browser session", () => {
      const sessionId1 = getOrCreateSessionId();
      expect(sessionId1).toBeDefined();
      // IDs can be a UUID (crypto.randomUUID) or the fallback "session_..." format
      expect(sessionId1.length).toBeGreaterThan(0);

      // Re-calling within same session returns the exact same ID
      const sessionId2 = getOrCreateSessionId();
      expect(sessionId2).toBe(sessionId1);
    });

    it("isolates data completely between two distinct browser sessions (e.g., Firefox vs Chrome)", () => {
      const firefoxSessionId = "session_firefox_abc123";
      const chromeSessionId = "session_chrome_xyz789";
      const firefoxText =
        "Firefox User: Offer letter from ABC Corp with suspicious registration fee.";
      const chromeText = "Chrome User: Legitimate offer letter from Google LLC.";

      // Save Firefox session state
      saveSessionState(firefoxSessionId, {
        text: firefoxText,
        report: createMockReport("ABC Corp"),
        isSample: false,
        savedFor: null,
        activeTab: "paste",
        uploaded: false,
        showExtracted: false,
      });

      // Save Chrome session state
      saveSessionState(chromeSessionId, {
        text: chromeText,
        report: createMockReport("Google LLC"),
        isSample: false,
        savedFor: null,
        activeTab: "paste",
        uploaded: false,
        showExtracted: true,
      });

      // Verify Firefox state is unaffected by Chrome
      const retrievedFirefox = loadSessionState(firefoxSessionId);
      expect(retrievedFirefox).not.toBeNull();
      expect(retrievedFirefox?.text).toBe(firefoxText);
      expect(retrievedFirefox?.report?.extracted.company).toBe("ABC Corp");

      // Verify Chrome state is independent
      const retrievedChrome = loadSessionState(chromeSessionId);
      expect(retrievedChrome).not.toBeNull();
      expect(retrievedChrome?.text).toBe(chromeText);
      expect(retrievedChrome?.report?.extracted.company).toBe("Google LLC");

      // Clearing Chrome session only removes Chrome data
      clearSessionState(chromeSessionId);
      expect(loadSessionState(chromeSessionId)).toBeNull();

      // Firefox session state must remain 100% intact
      const preservedFirefox = loadSessionState(firefoxSessionId);
      expect(preservedFirefox).not.toBeNull();
      expect(preservedFirefox?.text).toBe(firefoxText);
      expect(preservedFirefox?.report?.extracted.company).toBe("ABC Corp");
    });

    it("simulates concurrent typing and state updates without cross-contamination", () => {
      const firefoxSessionId = "session_firefox_sim";
      const chromeSessionId = "session_chrome_sim";

      // Firefox user types first line
      saveSessionState(firefoxSessionId, { text: "Dear Candidate," });

      // Chrome user opens page and starts typing
      saveSessionState(chromeSessionId, { text: "We are pleased to offer you..." });

      // Firefox user pastes the rest of their offer
      saveSessionState(firefoxSessionId, {
        text: "Dear Candidate, you must pay Rs 3000 refundable security deposit.",
      });

      // Check both states
      expect(loadSessionState(firefoxSessionId)?.text).toBe(
        "Dear Candidate, you must pay Rs 3000 refundable security deposit.",
      );
      expect(loadSessionState(chromeSessionId)?.text).toBe("We are pleased to offer you...");
    });
  });

  describe("Backend Request & AI Recommendations Session Tagging", () => {
    it("attaches sessionId to AI recommendations request payload", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          sessionId: "session_user_firefox_999",
          recommendations:
            "### Verification Steps\n- Contact HR via official email.\n\n### Recruiter Questions\n- Ask about equipment.\n\n### Important Precautions\n- Never pay upfront fees.",
        },
        error: null,
      });

      const report = createMockReport("Test Corp");
      const firefoxSessionId = "session_user_firefox_999";

      render(
        <AiRecommendations
          text="Sample offer text for Firefox user"
          report={report}
          sessionId={firefoxSessionId}
        />,
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockInvoke.mock.calls[0] as
        | [
            string,
            { body: { sessionId: string; context: { sessionId: string }; offerText: string } },
          ]
        | undefined;
      expect(callArgs).toBeDefined();
      if (!callArgs) return;

      expect(callArgs[0]).toBe("offerproof-ai-recommendations");
      expect(callArgs[1].body.sessionId).toBe(firefoxSessionId);
      expect(callArgs[1].body.context.sessionId).toBe(firefoxSessionId);
      expect(callArgs[1].body.offerText).toBe("Sample offer text for Firefox user");
      // Verify recommendations rendered
      await waitFor(() => {
        expect(screen.getByText("Verification Steps")).toBeDefined();
        expect(screen.getByText("Contact HR via official email.")).toBeDefined();
      });
    });

    it("ignores AI recommendation responses belonging to a different session", async () => {
      // Mock response returning a mismatched sessionId (e.g. from a race condition or other session)
      mockInvoke.mockResolvedValueOnce({
        data: {
          sessionId: "session_user_chrome_other",
          recommendations:
            "### Verification Steps\n- Irrelevant cross-session data.\n\n### Recruiter Questions\n- Questions.\n\n### Important Precautions\n- Precautions.",
        },
        error: null,
      });

      const report = createMockReport("Target Corp");
      const currentSessionId = "session_user_firefox_active";

      render(
        <AiRecommendations
          text="Offer text for active session"
          report={report}
          sessionId={currentSessionId}
        />,
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledTimes(1);
      });

      // The mismatched recommendation should NOT be rendered in the current session
      expect(screen.queryByText("Irrelevant cross-session data.")).toBeNull();
    });
  });
});
