import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { CompareOffersLink } from "./CompareOffersLink";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/scam-awareness", label: "Scam Awareness" },
  { to: "/faq", label: "FAQ" },
  { to: "/about", label: "About" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setOpen(false);
    navigate({ to: "/login", replace: true });
  }
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
              activeOptions={{ exact: true }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button asChild variant="ghost" className="hidden lg:inline-flex">
            <CompareOffersLink>Compare Offers</CompareOffersLink>
          </Button>
          {session && (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link to="/history">History</Link>
              </Button>
              <Button variant="ghost" className="hidden sm:inline-flex" onClick={signOut}>
                Sign out
              </Button>
            </>
          )}
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/verify">Verify Offer</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mt-8 flex flex-col gap-1">
                {[...NAV, ...(session ? [{ to: "/history", label: "History" } as const] : [])].map(
                  (n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setOpen(false)}
                      className="rounded-md px-3 py-2.5 hover:bg-muted"
                    >
                      {n.label}
                    </Link>
                  ),
                )}
                <CompareOffersLink
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 hover:bg-muted"
                >
                  Compare Offers
                </CompareOffersLink>
                {session && (
                  <button
                    type="button"
                    onClick={signOut}
                    className="rounded-md px-3 py-2.5 text-left hover:bg-muted"
                  >
                    Sign out
                  </button>
                )}
                <Button asChild className="mt-4">
                  <Link to="/verify" onClick={() => setOpen(false)}>
                    Verify Offer
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink text-ink-foreground print:hidden">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="[&_a]:text-ink-foreground">
            <Logo />
          </div>
          <p className="mt-4 max-w-sm text-sm text-ink-muted">
            Every warning comes with evidence. Every result comes with a next step. OfferProof
            highlights warning signs; it cannot guarantee an offer is genuine or fraudulent.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-display font-semibold">Product</span>
          <Link to="/verify" className="text-ink-muted hover:text-ink-foreground">
            Verify an offer
          </Link>
          <CompareOffersLink className="text-ink-muted hover:text-ink-foreground">
            Compare offers
          </CompareOffersLink>
          <Link to="/features" className="text-ink-muted hover:text-ink-foreground">
            Features
          </Link>
          <Link to="/how-it-works" className="text-ink-muted hover:text-ink-foreground">
            How it works
          </Link>
          <Link to="/scam-awareness" className="text-ink-muted hover:text-ink-foreground">
            Scam awareness
          </Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-display font-semibold">Company</span>
          <Link to="/about" className="text-ink-muted hover:text-ink-foreground">
            About
          </Link>
          <Link to="/faq" className="text-ink-muted hover:text-ink-foreground">
            FAQ
          </Link>
          <Link to="/contact" className="text-ink-muted hover:text-ink-foreground">
            Contact
          </Link>
          <Link to="/privacy" className="text-ink-muted hover:text-ink-foreground">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-ink-muted hover:text-ink-foreground">
            Terms
          </Link>
        </div>
      </div>
      <div className="border-t border-ink-border py-5 text-center text-xs text-ink-muted">
        © {2026} OfferProof
      </div>
    </footer>
  );
}

export function PageHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="bg-grid border-b">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">{title}</h1>
        {children && (
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">{children}</p>
        )}
      </div>
    </section>
  );
}
