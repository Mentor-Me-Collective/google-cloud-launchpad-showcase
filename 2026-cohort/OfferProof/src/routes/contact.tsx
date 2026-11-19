import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { PageHero } from "@/components/site/SiteShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — OfferProof" },
      { name: "description", content: "Get in touch with the OfferProof team." },
      { property: "og:title", content: "Contact — OfferProof" },
      { property: "og:description", content: "Questions, feedback or partnership ideas." },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  subject: z.string().trim().min(3, "Please add a subject").max(150),
  message: z.string().trim().min(10, "Message should be at least 10 characters").max(2000),
});
type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

function Contact() {
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const r = schema.safeParse(data);
    if (!r.success) {
      const errs: Errors = {};
      r.error.issues.forEach((i) => (errs[i.path[0] as keyof Errors] = i.message));
      setErrors(errs);
      return;
    }
    setErrors({});
    const body = encodeURIComponent(`${r.data.message}\n\n— ${r.data.name} (${r.data.email})`);
    window.location.href = `mailto:hello@offerproof.app?subject=${encodeURIComponent(r.data.subject)}&body=${body}`;
    setSent(true);
    toast.success("Opening your email app to send the message.");
  }

  const field = (name: keyof Errors, label: string, el: React.ReactNode) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      {el}
      {errors[name] && <p className="text-sm text-destructive">{errors[name]}</p>}
    </div>
  );

  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to us.">
        Questions, feedback, or a scam pattern we should know about.
      </PageHero>
      <section className="mx-auto max-w-xl px-4 py-14 sm:px-6">
        <form
          onSubmit={submit}
          noValidate
          className="space-y-5 rounded-2xl border bg-card p-6 shadow-card"
        >
          {field("name", "Name", <Input id="name" name="name" maxLength={100} />)}
          {field("email", "Email", <Input id="email" name="email" type="email" maxLength={255} />)}
          {field("subject", "Subject", <Input id="subject" name="subject" maxLength={150} />)}
          {field(
            "message",
            "Message",
            <Textarea id="message" name="message" rows={6} maxLength={2000} />,
          )}
          <Button type="submit" className="w-full">
            Send message
          </Button>
          {sent && (
            <p className="text-center text-sm text-muted-foreground">
              If your email app didn't open, write to hello@offerproof.app.
            </p>
          )}
        </form>
      </section>
    </>
  );
}
