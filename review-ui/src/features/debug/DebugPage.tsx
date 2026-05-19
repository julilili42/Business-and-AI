import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wifi,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { cn } from "@/shared/lib/cn";
import {
  type CheckResult,
  type LlmProbeResult,
  type PipelineFailure,
  type StammdatenQuality,
  useDebug,
  useLlmProbe,
} from "./useDebug";

const STATUS_CONFIG = {
  ok: {
    icon: CheckCircle2,
    iconClass: "text-success",
    badgeClass: "bg-success-soft text-success",
    badgeLabel: "OK",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-warning",
    badgeClass: "bg-warning-soft text-warning",
    badgeLabel: "Warnung",
  },
  error: {
    icon: XCircle,
    iconClass: "text-danger",
    badgeClass: "bg-danger-soft text-danger",
    badgeLabel: "Fehler",
  },
} as const;

const NUMBER_FORMAT = new Intl.NumberFormat("de-DE");

function formatDebugDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace("T", " ");
  return date.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

function isLlmCheck(check: CheckResult): boolean {
  return check.name.startsWith("LLM") || check.name === ".env Datei";
}

function isStammdatenCheck(check: CheckResult): boolean {
  return check.name === "stammdaten.csv";
}

function SectionHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 border-b border-border pb-3">
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {trailing}
    </div>
  );
}

function CheckCard({ check }: { check: CheckResult }) {
  const cfg = STATUS_CONFIG[check.status];
  const Icon = cfg.icon;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", cfg.iconClass)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-snug">{check.name}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", cfg.badgeClass)}>
          {cfg.badgeLabel}
        </span>
      </div>
      <p className="text-sm text-muted-foreground break-all leading-relaxed pl-8">{check.detail}</p>
    </div>
  );
}

function CheckGrid({ checks }: { checks: CheckResult[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {checks.map((c) => (
        <CheckCard key={c.name} check={c} />
      ))}
    </div>
  );
}

function StatusPill({ status, label }: { status: "ok" | "warning" | "error"; label: string }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("mb-1 w-fit shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", cfg.badgeClass)}>
      {label}
    </span>
  );
}

function PipelineTable({ failures, total }: { failures: PipelineFailure[]; total: number }) {
  if (failures.length === 0) {
    return (
      <div className="rounded-xl border border-success/20 bg-success-soft px-5 py-4 text-sm font-semibold text-success">
        Keine fehlgeschlagenen Pipeline-Läufe gefunden.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Schritt
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Betreff / Fehler
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">
              Absender
            </th>
            <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">
              %
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">
              Aktualisiert
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {failures.map((failure) => (
            <tr key={failure.review_id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 align-top">
                <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger whitespace-nowrap">
                  {failure.current_step}
                </span>
              </td>
              <td className="px-4 py-3 align-top">
                <p className="max-w-xs truncate font-medium text-foreground">{failure.subject}</p>
                <p className="mt-0.5 max-w-xs truncate font-mono text-[11px] text-muted-foreground">
                  {failure.error}
                </p>
              </td>
              <td className="hidden px-4 py-3 align-top sm:table-cell">
                <p className="max-w-[180px] truncate text-xs text-muted-foreground">
                  {failure.sender ?? "—"}
                </p>
              </td>
              <td className="hidden px-4 py-3 text-right align-top md:table-cell">
                <span className="text-xs font-semibold text-foreground">{failure.progress_percent}%</span>
              </td>
              <td className="hidden px-4 py-3 align-top lg:table-cell">
                <span className="text-xs text-muted-foreground">{formatDebugDate(failure.updated_at)}</span>
              </td>
              <td className="px-4 py-3 text-right align-top">
                <Link
                  to={`/reviews/${encodeURIComponent(failure.review_id)}`}
                  className="rounded border border-border px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Öffnen
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {total > failures.length && (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Zeigt {failures.length} von {formatNumber(total)} fehlgeschlagenen Läufen.
        </p>
      )}
    </div>
  );
}

function LlmProbeCard({ result }: { result: LlmProbeResult }) {
  const cfg = STATUS_CONFIG[result.status];
  const Icon = cfg.icon;

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", cfg.iconClass)} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">LLM-Verbindungstest</p>
            <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", cfg.badgeClass)}>
              {cfg.badgeLabel}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{result.detail}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provider</dt>
          <dd className="mt-1 font-mono font-semibold text-foreground">{result.provider}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modell</dt>
          <dd className="mt-1 break-all font-mono font-semibold text-foreground">{result.model}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latenz</dt>
          <dd className="mt-1 font-semibold text-foreground">{result.latency_ms} ms</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zeitpunkt</dt>
          <dd className="mt-1 font-semibold text-foreground">{formatDebugDate(result.checked_at)}</dd>
        </div>
      </dl>

      {result.error_type && (
        <p className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 font-mono text-xs leading-relaxed text-danger">
          {result.error_type}: {result.detail}
        </p>
      )}

      {result.response_preview && (
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-border bg-muted p-3 text-xs leading-relaxed text-foreground">
          {result.response_preview}
        </pre>
      )}

      {result.usage && (
        <p className="mt-3 text-xs text-muted-foreground">
          Tokens: {result.usage.input_tokens} Input · {result.usage.output_tokens} Output · {result.usage.total_tokens} Gesamt
        </p>
      )}
    </div>
  );
}

function QualityMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "ok" | "warning" | "error";
}) {
  const toneClass = {
    neutral: "border-border bg-surface text-foreground",
    ok: "border-success/20 bg-success-soft text-success",
    warning: "border-warning/20 bg-warning-soft text-warning",
    error: "border-danger/20 bg-danger-soft text-danger",
  }[tone];

  return (
    <div className={cn("rounded-xl border p-4 shadow-card", toneClass)}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-extrabold leading-none">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
    </div>
  );
}

function StammdatenQualityBlock({ quality }: { quality: StammdatenQuality | null }) {
  if (!quality) {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger-soft px-5 py-4 text-sm font-semibold text-danger">
        stammdaten.csv konnte nicht gelesen werden.
      </div>
    );
  }

  const hardIssues =
    quality.duplicate_article_numbers +
    quality.missing_article_numbers +
    quality.missing_descriptions +
    quality.zero_or_missing_prices +
    quality.invalid_price_ranges;

  return (
    <>
      <p className="mb-4 text-xs text-muted-foreground">
        {quality.path} · {quality.file_size_kb} KB · geändert {formatDebugDate(quality.last_modified)}
      </p>

      <div className="mb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Auffälligkeiten
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <QualityMetric label="Duplikate"             value={quality.duplicate_article_numbers} tone={quality.duplicate_article_numbers ? "warning" : "ok"} />
          <QualityMetric label="Artikelnummer fehlt"   value={quality.missing_article_numbers}   tone={quality.missing_article_numbers   ? "error"   : "ok"} />
          <QualityMetric label="Bezeichnung fehlt"     value={quality.missing_descriptions}      tone={quality.missing_descriptions      ? "error"   : "ok"} />
          <QualityMetric label="Preis 0/leer"          value={quality.zero_or_missing_prices}    tone={quality.zero_or_missing_prices    ? "warning" : "ok"} />
          <QualityMetric label="Preisbereich ungültig" value={quality.invalid_price_ranges}      tone={quality.invalid_price_ranges      ? "warning" : "ok"} />
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Statistiken
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <QualityMetric label="Artikel gesamt"     value={quality.total_rows}            tone="neutral" />
          <QualityMetric label="Nur 1 Angebot"      value={quality.single_offer_articles} tone="neutral" />
          <QualityMetric label="Abmessungen fehlen" value={quality.missing_dimensions}    tone="neutral" />
        </div>
      </div>

      {(quality.sample_duplicate_articles.length > 0 || quality.sample_zero_price_articles.length > 0) && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {quality.sample_duplicate_articles.length > 0 && (
            <div className="rounded-xl border border-warning/20 bg-surface p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Beispiel-Duplikate</p>
              <p className="mt-2 break-all font-mono text-sm text-foreground">
                {quality.sample_duplicate_articles.join(", ")}
              </p>
            </div>
          )}
          {quality.sample_zero_price_articles.length > 0 && (
            <div className="rounded-xl border border-warning/20 bg-surface p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Beispiele Preis 0/leer</p>
              <p className="mt-2 break-all font-mono text-sm text-foreground">
                {quality.sample_zero_price_articles.join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      {(hardIssues > 0) && (
        <p className="mt-4 text-xs font-semibold text-warning">
          {formatNumber(hardIssues)} prüfungsrelevante Auffälligkeiten gesamt.
        </p>
      )}
    </>
  );
}

export function DebugPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDebug();
  const llmProbe = useLlmProbe();

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState error={error} />;

  const llmChecks = data.checks.filter(isLlmCheck);
  const stammdatenChecks = data.checks.filter(isStammdatenCheck);
  const otherChecks = data.checks.filter((c) => !isLlmCheck(c) && !isStammdatenCheck(c));

  const pipelineHasFailures = data.pipeline_failures.total_failed > 0;
  const stammdatenHardIssues = data.stammdaten_quality
    ? data.stammdaten_quality.duplicate_article_numbers +
      data.stammdaten_quality.missing_article_numbers +
      data.stammdaten_quality.missing_descriptions +
      data.stammdaten_quality.zero_or_missing_prices +
      data.stammdaten_quality.invalid_price_ranges
    : null;

  return (
    <PageContainer>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            System-Diagnose<span className="text-brand">.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Systemzustand, Pipeline-Fehler und Konfigurationschecks auf einen Blick.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-1 flex shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-muted-foreground shadow-card transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden />
          Aktualisieren
        </button>
      </header>

      <section className="mb-10">
        <SectionHeader
          title="Pipeline-Fehler"
          subtitle="Fehlgeschlagene Review-Läufe aus den lokalen Fortschrittsdateien."
          trailing={
            <StatusPill
              status={pipelineHasFailures ? "warning" : "ok"}
              label={
                pipelineHasFailures
                  ? `${formatNumber(data.pipeline_failures.total_failed)} Fehler`
                  : "Keine Fehler"
              }
            />
          }
        />
        <PipelineTable
          failures={data.pipeline_failures.recent}
          total={data.pipeline_failures.total_failed}
        />
      </section>

      <section className="mb-10">
        <SectionHeader
          title="LLM Provider"
          subtitle={`Aktuell: ${data.llm_provider}. Erreichbarkeit per manuellem Probe-Aufruf prüfen.`}
          trailing={
            <button
              onClick={() => llmProbe.mutate()}
              disabled={llmProbe.isPending}
              className="mb-1 flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-card transition-colors hover:bg-muted disabled:opacity-50"
            >
              {llmProbe.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Wifi className="h-4 w-4" aria-hidden />
              )}
              Provider testen
            </button>
          }
        />

        {llmProbe.isError && (
          <p className="mb-4 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
            Debug-Endpoint nicht erreichbar: {llmProbe.error instanceof Error ? llmProbe.error.message : "Unbekannter Fehler"}
          </p>
        )}

        {llmProbe.data && <LlmProbeCard result={llmProbe.data} />}

        {llmChecks.length > 0 && (
          <div className="mt-4">
            <CheckGrid checks={llmChecks} />
          </div>
        )}
      </section>

      <section className="mb-10">
        <SectionHeader
          title="Stammdaten-Qualität"
          subtitle="Datenqualität der lokalen Artikelstammdaten."
          trailing={
            stammdatenHardIssues !== null ? (
              <StatusPill
                status={stammdatenHardIssues > 0 ? "warning" : "ok"}
                label={
                  stammdatenHardIssues > 0
                    ? `${formatNumber(stammdatenHardIssues)} Auffälligkeiten`
                    : "Keine Auffälligkeiten"
                }
              />
            ) : (
              <StatusPill status="error" label="Datei fehlt" />
            )
          }
        />
        <StammdatenQualityBlock quality={data.stammdaten_quality} />

        {stammdatenChecks.length > 0 && (
          <div className="mt-6">
            <CheckGrid checks={stammdatenChecks} />
          </div>
        )}
      </section>

      {otherChecks.length > 0 && (
        <section>
          <SectionHeader title="Sonstige Checks" subtitle="Speicher, Verzeichnisse und Konfiguration." />
          <CheckGrid checks={otherChecks} />
        </section>
      )}
    </PageContainer>
  );
}
