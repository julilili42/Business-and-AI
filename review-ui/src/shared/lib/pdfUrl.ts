import { env } from "./env";

/**
 * Build PDF URLs the iframe should load.
 *
 * Mirrors the backend's three endpoints (`pdf`, `pdf/draft`, `pdf/final`)
 * and appends a millisecond timestamp so a freshly-rebuilt PDF always
 * replaces the cached one in the browser. Critical: without cache busting
 * Chromium reuses the previous render across the draft/final tabs.
 */
type PdfKind = "current" | "draft" | "final";

export function pdfUrl(reviewId: string, kind: PdfKind = "current", buster?: string | number): string {
  const id = encodeURIComponent(reviewId);
  const path =
    kind === "draft"
      ? `/api/reviews/${id}/pdf/draft`
      : kind === "final"
        ? `/api/reviews/${id}/pdf/final`
        : `/api/reviews/${id}/pdf`;
  const v = buster ?? Date.now();
  return `${env.apiBaseUrl}${path}?v=${v}`;
}

/** Original input file (PDF/EML/CSV/etc.) attached to a review. */
export function originalUrl(reviewId: string): string {
  return `${env.apiBaseUrl}/api/reviews/${encodeURIComponent(reviewId)}/original`;
}
