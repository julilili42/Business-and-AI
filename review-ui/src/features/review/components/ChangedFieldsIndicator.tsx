import { useReviewUiStore } from "../stores/reviewUiStore";
import { cn } from "@/shared/lib/cn";

/**
 * Inline badge showing how many fields the user has touched since
 * the LLM extraction. Mirrors the Streamlit `_changes_indicator`.
 */
export function ChangedFieldsIndicator({ className }: { className?: string }) {
  const count = useReviewUiStore((s) => s.changedFields.size);
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <strong>{count}</strong>{" "}
      {count === 1 ? "Änderung" : "Änderungen"} gegenüber KI-Extraktion
    </div>
  );
}
