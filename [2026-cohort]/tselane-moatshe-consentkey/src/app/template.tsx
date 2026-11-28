"use client";

import type { ReactNode } from "react";

/**
 * One quiet, opacity-only reveal per navigation — a single load moment rather
 * than fade-and-slide on every section. Disabled under prefers-reduced-motion.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="enter">{children}</div>;
}
