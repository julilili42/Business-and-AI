/**
 * Per-mail workflow state, persisted in localStorage.
 *
 * Each Outlook item gets its own workflow record. The plugin renders
 * exactly one card based on the current state — so the user always
 * sees the next sensible action and nothing else.
 *
 * State machine:
 *   new ──[Review erstellen]──▶ review_created
 *                                    │
 *                                    │ [Review-UI öffnen]
 *                                    ▼
 *                                review_opened
 *                                    │
 *                                    │ [Angebotsmail erstellen]
 *                                    ▼
 *                                quote_sent
 *
 * Transitions are write-only: once you've reached a later state, you
 * stay there until the workflow is explicitly reset.
 */
import type { CreateReviewResponse, MailSnapshot } from "./types";

export type MailWorkflowState =
  | "new"
  | "review_created"
  | "review_opened"
  | "quote_sent";

export type MailWorkflow = {
  mailId: string;
  subject: string;
  sender: string;
  state: MailWorkflowState;
  review?: CreateReviewResponse;
  reviewCreatedAt?: string;
  reviewOpenedAt?: string;
  quoteSentAt?: string;
  updatedAt: string;
};

const STORAGE_KEY = "quoting.mailWorkflows.v2";
const LEGACY_KEY = "quoting.pendingReview.v1";

type Store = Record<string, MailWorkflow>;

// ---------- low-level store ------------------------------------------------

function readStore(): Store {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota exceeded — ignore, the user can still finish the action */
  }
}

// ---------- mail id derivation --------------------------------------------

/**
 * Stable id for the current Outlook item.
 *
 * `item.itemId` exists in read mode for synced items but can be missing
 * (compose mode, drafts, very fresh mails). We fall back to a content-based
 * hash so the workflow still works.
 */
export function deriveMailId(item: any, snapshot: MailSnapshot): string {
  if (item?.itemId) return String(item.itemId);
  const seed = `${snapshot.subject}|${snapshot.from}|${snapshot.attachments
    .map((a) => `${a.name}:${a.size}`)
    .join(",")}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return `local_${Math.abs(hash).toString(36)}`;
}

// ---------- public API -----------------------------------------------------

export function getWorkflow(mailId: string): MailWorkflow | null {
  return readStore()[mailId] ?? null;
}

export function listWorkflows(): MailWorkflow[] {
  return Object.values(readStore()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function upsertWorkflow(
  mailId: string,
  patch: Omit<Partial<MailWorkflow>, "mailId">,
): MailWorkflow {
  const store = readStore();
  const now = new Date().toISOString();
  const existing: MailWorkflow = store[mailId] ?? {
    mailId,
    subject: "",
    sender: "",
    state: "new",
    updatedAt: now,
  };
  const merged: MailWorkflow = {
    ...existing,
    ...patch,
    mailId,
    updatedAt: now,
  };
  store[mailId] = merged;
  writeStore(store);
  return merged;
}

export function deleteWorkflow(mailId: string): void {
  const store = readStore();
  delete store[mailId];
  writeStore(store);
}

// ---------- legacy migration ----------------------------------------------

/**
 * Migrate the previous single-pending-review localStorage entry into the new
 * keyed store on first read. Idempotent — drops the legacy key after.
 */
export function maybeMigrateLegacy(currentMailId: string): void {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw);
    const review: CreateReviewResponse | undefined = legacy?.review;
    if (review?.review_id) {
      const store = readStore();
      if (!store[currentMailId]) {
        store[currentMailId] = {
          mailId: currentMailId,
          subject: legacy.mailSubject ?? "",
          sender: legacy.sender ?? "",
          state: "review_created",
          review,
          reviewCreatedAt: legacy.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        writeStore(store);
      }
    }
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}
