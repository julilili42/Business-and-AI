import { Search } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/cn";

import type { ReviewStatus } from "../schemas/reviewSummary";

export type StatusFilter = "all" | ReviewStatus;

interface ReviewFiltersProps {
  status: StatusFilter;
  query: string;
  onStatusChange: (status: StatusFilter) => void;
  onQueryChange: (query: string) => void;
}

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Alle" },
  { value: "in_arbeit", label: "In Arbeit" },
  { value: "pdf_bereit", label: "PDF bereit" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
];

export function ReviewFilters({
  status,
  query,
  onStatusChange,
  onQueryChange,
}: ReviewFiltersProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div
        role="radiogroup"
        aria-label="Status-Filter"
        className="flex flex-wrap gap-2"
      >
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            type="button"
            role="radio"
            aria-checked={status === f.value}
            size="sm"
            variant={status === f.value ? "primary" : "ghost"}
            onClick={() => onStatusChange(f.value)}
            className={cn(
              status === f.value
                ? ""
                : "border border-border text-muted-foreground",
            )}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="relative md:w-72">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Betreff oder Absender…"
          className="pl-9"
          aria-label="Reviews durchsuchen"
        />
      </div>
    </div>
  );
}
