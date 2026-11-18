import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/SiteShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — OfferProof" },
      {
        name: "description",
        content:
          "Why OfferProof exists: helping students and job seekers make safer career decisions.",
      },
      { property: "og:title", content: "About — OfferProof" },
      { property: "og:description", content: "Our mission, vision and the problem we're solving." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <PageHero eyebrow="About" title="Safer first steps into work.">
        OfferProof helps students and job seekers spot suspicious offers before they cost money,
        data or time.
      </PageHero>
      <section className="mx-auto grid max-w-5xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-3">
        {[
          {
            t: "The problem",
            d: "Fake job and internship offers target people at their most hopeful moment — first jobs, career switches, remote work. They look official, move fast and ask for small payments or personal data.",
          },
          {
            t: "Our mission",
            d: "Give anyone a fast, free and transparent way to check an offer, understand the warning signs, and know exactly what to verify next.",
          },
          {
            t: "Our vision",
            d: "A hiring world where scammers' scripts are common knowledge, and every candidate checks before they pay or share.",
          },
        ].map((b) => (
          <div key={b.t}>
            <p className="eyebrow">{b.t}</p>
            <p className="mt-4 text-lg leading-relaxed">{b.d}</p>
          </div>
        ))}
      </section>
      <section className="bg-ink text-ink-foreground">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <p className="font-display text-3xl leading-snug font-semibold">
            “Every warning comes with evidence. Every result comes with a next step.”
          </p>
        </div>
      </section>
    </>
  );
}
