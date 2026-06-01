import type { MatchResult } from "@/shared/schemas/matchResult";
import { cn } from "@/shared/lib/cn";

interface MatchSummaryProps {
  matches: MatchResult[];
}

const ITEMS = [
  {
    status: "exact",
    label: "Exakt",
    tone: "border-success/25 bg-success-soft text-success",
  },
  {
    status: "fuzzy",
    label: "Fuzzy",
    tone: "border-ek-blue/25 bg-ek-blue-soft text-ek-blue",
  },
  {
    status: "semantic",
    label: "Beschreibung",
    tone: "border-warning/25 bg-warning-soft text-warning",
  },
  {
    status: "no_match",
    label: "Kein Treffer",
    tone: "border-danger/25 bg-danger-soft text-danger",
  },
] as const;

export function MatchSummary({ matches }: MatchSummaryProps) {
  if (matches.length === 0) return null;

  const counts: Record<string, number> = {
    exact: 0,
    fuzzy: 0,
    semantic: 0,
    no_match: 0,
  };
  for (const m of matches) counts[m.status] = (counts[m.status] ?? 0) + 1;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      aria-label="Match-Verteilung"
    >
      {ITEMS.map((item) => {
        const count = counts[item.status];
        return (
          <span
            key={item.status}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold",
              count > 0
                ? item.tone
                : "border-border bg-muted/35 text-muted-foreground/70",
            )}
          >
            <span className="font-bold tabular-nums">{count}</span>
            <span>{item.label}</span>
          </span>
        );
      })}
    </div>
  );
}
