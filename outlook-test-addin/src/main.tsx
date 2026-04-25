import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

declare const Office: any;

const REVIEW_API_URL = "http://127.0.0.1:8000/api/reviews";

type MailAttachment = {
  name: string;
  contentType: string;
  size: number;
  id: string;
  contentBase64: string;
};

type MailSnapshot = {
  subject: string;
  from: string;
  body: string;
  attachments: MailAttachment[];
};

type CreateReviewResponse = {
  review_id: string;
  review_url: string;
  draft_pdf_url: string;
  draft_pdf_filename: string;
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

async function getAttachmentsWithContent(item: any): Promise<MailAttachment[]> {
  const attachments = item.attachments || [];
  const results: MailAttachment[] = [];

  for (const att of attachments) {
    const content = await new Promise<string>((resolve, reject) => {
      item.getAttachmentContentAsync(att.id, (result: any) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value.content);
        } else {
          reject(result.error?.message || "attachment fetch failed");
        }
      });
    });

    results.push({
      name: att.name || "(unnamed)",
      contentType: att.contentType || "application/octet-stream",
      size: att.size || 0,
      id: att.id || "",
      contentBase64: content,
    });
  }
  return results;
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
    attachments: await getAttachmentsWithContent(item),
  };
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
        `Content: ${att.contentBase64 ? `${att.contentBase64.length} base64 chars` : "(none)"}`,
      ].join("\n"),
    )
    .join("\n\n");
}
function createDraftMail(
  result: CreateReviewResponse,
  mail: MailSnapshot,
  setStatus: (s: string) => void,
) {
  const subject = `Angebot zu Ihrer Anfrage: ${mail.subject}`;

  const htmlBody = `
    <p>Sehr geehrte Damen und Herren,</p>
    <p>vielen Dank für Ihre Anfrage.</p>
    <p>Anbei erhalten Sie unseren Angebotsentwurf.</p>
    <p><b>Debug PDF URL:</b><br/>
      <a href="${result.draft_pdf_url}">${result.draft_pdf_url}</a>
    </p>
    <p>Mit freundlichen Grüßen<br/>ElringKlinger Kunststofftechnik</p>
  `;

  console.log("createDraftMail result:", result);
  console.log("PDF URL:", result.draft_pdf_url);

  try {
    Office.context.mailbox.displayNewMessageForm({
      toRecipients: [],
      subject,
      htmlBody,
      attachments: [
        {
          type: Office.MailboxEnums.AttachmentType.File,
          name: result.draft_pdf_filename,
          url: result.draft_pdf_url,
          isInline: false,
        },
      ],
    });
    

    setStatus(
      [
        "displayNewMessageForm called.",
        `Review ID: ${result.review_id}`,
        `PDF filename: ${result.draft_pdf_filename}`,
        `PDF URL: ${result.draft_pdf_url}`,
      ].join("\n"),
    );
  } catch (e) {
    console.error("displayNewMessageForm failed:", e);

    setStatus(
      [
        "displayNewMessageForm threw an error.",
        `Error: ${String(e)}`,
        `PDF URL: ${result.draft_pdf_url}`,
      ].join("\n"),
    );
  }
}

async function createReview(mail: MailSnapshot): Promise<CreateReviewResponse> {
  console.log("Sending mail snapshot to review API:", {
    subject: mail.subject,
    from: mail.from,
    bodyLength: mail.body.length,
    attachments: mail.attachments.map((a) => ({
      name: a.name,
      contentType: a.contentType,
      size: a.size,
      base64Length: a.contentBase64?.length || 0,
    })),
  });

  const response = await fetch(REVIEW_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mail),
  });

  const text = await response.text();

  console.log("Review API status:", response.status);
  console.log("Review API raw response:", text);

  if (!response.ok) {
    throw new Error(`Review API failed (${response.status}): ${text}`);
  }

  const result = JSON.parse(text) as CreateReviewResponse;

  // Debug: Prüfen, ob die PDF-URL aus dem Add-in erreichbar ist
  try {
    const pdfCheck = await fetch(result.draft_pdf_url, {
      method: "GET",
    });

    console.log("PDF check status:", pdfCheck.status);
    console.log("PDF check content-type:", pdfCheck.headers.get("content-type"));

    if (!pdfCheck.ok) {
      throw new Error(`PDF URL check failed with status ${pdfCheck.status}`);
    }
  } catch (error) {
    console.error("PDF URL check failed:", error);
    throw new Error(
      `Review wurde erstellt, aber PDF-URL ist aus dem Add-in nicht erreichbar: ${String(error)}`,
    );
  }

  return result;
}

function openUrl(url: string) {
  if (Office.context?.ui?.openBrowserWindow) {
    Office.context.ui.openBrowserWindow(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function App() {
  const [isOutlook, setIsOutlook] = useState(false);
  const [snapshot, setSnapshot] = useState<MailSnapshot | null>(null);
  const [status, setStatus] = useState("Waiting for Outlook...");
  const [loading, setLoading] = useState(false);

  async function loadMail() {
    setLoading(true);
    setStatus("Loading mail body and attachments...");

    try {
      const mail = await readMailSnapshot();
      setSnapshot(mail);
      setStatus(`Mail loaded. ${mail.attachments.length} attachment(s).`);
    } catch (error) {
      setStatus(`Error reading mail: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  async function startReview() {
    setLoading(true);
    setStatus("Uploading mail to review API — extraction can take up to a minute...");

    try {
      const mail = snapshot || (await readMailSnapshot());
      setSnapshot(mail);

      const result = await createReview(mail);

      setStatus(`Review created: ${result.review_id}. Opening draft mail...`);

      createDraftMail(result, mail, setStatus);
    } catch (error) {
      setStatus(`Error creating review: ${String(error)}`);
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
      <h1>Quotation Review</h1>
      <p className="muted">
        Liest die aktuell geöffnete Outlook-Mail und startet den Review-Flow.
      </p>

      <button disabled={!isOutlook || loading} onClick={loadMail}>
        Mail anzeigen
      </button>

      <button disabled={!isOutlook || loading} onClick={startReview}>
        Draft Quotation erstellen
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