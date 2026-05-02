import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { useResetReview } from "../hooks/useReviewMutations";

interface ResetReviewActionProps {
  reviewId: string;
}

/**
 * Sidebar-mounted "reset pipeline" action.
 *
 * Two-step confirmation — first click arms the action, second click
 * actually fires the mutation. Mirrors the Streamlit confirm-before-reset
 * preference; we always confirm because reset is destructive.
 */
export function ResetReviewAction({ reviewId }: ResetReviewActionProps) {
  const [armed, setArmed] = useState(false);
  const reset = useResetReview(reviewId);

  if (!armed) {
    return (
      <div className="space-y-2 rounded-md border border-danger/30 bg-danger-soft p-3">
        <div className="text-xs font-bold text-danger">
          Pipeline neu starten
        </div>
        <p className="text-[11.5px] leading-snug text-foreground/80">
          Verarbeitet die Anfrage komplett neu. Bisherige Anpassungen gehen verloren.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="w-full border-danger/40 text-danger hover:bg-danger-soft hover:text-danger"
          onClick={() => setArmed(true)}
        >
          Neu starten
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-danger/40 bg-danger-soft p-3">
      <div className="text-[11.5px] font-semibold text-danger">
        Diese Aktion kann nicht rückgängig gemacht werden.
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="danger"
          size="sm"
          disabled={reset.isPending}
          onClick={() => {
            reset.mutate(undefined, {
              onSettled: () => setArmed(false),
            });
          }}
        >
          {reset.isPending ? "Läuft…" : "Bestätigen"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setArmed(false)}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
