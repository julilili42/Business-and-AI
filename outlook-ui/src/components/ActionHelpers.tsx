import type { ReactNode } from "react";

import { ChevronDown } from "./Icons";

const PRIVACY_LABEL =
  "Mail und Anhänge gehen zur Extraktion an Gemini bzw. Azure OpenAI.";

export function PrivacyInlineHelp() {
  return (
    <span className="action-help">
      <button
        className="action-help-button"
        type="button"
        aria-label={PRIVACY_LABEL}
      >
        ?
      </button>
      <span className="action-help-tooltip" role="tooltip">
        {PRIVACY_LABEL}
      </span>
    </span>
  );
}

export function SecondaryActions({ children }: { children: ReactNode }) {
  return (
    <details className="secondary-actions">
      <summary>
        <ChevronDown size={12} />
        <span>Weitere Aktionen</span>
      </summary>
      <div className="secondary-actions-list">{children}</div>
    </details>
  );
}
