import { cn } from "@/shared/lib/cn";

/**
 * PageContainer
 *
 * Constrains the main content width and applies consistent vertical
 * rhythm. The dashboard and the review-detail use the same container
 * so transitions between routes don't shift the eye.
 */
export function PageContainer({
  children,
  className,
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 py-8",
        wide ? "max-w-screen-2xl" : "max-w-screen-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
