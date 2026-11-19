import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertOctagon, Loader2, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { OfferRow } from "@/lib/offers";
import { compareOffers, type CompareOffer, type Period } from "@/lib/compare/engine";
import { ASSESSMENT_META, type Assessment, type Finding } from "@/lib/verify/engine";
import { useImportPending } from "@/hooks/use-import-pending";
import { AiCompareAdvisor } from "@/components/compare/AiCompareAdvisor";

export const Route = createFileRoute("/_authenticated/compare")({
  validateSearch: (s: Record<string, unknown>): { id?: string | undefined } => ({
    id: typeof s["id"] === "string" ? s["id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Compare offers — OfferProof" },
      {
        name: "description",
        content:
          "Compare job offers on salary, benefits, role, location, growth, work-life balance, terms and safety warnings.",
      },
      { property: "og:title", content: "Compare offers — OfferProof" },
      {
        property: "og:description",
        content: "Side-by-side offer comparison with safety signals kept separate.",
      },
    ],
  }),
  component: Compare,
});

const tone: Record<Assessment, string> = {
  high_concern: "bg-high-soft text-high",
  needs_review: "bg-warn-soft text-foreground",
  low_concern: "bg-low-soft text-low",
};

function Compare() {
  useImportPending();
  const { id: comparisonId } = Route.useSearch();
  const qc = useQueryClient();
  const offers = useQuery({
    queryKey: ["offers", "full"],
    queryFn: async () =>
      (await supabase.from("offers").select("*").order("created_at", { ascending: false })).data ??
      [],
  });
  const reports = useQuery({
    queryKey: ["reports", "safety"],
    queryFn: async () =>
      (
        await supabase
          .from("verification_reports")
          .select("offer_id,assessment,findings,created_at")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<OfferRow | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (comparisonId)
      supabase
        .from("comparisons")
        .select("*")
        .eq("id", comparisonId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setSelected(data.offer_ids);
            setName(data.name);
          } else toast.error("Comparison not found.");
        });
  }, [comparisonId]);

  const rows: CompareOffer[] = useMemo(() => {
    const byOffer = new Map<string, { assessment: Assessment; warnings: string[] }>();
    for (const r of reports.data ?? [])
      if (r.offer_id && !byOffer.has(r.offer_id))
        byOffer.set(r.offer_id, {
          assessment: r.assessment as Assessment,
          warnings: (r.findings as unknown as Finding[]).map((f) => `${f.name} (${f.severity})`),
        });
    return (offers.data ?? [])
      .filter((o) => selected.includes(o.id))
      .map((o) => ({
        ...o,
        salary_amount: o.salary_amount == null ? null : Number(o.salary_amount),
        salary_period: o.salary_period as Period | null,
        safety: byOffer.get(o.id) ?? null,
      }));
  }, [offers.data, reports.data, selected]);
  const result = rows.length >= 2 ? compareOffers(rows) : null;

  async function save() {
    if (selected.length < 2) return;
    setSaving(true);
    const payload = {
      name: (name.trim() || `Comparison ${new Date().toLocaleDateString()}`).slice(0, 200),
      offer_ids: selected,
    };
    const { error } = comparisonId
      ? await supabase.from("comparisons").update(payload).eq("id", comparisonId)
      : await supabase.from("comparisons").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Comparison saved");
    qc.invalidateQueries({ queryKey: ["comparisons"] });
  }

  if (offers.isLoading)
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <p className="eyebrow">Compare offers</p>
      <h1 className="mt-2 text-3xl font-bold">Which offer fits you?</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Pick two or more saved offers. Details come from the offer text or what you enter; anything
        missing is shown as “Not provided”. Safety signals are listed separately from career fit.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {offers.data?.length === 0 && (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground sm:col-span-3">
            No saved offers yet.{" "}
            <Link to="/verify" className="text-primary hover:underline">
              Check an offer
            </Link>{" "}
            and save it to compare.
          </p>
        )}
        {offers.data?.map((o) => (
          <label
            key={o.id}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 ${selected.includes(o.id) ? "border-primary" : ""}`}
          >
            <Checkbox
              checked={selected.includes(o.id)}
              onCheckedChange={(c) =>
                setSelected((s) => (c ? [...s, o.id] : s.filter((x) => x !== o.id)))
              }
              aria-label={`Select ${o.title}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{o.title}</span>
              <span className="text-xs text-muted-foreground">
                {o.company ?? "Company not found"}
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Edit details of ${o.title}`}
              onClick={(e) => {
                e.preventDefault();
                setEditing(o);
              }}
            >
              <Pencil className="size-4" />
            </Button>
          </label>
        ))}
      </div>

      {!result && (offers.data?.length ?? 0) > 0 && (
        <p className="mt-6 text-sm text-muted-foreground">Select at least two offers.</p>
      )}

      {result && (
        <div className="mt-10 space-y-8">
          {result.notes.map((n) => (
            <p
              key={n}
              className="flex gap-2 rounded-xl border-l-4 border-warn bg-warn-soft p-4 text-sm"
            >
              <AlertOctagon className="mt-0.5 size-4 shrink-0" />
              {n}
            </p>
          ))}
          {/* AI Career Advisor powered by NVIDIA Nemotron */}
          <AiCompareAdvisor offers={rows} />

          <section>
            <h2 className="text-xl font-semibold">Safety warnings</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              From each offer's latest verification report. Heuristic signals, not proof an offer is
              genuine or fraudulent.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {result.safety.map((s) => (
                <div key={s.id} className="rounded-xl border bg-card p-4">
                  <p className="font-medium">{s.title}</p>
                  {s.assessment ? (
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${tone[s.assessment]}`}
                    >
                      {ASSESSMENT_META[s.assessment].label}
                    </span>
                  ) : (
                    <p className="mt-2 text-xs italic text-muted-foreground">No report saved</p>
                  )}
                  <ul className="mt-3 space-y-1 text-sm">
                    {s.warnings.length
                      ? s.warnings.map((w) => <li key={w}>• {w}</li>)
                      : s.assessment && (
                          <li className="text-muted-foreground">No common warning signs found.</li>
                        )}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this comparison"
              className="max-w-xs"
              maxLength={200}
              aria-label="Comparison name"
            />
            <Button onClick={save} disabled={saving}>
              <Save className="size-4" />
              {comparisonId ? "Update comparison" : "Save comparison"}
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <EditOffer
          offer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["offers"] });
          }}
        />
      )}
    </div>
  );
}

function EditOffer({
  offer,
  onClose,
  onSaved,
}: {
  offer: OfferRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({ ...offer });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof OfferRow, v: string | number | null) =>
    setF((p) => ({ ...p, [k]: v === "" ? null : v }));
  const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
  async function save() {
    setBusy(true);
    const { id: _id, user_id: _u, created_at: _c, updated_at: _up, ...rest } = f;
    const { error } = await supabase
      .from("offers")
      .update({ ...rest, title: rest.title?.trim() || offer.title })
      .eq("id", offer.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Offer updated");
    onSaved();
  }
  const L = ({ t, children }: { t: string; children: ReactNode }) => (
    <label className="block text-xs text-muted-foreground">
      {t}
      <div className="mt-1 text-foreground">{children}</div>
    </label>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Offer details</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Only enter what the offer or employer actually states. Ratings are your own judgement.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {L({
              t: "Title",
              children: (
                <Input
                  value={f.title}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={200}
                />
              ),
            })}
          </div>
          {L({
            t: "Company",
            children: (
              <Input value={f.company ?? ""} onChange={(e) => set("company", e.target.value)} />
            ),
          })}
          {L({
            t: "Role",
            children: (
              <Input value={f.job_title ?? ""} onChange={(e) => set("job_title", e.target.value)} />
            ),
          })}
          {L({
            t: "Salary amount",
            children: (
              <Input
                type="number"
                min={0}
                value={f.salary_amount ?? ""}
                onChange={(e) =>
                  set("salary_amount", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            ),
          })}
          <div className="grid grid-cols-2 gap-2">
            {L({
              t: "Currency",
              children: (
                <Input
                  value={f.salary_currency ?? ""}
                  onChange={(e) => set("salary_currency", e.target.value.toUpperCase().slice(0, 3))}
                  placeholder="INR"
                />
              ),
            })}
            {L({
              t: "Per",
              children: (
                <select
                  className={sel}
                  value={f.salary_period ?? ""}
                  onChange={(e) => set("salary_period", e.target.value)}
                >
                  <option value="">—</option>
                  {["year", "month", "week", "day", "hour"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              ),
            })}
          </div>
          {L({
            t: "Location",
            children: (
              <Input value={f.location ?? ""} onChange={(e) => set("location", e.target.value)} />
            ),
          })}
          {L({
            t: "Work mode",
            children: (
              <select
                className={sel}
                value={f.work_mode ?? ""}
                onChange={(e) => set("work_mode", e.target.value)}
              >
                <option value="">—</option>
                <option value="onsite">Onsite</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            ),
          })}
          {L({
            t: "Employment type",
            children: (
              <select
                className={sel}
                value={f.employment_type ?? ""}
                onChange={(e) => set("employment_type", e.target.value)}
              >
                <option value="">—</option>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="freelance">Freelance</option>
              </select>
            ),
          })}
          {L({
            t: "Growth (your rating 1–5)",
            children: (
              <select
                className={sel}
                value={f.growth_rating ?? ""}
                onChange={(e) =>
                  set("growth_rating", e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Not rated</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            ),
          })}
          {L({
            t: "Work-life balance (your rating 1–5)",
            children: (
              <select
                className={sel}
                value={f.work_life_rating ?? ""}
                onChange={(e) =>
                  set("work_life_rating", e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Not rated</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            ),
          })}
          <div className="sm:col-span-2">
            {L({
              t: "Benefits",
              children: (
                <Textarea
                  rows={2}
                  value={f.benefits ?? ""}
                  onChange={(e) => set("benefits", e.target.value)}
                  placeholder="e.g. health insurance, 20 days leave"
                />
              ),
            })}
          </div>
          <div className="sm:col-span-2">
            {L({
              t: "Employment terms",
              children: (
                <Textarea
                  rows={2}
                  value={f.employment_terms ?? ""}
                  onChange={(e) => set("employment_terms", e.target.value)}
                  placeholder="e.g. 3-month probation, 60-day notice"
                />
              ),
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}Save details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
