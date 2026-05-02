import { apiClient } from "./client";
import {
  approvalRecordSchema,
  type ApprovalRecord,
  type ApprovalState,
} from "../schemas/approval";

/**
 * Approval state machine adapter.
 *
 * Wraps the backend's `/api/reviews/{id}/approval` endpoint and the
 * documented transitions in `quoting/api/approval_store.py`.
 */

export interface ApprovalTransitionInput {
  target: ApprovalState;
  actor?: string;
  warning_acknowledged?: boolean;
  changed_fields?: string[];
}

export const approvalApi = {
  get: async (reviewId: string): Promise<ApprovalRecord> => {
    const data = await apiClient.get<unknown>(
      `/api/reviews/${encodeURIComponent(reviewId)}/approval`,
    );
    return approvalRecordSchema.parse(data);
  },

  transition: async (
    reviewId: string,
    input: ApprovalTransitionInput,
  ): Promise<ApprovalRecord> => {
    const data = await apiClient.post<unknown>(
      `/api/reviews/${encodeURIComponent(reviewId)}/approval`,
      input,
    );
    return approvalRecordSchema.parse(data);
  },
};
