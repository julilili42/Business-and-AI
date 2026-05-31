import { Check, Loader2 } from "lucide-react";

import { useDelayedVisible } from "@/shared/hooks/useDelayedVisible";

interface SaveStatusProps {
  pending: boolean;
  isError: boolean;
  isSuccess: boolean;
  /** Message shown when the save failed. */
  errorText?: string;
  /** Confirmation shown after a successful save. */
  savedText?: string;
}

/**
 * Inline status for the auto-saving review editors.
 *
 * The editors commit per field, so there is no explicit "Save" button. To
 * reassure the user that their edits actually stuck, this stays on a
 * persistent "Gespeichert" after a successful save instead of only flashing
 * a transient spinner:
 *
 * - while saving (after a short delay, so fast saves don't flicker):
 *   "Änderungen werden gespeichert…"
 * - after success: a persistent "Gespeichert" with a check
 * - on error: the editor-specific message
 *
 * `isSuccess` stays true until the next `mutate`, which is exactly the
 * "saved and idle" window we want to confirm.
 */
export function SaveStatus({
  pending,
  isError,
  isSuccess,
  errorText = "Speichern fehlgeschlagen. Bitte erneut versuchen.",
  savedText = "Gespeichert",
}: SaveStatusProps) {
  const showSaving = useDelayedVisible(pending);

  if (showSaving) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
        role="status"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Änderungen werden gespeichert…
      </span>
    );
  }
  if (isError) {
    return (
      <span className="text-xs font-semibold text-danger" role="status">
        {errorText}
      </span>
    );
  }
  if (isSuccess) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium text-success"
        role="status"
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        {savedText}
      </span>
    );
  }
  return null;
}
