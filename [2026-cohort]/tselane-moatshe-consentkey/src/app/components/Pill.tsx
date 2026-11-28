const LABELS: Record<string, string> = {
  granted: "Granted",
  withdrawn: "Withdrawn",
  not_set: "Not yet set",
  complete: "Recorded everywhere",
  incomplete: "Partly recorded",
  rejected: "Declined",
  in_progress: "In progress",
  pending_approval: "Awaiting sign-off",
};

/** A worded consent/record status (color + shape carry meaning, not decoration). */
export default function Pill({ status }: { status: string }) {
  return <span className={`status ${status}`}>{LABELS[status] ?? status}</span>;
}
