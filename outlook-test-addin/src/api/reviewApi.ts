import { REVIEW_API_URL } from "../config";
import type { CreateReviewResponse, MailSnapshot } from "../types";

export async function createReview(
  mail: MailSnapshot,
): Promise<CreateReviewResponse> {
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mail),
  });

  const text = await response.text();
  console.log("Review API status:", response.status);
  console.log("Review API raw response:", text);

  if (!response.ok) {
    throw new Error(`Review API failed (${response.status}): ${text}`);
  }

  const result = JSON.parse(text) as CreateReviewResponse;
  await checkPdfUrl(result);
  return result;
}

async function checkPdfUrl(result: CreateReviewResponse): Promise<void> {
  try {
    const pdfCheck = await fetch(result.draft_pdf_url, { method: "GET" });
    console.log("PDF check status:", pdfCheck.status);
    console.log(
      "PDF check content-type:",
      pdfCheck.headers.get("content-type"),
    );
    if (!pdfCheck.ok) {
      throw new Error(`PDF URL check failed with status ${pdfCheck.status}`);
    }
  } catch (error) {
    console.error("PDF URL check failed:", error);
    throw new Error(
      `Review wurde erstellt, aber PDF-URL ist aus dem Add-in nicht erreichbar: ${String(error)}`,
    );
  }
}
