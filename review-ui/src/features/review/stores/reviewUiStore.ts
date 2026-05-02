import { create } from "zustand";

/**
 * Per-review UI store.
 *
 * Holds **only** UI-flag state (changed-fields tracker, approval-actor
 * draft, focus mode). Server-state — Anfrage, Matches, Quotation,
 * Approval — lives entirely in TanStack Query's cache.
 *
 * State is reset whenever a different review is opened (see
 * `setActiveReview`).
 */

interface ReviewUiState {
  activeReviewId: string | null;
  changedFields: Set<string>;
  approvalActor: string;
  resetConfirmPending: boolean;

  setActiveReview: (id: string | null) => void;
  trackChange: (fieldPath: string) => void;
  clearChanges: () => void;
  setApprovalActor: (name: string) => void;
  setResetConfirmPending: (v: boolean) => void;
}

export const useReviewUiStore = create<ReviewUiState>((set, get) => ({
  activeReviewId: null,
  changedFields: new Set(),
  approvalActor: "",
  resetConfirmPending: false,

  setActiveReview: (id) => {
    if (get().activeReviewId === id) return;
    set({
      activeReviewId: id,
      changedFields: new Set(),
      approvalActor: "",
      resetConfirmPending: false,
    });
  },

  trackChange: (fieldPath) =>
    set((state) => {
      if (state.changedFields.has(fieldPath)) return state;
      const next = new Set(state.changedFields);
      next.add(fieldPath);
      return { changedFields: next };
    }),

  clearChanges: () => set({ changedFields: new Set() }),

  setApprovalActor: (name) => set({ approvalActor: name }),

  setResetConfirmPending: (v) => set({ resetConfirmPending: v }),
}));
