import { Pill } from "@/shared/components/ui/pill";

import { Breadcrumb } from "./Breadcrumb";
import { ResetReviewAction } from "./ResetReviewAction";

interface ReviewHeroProps {
  reviewId: string;
  fileName?: string;
  createdAt?: string | null;
}

function SlaIndicator({ createdAt }: { createdAt: string }) {
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const label =
    elapsedHours < 1
      ? `${Math.round(elapsedHours * 60)} Min.`
      : `${elapsedHours.toFixed(1).replace(".", ",")} Std.`;

  const tone =
    elapsedHours < 1
      ? "text-green-600"
      : elapsedHours < 4
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <span className={`text-sm font-medium ${tone}`} title="Reaktionszeit seit Eingang">
      ⏱ {label}
    </span>
  );
}

export function ReviewHero({ reviewId, fileName, createdAt }: ReviewHeroProps) {
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
            {createdAt && <SlaIndicator createdAt={createdAt} />}
          </div>
        </div>

        <div className="w-72 flex-shrink-0">
          <ResetReviewAction reviewId={reviewId} />
        </div>
      </div>
    </header>
  );
}
