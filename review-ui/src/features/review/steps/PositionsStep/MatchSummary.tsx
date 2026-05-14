import type { MatchResult } from "@/shared/schemas/matchResult";

interface MatchSummaryProps {
  matches: MatchResult[];
}

const ITEMS = [
  { status: "exact", label: "Exakt", color: "text-success" },
  { status: "fuzzy", label: "Fuzzy", color: "text-ek-blue" },
  { status: "semantic", label: "Beschreibung", color: "text-warning" },
  { status: "no_match", label: "Kein Treffer", color: "text-brand" },
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
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
      aria-label="Match-Verteilung"
    >
      {ITEMS.map((item) => (
        <span key={item.status} className="inline-flex items-center gap-1.5">
          <span className={`font-bold tabular-nums ${item.color}`}>
            {counts[item.status]}
          </span>
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}
