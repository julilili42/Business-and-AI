import { cn } from "@/shared/lib/cn";

interface PlaceholderChipsProps {
  placeholders: string[];
  onInsert: (text: string) => void;
  className?: string;
}

export function PlaceholderChips({ placeholders, onInsert, className }: PlaceholderChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {placeholders.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onInsert(`[${p}]`)}
          className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-[11px] text-foreground/60 transition-colors hover:bg-brand-soft hover:text-brand"
        >
          [{p}]
        </button>
      ))}
    </div>
  );
}
