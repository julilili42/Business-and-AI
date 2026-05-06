import { cn } from "@/shared/lib/cn";

interface MetricTileProps {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
  variant?: "card" | "stat";
}

export function MetricTile({ label, value, hint, className, variant = "card" }: MetricTileProps) {
  if (variant === "stat") {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</div>}
      </div>
    );
  }

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
