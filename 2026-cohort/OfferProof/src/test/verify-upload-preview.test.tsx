import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => vi.fn(),
  useRouter: () => ({ subscribe: () => () => {} }),
}));
vi.mock("@/hooks/use-session", () => ({ useSession: () => null }));
vi.mock("@/lib/offers", () => ({ addPending: vi.fn(), saveOfferWithReport: vi.fn() }));
vi.mock("@/lib/verify/extract-file", () => ({
  extractFromFile: vi
    .fn()
    .mockResolvedValue("Company: Acme Corp\nPosition: Dev\nSalary: $100,000 per year"),
}));

import { Route } from "@/routes/verify";
import { UploadEvidence } from "@/components/verify/UploadEvidence";

afterEach(cleanup);

describe("UploadEvidence preview", () => {
  let createdUrls: string[] = [];

  beforeEach(() => {
    createdUrls = [];
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((file: File) => {
        const url = `blob:test/${file.name}`;
        createdUrls.push(url);
        return url;
      }),
      revokeObjectURL: vi.fn(),
    });
  });

  it("creates preview URLs for both PDF and screenshots and allows preview dialog", async () => {
    render(<UploadEvidence onText={vi.fn()} onBusy={vi.fn()} onPending={vi.fn()} />);

    const fileInput = screen.getByLabelText("Upload offer evidence");
    const pdfFile = new File(["dummy pdf"], "offer.pdf", { type: "application/pdf" });
    const imgFile = new File(["dummy png"], "screenshot.png", { type: "image/png" });

    // Upload PDF
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    expect(URL.createObjectURL).toHaveBeenCalledWith(pdfFile);

    // Preview button for PDF
    const [pdfPreviewBtn] = screen.getAllByRole("button", { name: "Preview offer.pdf" });
    expect(pdfPreviewBtn).toBeDefined();
    if (!pdfPreviewBtn) throw new Error("pdfPreviewBtn missing");

    // Click preview to open dialog
    fireEvent.click(pdfPreviewBtn);
    expect(screen.getByRole("dialog")).toBeDefined();
    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe("blob:test/offer.pdf");

    // Close dialog
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    // Remove PDF
    fireEvent.click(screen.getByRole("button", { name: "Remove offer.pdf" }));

    // Upload image
    fireEvent.change(fileInput, { target: { files: [imgFile] } });
    expect(URL.createObjectURL).toHaveBeenCalledWith(imgFile);

    // Preview button for image
    const [imgPreviewBtn] = screen.getAllByRole("button", { name: "Preview screenshot.png" });
    expect(imgPreviewBtn).toBeDefined();
    if (!imgPreviewBtn) throw new Error("imgPreviewBtn missing");
    fireEvent.click(imgPreviewBtn);
    expect(screen.getByRole("dialog")).toBeDefined();
    const img = document.querySelector("img[alt='screenshot.png']");
    expect(img).not.toBeNull();
  });
});

describe("VerifyPage extracted text hide/expand toggle", () => {
  it("hides extracted text by default for uploads with an option to expand", async () => {
    const Component = (Route as unknown as { component: React.ComponentType }).component;
    render(<Component />);

    // Switch to upload tab
    const uploadTab = screen.getByRole("tab", { name: "Upload PDF / image" });
    fireEvent.pointerDown(uploadTab);
    fireEvent.click(uploadTab);

    // Upload a PDF
    const fileInput = screen.getByLabelText("Upload offer evidence");
    const pdfFile = new File(["dummy pdf"], "offer.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    // Read selected files
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Read selected files" }));
    });

    // Extracted text header should be visible with "Expand extracted text" button
    const expandBtn = screen.getByRole("button", { name: /Expand extracted text/i });
    expect(expandBtn).toBeDefined();

    // By default, the textarea container is hidden
    const offerTextarea = document.querySelector<HTMLTextAreaElement>("#offer");
    expect(offerTextarea).not.toBeNull();
    expect(offerTextarea?.parentElement?.className).toContain("hidden");

    // Click to expand extracted text
    fireEvent.click(expandBtn);
    expect(screen.getByRole("button", { name: /Hide extracted text/i })).toBeDefined();
    expect(offerTextarea?.parentElement?.className).not.toContain("hidden");
    expect(offerTextarea?.value).toContain("Company: Acme Corp");

    // Click to hide again
    fireEvent.click(screen.getByRole("button", { name: /Hide extracted text/i }));
    expect(screen.getByRole("button", { name: /Expand extracted text/i })).toBeDefined();
    expect(offerTextarea?.parentElement?.className).toContain("hidden");
  });
});
