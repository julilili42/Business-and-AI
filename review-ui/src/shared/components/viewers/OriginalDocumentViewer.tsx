import { env } from "@/shared/lib/env";
import { cn } from "@/shared/lib/cn";

import { MailBodyViewer } from "./MailBodyViewer";
import type { MailMeta } from "@/shared/api/reviews";

interface OriginalDocumentViewerProps {
  reviewId: string;
  mail: MailMeta;
  /** First attachment filename, if any — drives the renderer choice. */
  attachmentName?: string;
  className?: string;
}

/**
 * Decide-and-render adapter for the "original" pane.
 *
 * - PDF / images → iframe pointing at `/api/reviews/{id}/original`.
 * - Mail without attachment → `MailBodyViewer`.
 * - Other formats (CSV / XLSX) → server-streamed iframe; the browser
 *   either renders inline or offers download. A richer table preview
 *   can come later but isn't on the critical path.
 */
export function OriginalDocumentViewer({
  reviewId,
  mail,
  attachmentName,
  className,
}: OriginalDocumentViewerProps) {
  const hasAttachment = Boolean(attachmentName);
  const suffix = (attachmentName ?? "").toLowerCase().split(".").pop();

  if (!hasAttachment) {
    return <MailBodyViewer mail={mail} className={className} />;
  }

  const originalSrc = `${env.apiBaseUrl}/api/reviews/${encodeURIComponent(reviewId)}/original?v=${Date.now()}`;
  const isInlineRenderable = suffix === "pdf" || suffix === "png" || suffix === "jpg" || suffix === "jpeg";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted px-4 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Original · {attachmentName}
        </span>
        <a
          href={originalSrc}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Download
        </a>
      </div>

      {isInlineRenderable ? (
        <iframe
          src={originalSrc}
          title={`Original · ${attachmentName}`}
          className="block min-h-[700px] w-full flex-1 border-0 bg-surface"
          loading="lazy"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-12 text-center text-sm text-muted-foreground">
          Vorschau für <code className="mx-1">{suffix?.toUpperCase()}</code>{" "}
          nicht inline verfügbar — bitte herunterladen.
        </div>
      )}
    </div>
  );
}
