import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSession } from "@/hooks/use-session";
import { compareTarget } from "@/lib/compare-target";

interface Props {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/** "Compare Offers" affordance: /compare when signed in, login-with-redirect-back for guests. */
export function CompareOffersLink({ children, className, onClick }: Props) {
  const session = useSession();
  const target = compareTarget(Boolean(session));
  return target.to === "/compare" ? (
    <Link to="/compare" className={className} onClick={onClick}>
      {children}
    </Link>
  ) : (
    <Link to="/login" search={{ redirect: "/compare" }} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
