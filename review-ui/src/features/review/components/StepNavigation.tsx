import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/shared/components/ui/button";
import { useGlobalShortcut } from "@/shared/hooks/useGlobalShortcut";

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

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1 hidden rounded border border-current/20 px-1 font-mono text-[10px] font-normal opacity-50 sm:inline">
      {children}
    </kbd>
  );
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

  const goNext = useCallback(() => {
    if (disabled) return;
    if (next) navigate(`/reviews/${encodeURIComponent(reviewId ?? "")}/${next}`);
    else onFinish?.();
  }, [disabled, next, navigate, reviewId, onFinish]);

  const goPrev = useCallback(() => {
    if (prev) navigate(`/reviews/${encodeURIComponent(reviewId ?? "")}/${prev}`);
  }, [prev, navigate, reviewId]);

  useGlobalShortcut("ArrowRight", goNext, { altKey: true, disabled: !reviewId });
  useGlobalShortcut("ArrowLeft", goPrev, { altKey: true, disabled: !reviewId });

  return (
    <nav
      aria-label="Schritt-Navigation"
      className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6"
    >
      <div>
        {prev && (
          <Button variant="secondary" onClick={goPrev}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel}
            <Kbd>Alt ←</Kbd>
          </Button>
        )}
      </div>

      <div>
        {next ? (
          <Button variant="primary" disabled={disabled} onClick={goNext}>
            {forwardLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            <Kbd>Alt →</Kbd>
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
