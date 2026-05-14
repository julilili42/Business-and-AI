import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { formatEur } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import type { StammdatenRow } from "@/shared/schemas/stammdaten";

import {
  useMatchOverride,
  useStammdatenSearch,
} from "../../hooks/useStammdaten";

interface StammdatenSearchDialogProps {
  reviewId: string;
  posNr: number;
  initialQuery?: string;
  /** Called after a successful assignment so the position card can update its fields. */
  onAssign?: (row: StammdatenRow) => void;
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
  onAssign,
  children,
}: StammdatenSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [assigningArticle, setAssigningArticle] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query, 250);

  // Reset the query each time the dialog opens so a stale search from
  // the last position doesn't leak in.
  useEffect(() => {
    if (open) {
      setQuery(initialQuery ?? "");
    } else {
      setAssigningArticle(null);
    }
  }, [open, initialQuery]);

  const search = useStammdatenSearch(debouncedQuery, open);
  const override = useMatchOverride(reviewId);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Position {posNr} · Artikel zuordnen</DialogTitle>
          <DialogDescription>
            Suche nach Artikelnummer oder Bezeichnung. Die ausgewählte
            Zeile wird als manueller Treffer hinterlegt.
          </DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
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
