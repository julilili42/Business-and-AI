import type { PendingReview } from "../types";
import {
  CheckIcon,
  ClockIcon,
  ExternalIcon,
  SendIcon,
  TrashIcon,
} from "./Icons";

type PendingReviewCardProps = {
  pendingReview: PendingReview | null;
  loading: boolean;
  onOpenReview: () => void;
  onCreateDraftMail: () => void;
  onClearPendingReview: () => void;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function PendingReviewCard({
  pendingReview,
  loading,
  onOpenReview,
  onCreateDraftMail,
  onClearPendingReview,
}: PendingReviewCardProps) {
  if (!pendingReview) return null;

  return (
    <section
      className="card card-highlight"
      aria-labelledby="pending-card-title"
    >
      <div className="card-header">
        <div className="card-title" id="pending-card-title">
          <CheckIcon className="card-title-icon" />
          Review aktiv
        </div>
        <span className="review-id-chip" title="Review-ID">
          <ClockIcon size={12} />
          <code>{pendingReview.review.review_id}</code>
        </span>
      </div>

      <div className="mail-subject">{pendingReview.mailSubject}</div>

      <div className="kv-list">
        <div className="kv-row">
          <span className="kv-label">Absender</span>
          <span className={`kv-value ${pendingReview.sender ? "" : "muted"}`}>
            {pendingReview.sender || "—"}
          </span>
        </div>
        <div className="kv-row">
          <span className="kv-label">Erstellt</span>
          <span className="kv-value">{formatDate(pendingReview.createdAt)}</span>
        </div>
      </div>

      <p className="hint">
        Öffne zuerst die Review-UI im Browser, prüfe Positionen und Preise und
        speichere die Änderungen. Danach erstellt der zweite Button eine neue
        Mail mit der aktualisierten PDF.
      </p>

      <div className="actions">
        <button
          className="btn btn-secondary"
          disabled={loading}
          onClick={onOpenReview}
        >
          <ExternalIcon className="btn-icon" />
          Review-UI öffnen
        </button>
        <button
          className="btn btn-primary"
          disabled={loading}
          onClick={onCreateDraftMail}
        >
          <SendIcon className="btn-icon" />
          Angebotsmail erstellen
        </button>
        <button
          className="btn btn-danger-ghost"
          disabled={loading}
          onClick={onClearPendingReview}
          aria-label="Aktiven Review zurücksetzen"
        >
          <TrashIcon className="btn-icon" />
          Review zurücksetzen
        </button>
      </div>
    </section>
  );
}
