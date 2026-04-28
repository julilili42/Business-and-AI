"""Review-overview blocks shown above the review tabs.

Splits the previous ``review_overview`` module into two clear concerns:

- :func:`render_review_title` — hero block with title, subtitle, and chips
- :func:`render_workflow_steps` — visual 3-step indicator
- :func:`render_review_overview` — KPI strip + collapsible details

Visual design is owned by :mod:`layout` (CSS variables, fonts, etc.).
This module only emits semantic HTML/components.
"""
from __future__ import annotations

from pathlib import Path

import streamlit as st

from quoting.core import Anfrage


# --------------------------------------------------------------------- hero


def render_review_title(review_id: str | None, input_path: Path | None) -> None:
    """Render the hero block at the top of the review page."""
    is_existing = bool(review_id)

    mode_chip = (
        f'<span class="ek-chip ek-chip-success">'
        f'<span style="width:6px;height:6px;border-radius:999px;'
        f'background:currentColor;display:inline-block;"></span>'
        f"Bestehender Review · <code>{review_id}</code>"
        "</span>"
        if is_existing
        else '<span class="ek-chip ek-chip-brand">'
        '<span style="width:6px;height:6px;border-radius:999px;'
        'background:currentColor;display:inline-block;"></span>'
        "Neuer Upload"
        "</span>"
    )

    file_chip = (
        f'<span class="ek-chip">📄 {input_path.name}</span>'
        if input_path is not None and str(input_path) != "—"
        else ""
    )

    st.markdown(
        f"""
        <div class="ek-title-block">
            <div class="ek-title-row">
                <h1 class="ek-title">
                    Angebots-Review<span class="ek-accent-dot">.</span>
                </h1>
            </div>
            <p class="ek-subtitle">
                KI-extrahierte Anfrage prüfen, Stammdaten-Treffer validieren
                und ein verkaufsfertiges Angebot in Minuten erstellen.
            </p>
            <div class="ek-meta-row">
                {mode_chip}
                {file_chip}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# --------------------------------------------------------------------- steps


def render_workflow_steps(active: int) -> None:
    """Render the 3-step workflow indicator.

    ``active`` is 1-based: ``1`` = step 1 active, etc. Steps before the
    active one are rendered as ``done``.
    """
    steps = [
        ("01", "Anfrage prüfen", "Extrahierte Daten korrigieren"),
        ("02", "Angebot & Matching", "Stammdaten validieren, PDF erzeugen"),
        ("03", "Agent Chat", "Preise & Rabatte natürlichsprachlich anpassen"),
    ]

    parts = ['<div class="ek-steps">']
    for i, (num, title, desc) in enumerate(steps, start=1):
        cls = "ek-step"
        if i < active:
            cls += " done"
        elif i == active:
            cls += " active"
        parts.append(
            f'<div class="{cls}">'
            f'<div class="ek-step-num">SCHRITT {num}</div>'
            f'<div class="ek-step-title">{title}</div>'
            f'<p class="ek-step-desc">{desc}</p>'
            "</div>"
        )
    parts.append("</div>")
    st.markdown("".join(parts), unsafe_allow_html=True)


# --------------------------------------------------------------------- KPIs


def render_review_overview(
    review_id: str | None,
    input_path: Path,
    anfrage: Anfrage,
    matches,
) -> None:
    """KPI strip + collapsible details for the current review."""
    total_positions = len(anfrage.positionen)
    exact = sum(1 for m in matches if m.status == "exact")
    fuzzy = sum(1 for m in matches if m.status == "fuzzy")
    semantic = sum(1 for m in matches if m.status == "semantic")
    no_match = sum(1 for m in matches if m.status == "no_match")
    matched = exact + fuzzy + semantic
    match_rate = matched / total_positions if total_positions else 0.0

    loaded_source = st.session_state.get("loaded_extraction_source", "unbekannt")
    pdf_ready = bool(st.session_state.get("pdf_bytes"))
    quotation = st.session_state.get("quotation")
    total_eur = (
        f"{getattr(quotation, 'gesamtsumme', 0.0):.2f} €"
        if quotation
        else "—"
    )

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Positionen", total_positions)
    c2.metric("Match-Quote", f"{match_rate:.0%}")
    c3.metric("Angebotssumme", total_eur)
    c4.metric("PDF", "Bereit" if pdf_ready else "Offen")

    with st.expander("Review-Details anzeigen", expanded=False):
        col_a, col_b = st.columns(2)
        with col_a:
            st.markdown(f"**Datei**  \n`{input_path.name}`")
            st.markdown(f"**Review-ID**  \n`{review_id or '—'}`")
        with col_b:
            st.markdown(f"**Geladene Extraktion**  \n`{loaded_source}`")
            st.markdown(
                f"**Matching**  \n"
                f"exact = `{exact}`, fuzzy = `{fuzzy}`, "
                f"semantic = `{semantic}`, no_match = `{no_match}`"
            )

        if st.session_state.get("pdf_bytes"):
            st.download_button(
                label="📥 Aktuelles PDF herunterladen",
                data=st.session_state["pdf_bytes"],
                file_name=st.session_state.get(
                    "pdf_file_name",
                    f"Angebot_Draft_{review_id or 'upload'}.pdf",
                ),
                mime="application/pdf",
                use_container_width=True,
                key="download_current_pdf_overview",
            )
