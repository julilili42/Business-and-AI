import type { MailSnapshot } from "../types";
import { PaperclipIcon } from "./Icons";

type AttachmentListProps = {
  snapshot: MailSnapshot | null;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileBadge(name: string): string {
  const ext = name.split(".").pop()?.toUpperCase() ?? "FILE";
  return ext.length <= 4 ? ext : "FILE";
}

export function AttachmentList({ snapshot }: AttachmentListProps) {
  const attachments = snapshot?.attachments ?? [];

  return (
    <section className="card" aria-labelledby="attach-card-title">
      <div className="card-header">
        <div className="card-title" id="attach-card-title">
          <PaperclipIcon className="card-title-icon" />
          Anhänge
        </div>
        {attachments.length > 0 && (
          <span className="pill pill-neutral">{attachments.length}</span>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="empty">Keine Anhänge geladen.</p>
      ) : (
        <div className="attachment-list">
          {attachments.map((att, index) => {
            const isPdf = att.name.toLowerCase().endsWith(".pdf");
            return (
              <div
                className="attachment"
                key={`${att.id}-${index}`}
                title={att.name}
              >
                <div
                  className={`attachment-icon-wrap ${isPdf ? "is-pdf" : ""}`}
                  aria-hidden="true"
                >
                  {fileBadge(att.name)}
                </div>
                <div className="attachment-body">
                  <div className="attachment-name">{att.name}</div>
                  <div className="attachment-meta">
                    {att.contentType || "unknown"} · {formatSize(att.size)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
