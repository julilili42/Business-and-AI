from __future__ import annotations

from pathlib import Path

import streamlit as st

from quoting.core import Anfrage


def render_review_title(review_id: str | None, input_path: Path) -> None:
    mode_label = "Bestehender Review" if review_id else "Neuer Upload"
    review_label = review_id or "noch nicht gespeichert"

    st.markdown(
        f"""
        <div class="review-title-block">
            <div>
                <h1 class="review-title">📋 Angebots-Review</h1>
                <div class="review-subtitle">
                    {mode_label} · <code>{review_label}</code> · {input_path.name}
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_review_overview(
    review_id: str | None,
    input_path: Path,
    anfrage: Anfrage,
    matches,
) -> None:
    total_positions = len(anfrage.positionen)
    exact = sum(1 for m in matches if m.status == "exact")
    fuzzy = sum(1 for m in matches if m.status == "fuzzy")
    semantic = sum(1 for m in matches if m.status == "semantic")
    no_match = sum(1 for m in matches if m.status == "no_match")

    matched = exact + fuzzy + semantic
    match_rate = matched / total_positions if total_positions else 0.0

    loaded_source = st.session_state.get("loaded_extraction_source", "unbekannt")
    pdf_ready = bool(st.session_state.get("pdf_bytes"))

    c1, c2, c3, c4 = st.columns(4)

    c1.metric("Review", review_id or "Upload")
    c2.metric("Positionen", total_positions)
    c3.metric("Match-Quote", f"{match_rate:.0%}")
    c4.metric("PDF", "bereit" if pdf_ready else "offen")

    with st.expander("ℹ️ Review-Details", expanded=bool(review_id)):
        st.markdown(
            f"""
            **Datei:** `{input_path.name}`  
            **Geladene Extraktion:** `{loaded_source}`  
            **Matching:** exact={exact}, fuzzy={fuzzy}, semantic={semantic}, no_match={no_match}
            """
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