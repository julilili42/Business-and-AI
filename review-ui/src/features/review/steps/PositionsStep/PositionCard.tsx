import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/cn";
import type { Position } from "@/shared/schemas/anfrage";
import type { MatchResult } from "@/shared/schemas/matchResult";
import type { ManualOverride, QuotationItem } from "@/shared/schemas/quotation";

import { MatchChip } from "./MatchChip";

interface PositionCardProps {
  position: Position;
  match?: MatchResult;
  quotationItem?: QuotationItem;
  unitPriceOverride?: number;
  onPositionChange: (next: Position) => void;
  onUnitPriceChange: (override: ManualOverride | null) => void;
  onFieldEdit: (fieldPath: string) => void;
  index: number;
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "hoch",
  medium: "mittel",
  low: "gering",
};

/**
 * Editable position panel.
 *
 * Internal state is debounced — we keep a local mirror of the field
 * values so React Hook Form-style "onBlur commits" feel snappy. The
 * commit (`onPositionChange`) is triggered on blur to avoid one mutation
 * per keystroke.
 */
export function PositionCard({
  position,
  match,
  quotationItem,
  unitPriceOverride,
  onPositionChange,
  onUnitPriceChange,
  onFieldEdit,
  index,
}: PositionCardProps) {
  const [draft, setDraft] = useState<Position>(position);
  useEffect(() => setDraft(position), [position]);

  const updateField = <K extends keyof Position>(key: K, value: Position[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const commit = (fieldPath: string) => {
    onFieldEdit(fieldPath);
    if (JSON.stringify(draft) !== JSON.stringify(position)) {
      onPositionChange(draft);
    }
  };

  const initialUnitPrice =
    unitPriceOverride ?? quotationItem?.einzelpreis ?? 0;
  const [unitPriceDraft, setUnitPriceDraft] = useState<number>(initialUnitPrice);
  useEffect(() => setUnitPriceDraft(initialUnitPrice), [initialUnitPrice]);

  const commitUnitPrice = () => {
    if (Math.abs(unitPriceDraft - initialUnitPrice) < 0.005) return;
    onUnitPriceChange({
      target: "pos",
      pos_nr: position.pos_nr,
      mode: "unit_price_eur",
      unit_price_eur: Math.max(0, Number(unitPriceDraft.toFixed(2))),
    });
    onFieldEdit(`positionen[${index}].einzelpreis`);
  };

  const label = `Pos ${position.pos_nr} · ${
    position.artikelnummer || "Unbekannt"
  } · ${Math.round(position.menge)} ${position.einheit}`;

  return (
    <Accordion.Item
      value={`pos-${position.pos_nr}`}
      className="rounded-lg border border-border bg-surface shadow-card transition-colors hover:border-foreground/20"
    >
      <Accordion.Header>
        <Accordion.Trigger
          className={cn(
            "group flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold",
            "data-[state=open]:border-b data-[state=open]:border-border",
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </Accordion.Trigger>
      </Accordion.Header>

      <Accordion.Content className="px-4 pb-4 pt-3 data-[state=closed]:hidden">
        {match && (
          <div className="mb-2">
            <MatchChip match={match} />
          </div>
        )}

        <div className="mb-3 text-xs text-muted-foreground">
          KI-Sicherheit:{" "}
          <span className="font-medium text-foreground">
            {CONFIDENCE_LABEL[position.confidence] ?? position.confidence}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
          <Field label="Artikelnummer">
            <Input
              value={draft.artikelnummer}
              onChange={(e) => updateField("artikelnummer", e.target.value)}
              onBlur={() => commit(`positionen[${index}].artikelnummer`)}
            />
          </Field>

          <Field label="Liefertermin">
            <Input
              value={draft.liefertermin ?? ""}
              onChange={(e) => updateField("liefertermin", e.target.value)}
              onBlur={() => commit(`positionen[${index}].liefertermin`)}
            />
          </Field>

          <Field label="Menge">
            <Input
              type="number"
              step="any"
              value={draft.menge}
              onChange={(e) => updateField("menge", Number(e.target.value))}
              onBlur={() => commit(`positionen[${index}].menge`)}
            />
          </Field>

          <Field label="Werkstoff">
            <Input
              value={draft.werkstoff ?? ""}
              onChange={(e) => updateField("werkstoff", e.target.value)}
              onBlur={() => commit(`positionen[${index}].werkstoff`)}
            />
          </Field>

          <Field label="Einheit">
            <Input
              value={draft.einheit}
              onChange={(e) => updateField("einheit", e.target.value)}
              onBlur={() => commit(`positionen[${index}].einheit`)}
            />
          </Field>

          <Field label="Zeichnungs-Nr.">
            <Input
              value={draft.zeichnungsnummer ?? ""}
              onChange={(e) => updateField("zeichnungsnummer", e.target.value)}
              onBlur={() => commit(`positionen[${index}].zeichnungsnummer`)}
            />
          </Field>

          <Field label="Stückpreis EUR" hint="Manueller Preis-Override">
            <Input
              type="number"
              step="0.01"
              value={unitPriceDraft}
              onChange={(e) => setUnitPriceDraft(Number(e.target.value))}
              onBlur={commitUnitPrice}
            />
          </Field>

          <Field label="Abmessungen">
            <Input
              value={draft.abmessungen ?? ""}
              onChange={(e) => updateField("abmessungen", e.target.value)}
              onBlur={() => commit(`positionen[${index}].abmessungen`)}
            />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Bezeichnung">
            <textarea
              className="flex min-h-[72px] w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={draft.bezeichnung}
              onChange={(e) => updateField("bezeichnung", e.target.value)}
              onBlur={() => commit(`positionen[${index}].bezeichnung`)}
            />
          </Field>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
          <Field label="Lieferzeit">
            <Input
              value={draft.lieferzeit ?? ""}
              onChange={(e) => updateField("lieferzeit", e.target.value)}
              onBlur={() => commit(`positionen[${index}].lieferzeit`)}
              placeholder="z. B. 6 Wochen"
            />
          </Field>

          <Field label="Lieferwerk">
            <Input
              value={draft.lieferwerk ?? ""}
              onChange={(e) => updateField("lieferwerk", e.target.value)}
              onBlur={() => commit(`positionen[${index}].lieferwerk`)}
              placeholder="z. B. Werk Dettingen"
            />
          </Field>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.ist_zertifikat}
            onChange={(e) => {
              updateField("ist_zertifikat", e.target.checked);
              commit(`positionen[${index}].ist_zertifikat`);
              // Force a commit on the next tick — checkbox commits eagerly.
              setTimeout(
                () => onPositionChange({ ...draft, ist_zertifikat: e.target.checked }),
                0,
              );
            }}
            className="h-4 w-4 rounded border-input"
          />
          <span className="font-medium">Zertifikat / Pauschalposition</span>
          <span className="text-xs text-muted-foreground">
            (z. B. Abnahmeprüfzeugnis)
          </span>
        </label>

        {position.source_quote && (
          <p className="mt-3 text-xs text-muted-foreground">
            <span className="font-semibold">Quelle aus der Anfrage:</span>{" "}
            <em>"{position.source_quote.slice(0, 160)}
              {position.source_quote.length > 160 && "…"}"</em>
          </p>
        )}
      </Accordion.Content>
    </Accordion.Item>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {hint && <span className="ml-1 font-normal text-muted-foreground">· {hint}</span>}
      </Label>
      {children}
    </div>
  );
}
