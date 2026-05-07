import { useQuery } from "@tanstack/react-query";

import { reviewsApi } from "@/shared/api/reviews";
import { reviewQueryKey } from "@/shared/api/queryKeys";

export { reviewQueryKey };

export function useReview(reviewId: string | undefined) {
  return useQuery({
    queryKey: reviewQueryKey(reviewId ?? ""),
    queryFn: () => reviewsApi.detail(reviewId!),
    enabled: Boolean(reviewId),
    staleTime: 5_000,
  });
}
