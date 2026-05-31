import { AlertTriangle } from "lucide-react";
import { ApiError } from "@/shared/api/client";
import { cn } from "@/shared/lib/cn";

interface ErrorStateProps {
  title?: string;
  error: unknown;
  className?: string;
  action?: React.ReactNode;
}

/**
 * Turn an arbitrary thrown value into a sentence a non-technical user can
 * act on. Raw `error.message` (HTTP status codes, "Failed to fetch", stack
 * fragments) is intimidating and rarely actionable, so we special-case the
 * two shapes that actually reach the UI — fetch network failures and
 * `ApiError` — and only fall back to the raw message as a last resort.
 */
function describe(error: unknown): string {
  if (isNetworkError(error)) {
    return "Keine Verbindung zum Server. Bitte prüfen, ob die Anwendung läuft, und erneut versuchen.";
  }
  if (error instanceof ApiError) {
    return describeApiError(error);
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "Unbekannter Fehler. Bitte erneut versuchen.";
}

// fetch() rejects with a TypeError when the backend is unreachable (server
// down, wrong port, offline). An ApiError means a response came back, so it
// is never a connection problem.
function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) return false;
  if (error instanceof TypeError) return true;
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /failed to fetch|networkerror|load failed|connection|err_network/i.test(message);
}

function describeApiError(error: ApiError): string {
  if (error.status >= 500) {
    return "Der Server hat einen Fehler gemeldet. Bitte später erneut versuchen.";
  }
  if (error.status === 404) {
    return "Nicht gefunden – der Eintrag wurde möglicherweise gelöscht.";
  }
  if (error.status === 401 || error.status === 403) {
    return "Kein Zugriff auf diese Ressource.";
  }
  if (error.status === 408 || error.status === 504) {
    return "Zeitüberschreitung – der Server hat zu lange gebraucht. Bitte erneut versuchen.";
  }
  // Remaining 4xx: the server's `detail` is written for end users
  // (validation, unsupported file type, file too large …). Show it
  // verbatim; fall back to a generic line when it is just "HTTP 4xx".
  const detail = error.message.trim();
  if (detail && !/^HTTP\s+\d+$/i.test(detail)) {
    return detail;
  }
  return "Die Anfrage konnte nicht verarbeitet werden. Bitte Eingaben prüfen.";
}

export function ErrorState({
  title = "Etwas ist schiefgelaufen",
  error,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger",
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="mt-1 text-danger/80">{describe(error)}</div>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
