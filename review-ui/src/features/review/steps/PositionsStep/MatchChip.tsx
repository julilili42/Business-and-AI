import type { MatchResult, MatchStatus } from "@/shared/schemas/matchResult";
import { cn } from "@/shared/lib/cn";

const STATUS_LABEL: Record<MatchStatus, string> = {
  exact: "Exakt",
  fuzzy: "Fuzzy",
  semantic: "Semantisch",
  no_match: "Kein Treffer",
};

const STATUS_TONE: Record<MatchStatus, string> = {
  exact: "border-success/30 bg-success-soft text-success",
  fuzzy: "border-info/30 bg-info-soft text-info",
  semantic: "border-info/30 bg-info-soft text-info",
  no_match: "border-warning/30 bg-warning-soft text-warning",
};

export function MatchChip({ match }: { match: MatchResult }) {
  const tone = STATUS_TONE[match.status];
  const score =
    match.status !== "no_match" && match.score
      ? `${Math.round(match.score * 100)}%`
      : null;

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px]",
        tone,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      <span className="font-semibold">{STATUS_LABEL[match.status]}</span>
      <span className="opacity-70">
        {match.status === "no_match" ? (
          "kein Stammdaten-Treffer"
        ) : (
          <>
            {match.matched_artikelnr && (
              <code className="rounded bg-foreground/10 px-1 py-px font-mono text-[10.5px]">
                {match.matched_artikelnr}
              </code>
            )}
            {score && <span className="ml-1.5">Score {score}</span>}
            {match.matched_bezeichnung && (
              <span className="ml-1.5">
                · {match.matched_bezeichnung.slice(0, 60)}
              </span>
            )}
          </>
        )}
      </span>
    </div>
  );
}
