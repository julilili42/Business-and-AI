import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";

import type { ReviewSummary } from "../schemas/reviewSummary";
import { ReviewCard } from "./ReviewCard";

const PAGE_SIZE = 12;

interface ReviewListProps {
  reviews: ReviewSummary[];
}

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
      <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
        Keine Reviews entsprechen den aktuellen Filtern.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {start + 1}–{end} von {total} Reviews · Seite {safePage} von {pageCount}
      </p>

      <ul className="space-y-2.5">
        {items.map((r) => (
          <li key={r.review_id}>
            <ReviewCard review={r} />
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Zurück
          </Button>
          <span className="text-sm font-semibold text-muted-foreground">
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
      )}
    </div>
  );
}
