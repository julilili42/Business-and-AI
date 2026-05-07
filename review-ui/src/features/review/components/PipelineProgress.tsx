import { AlertTriangle, Check, Clock, Loader2, type LucideIcon } from "lucide-react";

import { Progress } from "@/shared/components/ui/progress";
import { cn } from "@/shared/lib/cn";
import type { PipelineProgress as TPipelineProgress } from "@/shared/schemas/progress";

type StepStatus = "completed" | "running" | "failed" | "pending" | "skipped";

const STEP_STATUS_CONFIG: Record<StepStatus, { Icon: LucideIcon; tone: string }> = {
  completed: { Icon: Check,          tone: "border-success/30 bg-success-soft text-success" },
  skipped:   { Icon: Check,          tone: "border-success/30 bg-success-soft text-success" },
  running:   { Icon: Loader2,        tone: "border-info/30 bg-info-soft text-info" },
  failed:    { Icon: AlertTriangle,  tone: "border-danger/30 bg-danger-soft text-danger" },
  pending:   { Icon: Clock,          tone: "border-border bg-surface text-muted-foreground" },
};

interface PipelineProgressProps {
  progress: TPipelineProgress;
}

export function PipelineProgress({ progress }: PipelineProgressProps) {
  const failed = progress.status === "failed";

  return (
    <section
      className={cn(
        "rounded-lg border bg-surface p-6 shadow-card",
        failed ? "border-danger/30" : "border-border",
      )}
    >
      <div className="section-label mb-3">Pipeline-Status</div>

      <div className="mb-4 flex items-center gap-3">
        {failed ? (
          <AlertTriangle className="h-5 w-5 text-danger" aria-hidden="true" />
        ) : (
          <Loader2
            className="h-5 w-5 animate-spin text-info"
            aria-hidden="true"
          />
        )}
        <div>
          <div className="font-display text-lg font-bold tracking-tight">
            {progress.current_step || "Pipeline"}
          </div>
          {progress.current_detail && (
            <div className="text-sm text-muted-foreground">
              {progress.current_detail}
            </div>
          )}
        </div>
      </div>

      <Progress value={progress.progress_percent} className="mb-6" />

      <ol className="space-y-2" aria-label="Pipeline-Schritte">
        {progress.steps.map((step) => {
          const { Icon, tone } =
            STEP_STATUS_CONFIG[step.status as StepStatus] ?? STEP_STATUS_CONFIG.pending;
          return (
            <li
              key={step.name}
              className={cn("flex items-start gap-3 rounded-md border px-3 py-2 text-sm", tone)}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 flex-shrink-0",
                  step.status === "running" && "animate-spin",
                )}
                aria-hidden="true"
              />
              <div className="flex-1">
                <div className="font-semibold">{step.name}</div>
                {step.detail && (
                  <div className="mt-0.5 text-xs opacity-80">{step.detail}</div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {progress.status === "failed" && progress.error && (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
          {progress.error}
        </div>
      )}
    </section>
  );
}
