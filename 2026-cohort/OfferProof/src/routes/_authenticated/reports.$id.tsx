import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { rowToReport } from "@/lib/offers";
import { ReportView } from "@/components/verify/ReportView";

export const Route = createFileRoute("/_authenticated/reports/$id")({
  head: () => ({
    meta: [
      { title: "Saved report — OfferProof" },
      { name: "description", content: "A verification report you saved on OfferProof." },
      { property: "og:title", content: "Saved report — OfferProof" },
      { property: "og:description", content: "Saved verification report." },
    ],
  }),
  component: SavedReport,
});

function SavedReport() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_reports")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading)
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  if (!q.data)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Report not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been deleted, or it belongs to another account.
        </p>
        <Link to="/history" className="mt-4 inline-block text-primary hover:underline">
          Back to history
        </Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="mb-4 text-xs text-muted-foreground">
        Saved {new Date(q.data.created_at).toLocaleString()} ·{" "}
        <Link to="/history" className="text-primary hover:underline">
          Back to history
        </Link>
      </p>
      <ReportView
        report={rowToReport(q.data)}
        text={q.data.offer_text}
        onReset={() => navigate({ to: "/verify" })}
      />
    </div>
  );
}
