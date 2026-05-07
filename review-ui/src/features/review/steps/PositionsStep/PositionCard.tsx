import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, Replace, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { FormField } from "@/shared/components/ui/FormField";
import { Input } from "@/shared/components/ui/input";
import { SourceBadge } from "@/shared/components/ui/SourceBadge";
import { cn } from "@/shared/lib/cn";
import type { Evidence, Position } from "@/shared/schemas/anfrage";
import type { MatchResult } from "@/shared/schemas/matchResult";
import type { ManualOverride, QuotationItem } from "@/shared/schemas/quotation";
import type { StammdatenRow } from "@/shared/schemas/stammdaten";

import { MatchChip } from "./MatchChip";
import { StammdatenSearchDialog } from "./StammdatenSearchDialog";

interface PositionCardProps {
  reviewId: string;
  position: Position;
  match?: MatchResult;
  quotationItem?: QuotationItem;
  unitPriceOverride?: number;
  /** Auto-open the accordion on mount — used right after "add position". */
  defaultOpen?: boolean;
  onPositionChange: (next: Position) => void;
  onUnitPriceChange: (override: ManualOverride | null) => void;
  onFieldEdit: (fieldPath: string) => void;
  onDelete: () => void;
  onEvidenceSelect?: (ev: Evidence) => void;
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
 * The card keeps its own draft state for every text field so React's
 * controlled-input model doesn't fight the user's typing. We commit on
 * `onBlur` to keep PDF rebuilds from firing per keystroke.
 *
 * Two destructive actions live on this card:
 *
 * - **Anderen Artikel zuordnen** opens the Stammdaten search dialog,
 *   which writes a manual match server-side. The card itself doesn't
 *   know about the mutation — the dialog handles it.
 * - **Position löschen** uses inline two-step confirmation. We never
 *   delete on a single click, but we also don't pop a modal — the
 *   confirmation lives in the same row, identical pattern to the
 *   "Pipeline reset" sidebar action.
 */
export function PositionCard({
  reviewId,
  position,
  match,
  quotationItem,
  unitPriceOverride,
  defaultOpen = false,
  onPositionChange,
  onUnitPriceChange,
  onFieldEdit,
  onDelete,
  onEvidenceSelect,
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

  const handleAssign = (row: StammdatenRow) => {
    const updated: Position = {
      ...draft,
      artikelnummer: row.artikel_nr,
      bezeichnung: row.bezeichnung || draft.bezeichnung,
      werkstoff: row.werkstoff ?? draft.werkstoff,
      abmessungen: row.abmessungen ?? draft.abmessungen,
      einheit: row.einheit || draft.einheit,
    };
    setDraft(updated);
    onPositionChange(updated);
    onFieldEdit(`positionen[${index}].artikelnummer`);
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

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const label = `Pos ${position.pos_nr} · ${
    position.artikelnummer || "Unbekannt"
  } · ${Math.round(position.menge)} ${position.einheit}`;

  return (
    <Accordion.Item
      value={`pos-${position.pos_nr}`}
      className={cn(
        "rounded-lg border bg-surface shadow-card transition-colors",
        confirmingDelete ? "border-danger/40" : "border-border hover:border-foreground/20",
      )}
    >
      <Accordion.Header className="flex items-stretch">
        <Accordion.Trigger
          className={cn(
            "group flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left text-sm font-semibold",
            "data-[state=open]:border-b data-[state=open]:border-border",
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown
            className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </Accordion.Trigger>

        {/* Delete — always visible, separate click target */}
        {confirmingDelete ? (
          <div className="flex items-center gap-1.5 border-b border-danger/30 border-l border-l-danger/20 bg-danger-soft px-3">
            <span className="text-[11px] font-semibold text-danger whitespace-nowrap">Löschen?</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false); onDelete(); }}
              className="rounded px-1.5 py-0.5 text-[11px] font-bold text-danger bg-danger/10 hover:bg-danger/20"
            >
              Ja
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false); }}
              className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Nein
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label={`Position ${position.pos_nr} löschen`}
            onClick={(e) => { e.stopPropagation(); setConfirmingDelete(true); }}
            className="flex items-center border-l border-border px-3 text-muted-foreground/40 transition-colors hover:bg-danger-soft hover:text-danger data-[state=open]:border-b data-[state=open]:border-border"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </Accordion.Header>

      <Accordion.Content
        className="px-4 pb-4 pt-3 data-[state=closed]:hidden"
        forceMount={defaultOpen ? true : undefined}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {match ? <MatchChip match={match} /> : <span />}
          <StammdatenSearchDialog
            reviewId={reviewId}
            posNr={position.pos_nr}
            initialQuery={position.artikelnummer || position.bezeichnung}
            onAssign={handleAssign}
          >
            <Button type="button" size="sm" variant="ghost" className="border border-border">
              <Replace className="h-3.5 w-3.5" aria-hidden="true" />
              Anderen Artikel zuordnen
            </Button>
          </StammdatenSearchDialog>
        </div>

        <div className="mb-3 text-xs text-muted-foreground">
          KI-Sicherheit:{" "}
          <span className="font-medium text-foreground">
            {CONFIDENCE_LABEL[position.confidence] ?? position.confidence}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
          <FormField label="Artikelnummer">
            <Input
              value={draft.artikelnummer}
              onChange={(e) => updateField("artikelnummer", e.target.value)}
              onBlur={() => commit(`positionen[${index}].artikelnummer`)}
            />
          </FormField>

          <FormField label="Liefertermin">
            <Input
              value={draft.liefertermin ?? ""}
              onChange={(e) => updateField("liefertermin", e.target.value)}
              onBlur={() => commit(`positionen[${index}].liefertermin`)}
            />
          </FormField>

          <FormField label="Menge">
            <Input
              type="number"
              step="any"
              value={draft.menge}
              onChange={(e) => updateField("menge", Number(e.target.value))}
              onBlur={() => commit(`positionen[${index}].menge`)}
            />
          </FormField>

          <FormField label="Werkstoff">
            <Input
              value={draft.werkstoff ?? ""}
              onChange={(e) => updateField("werkstoff", e.target.value)}
              onBlur={() => commit(`positionen[${index}].werkstoff`)}
            />
          </FormField>

          <FormField label="Einheit">
            <Input
              value={draft.einheit}
              onChange={(e) => updateField("einheit", e.target.value)}
              onBlur={() => commit(`positionen[${index}].einheit`)}
            />
          </FormField>

          <FormField label="Zeichnungs-Nr.">
            <Input
              value={draft.zeichnungsnummer ?? ""}
              onChange={(e) => updateField("zeichnungsnummer", e.target.value)}
              onBlur={() => commit(`positionen[${index}].zeichnungsnummer`)}
            />
          </FormField>

          <FormField label="Stückpreis EUR" hint="Manueller Preis-Override">
            <Input
              type="number"
              step="0.01"
              value={unitPriceDraft}
              onChange={(e) => setUnitPriceDraft(Number(e.target.value))}
              onBlur={commitUnitPrice}
            />
          </FormField>

          <FormField label="Abmessungen">
            <Input
              value={draft.abmessungen ?? ""}
              onChange={(e) => updateField("abmessungen", e.target.value)}
              onBlur={() => commit(`positionen[${index}].abmessungen`)}
            />
          </FormField>
        </div>

        <div className="mt-3">
          <FormField label="Bezeichnung">
            <textarea
              className="flex min-h-[72px] w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={draft.bezeichnung}
              onChange={(e) => updateField("bezeichnung", e.target.value)}
              onBlur={() => commit(`positionen[${index}].bezeichnung`)}
            />
          </FormField>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
          <FormField label="Lieferzeit">
            <Input
              value={draft.lieferzeit ?? ""}
              onChange={(e) => updateField("lieferzeit", e.target.value)}
              onBlur={() => commit(`positionen[${index}].lieferzeit`)}
              placeholder="z. B. 6 Wochen"
            />
          </FormField>

          <FormField label="Lieferwerk">
            <Input
              value={draft.lieferwerk ?? ""}
              onChange={(e) => updateField("lieferwerk", e.target.value)}
              onBlur={() => commit(`positionen[${index}].lieferwerk`)}
              placeholder="z. B. Werk Dettingen"
            />
          </FormField>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.ist_zertifikat}
            onChange={(e) => {
              const next = { ...draft, ist_zertifikat: e.target.checked };
              setDraft(next);
              onFieldEdit(`positionen[${index}].ist_zertifikat`);
              onPositionChange(next);
            }}
            className="h-4 w-4 rounded border-input"
          />
          <span className="font-medium">Zertifikat / Pauschalposition</span>
          <span className="text-xs text-muted-foreground">
            (z. B. Abnahmeprüfzeugnis)
          </span>
        </label>

        {(position.source_quote || position.source_file) && (
          <div className="mt-3">
            <SourceBadge
              evidence={{
                source_file: position.source_file,
                source_page: position.source_page,
                source_row: position.source_row,
                source_quote: position.source_quote || null,
              }}
              onNavigate={onEvidenceSelect}
            />
          </div>
        )}

      </Accordion.Content>
    </Accordion.Item>
  );
}

