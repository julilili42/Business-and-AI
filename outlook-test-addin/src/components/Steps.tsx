/**
 * Step indicator — 3 stages aligned with the Streamlit review UI.
 *
 *   1. Anfrage analysieren   — mail loaded, ready to extract
 *   2. Angebot erstellen     — review created, refining quote
 *   3. Angebot versenden     — draft mail with PDF being prepared
 *
 * Stage is derived purely from the workflow state — no internal state.
 */
import type { MailWorkflowState } from "../mailWorkflowStorage";

type StepsProps = {
  workflowState: MailWorkflowState;
};

const STEPS = [
  { num: 1, label: "Anfrage" },
  { num: 2, label: "Angebot" },
  { num: 3, label: "Versand" },
] as const;

function activeIndex(state: MailWorkflowState): number {
  // 0-based: step 1 = index 0
  switch (state) {
    case "new":
      return 0;
    case "review_created":
    case "review_opened":
      return 1;
    case "quote_sent":
      return 2;
  }
}

export function Steps({ workflowState }: StepsProps) {
  const current = activeIndex(workflowState);
  // quote_sent means step 3 is *done*, not just active. Show all done in that case.
  const allDone = workflowState === "quote_sent";

  return (
    <div className="steps" role="list" aria-label="Workflow-Fortschritt">
      {STEPS.map((s, i) => {
        const status =
          allDone || i < current
            ? "done"
            : i === current
              ? "active"
              : "idle";
        return (
          <div
            key={s.num}
            role="listitem"
            className={`step ${status}`}
            aria-current={status === "active" ? "step" : undefined}
          >
            <div className="step-num">{status === "done" ? "✓" : s.num}</div>
            <div className="step-label">{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}
