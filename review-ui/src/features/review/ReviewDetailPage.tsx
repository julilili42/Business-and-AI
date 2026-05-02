import { useEffect } from "react";
import { Outlet, useParams, useSearchParams } from "react-router-dom";

import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { PageContainer } from "@/shared/components/layout/PageContainer";

import { KpiOverview } from "./components/KpiOverview";
import { PipelineProgress } from "./components/PipelineProgress";
import { ReviewHero } from "./components/ReviewHero";
import { StepIndicator } from "./components/StepIndicator";
import { useReview } from "./hooks/useReview";
import { useReviewStatus } from "./hooks/useReviewStatus";
import { useReviewUiStore } from "./stores/reviewUiStore";

/**
 * Review detail layout.
 *
 * Acts as a composition root for the three steps:
 * - Hero + KPI strip render once at the top
 * - Step indicator below
 * - The active step renders into the <Outlet/>, fed by data from `useReview`
 *
 * If the pipeline is still running we suppress all editor chrome and
 * just show the progress card — same pattern as the Streamlit version.
 */
export function ReviewDetailPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const [searchParams] = useSearchParams();
  const focusMode = searchParams.get("focus") === "1";

  const setActiveReview = useReviewUiStore((s) => s.setActiveReview);

  // Reset per-review UI state whenever we land on a different review.
  useEffect(() => {
    setActiveReview(reviewId ?? null);
    return () => setActiveReview(null);
  }, [reviewId, setActiveReview]);

  const review = useReview(reviewId);
  const status = useReviewStatus(reviewId);

  const isPipelineRunning =
    status.data?.status === "running" || status.data?.status === "failed";

  if (!reviewId) {
    return (
      <PageContainer>
        <ErrorState error="Keine Review-ID angegeben." />
      </PageContainer>
    );
  }

  if (review.isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Lade Review…" />
      </PageContainer>
    );
  }

  if (review.isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Review konnte nicht geladen werden"
          error={review.error}
        />
      </PageContainer>
    );
  }

  const detail = review.data;
  if (!detail) {
    return (
      <PageContainer>
        <ErrorState error="Review-Daten unvollständig." />
      </PageContainer>
    );
  }

  // Vollbild — only meaningful for the approval step. The step itself
  // is responsible for rendering the focus toolbar.
  if (focusMode) {
    return <Outlet context={{ detail, focusMode: true }} />;
  }

  if (isPipelineRunning && status.data) {
    return (
      <PageContainer>
        <ReviewHero reviewId={reviewId} />
        <PipelineProgress progress={status.data} />
      </PageContainer>
    );
  }

  return (
    <PageContainer wide>
      <ReviewHero reviewId={reviewId} />
      <div className="mb-8">
        <KpiOverview
          anfrage={detail.anfrage}
          matches={detail.matches}
          quotation={detail.quotation}
          pdfReady={detail.has_draft_pdf || detail.has_final_pdf}
        />
      </div>
      <div className="mb-8">
        <StepIndicator />
      </div>
      <Outlet context={{ detail, focusMode: false }} />
    </PageContainer>
  );
}

/**
 * Typed Outlet context — every step reads the loaded detail from here
 * via `useOutletContext<ReviewDetailContext>()`.
 */
export interface ReviewDetailContext {
  detail: NonNullable<ReturnType<typeof useReview>["data"]>;
  focusMode: boolean;
}
