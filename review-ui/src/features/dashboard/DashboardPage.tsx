import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { UploadDropzone } from "@/features/upload/UploadDropzone";

import { DashboardHero } from "./components/DashboardHero";
import { ReviewFilters, type StatusFilter } from "./components/ReviewFilters";
import { ReviewList } from "./components/ReviewList";
import { ValueMetrics } from "./components/ValueMetrics";
import { useReviewSummaries } from "./hooks/useReviewSummaries";

export function DashboardPage() {
  const { data: reviews, isLoading, isError, error } = useReviewSummaries();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!reviews) return [];
    const q = query.trim().toLowerCase();
    return reviews.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return (
        r.subject.toLowerCase().includes(q) ||
        r.sender.toLowerCase().includes(q)
      );
    });
  }, [reviews, status, query]);

  return (
    <PageContainer>
      <DashboardHero />

      <section className="mb-8">
        <UploadDropzone />
      </section>

      {isLoading && <LoadingState label="Lade Reviews…" />}

      {isError && <ErrorState error={error} />}

      {!isLoading && !isError && reviews && reviews.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="Noch keine Reviews vorhanden"
          description="Sobald aus Outlook eine Anfrage an die Review-API gesendet wird, erscheint sie hier. Alternativ einfach eine Datei oben ablegen."
        />
      )}

      {!isLoading && !isError && reviews && reviews.length > 0 && (
        <div className="space-y-8">
          <ValueMetrics reviews={reviews} />

          <section>
            <div className="section-label mb-3">Reviews</div>
            <div className="mb-4">
              <ReviewFilters
                status={status}
                query={query}
                onStatusChange={setStatus}
                onQueryChange={setQuery}
              />
            </div>
            <ReviewList reviews={filtered} />
          </section>
        </div>
      )}
    </PageContainer>
  );
}
