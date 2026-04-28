/**
 * Header — minimal brand presence.
 *
 * The Outlook ribbon already labels the add-in; the taskpane itself
 * just needs a quiet identification. One small EK mark, no wordmark.
 */
export function Header() {
  return (
    <header className="app-header">
      <div className="brand-mark" aria-label="ElringKlinger">
        EK
      </div>
    </header>
  );
}
