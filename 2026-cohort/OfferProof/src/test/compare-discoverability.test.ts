import { describe, expect, it } from "vitest";

import { FAQS } from "@/lib/content";
import { compareTarget } from "@/lib/compare-target";
import { safeRedirect } from "@/lib/offers";

describe("Compare Offers discoverability", () => {
  it("sends guests to login with a redirect back to comparison", () => {
    expect(compareTarget(false)).toEqual({ to: "/login", search: { redirect: "/compare" } });
  });

  it("sends signed-in users straight to the existing comparison page", () => {
    expect(compareTarget(true)).toEqual({ to: "/compare" });
  });

  it("returns the visitor to /compare after login", () => {
    expect(safeRedirect("/compare")).toBe("/compare");
  });

  it("answers the comparison question in the FAQ with the agreed wording", () => {
    const entry = FAQS.find((f) => f.q === "Can I compare multiple job offers?");
    expect(entry?.a).toBe(
      "Yes! Log in to OfferProof to compare offers, review key differences, and make a more informed decision.",
    );
  });

  it("shows that FAQ answer in the homepage preview", () => {
    expect(FAQS.slice(0, 4).map((f) => f.q)).toContain("Can I compare multiple job offers?");
  });
});
