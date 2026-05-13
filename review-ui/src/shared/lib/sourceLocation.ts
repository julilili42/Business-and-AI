import type { Evidence } from "@/shared/schemas/anfrage";

export function buildLocationText(ev: Evidence): string {
  const parts: string[] = [];
  if (ev.source_file && ev.source_file !== "mail") parts.push(ev.source_file);
  if (ev.source_page != null) parts.push(`Seite ${ev.source_page}`);
  if (ev.source_row != null) parts.push(`Zeile ${ev.source_row + 1}`);
  return parts.join(" · ");
}
