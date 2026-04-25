import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

type MailAttachment = {
  name: string;
  contentType: string;
  size: number;
  id: string;
};

type MailSnapshot = {
  subject: string;
  from: string;
  body: string;
  attachments: MailAttachment[];
};

function decodeSnapshot(encoded: string): MailSnapshot {
  const utf8 = atob(encoded);
  const json = decodeURIComponent(utf8);
  return JSON.parse(json) as MailSnapshot;
}

function readSnapshotFromUrl(): MailSnapshot | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const encoded = params.get("data");

  if (!encoded) {
    return null;
  }

  return decodeSnapshot(encoded);
}

function formatAttachments(attachments: MailAttachment[]): string {
  if (!attachments.length) {
    return "No attachments";
  }

  return attachments
    .map((att, index) =>
      [
        `#${index + 1}`,
        `Name: ${att.name}`,
        `Type: ${att.contentType}`,
        `Size: ${att.size} bytes`,
        `ID: ${att.id}`,
      ].join("\n"),
    )
    .join("\n\n");
}

function createOutlookDraft(snapshot: MailSnapshot | null) {
  const subject = "Angebot zu Ihrer Anfrage";

  const body = [
    "Sehr geehrte Damen und Herren,",
    "",
    "vielen Dank für Ihre Anfrage.",
    "",
    "Anbei erhalten Sie unseren Angebotsentwurf.",
    "",
    "---",
    "Originale Anfrage:",
    snapshot ? `Betreff: ${snapshot.subject}` : "",
    snapshot ? `Von: ${snapshot.from}` : "",
    "",
    "Mit freundlichen Grüßen",
    "ElringKlinger Kunststofftechnik",
  ].join("\n");

  const url =
    "https://outlook.office.com/mail/deeplink/compose" +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  window.open(url, "_blank", "noopener,noreferrer");
}

function ExternalApp() {
  const snapshot = useMemo(() => {
    try {
      return readSnapshotFromUrl();
    } catch {
      return null;
    }
  }, []);

  return (
    <div className="panel">
      <h1>Mail Inhalt</h1>
      <p className="muted">Extern geöffnet aus dem Outlook Add-in.</p>

      <button disabled={!snapshot} onClick={() => createOutlookDraft(snapshot)}>
        Outlook Entwurf erstellen
      </button>

      {!snapshot && (
        <section>
          <h2>Status</h2>
          <pre>Keine Mail-Daten gefunden. Öffne diese Seite über das Outlook Add-in.</pre>
        </section>
      )}

      <section>
        <h2>Subject</h2>
        <pre>{snapshot?.subject || "(not loaded)"}</pre>
      </section>

      <section>
        <h2>From</h2>
        <pre>{snapshot?.from || "-"}</pre>
      </section>

      <section>
        <h2>Body</h2>
        <pre>{snapshot?.body || "(not loaded)"}</pre>
      </section>

      <section>
        <h2>Attachments</h2>
        <pre>{snapshot ? formatAttachments(snapshot.attachments) : "(not loaded)"}</pre>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<ExternalApp />);