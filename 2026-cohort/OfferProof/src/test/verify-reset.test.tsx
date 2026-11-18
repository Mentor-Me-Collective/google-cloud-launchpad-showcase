import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  listener: undefined as undefined | ((event: { toLocation: { pathname: string } }) => void),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => vi.fn(),
  useRouter: () => router,
}));
const router = {
  subscribe: (_event: string, listener: typeof navigation.listener) => {
    navigation.listener = listener;
    return () => {
      navigation.listener = undefined;
    };
  },
};
vi.mock("@/hooks/use-session", () => ({ useSession: () => null }));
vi.mock("@/lib/offers", () => ({ addPending: vi.fn(), saveOfferWithReport: vi.fn() }));

import { Route } from "@/routes/verify";

afterEach(cleanup);

describe("new verification navigation", () => {
  it("clears offer text, results and checklist repeatedly without remounting the router", () => {
    const Component = (Route as unknown as { component: React.ComponentType }).component;
    render(<Component />);
    for (let attempt = 0; attempt < 3; attempt++) {
      const input = document.querySelector<HTMLTextAreaElement>("#offer");
      expect(input).not.toBeNull();
      expect(input?.value).toBe("");
      if (!input) throw new Error("Fresh offer input missing");
      fireEvent.change(input, {
        target: {
          value:
            "Company: Acme Technologies\nPosition: Engineer\nSalary: ₹4,80,000 per year\nLocation: Bengaluru",
        },
      });
      fireEvent.click(screen.getByRole("button", { name: "Check this offer" }));
      const checkboxes = screen.getAllByRole("checkbox");
      expect(
        checkboxes.every((checkbox) => checkbox.getAttribute("aria-checked") === "false"),
      ).toBe(true);
      const firstCheckbox = checkboxes[0];
      if (!firstCheckbox) throw new Error("Checklist missing");
      fireEvent.click(firstCheckbox);
      expect(firstCheckbox.getAttribute("aria-checked")).toBe("true");
      act(() => navigation.listener?.({ toLocation: { pathname: "/verify" } }));
      expect(document.querySelector("#report")).toBeNull();
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    }
  });
});
