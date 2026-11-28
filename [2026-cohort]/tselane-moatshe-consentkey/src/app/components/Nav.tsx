"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { homeFor, roleSummary } from "./types";
import type { Me } from "./types";

export default function Nav() {
  const [me, setMe] = useState<Me | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: { identity: Me | null }) => {
        if (alive) setMe(d.identity);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  // Only the pages this role can use. A System Admin gets user management
  // and nothing else: no consent requests, no audit trail.
  const links =
    me?.kind === "admin"
      ? [{ href: "/admin", label: "Manage users" }]
      : me?.kind === "staff"
        ? [
            { href: "/staff", label: "Requests" },
            { href: "/audit", label: "Audit trail" },
          ]
        : me?.kind === "parent"
          ? [
              { href: "/dashboard", label: "My consent" },
              { href: "/audit", label: "Audit trail" },
            ]
          : [];

  const home = homeFor(me);

  return (
    <header className="topbar">
      <Link href={home} className="wordmark" translate="no">
        <span className="k">Consent</span>
        <b>Key</b>
      </Link>

      <nav className="topnav" aria-label="Primary">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={pathname === l.href ? "page" : undefined}
          >
            {l.label}
          </Link>
        ))}
        {me && (
          <>
            <span className="whoami">
              <b>{me.name}</b>
              {roleSummary(me)}
            </span>
            <button className="btn btn--quiet btn--sm" onClick={logout}>
              Sign out
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
