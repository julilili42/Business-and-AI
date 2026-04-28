"""Visual layout for the Streamlit review UI.

Design intent
-------------
- Stakeholder-grade polish: Linear / Stripe / Notion level of refinement.
- One brand accent (ElringKlinger red) used surgically; everything else
  is a calm slate scale.
- Inter Tight for display, Inter for body — distinctive but professional.
- Generous whitespace, hairline dividers, layered shadows.

This module owns:
- The global CSS injection (`apply_style`)
- The marketing-style top header with partner logos (`render_header`)
- The sidebar with logo, review-id chip, controls, and workflow help
  (`render_sidebar`)
"""
from __future__ import annotations

import base64
from pathlib import Path

import streamlit as st

ASSETS_DIR = Path(__file__).resolve().parents[1] / "assets"


# --------------------------------------------------------------------- assets


def img_to_base64(path: Path) -> str | None:
    """Return base64 of an image file, or None if missing.

    Used to inline brand assets so the Streamlit page stays self-contained.
    """
    if not path.exists():
        return None
    return base64.b64encode(path.read_bytes()).decode()


# --------------------------------------------------------------------- styles


_GLOBAL_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@500;600;700;800;900&display=swap');

:root {
    --ek-bg:            #fafaf9;
    --ek-surface:       #ffffff;
    --ek-surface-2:     #f5f5f4;
    --ek-surface-sunk:  #f1f5f9;

    --ek-border:        #e5e7eb;
    --ek-border-strong: #d1d5db;
    --ek-divider:       #f1f5f9;

    --ek-text:          #0f172a;
    --ek-text-2:        #334155;
    --ek-muted:         #64748b;
    --ek-faint:         #94a3b8;

    --ek-brand:         #e30613;
    --ek-brand-dark:    #b8000b;
    --ek-brand-soft:    #fef2f2;

    --ek-accent:        #1e3a8a;
    --ek-accent-soft:   #eef2ff;

    --ek-success:       #047857;
    --ek-success-soft:  #ecfdf5;
    --ek-success-border:#a7f3d0;

    --ek-warning:       #b45309;
    --ek-warning-soft:  #fff7ed;
    --ek-warning-border:#fed7aa;

    --ek-danger:        #b91c1c;
    --ek-danger-soft:   #fef2f2;
    --ek-danger-border: #fecaca;

    --ek-shadow-1: 0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.02);
    --ek-shadow-2: 0 6px 20px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
    --ek-shadow-3: 0 24px 48px -12px rgba(15,23,42,0.18), 0 4px 8px rgba(15,23,42,0.04);
}

/* ---------------- Base ---------------- */

html, body, [data-testid="stAppViewContainer"] {
    font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
    background-color: var(--ek-bg);
    color: var(--ek-text);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

[data-testid="stAppViewContainer"] > .main {
    background-color: var(--ek-bg);
}

h1, h2, h3, h4, h5 {
    font-family: 'Inter Tight', 'Inter', sans-serif;
    color: var(--ek-text);
    letter-spacing: -0.02em;
}

h1 { font-weight: 800; }
h2, h3 { font-weight: 700; }

/* Soften default Streamlit container padding for a calmer feel */
.block-container {
    padding-top: 0 !important;
    padding-bottom: 4rem !important;
    max-width: 1400px;
}

/* ---------------- Top header strip ---------------- */

.ek-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 44px;
    padding: 22px 8px 22px 8px;
    background: var(--ek-surface);
    border-bottom: 1px solid var(--ek-divider);
    margin: 0 -1rem 28px -1rem;
}

.ek-support-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--ek-faint);
    text-transform: uppercase;
    letter-spacing: 0.18em;
}

.ek-partner-logo {
    height: 60px;
    width: auto;
    object-fit: contain;
    opacity: 0.92;
    transition: opacity 0.2s ease;
}

.ek-partner-logo:hover {
    opacity: 1;
}

/* ---------------- Page title block ---------------- */

.ek-title-block {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 8px;
    padding: 8px 0 0 0;
}

.ek-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
}

.ek-title {
    font-family: 'Inter Tight', sans-serif;
    font-size: 44px;
    line-height: 1.05;
    margin: 0;
    color: var(--ek-text);
    font-weight: 800;
    letter-spacing: -0.035em;
}

.ek-title .ek-accent-dot {
    color: var(--ek-brand);
}

.ek-subtitle {
    margin: 0;
    color: var(--ek-muted);
    font-size: 15px;
    line-height: 1.5;
    max-width: 720px;
}

.ek-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-top: 4px;
}

.ek-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 600;
    background: var(--ek-surface);
    border: 1px solid var(--ek-border);
    color: var(--ek-text-2);
}

.ek-chip-success {
    background: var(--ek-success-soft);
    border-color: var(--ek-success-border);
    color: var(--ek-success);
}

.ek-chip-brand {
    background: var(--ek-brand-soft);
    border-color: #fecaca;
    color: var(--ek-brand-dark);
}

.ek-chip code {
    font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
    font-size: 11.5px;
    background: transparent;
    padding: 0;
    color: inherit;
}

/* ---------------- Workflow steps ---------------- */

.ek-steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 22px 0 8px 0;
}

.ek-step {
    background: var(--ek-surface);
    border: 1px solid var(--ek-border);
    border-radius: 14px;
    padding: 16px 18px;
    box-shadow: var(--ek-shadow-1);
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    position: relative;
    overflow: hidden;
}

.ek-step::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: var(--ek-border);
}

.ek-step.active::before { background: var(--ek-brand); }
.ek-step.done::before   { background: var(--ek-success); }

.ek-step-num {
    font-family: 'Inter Tight', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: var(--ek-faint);
    letter-spacing: 0.04em;
    margin-bottom: 6px;
}

.ek-step.active .ek-step-num { color: var(--ek-brand); }
.ek-step.done   .ek-step-num { color: var(--ek-success); }

.ek-step-title {
    font-family: 'Inter Tight', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: var(--ek-text);
    margin: 0 0 4px 0;
    letter-spacing: -0.01em;
}

.ek-step-desc {
    font-size: 13px;
    color: var(--ek-muted);
    line-height: 1.5;
    margin: 0;
}

/* ---------------- Sidebar ---------------- */

[data-testid="stSidebar"] {
    background-color: var(--ek-surface) !important;
    border-right: 1px solid var(--ek-divider);
}

[data-testid="stSidebar"] [data-testid="stSidebarUserContent"] {
    padding-top: 1rem;
}

.ek-review-id-box {
    background: linear-gradient(180deg, var(--ek-success-soft) 0%, #ffffff 100%);
    color: var(--ek-success);
    border: 1px solid var(--ek-success-border);
    border-radius: 14px;
    padding: 14px 16px;
    margin-bottom: 16px;
    box-shadow: var(--ek-shadow-1);
}

.ek-review-id-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ek-success);
    margin-bottom: 6px;
}

.ek-review-id-value {
    font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
    font-size: 14px;
    font-weight: 700;
    color: var(--ek-text);
    word-break: break-all;
}

.ek-sidebar-caption {
    color: var(--ek-muted);
    font-size: 12.5px;
    line-height: 1.55;
    margin-bottom: 24px;
    padding: 0 2px;
}

/* ---------------- Buttons ---------------- */

.stButton > button, .stDownloadButton > button {
    border-radius: 10px !important;
    font-weight: 600 !important;
    padding: 0.65rem 1.2rem !important;
    border: 1px solid var(--ek-border-strong) !important;
    transition: all 0.16s ease !important;
    font-family: 'Inter', sans-serif !important;
    letter-spacing: -0.005em !important;
}

.stButton > button:hover {
    background: var(--ek-surface-2) !important;
    border-color: var(--ek-text-2) !important;
}

.stButton > button[kind="primary"], .stDownloadButton > button {
    background: var(--ek-text) !important;
    color: white !important;
    border-color: var(--ek-text) !important;
    box-shadow: 0 1px 2px rgba(0,0,0,0.08) !important;
}

.stButton > button[kind="primary"]:hover, .stDownloadButton > button:hover {
    background: #000 !important;
    border-color: #000 !important;
    transform: translateY(-1px);
    box-shadow: var(--ek-shadow-2) !important;
}

/* ---------------- Metrics ---------------- */

[data-testid="stMetric"] {
    background: var(--ek-surface);
    border: 1px solid var(--ek-border);
    border-radius: 14px;
    padding: 16px 18px;
    box-shadow: var(--ek-shadow-1);
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

[data-testid="stMetric"]:hover {
    border-color: var(--ek-border-strong);
    box-shadow: var(--ek-shadow-2);
}

[data-testid="stMetric"] [data-testid="stMetricLabel"] {
    color: var(--ek-muted);
    font-size: 12px !important;
    font-weight: 600 !important;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

[data-testid="stMetric"] [data-testid="stMetricValue"] {
    font-family: 'Inter Tight', sans-serif !important;
    font-weight: 800 !important;
    font-size: 28px !important;
    color: var(--ek-text);
    letter-spacing: -0.025em;
}

/* ---------------- Tabs ---------------- */

[data-testid="stTabs"] [role="tablist"] {
    gap: 4px;
    border-bottom: 1px solid var(--ek-border);
    padding-bottom: 0;
    margin-bottom: 22px;
}

[data-testid="stTabs"] [role="tab"] {
    background: transparent !important;
    border: none !important;
    border-bottom: 2px solid transparent !important;
    border-radius: 0 !important;
    padding: 10px 18px !important;
    font-weight: 600 !important;
    color: var(--ek-muted) !important;
    font-size: 14px !important;
    transition: color 0.16s ease, border-color 0.16s ease !important;
    margin: 0 !important;
}

[data-testid="stTabs"] [role="tab"]:hover {
    color: var(--ek-text) !important;
}

[data-testid="stTabs"] [role="tab"][aria-selected="true"] {
    color: var(--ek-text) !important;
    border-bottom-color: var(--ek-brand) !important;
    background: transparent !important;
}

/* ---------------- Expander / containers ---------------- */

[data-testid="stExpander"] {
    background: var(--ek-surface);
    border: 1px solid var(--ek-border) !important;
    border-radius: 12px !important;
    box-shadow: var(--ek-shadow-1);
    overflow: hidden;
}

[data-testid="stExpander"] summary {
    font-weight: 600 !important;
    color: var(--ek-text) !important;
    padding: 12px 16px !important;
}

/* ---------------- Inputs ---------------- */

.stTextInput input, .stTextArea textarea, .stNumberInput input {
    border-radius: 8px !important;
    border-color: var(--ek-border) !important;
    font-family: 'Inter', sans-serif !important;
}

.stTextInput input:focus, .stTextArea textarea:focus, .stNumberInput input:focus {
    border-color: var(--ek-brand) !important;
    box-shadow: 0 0 0 3px rgba(227, 6, 19, 0.10) !important;
}

/* ---------------- Dataframe ---------------- */

[data-testid="stDataFrame"] {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--ek-border);
    box-shadow: var(--ek-shadow-1);
}

/* ---------------- Chat ---------------- */

[data-testid="stChatMessage"] {
    background: var(--ek-surface);
    border: 1px solid var(--ek-border);
    border-radius: 14px;
    padding: 14px 16px;
    margin-bottom: 8px;
    box-shadow: var(--ek-shadow-1);
}

[data-testid="stChatInput"] {
    border-radius: 12px;
    box-shadow: var(--ek-shadow-2);
}

/* ---------------- Misc ---------------- */

hr {
    border: none;
    border-top: 1px solid var(--ek-divider);
    margin: 28px 0 !important;
}

.ek-section-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--ek-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0 0 12px 0;
}
</style>
"""


def apply_style() -> None:
    """Inject the global stylesheet. Call once per page render."""
    st.markdown(_GLOBAL_CSS, unsafe_allow_html=True)


# --------------------------------------------------------------------- header


def render_header() -> None:
    """Render the partner-logo strip at the top of the page."""
    logos = [
        ("logo_bw_stiftung.png", "Stiftung Baden-Württemberg"),
        ("logo_bw_wappen.png", "Wappen Baden-Württemberg"),
        ("logo_bw_bank.png", "BW-Bank"),
    ]

    parts = ['<div class="ek-header">',
             '<span class="ek-support-label">Unterstützt durch</span>']
    for filename, alt in logos:
        encoded = img_to_base64(ASSETS_DIR / filename)
        if encoded:
            parts.append(
                f'<img src="data:image/png;base64,{encoded}" '
                f'class="ek-partner-logo" alt="{alt}">'
            )
    parts.append("</div>")

    st.markdown("".join(parts), unsafe_allow_html=True)


# --------------------------------------------------------------------- sidebar


def render_sidebar(review_id: str | None = None):
    """Render the left sidebar.

    Returns a tuple: (uploaded_file_or_None, fuzzy_threshold).
    """
    with st.sidebar:
        elring_logo = img_to_base64(ASSETS_DIR / "logo_elringklinger.png")
        if elring_logo:
            st.markdown(
                f'<img src="data:image/png;base64,{elring_logo}" '
                f'style="width: 100%; margin: 6px 0 22px 0;" '
                f'alt="ElringKlinger">',
                unsafe_allow_html=True,
            )
        else:
            st.title("ElringKlinger")

        uploaded = None

        if review_id:
            st.markdown(
                f"""
                <div class="ek-review-id-box">
                    <div class="ek-review-id-label">Review aktiv</div>
                    <div class="ek-review-id-value">{review_id}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            st.markdown(
                '<div class="ek-sidebar-caption">'
                "Änderungen werden in diesem Review gespeichert und überschreiben "
                "die aktuelle Review-Version."
                "</div>",
                unsafe_allow_html=True,
            )
        else:
            st.markdown(
                '<div class="ek-section-label">Datei-Upload</div>',
                unsafe_allow_html=True,
            )
            uploaded = st.file_uploader(
                "Anfrage hochladen",
                type=["pdf", "msg", "eml", "xlsx", "xls"],
                label_visibility="collapsed",
            )
            st.markdown(
                '<div class="ek-sidebar-caption" style="margin-top: 12px;">'
                "Akzeptiert PDF, MSG, EML und Excel-Dateien. "
                "Nach dem Upload startet die KI-Extraktion automatisch."
                "</div>",
                unsafe_allow_html=True,
            )

        st.markdown("---")

        st.markdown(
            '<div class="ek-section-label">Matching-Einstellungen</div>',
            unsafe_allow_html=True,
        )
        fuzzy_threshold = st.slider(
            "Fuzzy-Match Schwellenwert",
            min_value=50,
            max_value=100,
            value=85,
            help=(
                "Höher = strenger. Bei niedrigerem Schwellenwert findet das "
                "System auch bei Tippfehlern und OCR-Problemen Treffer."
            ),
        )

        st.markdown("---")

        st.markdown(
            """
            <div class="ek-section-label">Workflow</div>
            <div class="ek-sidebar-caption" style="line-height: 1.7;">
                <strong>1.</strong> Anfrage prüfen & korrigieren<br/>
                <strong>2.</strong> Stammdaten-Match validieren<br/>
                <strong>3.</strong> Angebots-PDF erstellen<br/>
                <strong>4.</strong> Optional: Agent-Chat für Anpassungen
            </div>
            """,
            unsafe_allow_html=True,
        )

        return uploaded, fuzzy_threshold
