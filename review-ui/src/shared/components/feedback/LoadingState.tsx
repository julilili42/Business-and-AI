import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Lade…", className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
