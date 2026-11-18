import { lazy, Suspense, useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { ShieldCheck } from "lucide-react";

const HeroScene = lazy(() => import("./HeroScene"));

function StaticFallback() {
  return (
    <div className="relative mx-auto aspect-[4/5] w-64 rotate-[-6deg] rounded-xl border bg-card p-6 shadow-card">
      <div className="h-3 w-24 rounded bg-primary" />
      <div className="mt-6 h-4 w-32 rounded bg-foreground/80" />
      {[90, 100, 70, 100, 85, 60].map((w, i) => (
        <div
          key={i}
          className={`mt-3 h-2 rounded ${i === 3 ? "bg-high" : i === 5 ? "bg-warn" : "bg-muted"}`}
          style={{ width: `${w}%` }}
        />
      ))}
      <div className="absolute inset-x-0 top-0 h-0.5 animate-scan bg-electric" />
      <ShieldCheck className="absolute -bottom-6 -right-6 size-20 rounded-2xl bg-primary p-4 text-primary-foreground shadow-card" />
    </div>
  );
}

export function Hero3D() {
  const { dark } = useTheme();
  const [mode, setMode] = useState<"pending" | "3d" | "static">("pending");
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const r = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(r);
    const small = matchMedia("(max-width: 767px)").matches;
    setMode(small ? "static" : "3d");
  }, []);
  return (
    <div className="relative h-[380px] w-full md:h-[520px]">
      {mode === "3d" ? (
        <Suspense
          fallback={
            <div className="flex h-full items-center">
              <StaticFallback />
            </div>
          }
        >
          <HeroScene dark={dark} reduced={reduced} />
        </Suspense>
      ) : (
        <div className="flex h-full items-center justify-center">
          <StaticFallback />
        </div>
      )}
    </div>
  );
}
