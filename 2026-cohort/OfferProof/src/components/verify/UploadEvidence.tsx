import { useEffect, useRef, useState } from "react";
import { Eye, FileText, FileUp, Loader2, Plus, ScanSearch, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { extractUploadBatch, validateUploadBatch } from "@/lib/verify/upload-batch";

type Selection = { id: number; file: File; preview: string | null };

export function UploadEvidence({
  onText,
  onBusy,
  onPending,
}: {
  onText: (text: string) => void;
  onBusy: (busy: boolean) => void;
  onPending: (pending: boolean) => void;
}) {
  const [files, setFiles] = useState<Selection[]>([]);
  const [busy, setBusy] = useState<{ p: number; label: string } | null>(null);
  const [previewEntry, setPreviewEntry] = useState<Selection | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const nextId = useRef(0);
  const processing = useRef(false);

  useEffect(
    () => () => {
      for (const url of urls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  function add(incoming: File[]) {
    if (processing.current || !incoming.length) return;
    try {
      validateUploadBatch([...files.map((entry) => entry.file), ...incoming]);
      const entries = incoming.map((file) => {
        const preview =
          file.type.startsWith("image/") || file.type === "application/pdf"
            ? URL.createObjectURL(file)
            : null;
        if (preview) urls.current.add(preview);
        return { id: nextId.current++, file, preview };
      });
      setFiles((current) => [...current, ...entries]);
      onPending(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add these files.");
    }
  }

  function remove(entry: Selection) {
    if (processing.current) return;
    if (entry.preview) {
      URL.revokeObjectURL(entry.preview);
      urls.current.delete(entry.preview);
    }
    const remaining = files.filter((file) => file.id !== entry.id);
    setFiles(remaining);
    if (!remaining.length) onText("");
    onPending(remaining.length > 0);
  }

  async function read() {
    if (processing.current || !files.length) return;
    processing.current = true;
    setBusy({ p: 0, label: "Preparing" });
    onBusy(true);
    try {
      const { extractFromFile } = await import("@/lib/verify/extract-file");
      const text = await extractUploadBatch(
        files.map((entry) => entry.file),
        extractFromFile,
        (p, label) => setBusy({ p, label }),
      );
      onText(text);
      onPending(false);
      toast.success("Text extracted. Run the check or expand extracted text to review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read these files.");
    } finally {
      processing.current = false;
      setBusy(null);
      onBusy(false);
    }
  }

  return (
    <div>
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          add(Array.from(event.dataTransfer.files));
        }}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors hover:border-primary sm:p-10"
      >
        <FileUp className="size-8 text-primary" />
        <Button variant="ghost" disabled={!!busy} onClick={() => input.current?.click()}>
          {files.length ? <Plus /> : <FileUp />}
          {files.length ? "Add files" : "Drop files or browse"}
        </Button>
        <span className="text-xs text-muted-foreground">
          One PDF or up to 10 JPG / PNG images · 10 MB per file
        </span>
        <input
          ref={input}
          aria-label="Upload offer evidence"
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          multiple
          className="sr-only"
          disabled={!!busy}
          onChange={(event) => {
            add(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>
      {files.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{files.length} file(s) · One offer</p>
          <ul aria-label="Selected evidence" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {files.map((entry) => (
              <li
                key={entry.id}
                className="group relative min-w-0 overflow-hidden rounded-lg border bg-muted/50"
              >
                <button
                  type="button"
                  className="flex aspect-[4/3] w-full items-center justify-center bg-muted cursor-pointer transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={() => setPreviewEntry(entry)}
                  aria-label={`Preview ${entry.file.name}`}
                >
                  {entry.file.type.startsWith("image/") && entry.preview ? (
                    <img
                      src={entry.preview}
                      alt={entry.file.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 p-2 text-center">
                      <FileText className="size-10 text-primary" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        PDF · Click to preview
                      </span>
                    </div>
                  )}
                </button>
                <p className="truncate p-2 pr-16 text-xs" title={entry.file.name}>
                  {entry.file.name}
                </p>
                <div className="absolute right-1 top-1 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="size-7 bg-background/80 backdrop-blur-xs hover:bg-background"
                    aria-label={`Preview ${entry.file.name}`}
                    title={`Preview ${entry.file.name}`}
                    onClick={() => setPreviewEntry(entry)}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-7 bg-background/80 backdrop-blur-xs hover:bg-background"
                    aria-label={`Remove ${entry.file.name}`}
                    title={`Remove ${entry.file.name}`}
                    disabled={!!busy}
                    onClick={() => remove(entry)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" disabled={!!busy} onClick={read}>
            <ScanSearch />
            Read selected files
          </Button>
        </div>
      )}
      {busy && (
        <div className="mt-4" role="status">
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            {busy.label}…
          </p>
          <Progress value={busy.p * 100} className="mt-2" />
        </div>
      )}

      <Dialog open={!!previewEntry} onOpenChange={(open) => !open && setPreviewEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="truncate text-base font-medium">
              {previewEntry?.file.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto flex items-center justify-center min-h-[300px]">
            {previewEntry?.file.type === "application/pdf" && previewEntry.preview ? (
              <iframe
                src={previewEntry.preview}
                title={previewEntry.file.name}
                className="w-full h-[70vh] rounded-md border"
              />
            ) : previewEntry?.preview ? (
              <img
                src={previewEntry.preview}
                alt={previewEntry.file.name}
                className="max-h-[70vh] max-w-full rounded-md object-contain"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Preview not available.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
