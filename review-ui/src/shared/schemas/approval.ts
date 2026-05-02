import { z } from "zod";

/**
 * Mirrors `quoting/api/approval_store.py::ApprovalRecord`.
 */

export const approvalStateSchema = z.enum([
  "draft_generated",
  "reviewed",
  "approved",
  "ready_to_send",
]);

export type ApprovalState = z.infer<typeof approvalStateSchema>;

export const approvalRecordSchema = z
  .object({
    state: approvalStateSchema,
    approved_by: z.string().nullable().optional(),
    approved_at: z.string().nullable().optional(),
    sent_at: z.string().nullable().optional(),
    changed_fields: z.array(z.string()).default([]),
    final_pdf_path: z.string().nullable().optional(),
    warning_acknowledged: z.boolean().default(false),
    history: z.array(z.record(z.unknown())).default([]),
  })
  .passthrough();

export type ApprovalRecord = z.infer<typeof approvalRecordSchema>;

export function isApproved(record: ApprovalRecord | null | undefined): boolean {
  return record?.state === "approved" || record?.state === "ready_to_send";
}
