import { useReviewUiStore } from "../stores/reviewUiStore";

/**
 * Inline badge showing how many fields the user has touched since
 * the LLM extraction. Mirrors the Streamlit `_changes_indicator`.
 */
export function ChangedFieldsIndicator() {
  const count = useReviewUiStore((s) => s.changedFields.size);
  if (count === 0) return null;

  return (
    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      <strong>{count}</strong>{" "}
      {count === 1 ? "Änderung" : "Änderungen"} gegenüber KI-Extraktion
    </div>
  );
}
