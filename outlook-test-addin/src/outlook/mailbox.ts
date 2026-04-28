import type { MailAttachment, MailSnapshot } from "../types";

declare const Office: any;

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

export async function readMailSnapshot(): Promise<MailSnapshot> {
  const item = Office.context.mailbox.item;

  return {
    subject: item.subject || "(no subject)",
    from: formatFrom(item),
    body: await getBodyText(item),
    attachments: await getAttachmentsWithContent(item),
  };
}