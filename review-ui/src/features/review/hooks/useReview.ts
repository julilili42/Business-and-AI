import { useQuery } from "@tanstack/react-query";

import { reviewsApi } from "@/shared/api/reviews";

export const reviewQueryKey = (reviewId: string) => ["reviews", "detail", reviewId] as const;

export function useReview(reviewId: string | undefined) {
  return useQuery({
    queryKey: reviewQueryKey(reviewId ?? ""),
    queryFn: () => reviewsApi.detail(reviewId!),
    enabled: Boolean(reviewId),
    staleTime: 5_000,
  });
}
