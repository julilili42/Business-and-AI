import { useQuery } from "@tanstack/react-query";

import { reviewsApi } from "@/shared/api/reviews";
import type { PipelineProgress } from "@/shared/schemas/progress";

/**
 * Pipeline progress query.
 *
 * Polls every 1.5s while the pipeline is `running`. Stops polling once
 * the pipeline reaches `completed` or `failed` so we don't hammer the
 * API for finished reviews.
 */
export function useReviewStatus(reviewId: string | undefined) {
  return useQuery<PipelineProgress>({
    queryKey: ["reviews", "status", reviewId],
    queryFn: () => reviewsApi.status(reviewId!),
    enabled: Boolean(reviewId),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "running" ? 1_500 : false;
    },
  });
}
