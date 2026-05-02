import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface BreadcrumbProps {
  isOutlookReview: boolean;
}

/**
 * Breadcrumb shown at the top of the review-detail page.
 *
 * Outlook flow:    Anfrage › Pipeline › **Review**
 * Direct upload:   Direkter Upload › **Review**
 */
export function Breadcrumb({ isOutlookReview }: BreadcrumbProps) {
  const nodes = isOutlookReview
    ? [
        { label: "Anfrage", active: false },
        { label: "Pipeline", active: false },
        { label: "Review", active: true },
      ]
    : [
        { label: "Direkter Upload", active: false },
        { label: "Review", active: true },
      ];

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
    >
      {nodes.map((node, i) => (
        <div key={node.label} className="flex items-center gap-1.5">
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5",
              node.active
                ? "border-brand/30 bg-brand-soft text-brand-dark"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {node.label}
          </span>
          {i < nodes.length - 1 && (
            <ChevronRight
              className="h-3 w-3 text-muted-foreground/60"
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </nav>
  );
}
