import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/SiteShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — OfferProof" },
      { name: "description", content: "How OfferProof handles your documents and data." },
      { property: "og:title", content: "Privacy Policy — OfferProof" },
      { property: "og:description", content: "How OfferProof handles your documents and data." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
      <article className="mx-auto max-w-3xl space-y-6 px-4 py-14 leading-relaxed text-muted-foreground sm:px-6 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground">
        <h2>Documents you check</h2>
        <p>
          Text extraction (PDF reading and OCR) and the heuristic offer analysis run inside your
          browser. When you check an offer without saving it, the document file is never uploaded to
          our servers.
        </p>
        <p>
          If you request AI recommendations, offer text with emails and phone numbers redacted is
          sent to NVIDIA's inference API to generate verification guidance. The redacted text is not
          stored by OfferProof after the response is returned.
        </p>
        <h2>Saved reports</h2>
        <p>
          If you create an account and choose to save a report, the report and any document you
          attach are stored privately and are only accessible to your account. You can delete any
          saved report, or your whole account, at any time.
        </p>
        <h2>Contact messages</h2>
        <p>If you contact us, we use your name and email only to reply.</p>
        <h2>What we don't do</h2>
        <p>
          We don't sell your data, and we don't share your documents with employers or third
          parties.
        </p>
        <h2>Sensitive information</h2>
        <p>
          Offer letters can contain personal details. Consider removing ID numbers or bank details
          before checking — they are not needed for the analysis.
        </p>
      </article>
    </>
  );
}
