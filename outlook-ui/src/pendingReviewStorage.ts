import type { PendingReview } from "./types";

const STORAGE_KEY = "quoting.pendingReview.v1";

export function loadPendingReview(): PendingReview | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PendingReview;

    if (!parsed?.review?.review_id || !parsed?.review?.draft_pdf_url) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function savePendingReview(pendingReview: PendingReview): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingReview));
  } catch {
    /* Quota exceeded or storage disabled — workflow still works in-memory. */
  }
}

export function clearPendingReview(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}