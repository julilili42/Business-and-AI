import { apiClient } from "./client";
import { metricsSchema, type Metrics } from "@/features/status/schemas/metrics";

export const metricsApi = {
  get: async (): Promise<Metrics> => {
    const data = await apiClient.get<unknown>("/api/metrics");
    return metricsSchema.parse(data);
  },
};
