import { useQuery } from "@tanstack/react-query";

import { reviewsApi } from "@/shared/api/reviews";

/**
 * Dashboard list query.
 *
 * Single source of truth — all dashboard sub-components read from the
 * same query so filtering / pagination / insights stay in sync.
 */
export function useReviewSummaries() {
  return useQuery({
    queryKey: ["reviews", "list"],
    queryFn: () => reviewsApi.list(),
    staleTime: 15_000,
  });
}
