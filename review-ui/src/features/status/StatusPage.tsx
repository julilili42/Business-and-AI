import { Link } from "react-router-dom";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { MetricTile } from "@/features/dashboard/components/MetricTile";
import { useMetrics } from "./hooks/useMetrics";
import type { Metrics, PerReviewMetric } from "./schemas/metrics";

function fmt(n: number): string {
  return n.toLocaleString("de-DE");
}

function fmtEur(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + " %";
}

const MINUTES_PER_MANUAL_REVIEW = 15;

function OperativeWirkung({ m }: { m: Metrics }) {
  const avgPositions = m.total_reviews > 0 ? m.total_positions / m.total_reviews : 0;
  const hoursSaved = (m.total_reviews * MINUTES_PER_MANUAL_REVIEW) / 60;

  return (
    <section className="mb-8">
      <h2 className="section-label mb-3">Operative Wirkung</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricTile label="Reviews" value={m.total_reviews} hint="Gesamtanzahl Anfragen" />
        <MetricTile label="Ø Positionen" value={avgPositions.toFixed(1)} hint="pro Anfrage" />
        <MetricTile
          label="Ø Match-Quote"
          value={`${Math.round(m.avg_match_rate * 100)} %`}
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

function AggregateMetrics({ m }: { m: Metrics }) {
  return (
    <section className="mb-8">
      <h2 className="section-label mb-4">Pipeline-Übersicht</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricTile label="Angebote gesamt" value={m.total_reviews} />
        <MetricTile
          label="Abgeschlossen"
          value={m.completed_reviews}
          hint={`${m.total_reviews > 0 ? Math.round((m.completed_reviews / m.total_reviews) * 100) : 0} %`}
        />
        <MetricTile
          label="Ø Verarbeitungszeit"
          value={`${m.avg_duration_s} s`}
        />
        <MetricTile
          label="Ø Match-Rate"
          value={fmtPct(m.avg_match_rate)}
        />
        <MetricTile
          label="Gesamtvolumen"
          value={fmtEur(m.total_eur)}
          hint={`${m.total_positions} Positionen`}
        />
      </div>
    </section>
  );
}

function TokenMetrics({ m }: { m: Metrics }) {
  if (m.reviews_with_token_data === 0) return null;

  const avgInput = Math.round(m.total_input_tokens / m.reviews_with_token_data);
  const avgOutput = Math.round(m.total_output_tokens / m.reviews_with_token_data);

  return (
    <section className="mb-8">
      <h2 className="section-label mb-4">Token-Verbrauch</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile
          label="Eingabe-Tokens gesamt"
          value={fmt(m.total_input_tokens)}
          hint={`Ø ${fmt(avgInput)} / Angebot`}
        />
        <MetricTile
          label="Ausgabe-Tokens gesamt"
          value={fmt(m.total_output_tokens)}
          hint={`Ø ${fmt(avgOutput)} / Angebot`}
        />
        <MetricTile
          label="Token gesamt"
          value={fmt(m.total_tokens)}
        />
        <MetricTile
          label="Angebote mit Token-Daten"
          value={m.reviews_with_token_data}
          hint={`von ${m.total_reviews} gesamt`}
        />
      </div>
    </section>
  );
}

function PerReviewTable({ rows }: { rows: PerReviewMetric[] }) {
  const dash = "—";

  return (
    <section>
      <h2 className="section-label mb-4">Details pro Angebot</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left">Betreff</th>
              <th className="px-4 py-3 text-right">Pos.</th>
              <th className="px-4 py-3 text-right">Match-Rate</th>
              <th className="px-4 py-3 text-right">EUR</th>
              <th className="px-4 py-3 text-right">Dauer (s)</th>
              <th className="px-4 py-3 text-right">Eingabe-T</th>
              <th className="px-4 py-3 text-right">Ausgabe-T</th>
              <th className="px-4 py-3 text-right">Gesamt-T</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.review_id}
                className={`border-b border-border last:border-0 transition-colors hover:bg-muted/40 ${
                  i % 2 === 0 ? "" : "bg-muted/10"
                }`}
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/reviews/${r.review_id}/positions`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {r.subject || r.review_id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{r.positions}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtPct(r.match_rate)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtEur(r.total_eur)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.duration_s > 0 ? r.duration_s.toFixed(1) : dash}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {r.token_usage ? fmt(r.token_usage.input_tokens) : dash}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {r.token_usage ? fmt(r.token_usage.output_tokens) : dash}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">
                  {r.token_usage ? fmt(r.token_usage.total_tokens) : dash}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Noch keine abgeschlossenen Angebote vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function StatusPage() {
  const { data, isLoading, isError, error } = useMetrics();

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message={String(error)} />;

  return (
    <PageContainer>
      <header className="mb-8">
        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
          Status & Metriken<span className="text-brand">.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Aggregierte Pipeline-Kennzahlen und Token-Verbrauch aller verarbeiteten Angebote.
        </p>
      </header>

      <OperativeWirkung m={data} />
      <AggregateMetrics m={data} />
      <TokenMetrics m={data} />
      <PerReviewTable rows={data.per_review} />
    </PageContainer>
  );
}
