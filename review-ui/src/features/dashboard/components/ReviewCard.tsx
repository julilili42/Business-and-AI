import { AlertCircle, ShieldAlert } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/shared/lib/cn";
import { formatDate, formatEur } from "@/shared/lib/format";

import { matchRate, type ReviewStatus, type ReviewSummary } from "../schemas/reviewSummary";

const STATUS_CONFIG: Record<
  ReviewStatus,
  { dot: string; text: string; label: string }
> = {
  in_arbeit:     { dot: "bg-warning", text: "text-warning", label: "In Arbeit" },
  pdf_bereit:    { dot: "bg-info",    text: "text-info",    label: "Zu prüfen" },
  abgeschlossen: { dot: "bg-success", text: "text-success", label: "Abgeschlossen" },
};

interface ReviewCardProps {
  review: ReviewSummary;
  selected: boolean;
  selectionDisabled?: boolean;
  onToggleSelected: () => void;
}

export function ReviewCard({
  review,
  selected,
  selectionDisabled = false,
  onToggleSelected,
}: ReviewCardProps) {
  const navigate = useNavigate();
  const detailHref = `/reviews/${encodeURIComponent(review.review_id)}`;
  const cfg = STATUS_CONFIG[review.status];
  const rate = matchRate(review);
  const manualClarification = Boolean(review.escalation?.escalated);
  const statusLabel = manualClarification ? "Klärung" : cfg.label;
  const clarificationReason = review.escalation?.reason?.trim();
  const hasOpenPositions = review.matches_no_match > 0 && review.status !== "abgeschlossen";

  const openReview = () => navigate(detailHref);
  const openReviewFromKeyboard = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openReview();
  };

  return (
    <tr
      role="link"
      tabIndex={0}
      aria-label={`Review ${review.subject || review.review_id} öffnen`}
      onClick={openReview}
      onKeyDown={openReviewFromKeyboard}
      className={cn(
        "group cursor-pointer border-b border-border last:border-0 transition-all duration-150",
        "hover:bg-ek-blue-soft/35 hover:shadow-[inset_3px_0_0_hsl(var(--ek-blue))]",
        "focus-visible:bg-ek-blue-soft/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        manualClarification && "bg-warning-soft/40 hover:bg-ek-blue-soft/35",
        selected && "bg-info-soft/50 hover:bg-info-soft/70",
      )}
    >
      {/* Auswahl */}
      <td
        className="w-12 px-4 py-4 align-middle"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          disabled={selectionDisabled}
          ariaLabel={`Anfrage ${review.subject || review.review_id} auswählen`}
          onCheckedChange={onToggleSelected}
        />
      </td>

      {/* Status */}
      <td className="w-36 px-4 py-4 align-middle">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {manualClarification ? (
              <ClarificationStatus reason={clarificationReason} />
            ) : (
              <>
                <span className={cn("h-2 w-2 shrink-0 rounded-full", cfg.dot)} aria-hidden="true" />
                <span className={cn("text-xs font-semibold", cfg.text)}>
                  {statusLabel}
                </span>
              </>
            )}
          </div>
        </div>
      </td>

      {/* Kunde */}
      <td className="w-48 px-4 py-4 align-middle">
        <span className="block max-w-[11rem] truncate text-sm font-semibold text-foreground transition-colors group-hover:text-foreground">
          {review.customer || review.sender || "—"}
        </span>
      </td>

      {/* Betreff + ID */}
      <td className="px-4 py-4 align-middle">
        <span className="block truncate text-sm text-muted-foreground transition-colors group-hover:text-foreground">
          {review.subject || "(ohne Betreff)"}
        </span>
        <code className="mt-0.5 block font-mono text-[10px] text-muted-foreground/40">
          {review.review_id}
        </code>
        {hasOpenPositions && (
          <span
            title={`${review.matches_no_match} Position${review.matches_no_match !== 1 ? "en" : ""} ohne Match`}
            className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand"
          >
            <AlertCircle className="h-2.5 w-2.5" aria-hidden="true" />
            {review.matches_no_match} ohne Match
          </span>
        )}
      </td>

      {/* Datum */}
      <td className="w-28 px-4 py-4 text-right align-middle">
        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          {formatDate(review.updated_at)}
        </span>
      </td>

      {/* Positionen */}
      <td className="w-16 px-4 py-4 text-center align-middle">
        <span className="text-xs tabular-nums text-muted-foreground">{review.positions}</span>
      </td>

      {/* Match-Quote */}
      <td className="w-20 px-4 py-4 text-right align-middle">
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            rate >= 0.8 ? "text-success" : rate >= 0.5 ? "text-warning" : "text-brand",
          )}
        >
          {Math.round(rate * 100)}&thinsp;%
        </span>
      </td>

      {/* Betrag */}
      <td className="w-32 px-4 py-4 text-right align-middle">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatEur(review.total_eur)}
        </span>
      </td>
    </tr>
  );
}

function ClarificationStatus({ reason }: { reason?: string }) {
  const label = reason || "Manuelle Klärung erforderlich";

  return (
    <Tooltip.Root delayDuration={120}>
      <Tooltip.Trigger asChild>
        <span
          tabIndex={0}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-600/30 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 outline-none transition-colors hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-amber-300/35 dark:bg-amber-300/15 dark:text-amber-200 dark:hover:bg-amber-300/20"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Klärung
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-50 max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium leading-snug text-foreground shadow-card"
        >
          {label}
          <Tooltip.Arrow className="fill-surface" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
