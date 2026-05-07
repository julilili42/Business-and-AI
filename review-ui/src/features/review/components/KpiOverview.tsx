import { MetricTile } from "@/features/dashboard/components/MetricTile";
import type { Anfrage } from "@/shared/schemas/anfrage";
import type { MatchResult } from "@/shared/schemas/matchResult";
import type { Quotation } from "@/shared/schemas/quotation";
import { formatEur } from "@/shared/lib/format";

interface KpiOverviewProps {
  anfrage: Anfrage;
  matches: MatchResult[];
  quotation: Quotation | null;
  pdfReady: boolean;
}

export function KpiOverview({
  anfrage,
  matches,
  quotation,
  pdfReady,
}: KpiOverviewProps) {
  const totalPositions = anfrage.positionen.length;
  const matched = matches.filter((m) => m.status !== "no_match").length;
  const matchRate = totalPositions > 0 ? matched / totalPositions : 0;

  const totalMarginEur = quotation
    ? quotation.items.reduce((sum, it) => sum + (it.margin_eur ?? 0), 0)
    : null;
  const marginPct =
    totalMarginEur != null && quotation && quotation.gesamtsumme > 0
      ? (totalMarginEur / quotation.gesamtsumme) * 100
      : null;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      <MetricTile label="Positionen" value={totalPositions} />
      <MetricTile label="Match-Quote" value={`${Math.round(matchRate * 100)}%`} />
      <MetricTile
        label="Angebotssumme"
        value={quotation ? formatEur(quotation.gesamtsumme) : "—"}
      />
      <MetricTile
        label="Marge"
        value={totalMarginEur != null ? formatEur(totalMarginEur) : "—"}
        hint={marginPct != null ? `${marginPct.toFixed(1)} % auf Gesamtsumme` : undefined}
      />
      <MetricTile label="PDF" value={pdfReady ? "Bereit" : "Offen"} />
    </div>
  );
}
