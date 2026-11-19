import { describe, expect, it, vi } from "vitest";
import { analyze } from "./engine";
import { extractUploadBatch, validateUploadBatch } from "./upload-batch";

const image = (name: string) => new File(["image"], name, { type: "image/png" });

describe("offer evidence batch", () => {
  it("accepts 1, 5 and 10 images and rejects 11", () => {
    for (const count of [1, 5, 10])
      expect(() =>
        validateUploadBatch(Array.from({ length: count }, (_, i) => image(`${i}.png`))),
      ).not.toThrow();
    expect(() =>
      validateUploadBatch(Array.from({ length: 11 }, (_, i) => image(`${i}.png`))),
    ).toThrow("up to 10 images");
  });

  it("keeps single PDF support without mixing PDFs and images", () => {
    const pdf = new File(["pdf"], "offer.pdf", { type: "application/pdf" });
    expect(() => validateUploadBatch([pdf])).not.toThrow();
    expect(() => validateUploadBatch([pdf, image("a.png")])).toThrow("not both");
  });

  it("enforces the existing 10 MB per-file limit", () => {
    expect(() =>
      validateUploadBatch([{ type: "image/png", size: 10 * 1024 * 1024 }]),
    ).not.toThrow();
    expect(() => validateUploadBatch([{ type: "image/png", size: 10 * 1024 * 1024 + 1 }])).toThrow(
      "10 MB",
    );
  });

  it("rejects unsupported files", () => {
    expect(() =>
      validateUploadBatch([new File(["text"], "a.txt", { type: "text/plain" })]),
    ).toThrow("Only PDF, JPG or PNG");
  });

  it("processes every image in order into one offer report", async () => {
    const files = Array.from({ length: 10 }, (_, i) => image(`${i}.png`));
    const texts = [
      "Company: Acme Technologies Pvt Ltd",
      "Position: Software Engineer Intern",
      "Salary: Rs 25000 per month",
      "Location: Bengaluru",
      "Pay a registration fee of Rs 2999",
      "Contact hr.jobs@gmail.com",
      "Respond within 24 hours",
      "Onboarding at https://bit.ly/acme",
      "Regards HR",
      "Offer evidence complete",
    ];
    const extract = vi.fn(async (file: File) => {
      const text = texts[files.indexOf(file)];
      if (text === undefined) throw new Error("Unexpected fixture");
      return text;
    });
    const text = await extractUploadBatch(files, extract);
    expect(extract).toHaveBeenCalledTimes(10);
    expect(text).toBe(texts.join("\n\n"));
    const report = analyze(text);
    expect(report.findings.map((finding) => finding.id)).toContain("payment_request");
    expect(report.findings.map((finding) => finding.id)).toContain("personal_email");
  });

  it("never returns partial evidence when an image is unreadable", async () => {
    const extract = vi.fn().mockResolvedValueOnce("Offer letter").mockResolvedValueOnce(" ");
    await expect(
      extractUploadBatch([image("first.png"), image("blank.png")], extract),
    ).rejects.toThrow("blank.png");
  });

  it("propagates an OCR failure instead of producing a partial result", async () => {
    const extract = vi
      .fn()
      .mockResolvedValueOnce("Offer letter")
      .mockRejectedValueOnce(new Error("OCR unavailable"));
    await expect(
      extractUploadBatch([image("first.png"), image("second.png")], extract),
    ).rejects.toThrow("OCR unavailable");
  });
});
