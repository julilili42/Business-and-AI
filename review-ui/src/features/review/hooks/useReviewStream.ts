import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { reviewQueryKey } from "@/shared/api/queryKeys";
import { env } from "@/shared/lib/env";
import type { PipelineProgress } from "@/shared/schemas/progress";

const RECONNECT_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 10_000];

/**
 * Subscribe to the SSE stream of a review's pipeline events.
 *
 * - `progress` frames write directly into the `useReviewStatus` cache.
 * - `extracted` / `matched` / `priced` / `done` invalidate the review
 *   detail query so the next render shows the freshly persisted data.
 * - On connection drop the hook reconnects with exponential backoff. The
 *   server replays the current DB snapshot on every new connection, so
 *   no events are lost across a reconnect.
 */
export function useReviewStream(reviewId: string | undefined) {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!reviewId) return;
    stoppedRef.current = false;

    const invalidateDetail = () =>
      qc.invalidateQueries({ queryKey: reviewQueryKey(reviewId) });

    const connect = () => {
      if (stoppedRef.current) return;
      const url = `${env.apiBaseUrl}/api/reviews/${reviewId}/events`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("open", () => {
        attemptRef.current = 0;
      });

      es.addEventListener("progress", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as PipelineProgress;
          qc.setQueryData(["reviews", "status", reviewId], data);
        } catch {
          /* malformed frame — skip */
        }
      });

      es.addEventListener("extracted", invalidateDetail);
      es.addEventListener("matched", invalidateDetail);
      es.addEventListener("priced", invalidateDetail);

      es.addEventListener("done", () => {
        invalidateDetail();
        stoppedRef.current = true;
        es.close();
      });

      es.onerror = () => {
        if (es.readyState !== EventSource.CLOSED) return;
        if (stoppedRef.current) return;
        const delay =
          RECONNECT_BACKOFF_MS[
            Math.min(attemptRef.current, RECONNECT_BACKOFF_MS.length - 1)
          ];
        attemptRef.current += 1;
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          connect();
        }, delay);
      };
    };

    connect();

    return () => {
      stoppedRef.current = true;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      esRef.current?.close();
      esRef.current = null;
    };
  }, [reviewId, qc]);
}
