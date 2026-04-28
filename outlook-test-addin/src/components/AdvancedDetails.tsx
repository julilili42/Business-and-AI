/**
 * Advanced — single collapsible section at the bottom of the panel.
 *
 * Folds attachment overview + raw mail body + raw attachment metadata
 * into one disclosure. Closed by default so the main flow stays calm.
 */
import type { MailAttachment, MailSnapshot } from "../types";
import { ChevronDown } from "./Icons";

type AdvancedProps = {
  snapshot: MailSnapshot | null;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAttachments(attachments: MailAttachment[]): string {
  if (!attachments.length) return "(keine Anhänge)";
  return attachments
    .map((att, i) =>
      [
        `#${i + 1} ${att.name}`,
        `  type: ${att.contentType}`,
        `  size: ${formatSize(att.size)} (${att.size} bytes)`,
        `  id:   ${att.id}`,
        `  data: ${
          att.contentBase64 ? `${att.contentBase64.length} base64 chars` : "—"
        }`,
      ].join("\n"),
    )
    .join("\n\n");
}

export function AdvancedDetails({ snapshot }: AdvancedProps) {
  const attachments = snapshot?.attachments ?? [];

  return (
    <details className="advanced">
      <summary>
        <ChevronDown size={12} />
        <span>Erweitert</span>
        <span className="advanced-meta">
          {attachments.length}{" "}
          {attachments.length === 1 ? "Anhang" : "Anhänge"}
        </span>
      </summary>

      <div className="advanced-body">
        {attachments.length > 0 && (
          <div className="attachment-list">
            {attachments.map((att, i) => {
              const isPdf = att.name.toLowerCase().endsWith(".pdf");
              const ext =
                att.name.split(".").pop()?.toUpperCase().slice(0, 4) ?? "FILE";
              return (
                <div className="attachment" key={`${att.id}-${i}`} title={att.name}>
                  <div className={`attachment-icon ${isPdf ? "is-pdf" : ""}`}>
                    {ext}
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

        <details className="debug-inner">
          <summary>Rohdaten anzeigen</summary>
          <div className="debug-section-label">Mail-Body</div>
          <pre className="debug-pre">{snapshot?.body || "(nicht geladen)"}</pre>
          <div className="debug-section-label">Anhänge (raw)</div>
          <pre className="debug-pre">
            {snapshot
              ? formatAttachments(snapshot.attachments)
              : "(nicht geladen)"}
          </pre>
        </details>
      </div>
    </details>
  );
}
