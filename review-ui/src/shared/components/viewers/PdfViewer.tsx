import { cn } from "@/shared/lib/cn";
import { pdfUrl } from "@/shared/lib/pdfUrl";

type PdfKind = "draft" | "final" | "current";

interface PdfViewerProps {
  reviewId: string;
  kind?: PdfKind;
  /**
   * Cache-buster value. Pass a stable value (e.g. `updated_at` from the
   * detail query) so the iframe doesn't refresh on every render — but
   * does refresh whenever the underlying PDF actually changes.
   */
  cacheBuster?: string | number;
  className?: string;
}

/**
 * PDF preview pane.
 *
 * Uses an `<iframe>` pointing at the FastAPI streaming endpoint instead
 * of a base64 data URL. Two reasons (preserved from the Streamlit
 * implementation):
 *
 * 1. The data-URL approach pushes multi-MB strings into the React tree
 *    and can be slow.
 * 2. Browsers de-duplicate identical data URLs across iframes, which
 *    causes the draft and final tabs to render the *same* PDF after
 *    approval. Distinct API URLs sidestep that entirely.
 */
export function PdfViewer({
  reviewId,
  kind = "current",
  cacheBuster,
  className,
}: PdfViewerProps) {
  const src = pdfUrl(reviewId, kind, cacheBuster);

  const titles: Record<PdfKind, string> = {
    draft: "Angebotsentwurf",
    final: "Finales Angebot",
    current: "Angebot",
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card",
        className,
      )}
    >
      <div className="border-b border-border bg-muted px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {titles[kind]}
      </div>
      <iframe
        src={src}
        title={titles[kind]}
        className="block min-h-[700px] w-full flex-1 border-0 bg-surface"
        loading="lazy"
      />
    </div>
  );
}
