import type { Evidence } from "@/shared/schemas/anfrage";

import { Label } from "./label";
import { SourceBadge } from "./SourceBadge";

interface FormFieldProps {
  label: string;
  /** Shown inline in muted text after the label. */
  hint?: string;
  /** When set, renders a SourceBadge next to the label. */
  evidence?: Evidence;
  onNavigate?: (ev: Evidence) => void;
  children: React.ReactNode;
}

export function FormField({ label, hint, evidence, onNavigate, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-xs">
          {label}
          {hint && (
            <span className="ml-1 font-normal text-muted-foreground">· {hint}</span>
          )}
        </Label>
        {evidence && <SourceBadge evidence={evidence} onNavigate={onNavigate} />}
      </div>
      {children}
    </div>
  );
}
