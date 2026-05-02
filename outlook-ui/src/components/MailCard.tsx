import type { MailSnapshot } from "../types";
import { InboxIcon, RefreshIcon, SparkIcon } from "./Icons";

type MailCardProps = {
  snapshot: MailSnapshot | null;
  isOutlook: boolean;
  loading: boolean;
  onStartReview: () => void;
  onLoadMail: () => void;
};

export function MailCard({
  snapshot,
  isOutlook,
  loading,
  onStartReview,
  onLoadMail,
}: MailCardProps) {
  const attachmentCount = snapshot?.attachments.length ?? 0;
  const hasPdf = snapshot?.attachments.some((a) =>
    a.name.toLowerCase().endsWith(".pdf"),
  );
  const canStart = isOutlook && !loading && !!snapshot;

  return (
    <section className="card" aria-labelledby="mail-card-title">
      <div className="card-header">
        <div className="card-title" id="mail-card-title">
          <InboxIcon className="card-title-icon" />
          Aktuelle Mail
        </div>
      </div>

      <div className="mail-subject">
        {snapshot?.subject || "Noch keine Mail geladen"}
      </div>

      <div className="kv-list">
        <div className="kv-row">
          <span className="kv-label">Absender</span>
          <span className={`kv-value ${snapshot ? "" : "muted"}`}>
            {snapshot?.from || "—"}
          </span>
        </div>
        <div className="kv-row">
          <span className="kv-label">Anhänge</span>
          <span className="kv-value">
            {snapshot ? (
              <span className="pill pill-neutral">
                <span className="pill-dot" />
                {attachmentCount} {attachmentCount === 1 ? "Datei" : "Dateien"}
              </span>
            ) : (
              <span className="kv-value muted">—</span>
            )}
          </span>
        </div>
        <div className="kv-row">
          <span className="kv-label">PDF erkannt</span>
          <span className="kv-value">
            {snapshot ? (
              hasPdf ? (
                <span className="pill pill-success">Ja</span>
              ) : (
                <span className="pill pill-warning">Keine</span>
              )
            ) : (
              <span className="kv-value muted">—</span>
            )}
          </span>
        </div>
      </div>

      <div className="actions">
        <button
          className="btn btn-primary"
          disabled={!canStart}
          onClick={onStartReview}
          aria-label="Review für aktuelle Mail erstellen"
        >
          <SparkIcon className="btn-icon" />
          Review erstellen
        </button>
        <button
          className="btn btn-secondary"
          disabled={!isOutlook || loading}
          onClick={onLoadMail}
          aria-label="Mail neu laden"
        >
          <RefreshIcon className="btn-icon" />
          Mail neu laden
        </button>
      </div>
    </section>
  );
}
