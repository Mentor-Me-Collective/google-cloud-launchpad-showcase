/**
 * Where a "Compare Offers" action sends the visitor.
 *
 * Signed-in users reach the existing comparison page directly. Guests are sent to
 * login with a redirect back to /compare, so their pending offers carry over and
 * they land on comparison after authenticating.
 */
export type CompareTarget = { to: "/compare" } | { to: "/login"; search: { redirect: "/compare" } };

export function compareTarget(hasSession: boolean): CompareTarget {
  return hasSession ? { to: "/compare" } : { to: "/login", search: { redirect: "/compare" } };
}
