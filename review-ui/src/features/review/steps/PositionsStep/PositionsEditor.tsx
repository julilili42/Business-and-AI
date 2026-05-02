import * as Accordion from "@radix-ui/react-accordion";
import { useMemo } from "react";

import { useReviewUiStore } from "@/features/review/stores/reviewUiStore";
import type { Anfrage, Position } from "@/shared/schemas/anfrage";
import type { MatchResult } from "@/shared/schemas/matchResult";
import type {
  ManualOverride,
  Quotation,
  QuotationItem,
} from "@/shared/schemas/quotation";

import { useSaveAndRegenerate } from "../../hooks/useReviewMutations";
import { ChangedFieldsIndicator } from "../../components/ChangedFieldsIndicator";
import { MatchSummary } from "./MatchSummary";
import { PositionCard } from "./PositionCard";
import { upsertOverride } from "./upsertOverride";

interface PositionsEditorProps {
  reviewId: string;
  anfrage: Anfrage;
  matches: MatchResult[];
  quotation: Quotation | null;
  overrides: ManualOverride[];
}

/**
 * The Step-1 editor.
 *
 * Strategy
 * --------
 * - Anfrage and overrides are passed in from the parent (they originate
 *   in `useReview`'s cache).
 * - Edits commit field-by-field via `saveAndRegenerate`, which writes
 *   the updated Anfrage / overrides and rebuilds the draft PDF in one
 *   round-trip. The draft PDF is therefore always in sync with what
 *   the user just typed — exactly the "Änderungen müssen bereits in
 *   der Draft-PDF sichtbar sein" requirement.
 * - Field-level change tracking lives in the Zustand store so the
 *   approval step can read the change-set later.
 */
export function PositionsEditor({
  reviewId,
  anfrage,
  matches,
  quotation,
  overrides,
}: PositionsEditorProps) {
  const trackChange = useReviewUiStore((s) => s.trackChange);
  const saveAndRegenerate = useSaveAndRegenerate(reviewId);

  const matchesByPos = useMemo(() => {
    const map = new Map<number, MatchResult>();
    for (const m of matches) map.set(m.pos_nr, m);
    return map;
  }, [matches]);

  const quotationByPos = useMemo(() => {
    const map = new Map<number, QuotationItem>();
    for (const it of quotation?.items ?? []) map.set(it.pos_nr, it);
    return map;
  }, [quotation]);

  const unitPriceOverrideByPos = useMemo(() => {
    const map = new Map<number, number>();
    for (const o of overrides) {
      if (o.target === "pos" && o.mode === "unit_price_eur") {
        map.set(o.pos_nr, o.unit_price_eur);
      }
    }
    return map;
  }, [overrides]);

  const handlePositionChange = (next: Position, original: Position) => {
    if (JSON.stringify(next) === JSON.stringify(original)) return;
    const updated: Anfrage = {
      ...anfrage,
      positionen: anfrage.positionen.map((p) =>
        p.pos_nr === next.pos_nr ? next : p,
      ),
    };
    saveAndRegenerate.mutate({ anfrage: updated });
  };

  const handleUnitPriceChange = (override: ManualOverride | null) => {
    if (!override) return;
    const updated = upsertOverride(overrides, override);
    saveAndRegenerate.mutate({ overrides: updated });
  };

  return (
    <section aria-labelledby="positions-heading" className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="positions-heading" className="section-label mb-2">
            Positionen prüfen
          </h2>
          <ChangedFieldsIndicator />
          <MatchSummary matches={matches} />
        </div>

        {saveAndRegenerate.isPending && (
          <span className="text-xs font-semibold text-info">
            PDF wird neu berechnet…
          </span>
        )}
        {saveAndRegenerate.isError && (
          <span className="text-xs font-semibold text-danger">
            Speichern fehlgeschlagen — bitte erneut versuchen.
          </span>
        )}
      </header>

      <Accordion.Root type="multiple" className="space-y-2">
        {anfrage.positionen.map((position, index) => (
          <PositionCard
            key={position.pos_nr}
            index={index}
            position={position}
            match={matchesByPos.get(position.pos_nr)}
            quotationItem={quotationByPos.get(position.pos_nr)}
            unitPriceOverride={unitPriceOverrideByPos.get(position.pos_nr)}
            onPositionChange={(next) => handlePositionChange(next, position)}
            onUnitPriceChange={handleUnitPriceChange}
            onFieldEdit={trackChange}
          />
        ))}
      </Accordion.Root>
    </section>
  );
}
