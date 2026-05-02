import { Pill } from "@/shared/components/ui/pill";

import { Breadcrumb } from "./Breadcrumb";
import { ResetReviewAction } from "./ResetReviewAction";

interface ReviewHeroProps {
  reviewId: string;
  fileName?: string;
}

export function ReviewHero({ reviewId, fileName }: ReviewHeroProps) {
  // Heuristic: anything not coming via the Outlook flow lacks
  // a real review-id format with the 12-hex-char convention.
  // For now we just check length; tighten later if the heuristic
  // ever becomes wrong.
  const isOutlookReview = reviewId.length === 12;

  return (
    <header className="mb-8">
      <Breadcrumb isOutlookReview={isOutlookReview} />

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Angebots-Review<span className="text-brand">.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            KI-extrahierte Anfrage prüfen, Stammdaten-Treffer validieren und ein
            verkaufsfertiges Angebot erstellen.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Pill tone={isOutlookReview ? "success" : "brand"} withDot>
              {isOutlookReview ? "Review" : "Direkter Upload"}{" "}
              <code className="ml-1 font-mono text-[11px]">{reviewId}</code>
            </Pill>
            {fileName && <Pill tone="neutral">{fileName}</Pill>}
          </div>
        </div>

        <div className="w-72 flex-shrink-0">
          <ResetReviewAction reviewId={reviewId} />
        </div>
      </div>
    </header>
  );
}
