from __future__ import annotations

import streamlit as st

from quoting.core import Anfrage
from quoting.matching import match_positions
from quoting.ui.review_ui.resources import settings, stammdaten


def render_matching(anfrage: Anfrage, fuzzy_threshold: int):
    st.markdown("---")
    st.subheader("🔗 Stammdaten-Abgleich")

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
    c1.metric("Exact", exact)
    c2.metric("Fuzzy", fuzzy)
    c3.metric("Semantic", semantic)
    c4.metric("No Match", no_match)

    rows = []

    for pos, match in zip(anfrage.positionen, matches):
        rows.append(
            {
                "Pos": pos.pos_nr,
                "Anfrage Artikel": pos.artikelnummer,
                "Status": match.status.upper(),
                "Score": f"{match.score:.0%}",
                "Treffer Artikel": match.matched_artikelnr or "—",
                "Treffer Bezeichnung": match.matched_bezeichnung or "—",
            }
        )

    if rows:
        st.dataframe(
            rows,
            use_container_width=True,
            hide_index=True,
        )

    return matches