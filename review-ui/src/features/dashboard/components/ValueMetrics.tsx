import {
  matchedCount,
  type ReviewSummary,
} from "../schemas/reviewSummary";

const MINUTES_PER_MANUAL_REVIEW = 15;

interface ValueMetricsProps {
  reviews: ReviewSummary[];
}

function StatCell({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}

export function ValueMetrics({ reviews }: ValueMetricsProps) {
  const total = reviews.length;
  const totalPositions = reviews.reduce((sum, r) => sum + r.positions, 0);
  const avgPositions = total > 0 ? totalPositions / total : 0;
  const totalMatched = reviews.reduce((sum, r) => sum + matchedCount(r), 0);
  const avgMatchRate = totalPositions > 0 ? totalMatched / totalPositions : 0;
  const hoursSaved = (total * MINUTES_PER_MANUAL_REVIEW) / 60;

  return (
    <section aria-label="Operative Wirkung">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
        <StatCell label="Reviews" value={total} hint="Anfragen gesamt" />
        <StatCell label="Ø Positionen" value={avgPositions.toFixed(1)} hint="pro Anfrage" />
        <StatCell
          label="Ø Match-Quote"
          value={`${Math.round(avgMatchRate * 100)} %`}
          hint="Stammdaten-Treffer"
        />
        <StatCell
          label="Zeitersparnis"
          value={`${hoursSaved.toFixed(1)} h`}
          hint={`~${MINUTES_PER_MANUAL_REVIEW} min / Anfrage`}
        />
      </div>
    </section>
  );
}
