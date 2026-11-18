import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/SiteShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — OfferProof" },
      { name: "description", content: "Terms and limitations of the OfferProof service." },
      { property: "og:title", content: "Terms of Use — OfferProof" },
      { property: "og:description", content: "Terms and limitations of the OfferProof service." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms of Use" />
      <article className="mx-auto max-w-3xl space-y-6 px-4 py-14 leading-relaxed text-muted-foreground sm:px-6 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground">
        <h2>What OfferProof is</h2>
        <p>
          OfferProof is an informational tool that highlights common warning signs in job and
          internship offers using rule-based checks.
        </p>
        <h2>Limitations</h2>
        <p>
          Results are heuristic. A Low Concern result does not mean an offer is genuine, and a High
          Concern result does not mean it is fraudulent. The assessment is not a scientifically
          validated probability of fraud. Text extraction can contain errors.
        </p>
        <h2>Your responsibility</h2>
        <p>
          Always verify offers directly with the employer through official channels. Decisions you
          make based on a report are your own.
        </p>
        <h2>Acceptable use</h2>
        <p>
          Only upload documents you have the right to share. Don't use OfferProof to harass or
          defame individuals or companies.
        </p>
        <h2>No warranty</h2>
        <p>The service is provided "as is" without warranties of any kind.</p>
      </article>
    </>
  );
}
