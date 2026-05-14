import { Loader2, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { FormField } from "@/shared/components/ui/FormField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { formatEur } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import type { StammdatenRow } from "@/shared/schemas/stammdaten";

import {
  useCustomArticleMatch,
  useMatchOverride,
  useStammdatenSearch,
} from "../../hooks/useStammdaten";

type AssignmentMode = "stammdaten" | "custom";

interface StammdatenSearchDialogProps {
  reviewId: string;
  posNr: number;
  initialQuery?: string;
  initialArticleNumber?: string;
  initialDescription?: string;
  initialUnit?: string;
  initialWerkstoff?: string | null;
  initialAbmessungen?: string | null;
  initialUnitPrice?: number;
  /** Called after a successful Stammdaten assignment so the position card can update its fields. */
  onAssign?: (row: StammdatenRow) => void;
  /** Called after a successful custom assignment; the backend has already persisted the position. */
  onCustomAssign?: (row: StammdatenRow) => void;
  children: React.ReactNode;
}

/**
 * Manual re-match dialog.
 *
 * Self-contained: the parent supplies the trigger, the dialog handles
 * search, override mutation, and dismissal. After a successful pin,
 * the dialog closes itself and React Query invalidation in
 * `useMatchOverride` causes the parent to re-render with the new
 * match — there's nothing for the caller to wire up.
 */
export function StammdatenSearchDialog({
  reviewId,
  posNr,
  initialQuery,
  initialArticleNumber,
  initialDescription,
  initialUnit,
  initialWerkstoff,
  initialAbmessungen,
  initialUnitPrice,
  onAssign,
  onCustomAssign,
  children,
}: StammdatenSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AssignmentMode>("stammdaten");
  const [query, setQuery] = useState(initialQuery ?? "");
  const [assigningArticle, setAssigningArticle] = useState<string | null>(null);
  const [customArticleNr, setCustomArticleNr] = useState(initialArticleNumber ?? "");
  const [customDescription, setCustomDescription] = useState(initialDescription ?? "");
  const [customUnit, setCustomUnit] = useState(initialUnit || "Stk");
  const [customUnitPrice, setCustomUnitPrice] = useState(
    initialUnitPrice && initialUnitPrice > 0 ? String(initialUnitPrice) : "",
  );
  const [customWerkstoff, setCustomWerkstoff] = useState(initialWerkstoff ?? "");
  const [customAbmessungen, setCustomAbmessungen] = useState(initialAbmessungen ?? "");
  const debouncedQuery = useDebouncedValue(query, 250);
  const debouncedCustomArticleNr = useDebouncedValue(customArticleNr, 250);

  // Reset the query each time the dialog opens so a stale search from
  // the last position doesn't leak in.
  useEffect(() => {
    if (open) {
      setMode("stammdaten");
      setQuery(initialQuery ?? "");
      setCustomArticleNr(initialArticleNumber ?? "");
      setCustomDescription(initialDescription ?? "");
      setCustomUnit(initialUnit || "Stk");
      setCustomUnitPrice(
        initialUnitPrice && initialUnitPrice > 0 ? String(initialUnitPrice) : "",
      );
      setCustomWerkstoff(initialWerkstoff ?? "");
      setCustomAbmessungen(initialAbmessungen ?? "");
    } else {
      setAssigningArticle(null);
    }
  }, [
    open,
    initialQuery,
    initialArticleNumber,
    initialDescription,
    initialUnit,
    initialUnitPrice,
    initialWerkstoff,
    initialAbmessungen,
  ]);

  const search = useStammdatenSearch(debouncedQuery, open && mode === "stammdaten");
  const duplicateSearch = useStammdatenSearch(
    debouncedCustomArticleNr,
    open && mode === "custom" && debouncedCustomArticleNr.trim().length > 0,
  );
  const override = useMatchOverride(reviewId);
  const customMatch = useCustomArticleMatch(reviewId);

  const assignRow = (row: StammdatenRow) => {
    if (override.isPending) return;
    setAssigningArticle(row.artikel_nr);
    override.mutate(
      { posNr, artikelNr: row.artikel_nr },
      {
        onSuccess: () => {
          onAssign?.(row);
          setOpen(false);
        },
        onError: () => setAssigningArticle(null),
      },
    );
  };

  const customUnitPriceNumber = Number(customUnitPrice.replace(",", "."));
  const customDuplicate = duplicateSearch.data?.some(
    (row) => normaliseArticleNr(row.artikel_nr) === normaliseArticleNr(customArticleNr),
  ) ?? false;
  const customPending = customMatch.isPending;
  const customValid =
    customArticleNr.trim().length > 0 &&
    customDescription.trim().length > 0 &&
    customUnit.trim().length > 0 &&
    Number.isFinite(customUnitPriceNumber) &&
    customUnitPriceNumber > 0 &&
    !customDuplicate;

  const submitCustomArticle = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customValid || customPending) return;

    const row: StammdatenRow = {
      artikel_nr: customArticleNr.trim(),
      bezeichnung: customDescription.trim(),
      einheit: customUnit.trim(),
      basispreis_eur: Number(customUnitPriceNumber.toFixed(2)),
      preis_min_eur: Number(customUnitPriceNumber.toFixed(2)),
      preis_max_eur: Number(customUnitPriceNumber.toFixed(2)),
      n_offers: 0,
      werkstoff: customWerkstoff.trim() || null,
      abmessungen: customAbmessungen.trim() || null,
      sales_group: "Custom",
      material_group: "Custom",
    };

    customMatch.mutate(
      {
        pos_nr: posNr,
        artikel_nr: row.artikel_nr,
        bezeichnung: row.bezeichnung,
        einheit: row.einheit,
        unit_price_eur: row.basispreis_eur,
        werkstoff: row.werkstoff,
        abmessungen: row.abmessungen,
      },
      {
        onSuccess: () => {
          onCustomAssign?.(row);
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Position {posNr} · Artikel zuordnen</DialogTitle>
          <DialogDescription>
            Stammdaten auswählen oder einen Custom-Artikel für diese Position anlegen.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => setMode(value as AssignmentMode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stammdaten">
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              Stammdaten
            </TabsTrigger>
            <TabsTrigger value="custom">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Custom-Artikel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stammdaten" className="space-y-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Artikelnummer oder Bezeichnung"
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {search.isLoading && <LoadingState label="Suche…" />}
              {search.isError && <ErrorState error={search.error} />}
              {search.data && search.data.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Keine Treffer für „{debouncedQuery}".
                </p>
              )}
              {search.data && search.data.length > 0 && (
                <ul className="divide-y divide-border">
                  {search.data.map((row) => (
                    <ResultRow
                      key={row.artikel_nr}
                      row={row}
                      pending={override.isPending}
                      selected={assigningArticle === row.artikel_nr}
                      onPin={() => assignRow(row)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {override.isError && <ErrorState error={override.error} />}
          </TabsContent>

          <TabsContent value="custom">
            <form className="space-y-4" onSubmit={submitCustomArticle}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.1fr_0.6fr_0.6fr]">
                <FormField label="Artikelnummer">
                  <Input
                    value={customArticleNr}
                    onChange={(e) => setCustomArticleNr(e.target.value)}
                    placeholder="z. B. CUSTOM-001"
                  />
                </FormField>

                <FormField label="Einheit">
                  <Input
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="Stk"
                  />
                </FormField>

                <FormField label="Stückpreis EUR">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customUnitPrice}
                    onChange={(e) => setCustomUnitPrice(e.target.value)}
                    placeholder="0,00"
                  />
                </FormField>
              </div>

              <FormField label="Bezeichnung">
                <textarea
                  className="flex min-h-[96px] w-full rounded-md border border-input bg-surface px-3 py-2 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Werkstoff">
                  <Input
                    value={customWerkstoff}
                    onChange={(e) => setCustomWerkstoff(e.target.value)}
                  />
                </FormField>

                <FormField label="Abmessungen">
                  <Input
                    value={customAbmessungen}
                    onChange={(e) => setCustomAbmessungen(e.target.value)}
                  />
                </FormField>
              </div>

              {customDuplicate && (
                <p className="rounded-md border border-warning/20 bg-warning-soft px-3 py-2 text-xs font-medium text-warning">
                  Diese Artikelnummer existiert bereits in den Stammdaten.
                </p>
              )}
              {customMatch.isError && <ErrorState error={customMatch.error} />}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!customValid || customPending}
                  className="min-w-[11rem] disabled:opacity-100"
                >
                  {customPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Wird angelegt
                    </>
                  ) : (
                    "Custom-Artikel zuordnen"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function normaliseArticleNr(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function ResultRow({
  row,
  pending,
  selected,
  onPin,
}: {
  row: StammdatenRow;
  pending: boolean;
  selected: boolean;
  onPin: () => void;
}) {
  const isAssigning = pending && selected;

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors duration-150",
        selected && "bg-info-soft ring-1 ring-info/20",
        pending && !selected && "opacity-55",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
            {row.artikel_nr}
          </code>
          <span className="text-xs text-muted-foreground">
            {row.einheit} · {formatEur(row.basispreis_eur)}
          </span>
        </div>
        <div className="mt-1 truncate text-sm font-medium">
          {row.bezeichnung || "—"}
        </div>
        {(row.werkstoff || row.abmessungen) && (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {[row.werkstoff, row.abmessungen].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={onPin}
        disabled={pending}
        className="min-w-[7.75rem] disabled:opacity-100"
      >
        {isAssigning ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Wird zugeordnet
          </>
        ) : (
          "Zuordnen"
        )}
      </Button>
    </li>
  );
}
