import { AlertTriangle } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface ErrorStateProps {
  title?: string;
  error: unknown;
  className?: string;
  action?: React.ReactNode;
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unbekannter Fehler.";
}

export function ErrorState({
  title = "Etwas ist schiefgelaufen",
  error,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger",
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="mt-1 text-danger/80">{describe(error)}</div>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
