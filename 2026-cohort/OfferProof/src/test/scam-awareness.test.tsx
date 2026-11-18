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

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

import { Route } from "@/routes/scam-awareness";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockPostings = [
  {
    job_id: 101,
    title: "Senior Data Entry Associate",
    company_profile: "Global Services Inc.",
    description: "Work from home position with high hourly pay.",
    requirements: "No experience needed.",
    location: "Mumbai, IN",
    industry: "Information Technology",
    employment_type: "Full-time",
    fraudulent: 1,
  },
  {
    job_id: 102,
    title: "Software Engineer",
    company_profile: "Acme Tech Solutions",
    description: "Build robust backend microservices.",
    requirements: "3+ years Python experience.",
    location: "Bengaluru, IN",
    industry: "Software",
    employment_type: "Full-time",
    fraudulent: 0,
  },
];

const mockSummary = {
  total: 17880,
  fraudulent: 866,
  legitimate: 17014,
  fraudulentRate: 4.84,
};

describe("Scam Awareness Centre with Explore Data tab", () => {
  it("renders Learn tab by default with all categories, warning signs and advice", () => {
    const Component = (Route as unknown as { component: React.ComponentType }).component;
    render(<Component />);

    // Tab buttons exist
    expect(screen.getByRole("tab", { name: "Learn" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Explore Data" })).toBeDefined();

    // Four scam categories are visible
    expect(screen.getAllByText("Fake recruiters").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Payment scams").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Suspicious domains").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fraudulent internships").length).toBeGreaterThan(0);

    // Safety advice & check another offer button
    expect(screen.getByText("Already paid or shared details?")).toBeDefined();
    expect(screen.getByRole("link", { name: "Check another offer" })).toBeDefined();
  });

  it("switches to Explore Data tab, invokes edge function, and renders BigQuery records & breakdown", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        summary: mockSummary,
        records: mockPostings,
        count: 2,
      },
      error: null,
    });

    const Component = (Route as unknown as { component: React.ComponentType }).component;
    render(<Component />);

    const dataTab = screen.getByRole("tab", { name: "Explore Data" });
    fireEvent.pointerDown(dataTab);
    fireEvent.click(dataTab);

    // Context banner
    expect(screen.getByText("Job Postings Analytics Dataset")).toBeDefined();
    expect(
      screen.getByText(/xenon-hub-514707-f9\.offerproof_analytics\.job_postings/),
    ).toBeDefined();

    // Verify invoke was called
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "offerproof-job-postings",
        expect.objectContaining({
          body: expect.objectContaining({
            filter: "all",
            limit: 30,
            includeSummary: true,
          }),
        }),
      );
    });

    // Breakdown stats
    await waitFor(() => {
      expect(screen.getByText("17,880")).toBeDefined();
      expect(screen.getByText("17,014")).toBeDefined();
      expect(screen.getByText("866")).toBeDefined();
    });

    // Records rendered with proper badges
    expect(screen.getByText("Senior Data Entry Associate")).toBeDefined();
    expect(screen.getAllByText("Fraudulent (1)").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Software Engineer")).toBeDefined();
    expect(screen.getAllByText("Legitimate (0)").length).toBeGreaterThanOrEqual(2);
  });

  it("supports filtering by fraudulent status", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        summary: mockSummary,
        records: [mockPostings[0]],
        count: 1,
      },
      error: null,
    });

    const Component = (Route as unknown as { component: React.ComponentType }).component;
    render(<Component />);

    const dataTab = screen.getByRole("tab", { name: "Explore Data" });
    fireEvent.pointerDown(dataTab);
    fireEvent.click(dataTab);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalled();
    });

    const fraudFilterBtn = screen.getByRole("button", { name: /Fraudulent \(1\)/i });
    fireEvent.click(fraudFilterBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "offerproof-job-postings",
        expect.objectContaining({
          body: expect.objectContaining({
            filter: "fraudulent",
          }),
        }),
      );
    });
  });

  it("handles BigQuery preview error state gracefully with retry option", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: "Failed to connect to BigQuery table." },
    });

    const Component = (Route as unknown as { component: React.ComponentType }).component;
    render(<Component />);

    const dataTab = screen.getByRole("tab", { name: "Explore Data" });
    fireEvent.pointerDown(dataTab);
    fireEvent.click(dataTab);

    await waitFor(() => {
      expect(screen.getByText("BigQuery dataset preview unavailable")).toBeDefined();
      expect(screen.getByText("Failed to connect to BigQuery table.")).toBeDefined();
      expect(screen.getByRole("button", { name: /Retry query/i })).toBeDefined();
    });
  });
});
