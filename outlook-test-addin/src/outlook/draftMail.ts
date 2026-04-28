import type { CreateReviewResponse } from "../types";

declare const Office: any;

type DraftMailContext = {
  subject: string;
};

function withCacheBust(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

export async function createDraftMail(
  result: CreateReviewResponse,
  mail: DraftMailContext,
  setStatus: (s: string) => void,
) {
  const subject = `Angebot zu Ihrer Anfrage: ${mail.subject}`;

  const htmlBody = `
    <p>Sehr geehrte Damen und Herren,</p>
    <p>vielen Dank für Ihre Anfrage.</p>
    <p>Anbei erhalten Sie unser Angebot.</p>
    <p>Mit freundlichen Grüßen<br/>ElringKlinger Kunststofftechnik</p>
  `;

  Office.context.mailbox.displayNewMessageForm({
    toRecipients: [],
    subject,
    htmlBody,
    attachments: [
      {
        type: "file",
        name: result.draft_pdf_filename,
        url: withCacheBust(result.draft_pdf_url),
      },
    ],
  });

  setStatus(`Angebotsmail mit aktueller PDF geöffnet (${result.review_id})`);
}

export function openUrl(url: string) {
  if (Office.context?.ui?.openBrowserWindow) {
    Office.context.ui.openBrowserWindow(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}