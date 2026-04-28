/**
 * Step indicator — turns the workflow into an obvious 3-step visual.
 *
 * Shows the user where they are right now:
 *   1. Read mail   →   2. Create review   →   3. Send quote
 *
 * State is derived purely from props — no internal state.
 */
type Stage = "read" | "review" | "send";

type StepsProps = {
  stage: Stage;
};

const STEPS: { id: Stage; label: string }[] = [
  { id: "read", label: "Mail prüfen" },
  { id: "review", label: "Review öffnen" },
  { id: "send", label: "Angebot senden" },
];

export function Steps({ stage }: StepsProps) {
  const order: Stage[] = ["read", "review", "send"];
  const currentIdx = order.indexOf(stage);

  return (
    <div className="steps" role="list" aria-label="Workflow">
      {STEPS.map((s, i) => {
        const status =
          i < currentIdx ? "done" : i === currentIdx ? "active" : "idle";
        return (
          <div
            key={s.id}
            role="listitem"
            className={`step ${status === "active" ? "active" : ""} ${
              status === "done" ? "done" : ""
            }`}
            aria-current={status === "active" ? "step" : undefined}
          >
            <div className="step-num">{status === "done" ? "✓" : i + 1}</div>
            <div className="step-label">{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}
