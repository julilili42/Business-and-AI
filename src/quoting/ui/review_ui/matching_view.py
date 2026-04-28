"""Stammdaten matching panel.

Renders the master-data match for each position with metrics and a
detailed table. Read-only — corrections happen in the editor.
"""
from __future__ import annotations

import streamlit as st

from quoting.core import Anfrage
from quoting.matching import match_positions
from quoting.ui.review_ui.resources import settings, stammdaten


_STATUS_LABELS = {
    "exact":    "Exakt",
    "fuzzy":    "Fuzzy",
    "semantic": "Semantisch",
    "no_match": "Kein Treffer",
}


def render_matching(anfrage: Anfrage, fuzzy_threshold: int):
    """Match each position and render a metrics + table view."""
    st.markdown(
        '<div class="ek-section-label" style="margin-top: 8px;">'
        "Stammdaten-Abgleich"
        "</div>",
        unsafe_allow_html=True,
    )

    matches = match_positions(
        anfrage.positionen,
        stammdaten(),
        fuzzy_threshold=fuzzy_threshold,
        semantic_threshold=settings().semantic_threshold,
    )

    exact = sum(1 for m in matches if m.status == "exact")
    fuzzy = sum(1 for m in matches if m.status == "fuzzy")
    semantic = sum(1 for m in matches if m.status == "semantic")
    no_match = sum(1 for m in matches if m.status == "no_match")

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Exakt", exact, help="Direkter Treffer auf Artikelnummer")
    c2.metric("Fuzzy", fuzzy, help="Ähnliche Artikelnummer (Tippfehler/OCR)")
    c3.metric("Semantisch", semantic, help="Treffer über Bezeichnung & Werkstoff")
    c4.metric("Kein Treffer", no_match, help="Manueller Review notwendig")

    rows = []
    for pos, match in zip(anfrage.positionen, matches):
        rows.append({
            "Pos": pos.pos_nr,
            "Anfrage": pos.artikelnummer,
            "Status": _STATUS_LABELS.get(match.status, match.status),
            "Score": f"{match.score:.0%}",
            "Stammdaten-Artikel": match.matched_artikelnr or "—",
            "Stammdaten-Bezeichnung": match.matched_bezeichnung or "—",
        })

    if rows:
        st.dataframe(
            rows,
            use_container_width=True,
            hide_index=True,
        )

    return matches
