/**
 * Header — quiet brand presence at the top of the panel.
 *
 * Single 36px ElringKlinger mark + product name. We deliberately
 * keep this small: the panel is narrow and the mail content
 * deserves the visual real estate.
 */
export function Header() {
  return (
    <header className="app-header">
      <div className="brand-mark" aria-hidden="true">
        EK
      </div>
      <div className="brand-text">
        <div className="brand-title">Quotation Assistant</div>
        <div className="brand-subtitle">ElringKlinger Kunststofftechnik</div>
      </div>
    </header>
  );
}
