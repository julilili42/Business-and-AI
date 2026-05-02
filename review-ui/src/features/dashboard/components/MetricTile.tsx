import { cn } from "@/shared/lib/cn";

interface MetricTileProps {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}

export function MetricTile({ label, value, hint, className }: MetricTileProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface px-5 py-4 shadow-card transition-colors hover:border-foreground/20",
        className,
      )}
    >
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-extrabold tracking-tight">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
