import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { getPending, safeRedirect } from "@/lib/offers";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Login — OfferProof" },
      {
        name: "description",
        content: "Sign in to save reports, compare offers and see your verification history.",
      },
      { property: "og:title", content: "Login — OfferProof" },
      { property: "og:description", content: "Sign in to OfferProof." },
    ],
  }),
  component: Login,
});

export function Login() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const target = safeRedirect(redirect);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setPending(getPending().length);

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        navigate({ to: target, replace: true });
      }
    });
  }, [navigate, target]);

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (busy || demoBusy) return;

    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      toast.error("Enter a valid email and a password of at least 8 characters.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(target)}`,
          },
        });

        const isExistingUser =
          (data?.user?.identities && data.user.identities.length === 0) ||
          (error &&
            (error.message?.toLowerCase().includes("already registered") ||
              error.message?.toLowerCase().includes("already exists")));

        if (isExistingUser) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (!signInErr) {
            navigate({ to: target, replace: true });
            return;
          }

          if (signInErr.message?.toLowerCase().includes("invalid login credentials")) {
            toast.error(
              "An account with this email already exists. Please enter your existing password to sign in.",
            );
            return;
          }

          throw signInErr;
        }

        if (error) throw error;

        if (!data?.session) {
          setSent(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }

      navigate({ to: target, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function exploreDemo() {
    if (busy || demoBusy) return;

    setDemoBusy(true);

    try {
      const { data, error } = await supabase.functions.invoke("demo-login", {
        body: {},
      });

      if (error) throw error;

      if (!data?.access_token || !data?.refresh_token) {
        throw new Error("Invalid demo session.");
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) throw sessionError;

      toast.success("Welcome to the OfferProof demo!");

      navigate({ to: target, replace: true });
    } catch (err) {
      console.error("Demo login failed:", err);

      toast.error("Unable to open the demo. Please try again.");
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div className="bg-grid flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-card">
        <UserRound className="mx-auto size-10 text-primary" />

        <h1 className="mt-4 text-center text-2xl font-bold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>

        <p className="mt-2 text-center text-sm text-muted-foreground">
          Save reports, compare offers and reopen your history. Checking an offer never needs an
          account.
        </p>

        {pending > 0 && (
          <p className="mt-4 rounded-lg bg-accent px-3 py-2 text-center text-xs text-accent-foreground">
            {pending} offer(s) from this visit will be added to your account after you sign in.
          </p>
        )}

        {sent ? (
          <div className="mt-6 rounded-lg border p-4 text-center text-sm">
            Check <b>{email}</b> for a confirmation link. After confirming you'll come back here and
            your offers will be kept.
          </div>
        ) : (
          <>
            <Tabs
              value={mode}
              onValueChange={(v) => setMode(v as "signin" | "signup")}
              className="mt-6"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={submit} className="mt-5 space-y-3">
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email"
                maxLength={255}
                disabled={busy || demoBusy}
              />

              <Input
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="Password (8+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Password"
                maxLength={72}
                disabled={busy || demoBusy}
              />

              <Button type="submit" className="w-full" disabled={busy || demoBusy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={exploreDemo}
              disabled={busy || demoBusy}
            >
              {demoBusy && <Loader2 className="size-4 animate-spin" />}
              {demoBusy ? "Opening demo..." : "Explore Demo"}
            </Button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Explore OfferProof using the demo account without entering login credentials.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
