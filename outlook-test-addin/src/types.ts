export type MailAttachment = {
  name: string;
  contentType: string;
  size: number;
  id: string;
  contentBase64: string;
};

export type MailSnapshot = {
  subject: string;
  from: string;
  body: string;
  attachments: MailAttachment[];
};

export type CreateReviewResponse = {
  review_id: string;
  review_url: string;
  draft_pdf_url: string;
  draft_pdf_filename: string;
};
