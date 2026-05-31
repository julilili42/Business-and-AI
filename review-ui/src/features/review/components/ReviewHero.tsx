import { Pill } from "@/shared/components/ui/pill";
import { ThemeToggle } from "@/shared/components/ui/ThemeToggle";

import { Breadcrumb } from "./Breadcrumb";
import { ResetReviewAction } from "./ResetReviewAction";

interface ReviewHeroProps {
  reviewId: string;
  fileName?: string;
  createdAt?: string | null;
  isApproved?: boolean;
  approvedAt?: string | null;
}

export function ReviewHero({
  reviewId,
  fileName,
  createdAt,
  isApproved = false,
  approvedAt = null,
}: ReviewHeroProps) {
  const isOutlookReview = reviewId.length === 12;

  return (
    <header className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <Breadcrumb
          isOutlookReview={isOutlookReview}
          reviewId={reviewId}
          createdAt={createdAt}
          isApproved={isApproved}
          approvedAt={approvedAt}
        />
        <div
          role="group"
          aria-label="Review-Aktionen"
          className="inline-flex items-center lg:rounded-md lg:border lg:border-border lg:bg-surface lg:p-0.5 lg:shadow-sm"
        >
          <ResetReviewAction reviewId={reviewId} />
          <div className="ml-0.5 hidden border-l border-border pl-0.5 lg:block">
            <ThemeToggle iconOnly className="h-8 w-8" />
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
          Angebots-Review<span className="text-brand">.</span>
        </h1>

        {fileName && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Pill tone="neutral">{fileName}</Pill>
          </div>
        )}
      </div>
    </header>
  );
}
