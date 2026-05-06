import { useQuery } from "@tanstack/react-query";
import { metricsApi } from "@/shared/api/metrics";

export function useMetrics() {
  return useQuery({
    queryKey: ["metrics"],
    queryFn: () => metricsApi.get(),
    staleTime: 30_000,
  });
}
