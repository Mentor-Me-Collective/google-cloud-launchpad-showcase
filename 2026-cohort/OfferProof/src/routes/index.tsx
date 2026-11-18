import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeAlert,
  BrainCircuit,
  Database,
  Eye,
  FileSearch,
  GitCompare,
  ListChecks,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hero3D } from "@/components/hero/Hero3D";
import { StepsVisual } from "@/components/site/StepsVisual";
import { CompareOffersLink } from "@/components/site/CompareOffersLink";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQS } from "@/lib/content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OfferProof — Your next opportunity deserves verification" },
      {
        name: "description",
        content:
          "Check job and internship offers for fees, fake recruiters and suspicious domains. Every warning comes with evidence and a next step.",
      },
      { property: "og:title", content: "OfferProof — Your next opportunity deserves verification" },
      {
        property: "og:description",
        content: "Explainable job-offer checks for students and job seekers.",
      },
    ],
  }),
  component: Home,
});

const FEATURES = [
  {
    icon: BadgeAlert,
    title: "Fee & payment detection",
    text: "Spots registration, security, training and 'refundable' deposit requests.",
  },
  {
    icon: FileSearch,
    title: "Domain & link checks",
    text: "Flags personal emails, look-alike domains, shortened and unencrypted links.",
  },
  {
    icon: Eye,
    title: "Highlighted evidence",
    text: "Every suspicious phrase is marked in your document so you can see why.",
  },
  {
    icon: BrainCircuit,
    title: "AI recommendations (NVIDIA)",
    text: "Powered by NVIDIA Nemotron via their inference API — generates verification steps, recruiter questions and precautions tailored to your offer.",
  },
  {
    icon: Database,
    title: "Threat analytics (Google BigQuery)",
    text: "Job-posting pattern data is queried from a Google Cloud BigQuery dataset to surface scam-awareness context.",
  },
  {
    icon: GitCompare,
    title: "Compare Job Offers",
    text: "Log in to line up two or more offers side by side: salary, benefits, credibility and warning signs.",
  },
  {
    icon: ListChecks,
    title: "Before-you-accept checklist",
    text: "A guided list of what to verify yourself before saying yes.",
  },
  {
    icon: ScrollText,
    title: "Downloadable reports",
    text: "Save a clear report with findings, recommendations and a disclaimer.",
  },
  {
    icon: ShieldCheck,
    title: "Scam Awareness Centre",
    text: "Browse real scam patterns, red-flag categories and job-posting threat data sourced from Google BigQuery.",
  },
];

function Home() {
  return (
    <>
      <section className="bg-grid relative overflow-hidden border-b">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pt-14 pb-10 sm:px-6 lg:grid-cols-2 lg:pt-20">
          <div>
            <p className="eyebrow">Job & internship offer verification</p>
            <h1 className="mt-5 text-4xl leading-[1.05] font-bold sm:text-6xl">
              Your next opportunity deserves verification.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              OfferProof reads an offer letter, email or screenshot and points out the warning signs
              scammers rely on — with the exact evidence and what to do next.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/verify">
                  Verify an Offer <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/how-it-works">Explore How It Works</Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Juggling more than one offer?{" "}
              <CompareOffersLink className="font-medium text-primary hover:underline">
                Log in to compare offers
              </CompareOffersLink>{" "}
              side by side — salary, benefits, credibility and warning signs.
            </p>
          </div>
          <Hero3D />
        </div>
      </section>

      {/* Upload preview */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="eyebrow">See it before you trust it</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Warnings you can point to.</h2>
            <p className="mt-4 text-muted-foreground">
              No black-box score. OfferProof shows the sentence that triggered each warning, why it
              matters, and the step that resolves it.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-card lg:col-span-3">
            <div className="flex items-center justify-between border-b pb-4">
              <span className="font-display font-semibold">Sample report · fictional</span>
              <span className="rounded-full bg-high-soft px-3 py-1 text-xs font-semibold text-high">
                High Concern
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              "Congratulations! You are selected as Data Entry Executive. Kindly pay a{" "}
              <span className="mark-high">refundable security deposit</span> of ₹2,999{" "}
              <span className="mark-warn">within 24 hours</span>, failing which the offer will be
              withdrawn. Contact <span className="mark-high">hr.globaltech@gmail.com</span>."
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border-l-4 border-high bg-high-soft/50 p-3 text-sm">
                <b>Payment requested</b>
                <p className="text-muted-foreground">
                  Don't pay. Confirm via the company's official site.
                </p>
              </div>
              <div className="rounded-lg border-l-4 border-warn bg-warn-soft/50 p-3 text-sm">
                <b>Personal email</b>
                <p className="text-muted-foreground">
                  Real recruiters usually use the company domain.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works – dark product section */}
      <section className="bg-ink text-ink-foreground">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <p className="eyebrow !text-electric">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
            Four steps from doubt to decision.
          </h2>
          <div className="mt-10">
            <StepsVisual inverted />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Features</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Built for the offers that feel too good.
            </h2>
          </div>
          <Button asChild variant="outline">
            <Link to="/features">All features</Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-card p-7">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-5 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust principles */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-3">
          <div>
            <p className="eyebrow">Trust principles</p>
            <h2 className="mt-3 text-3xl font-bold">Honest about what we know.</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3 lg:col-span-2">
            {[
              { t: "Evidence first", d: "Every warning links to the words that caused it." },
              { t: "No false certainty", d: "We never claim an offer is guaranteed real or fake." },
              {
                t: "Privacy by design",
                d: "Heuristic checks run in your browser. AI recommendations transmit only redacted text — emails and phone numbers are stripped before sending.",
              },
            ].map((p) => (
              <div key={p.t} className="border-l-2 border-primary pl-4">
                <h3 className="font-semibold">{p.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ preview */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <p className="eyebrow text-center">FAQ</p>
        <h2 className="mt-3 text-center text-3xl font-bold">Common questions</h2>
        <Accordion type="single" collapsible className="mt-8">
          {FAQS.slice(0, 4).map((f, i) => (
            <AccordionItem key={i} value={`f${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-6 text-center">
          <Button asChild variant="link">
            <Link to="/faq">See all questions</Link>
          </Button>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl bg-ink p-10 text-ink-foreground md:flex-row md:items-center md:p-14">
          <div>
            <ShieldAlert className="size-8 text-electric" />
            <h2 className="mt-4 text-3xl font-bold">Got an offer? Check it before you reply.</h2>
            <p className="mt-2 text-ink-muted">It takes under a minute. Free, no account needed.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/verify">
                Verify an Offer <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="border border-ink-border text-ink-foreground hover:bg-ink-border"
            >
              <CompareOffersLink>Compare Offers</CompareOffersLink>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
