import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useImportPending } from "@/hooks/use-import-pending";
import { ASSESSMENT_META, type Assessment } from "@/lib/verify/engine";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Your history — OfferProof" },
      {
        name: "description",
        content: "Reopen or delete your saved offers, verification reports and comparisons.",
      },
      { property: "og:title", content: "Your history — OfferProof" },
      { property: "og:description", content: "Saved offers, reports and comparisons." },
    ],
  }),
  component: History,
});

const tone: Record<Assessment, string> = {
  high_concern: "bg-high-soft text-high",
  needs_review: "bg-warn-soft text-foreground",
  low_concern: "bg-low-soft text-low",
};

function History() {
  useImportPending();
  const qc = useQueryClient();
  const offers = useQuery({
    queryKey: ["offers"],
    queryFn: async () =>
      (
        await supabase
          .from("offers")
          .select("id,title,company,created_at")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const reports = useQuery({
    queryKey: ["reports"],
    queryFn: async () =>
      (
        await supabase
          .from("verification_reports")
          .select("id,assessment,created_at,offer_id,offers(title)")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const comps = useQuery({
    queryKey: ["comparisons"],
    queryFn: async () =>
      (
        await supabase
          .from("comparisons")
          .select("id,name,offer_ids,created_at")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const [deleting, setDeleting] = useState<string | null>(null);

  async function del(table: "offers" | "verification_reports" | "comparisons", id: string) {
    if (!confirm(table === "offers" ? "Delete this offer and its reports?" : "Delete this record?"))
      return;
    setDeleting(id);
    const { error } = await supabase.from(table).delete().eq("id", id);
    setDeleting(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    qc.invalidateQueries();
  }

  const date = (s: string) => new Date(s).toLocaleString();
  const Row = ({
    children,
    onDelete,
    id,
  }: {
    children: ReactNode;
    onDelete: () => void;
    id: string;
  }) => (
    <li className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
      <div className="min-w-0">{children}</div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete"
        disabled={deleting === id}
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
  const Empty = ({ t }: { t: string }) => (
    <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">{t}</p>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="mt-2 text-3xl font-bold">History</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/compare">Compare offers</Link>
          </Button>
          <Button asChild>
            <Link to="/verify">Verify an offer</Link>
          </Button>
        </div>
      </div>
      <Tabs defaultValue="reports" className="mt-8">
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="comparisons">Comparisons</TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="mt-5">
          {reports.data?.length === 0 ? (
            <Empty t="No saved reports yet. Check an offer and click Save report." />
          ) : (
            <ul className="space-y-3">
              {reports.data?.map((r) => (
                <Row key={r.id} id={r.id} onDelete={() => del("verification_reports", r.id)}>
                  <Link
                    to="/reports/$id"
                    params={{ id: r.id }}
                    className="font-medium hover:underline"
                  >
                    {(r.offers as { title: string } | null)?.title ?? "Report"}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${tone[r.assessment as Assessment]}`}
                    >
                      {ASSESSMENT_META[r.assessment as Assessment].label}
                    </span>
                    {date(r.created_at)}
                  </p>
                </Row>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="offers" className="mt-5">
          {offers.data?.length === 0 ? (
            <Empty t="No saved offers yet." />
          ) : (
            <ul className="space-y-3">
              {offers.data?.map((o) => (
                <Row key={o.id} id={o.id} onDelete={() => del("offers", o.id)}>
                  <p className="font-medium">{o.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {o.company ?? "Company not found"} · {date(o.created_at)}
                  </p>
                </Row>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="comparisons" className="mt-5">
          {comps.data?.length === 0 ? (
            <Empty t="No saved comparisons yet." />
          ) : (
            <ul className="space-y-3">
              {comps.data?.map((c) => (
                <Row key={c.id} id={c.id} onDelete={() => del("comparisons", c.id)}>
                  <Link to="/compare" search={{ id: c.id }} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.offer_ids.length} offers · {date(c.created_at)}
                  </p>
                </Row>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
