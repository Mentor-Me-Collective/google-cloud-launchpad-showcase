import { useEffect, useState } from "react";
import { FileUp, ScanText, ShieldCheck, ClipboardCheck } from "lucide-react";

export const STEPS = [
  { icon: FileUp, title: "Upload", text: "Paste the offer text, or drop in a PDF or screenshot." },
  {
    icon: ScanText,
    title: "Extract",
    text: "Text is read in your browser using PDF.js or on-device OCR. You review and correct it.",
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    text: "Explainable checks look for fees, pressure, domains and more.",
  },
  {
    icon: ClipboardCheck,
    title: "Review",
    text: "See each warning with evidence, severity and what to do next.",
  },
];

export function StepsVisual({ inverted = false }: { inverted?: boolean }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {STEPS.map((s, i) => {
        const on = i === active;
        return (
          <button
            key={s.title}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            className={`relative rounded-xl border p-6 text-left transition-all duration-300 ${
              inverted
                ? on
                  ? "border-electric bg-ink-foreground/5"
                  : "border-ink-border"
                : on
                  ? "border-primary bg-card shadow-card"
                  : "bg-card/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <s.icon
                className={`size-6 ${on ? (inverted ? "text-electric" : "text-primary") : inverted ? "text-ink-muted" : "text-muted-foreground"}`}
              />
              <span
                className={`font-display text-sm ${inverted ? "text-ink-muted" : "text-muted-foreground"}`}
              >
                0{i + 1}
              </span>
            </div>
            <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
            <p className={`mt-2 text-sm ${inverted ? "text-ink-muted" : "text-muted-foreground"}`}>
              {s.text}
            </p>
            <div
              className={`absolute inset-x-6 bottom-0 h-0.5 origin-left transition-transform duration-500 ${inverted ? "bg-electric" : "bg-primary"} ${on ? "scale-x-100" : "scale-x-0"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
