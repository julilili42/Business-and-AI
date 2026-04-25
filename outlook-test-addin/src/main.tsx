import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

declare const Office: any;

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

function formatFrom(item: any): string {
  const from = item.from;

  if (!from) {
    return "(unknown)";
  }

  const displayName = from.displayName || "";
  const emailAddress = from.emailAddress || "";

  if (displayName && emailAddress) {
    return `${displayName} <${emailAddress}>`;
  }

  return displayName || emailAddress || "(unknown)";
}

function getAttachments(item: any): MailAttachment[] {
  const attachments = item.attachments || [];

  return attachments.map((att: any) => ({
    name: att.name || "(unnamed)",
    contentType: att.contentType || "(unknown)",
    size: att.size || 0,
    id: att.id || "",
  }));
}

function getBodyText(item: any): Promise<string> {
  return new Promise((resolve, reject) => {
    item.body.getAsync(Office.CoercionType.Text, (result: any) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve(result.value || "(empty body)");
      } else {
        reject(result.error?.message || "unknown error");
      }
    });
  });
}

async function readMailSnapshot(): Promise<MailSnapshot> {
  const item = Office.context.mailbox.item;

  return {
    subject: item.subject || "(no subject)",
    from: formatFrom(item),
    body: await getBodyText(item),
    attachments: getAttachments(item),
  };
}

function encodeSnapshot(snapshot: MailSnapshot): string {
  const json = JSON.stringify(snapshot);
  const utf8 = encodeURIComponent(json);
  return btoa(utf8);
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

function App() {
  const [isOutlook, setIsOutlook] = useState(false);
  const [snapshot, setSnapshot] = useState<MailSnapshot | null>(null);
  const [status, setStatus] = useState("Waiting for Outlook...");
  const [loading, setLoading] = useState(false);

  async function loadMail() {
    setLoading(true);
    setStatus("Loading mail body...");

    try {
      const mail = await readMailSnapshot();
      setSnapshot(mail);
      setStatus("Mail loaded.");
    } catch (error) {
      setStatus(`Error reading body: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  async function openExternalPage() {
    setLoading(true);
    setStatus("Preparing external page...");

    try {
      const mail = snapshot || (await readMailSnapshot());
      const encoded = encodeSnapshot(mail);
      const url = `https://localhost:5173/external.html#data=${encoded}`;

      if (Office.context?.ui?.openBrowserWindow) {
        Office.context.ui.openBrowserWindow(url);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }

      setStatus("External page opened.");
    } catch (error) {
      setStatus(`Error opening external page: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Office.onReady((info: any) => {
      if (info.host !== Office.HostType.Outlook) {
        setIsOutlook(false);
        setStatus("Start this app through Outlook using the add-in manifest.");
        return;
      }

      setIsOutlook(true);
      loadMail();
    });
  }, []);

  return (
    <div className="panel">
      <h1>TEST</h1>
      <p className="muted">Liest den Inhalt der aktuell geöffneten Outlook-Mail.</p>

      <button disabled={!isOutlook || loading} onClick={loadMail}>
        Mail anzeigen
      </button>

      <button disabled={!isOutlook || loading} onClick={openExternalPage}>
        In neuem Tab öffnen
      </button>

      <section>
        <h2>Status</h2>
        <pre>{status}</pre>
      </section>

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

createRoot(document.getElementById("root")!).render(<App />);