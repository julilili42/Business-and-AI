import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/shared/components/ui/button";

const STEP_ORDER = ["positions", "customer", "approval"] as const;
type Slug = (typeof STEP_ORDER)[number];

interface StepNavigationProps {
  current: Slug;
  forwardLabel?: string;
  backLabel?: string;
  /**
   * Final-step "finish" callback. When provided on the last step,
   * replaces the next button with a finish button.
   */
  onFinish?: () => void;
  finishLabel?: string;
  disabled?: boolean;
}

export function StepNavigation({
  current,
  forwardLabel = "Weiter",
  backLabel = "Zurück",
  onFinish,
  finishLabel = "Fertig",
  disabled = false,
}: StepNavigationProps) {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();
  const idx = STEP_ORDER.indexOf(current);
  const prev = idx > 0 ? STEP_ORDER[idx - 1] : null;
  const next = idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;

  return (
    <nav
      aria-label="Schritt-Navigation"
      className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6"
    >
      <div>
        {prev && (
          <Button
            variant="secondary"
            onClick={() =>
              navigate(`/reviews/${encodeURIComponent(reviewId ?? "")}/${prev}`)
            }
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel}
          </Button>
        )}
      </div>

      <div>
        {next ? (
          <Button
            variant="primary"
            disabled={disabled}
            onClick={() =>
              navigate(`/reviews/${encodeURIComponent(reviewId ?? "")}/${next}`)
            }
          >
            {forwardLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : onFinish ? (
          <Button variant="primary" onClick={onFinish}>
            {finishLabel}
          </Button>
        ) : null}
      </div>
    </nav>
  );
}
