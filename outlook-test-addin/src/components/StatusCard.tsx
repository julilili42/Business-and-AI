import type { ComponentType, SVGProps } from "react";
import { AlertIcon, CheckIcon, ClockIcon, RefreshIcon } from "./Icons";

type StatusCardProps = {
  status: string;
  loading: boolean;
};

type StatusKind = "idle" | "loading" | "success" | "error";

function classify(status: string, loading: boolean): StatusKind {
  const s = status.toLowerCase();
  if (s.includes("error") || s.includes("failed") || s.includes("fehler"))
    return "error";
  if (
    s.includes("created") ||
    s.includes("loaded") ||
    s.includes("called") ||
    s.includes("geöffnet") ||
    s.includes("erfolgreich")
  )
    return "success";
  if (loading) return "loading";
  return "idle";
}

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const ICONS: Record<StatusKind, IconComp> = {
  idle: ClockIcon,
  loading: RefreshIcon,
  success: CheckIcon,
  error: AlertIcon,
};

export function StatusCard({ status, loading }: StatusCardProps) {
  const kind = classify(status, loading);
  const IconComp = ICONS[kind];

  return (
    <div className={`status status-${kind}`} role="status" aria-live="polite">
      <IconComp className="status-icon" />
      <div className="status-text">{status}</div>
    </div>
  );
}
