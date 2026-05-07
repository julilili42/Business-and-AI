import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";

import type { ReviewSummary } from "../schemas/reviewSummary";
import { ReviewCard } from "./ReviewCard";

const PAGE_SIZE = 15;

interface ReviewListProps {
  reviews: ReviewSummary[];
}

const HEADERS: Array<{ label: string; className: string }> = [
  { label: "Status",  className: "w-36 px-4 py-3 text-left" },
  { label: "Kunde",   className: "w-48 px-4 py-3 text-left" },
  { label: "Betreff", className: "px-4 py-3 text-left" },
  { label: "Datum",   className: "w-28 px-4 py-3 text-right" },
  { label: "Pos.",    className: "w-16 px-4 py-3 text-right" },
  { label: "Match",   className: "w-20 px-4 py-3 text-right" },
  { label: "Betrag",  className: "w-32 px-4 py-3 text-right" },
  { label: "",        className: "w-28 px-4 py-3" },
];

export function ReviewList({ reviews }: ReviewListProps) {
  const [page, setPage] = useState(1);
  const total = reviews.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const items = reviews.slice(start, end);

  if (total === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
        Keine Anfragen entsprechen den aktuellen Filtern.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-sunk">
                {HEADERS.map((h) => (
                  <th
                    key={h.label}
                    className={`${h.className} text-[11px] font-semibold uppercase tracking-wide text-muted-foreground`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <ReviewCard key={r.review_id} review={r} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            {start + 1}–{end} von {total} Anfragen
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Zurück
            </Button>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {safePage} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Weiter
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
