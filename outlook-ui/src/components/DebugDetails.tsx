import type { MailAttachment, MailSnapshot } from "../types";

type DebugDetailsProps = {
  snapshot: MailSnapshot | null;
};

function formatAttachments(attachments: MailAttachment[]): string {
  if (!attachments.length) return "No attachments";
  return attachments
    .map((att, index) =>
      [
        `#${index + 1}`,
        `Name: ${att.name}`,
        `Type: ${att.contentType}`,
        `Size: ${att.size} bytes`,
        `ID: ${att.id}`,
        `Content: ${
          att.contentBase64 ? `${att.contentBase64.length} base64 chars` : "(none)"
        }`,
      ].join("\n"),
    )
    .join("\n\n");
}

export function DebugDetails({ snapshot }: DebugDetailsProps) {
  return (
    <details className="debug">
      <summary>Debug-Details</summary>
      <div className="debug-body">
        <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 600, color: "var(--ek-text-muted)" }}>
          Body
        </div>
        <pre className="debug-pre">{snapshot?.body || "(not loaded)"}</pre>
        <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 600, color: "var(--ek-text-muted)" }}>
          Raw Attachments
        </div>
        <pre className="debug-pre">
          {snapshot ? formatAttachments(snapshot.attachments) : "(not loaded)"}
        </pre>
      </div>
    </details>
  );
}
