import Pill from "./Pill";
import type { SerializedChange } from "./types";

export default function ChangeResultView({
  result,
}: {
  result: SerializedChange;
}) {
  const s = result.impactSummary;
  return (
    <div className="recorded" aria-live="polite">
      <h3>What happened, step by step</h3>
      <ol className="steps">
        {result.steps.map((step) => (
          <li key={step.key} className={step.status}>
            <span>
              {step.label}
              {step.detail ? <span className="detail"> — {step.detail}</span> : null}
            </span>
          </li>
        ))}
      </ol>

      {result.impact.length > 0 && (
        <>
          <div className="impact">
            {result.impact.map((e) => (
              <div className="impact-row" key={e.system}>
                <span>{e.system}</span>
                <Pill
                  status={
                    e.status === "updated"
                      ? "complete"
                      : e.status === "failed"
                        ? "incomplete"
                        : "in_progress"
                  }
                />
              </div>
            ))}
          </div>
          <p className="impact-count">
            Recorded in <span className="tnum">{s.updated}</span> of{" "}
            <span className="tnum">{s.total}</span>{" "}
            {s.total === 1 ? "system" : "systems"}.
          </p>
        </>
      )}
    </div>
  );
}
