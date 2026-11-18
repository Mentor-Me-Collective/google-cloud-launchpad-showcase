import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { PageHero } from "@/components/site/SiteShell";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQS } from "@/lib/content";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — OfferProof" },
      {
        name: "description",
        content:
          "Answers about how OfferProof works, what it checks, privacy and what to do if you've been scammed.",
      },
      { property: "og:title", content: "FAQ — OfferProof" },
      { property: "og:description", content: "Frequently asked questions about OfferProof." },
    ],
  }),
  component: Faq,
});

function Faq() {
  const [q, setQ] = useState("");
  const list = FAQS.filter((f) => (f.q + f.a).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHero eyebrow="FAQ" title="Questions, answered." />
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search questions…"
            className="h-12 pl-10"
            aria-label="Search questions"
          />
        </div>
        <Accordion type="single" collapsible className="mt-6">
          {list.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {list.length === 0 && (
          <p className="mt-8 text-center text-muted-foreground">No questions match “{q}”.</p>
        )}
      </section>
    </>
  );
}
