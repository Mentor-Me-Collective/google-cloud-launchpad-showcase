// Browser-only text extraction. Import this module dynamically from event handlers.
import { ACCEPTED, MAX_FILE_BYTES } from "./upload-batch";
export { ACCEPTED, MAX_FILE_BYTES } from "./upload-batch";

export async function extractFromFile(
  file: File,
  onProgress?: (p: number, label: string) => void,
): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Only PDF, JPG or PNG files are supported.");
  if (file.size > MAX_FILE_BYTES) throw new Error("File is larger than 10 MB.");

  if (file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    const n = Math.min(doc.numPages, 20);
    for (let i = 1; i <= n; i++) {
      onProgress?.(i / n, `Reading page ${i} of ${n}`);
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let line = "";
      let lastY: number | null = null;
      const out: string[] = [];
      for (const item of content.items as Array<{ str: string; transform: number[] }>) {
        const y = item.transform[5] ?? 0;
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          out.push(line);
          line = "";
        }
        line += item.str;
        lastY = y;
      }
      out.push(line);
      pages.push(out.join("\n"));
    }
    const text = pages.join("\n\n").trim();
    if (!text)
      throw new Error("This PDF has no selectable text. Try uploading a screenshot of it instead.");
    return text;
  }

  const { createWorker } = await import("tesseract.js");
  const w = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(m.progress, "Recognising text");
    },
  });
  try {
    const { data } = await w.recognize(file);
    return data.text.trim();
  } finally {
    await w.terminate();
  }
}
