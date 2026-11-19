import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeAlert,
  BrainCircuit,
  Clock,
  Database,
  Eye,
  FileSearch,
  FileText,
  GitCompare,
  KeyRound,
  ListChecks,
  MailWarning,
  ScrollText,
  TrendingUp,
} from "lucide-react";
import { PageHero } from "@/components/site/SiteShell";
import { CompareOffersLink } from "@/components/site/CompareOffersLink";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — OfferProof" },
      {
        name: "description",
        content:
          "Fee detection, domain checks, highlighted evidence, offer comparison, checklists and reports.",
      },
      { property: "og:title", content: "Features — OfferProof" },
      {
        property: "og:description",
        content: "Everything OfferProof checks in a job or internship offer.",
      },
    ],
  }),
  component: Features,
});

const CHECKS = [
  {
    icon: BadgeAlert,
    t: "Registration & security fees",
    d: "Detects requests for registration, processing, security or 'refundable' deposits.",
    ex: "“pay a refundable security deposit of ₹2,999”",
  },
  {
    icon: FileText,
    t: "Training & equipment payments",
    d: "Flags offers that ask you to pay for training, certificates or laptops.",
    ex: "“training fee of ₹4,500 before joining”",
  },
  {
    icon: Clock,
    t: "Urgency & pressure",
    d: "Spots tight deadlines, secrecy and threats of withdrawal.",
    ex: "“within 24 hours, failing which…”",
  },
  {
    icon: TrendingUp,
    t: "Unrealistic promises",
    d: "Catches guaranteed income, daily pay claims and 'no interview needed'.",
    ex: "“earn ₹5,000 per day, no experience required”",
  },
  {
    icon: MailWarning,
    t: "Personal recruiter emails",
    d: "Notices recruiters writing from Gmail, Yahoo, Outlook and similar.",
    ex: "“hr.infosys.careers@gmail.com”",
  },
  {
    icon: FileSearch,
    t: "Domain mismatches",
    d: "Compares the company name with the email and website domains used.",
    ex: "Company: Acme Ltd · Domain: jobs-portal-hr.xyz",
  },
  {
    icon: Eye,
    t: "Suspicious links",
    d: "Shortened, unencrypted, messaging-app and unusual-domain links.",
    ex: "“https://bit.ly/join-now”",
  },
  {
    icon: KeyRound,
    t: "Sensitive information requests",
    d: "Requests for OTPs, PINs, card numbers, bank or ID documents.",
    ex: "“share the OTP to verify your account”",
  },
];

function Features() {
  return (
    <>
      <PageHero eyebrow="Features" title="Every check, explained.">
        OfferProof uses transparent rules — so you always know why something was flagged.
      </PageHero>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {CHECKS.map((c) => (
            <div key={c.t} className="rounded-xl border bg-card p-6 shadow-card">
              <c.icon className="size-6 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{c.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
              <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs">
                <span className="text-muted-foreground">Example: </span>
                <span className="mark-high">{c.ex}</span>
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-ink text-ink-foreground">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 md:grid-cols-3">
          {[
            {
              icon: GitCompare,
              t: "Compare Job Offers",
              d: "Line up salary, benefits, credibility and warning signs across two or more offers side by side.",
              link: true,
            },
            {
              icon: ListChecks,
              t: "Before-you-accept checklist",
              d: "An interactive list of everything worth verifying yourself, attached to every report.",
              link: false,
            },
            {
              icon: ScrollText,
              t: "Downloadable reports",
              d: "Save a printable PDF with assessment, evidence, recommendations and disclaimer.",
              link: false,
            },
          ].map((f) => (
            <div key={f.t}>
              <f.icon className="size-7 text-electric" />
              <h3 className="mt-4 text-xl font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-ink-muted">{f.d}</p>
              {f.link && (
                <CompareOffersLink className="mt-3 inline-block text-sm font-medium text-electric hover:underline">
                  Compare offers now
                </CompareOffersLink>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Technology integrations */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="eyebrow">Technology</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
          Powered by industry-leading platforms.
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <BrainCircuit className="size-6 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">AI recommendations — NVIDIA Nemotron</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              When you request AI recommendations, redacted offer text (emails and phone numbers
              stripped) is sent to NVIDIA's inference API running the{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                nvidia/nemotron-3.5-bolt-e4b
              </code>{" "}
              model. It returns structured verification steps, recruiter questions, and precautions
              — without altering the heuristic assessment.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <Database className="size-6 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">Threat analytics — Google Cloud BigQuery</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The Scam Awareness Centre queries a Google Cloud BigQuery dataset of job-posting
              patterns to surface relevant context. No offer text or personal data is ever written
              to BigQuery — it is a read-only analytics query.
            </p>
          </div>
        </div>
      </section>
      <div className="py-16 text-center">
        <Button asChild size="lg">
          <Link to="/verify">Try it on an offer</Link>
        </Button>
      </div>
    </>
  );
}
