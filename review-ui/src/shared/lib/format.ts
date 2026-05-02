/**
 * German-locale formatting helpers.
 *
 * The Streamlit UI uses a custom `format_eur_de`/`format_qty` pair that
 * converts numbers like 1234.5 into `1.234,50`. We mirror that exactly
 * with `Intl.NumberFormat` so the React UI looks identical.
 */

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const qtyFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 3,
});

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatEur(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return eurFormatter.format(value);
}

export function formatQty(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (Number.isInteger(value)) return value.toString();
  return qtyFormatter.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}
