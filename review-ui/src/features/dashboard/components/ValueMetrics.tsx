import {
  matchedCount,
  type ReviewSummary,
} from "../schemas/reviewSummary";
import { MetricTile } from "./MetricTile";

const MINUTES_PER_MANUAL_REVIEW = 15;

interface ValueMetricsProps {
  reviews: ReviewSummary[];
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
      <div className="section-label mb-3">Operative Wirkung</div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricTile
          label="Reviews"
          value={total}
          hint="Gesamtanzahl Anfragen"
        />
        <MetricTile
          label="Ø Positionen"
          value={avgPositions.toFixed(1)}
          hint="pro Anfrage"
        />
        <MetricTile
          label="Ø Match-Quote"
          value={`${Math.round(avgMatchRate * 100)}%`}
          hint="Stammdaten-Treffer"
        />
        <MetricTile
          label="Zeitersparnis"
          value={`${hoursSaved.toFixed(1)} h`}
          hint={`~${MINUTES_PER_MANUAL_REVIEW} min/Anfrage manuell`}
        />
      </div>
    </section>
  );
}
