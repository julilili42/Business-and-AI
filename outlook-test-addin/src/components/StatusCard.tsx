/**
 * StatusCard — single-line, semantically-classified status banner.
 *
 * Classification is keyword-based and intentionally conservative: any
 * unrecognised string falls into "idle" rather than misclassifying.
 */
import type { ComponentType, SVGProps } from "react";

import { AlertIcon, CheckIcon, ClockIcon, RefreshIcon } from "./Icons";

type StatusCardProps = {
  status: string;
  loading: boolean;
};

type StatusKind = "idle" | "loading" | "success" | "error";

function classify(status: string, loading: boolean): StatusKind {
  const s = status.toLowerCase();
  if (
    s.includes("error") ||
    s.includes("failed") ||
    s.includes("fehler")
  )
    return "error";
  if (
    s.includes("erstellt") ||
    s.includes("geöffnet") ||
    s.includes("erfolgreich") ||
    s.includes("geladen") ||
    s.includes("versendet")
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
    <div
      className={`status status-${kind}`}
      role="status"
      aria-live="polite"
    >
      <IconComp className="status-icon" />
      <div className="status-text">{status}</div>
    </div>
  );
}
