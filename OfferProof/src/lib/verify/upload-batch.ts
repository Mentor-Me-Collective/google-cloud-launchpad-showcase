export const MAX_IMAGES = 10;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED = ["application/pdf", "image/png", "image/jpeg"];

export function validateUploadBatch(files: readonly Pick<File, "type" | "size">[]): void {
  if (!files.length) throw new Error("Select at least one file.");
  if (files.some((file) => !ACCEPTED.includes(file.type)))
    throw new Error("Only PDF, JPG or PNG files are supported.");
  if (files.some((file) => file.size > MAX_FILE_BYTES))
    throw new Error("Each file must be 10 MB or smaller.");
  if (files.some((file) => file.type === "application/pdf") && files.length > 1)
    throw new Error("Select one PDF or up to 10 images, not both.");
  if (files.length > MAX_IMAGES) throw new Error("Select up to 10 images for one offer.");
}

export async function extractUploadBatch(
  files: readonly File[],
  extract: (file: File, onProgress?: (p: number, label: string) => void) => Promise<string>,
  onProgress?: (p: number, label: string) => void,
): Promise<string> {
  validateUploadBatch(files);
  const parts: string[] = [];
  for (const [index, file] of files.entries()) {
    const text = await extract(file, (p, label) =>
      onProgress?.((index + p) / files.length, `${index + 1}/${files.length} · ${label}`),
    );
    if (!text.trim())
      throw new Error(
        `No text could be read from ${file.name}. Remove or replace this file and try again.`,
      );
    parts.push(text.trim());
    onProgress?.((index + 1) / files.length, `Read ${index + 1} of ${files.length}`);
  }
  return parts.join("\n\n");
}
