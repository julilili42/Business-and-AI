import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/shared/api/client";

const checkResultSchema = z.object({
  name: z.string(),
  status: z.enum(["ok", "warning", "error"]),
  detail: z.string(),
});

export const debugInfoSchema = z.object({
  overall: z.enum(["ok", "warning", "error"]),
  checks: z.array(checkResultSchema),
  llm_provider: z.string(),
  checked_at: z.string(),
});

export type CheckResult = z.infer<typeof checkResultSchema>;
export type DebugInfo = z.infer<typeof debugInfoSchema>;

export function useDebug() {
  return useQuery({
    queryKey: ["debug"],
    queryFn: async () => {
      const data = await apiClient.get<unknown>("/api/debug");
      return debugInfoSchema.parse(data);
    },
    staleTime: 0,
    retry: 1,
  });
}
