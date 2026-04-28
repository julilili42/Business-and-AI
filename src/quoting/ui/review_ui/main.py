"""Streamlit entry point for the review UI.

Renders, in order:
1. Global styles + header strip
2. Sidebar (upload OR review-id chip + thresholds + workflow help)
3. Hero block (title, subtitle, mode chips)
4. 3-step workflow indicator
5. Three tabs: prüfen / Angebot / Agent-Chat
"""
from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st


def _ensure_project_path() -> None:
    """Allow running this file directly via ``streamlit run``."""
    this_file = Path(__file__).resolve()
    project_root = this_file.parents[4]
    src_dir = this_file.parents[3]
    for p in (project_root, src_dir):
        if str(p) not in sys.path:
            sys.path.insert(0, str(p))


def _configure_page() -> None:
    st.set_page_config(
        page_title="ElringKlinger · Quotation Review",
        page_icon="🔧",
        layout="wide",
        initial_sidebar_state="expanded",
    )


def _derive_active_step() -> int:
    """1-based active step for the workflow indicator."""
    if st.session_state.get("agent_messages"):
        return 3
    if st.session_state.get("quotation"):
        return 3
    if st.session_state.get("anfrage"):
        return 1
    return 1


def run() -> None:
    _ensure_project_path()
    _configure_page()

    from quoting.ui.review_ui.agent_chat import render_agent_chat
    from quoting.ui.review_ui.document_view import render_original_request
    from quoting.ui.review_ui.editor import render_editor
    from quoting.ui.review_ui.extraction import (
        detect_and_store_agent_language,
        load_anfrage_once,
    )
    from quoting.ui.review_ui.layout import (
        apply_style,
        render_header,
        render_sidebar,
    )
    from quoting.ui.review_ui.matching_view import render_matching
    from quoting.ui.review_ui.quotation_flow import (
        hydrate_existing_review_state,
        render_generate_button,
    )
    from quoting.ui.review_ui.review_context import (
        ReviewInput,
        get_review_id_from_query,
        load_review_input,
        store_review_context,
    )
    from quoting.ui.review_ui.review_overview import (
        render_review_overview,
        render_review_title,
        render_workflow_steps,
    )
    from quoting.ui.review_ui.upload import handle_upload

    apply_style()
    render_header()

    review_id = get_review_id_from_query()
    uploaded, fuzzy_threshold = render_sidebar(review_id=review_id)

    # ------------------------------------------------------------------ input
    if review_id:
        try:
            review_input = load_review_input(review_id)
        except Exception as e:
            st.error(f"❌ Review konnte nicht geladen werden: {e}")
            st.stop()
        store_review_context(review_input)
        input_path = review_input.input_path
        content_hash = review_input.content_hash
        payload = review_input.payload
        uploaded_name = review_input.uploaded_name
    else:
        if not uploaded:
            render_review_title(None, None)
            st.markdown("&nbsp;", unsafe_allow_html=True)
            st.info(
                "👈  Bitte links eine Preisanfrage hochladen, um zu starten. "
                "Akzeptiert werden PDF, MSG, EML und Excel-Dateien.",
                icon="📤",
            )
            st.stop()
        input_path, content_hash, payload = handle_upload(uploaded)
        review_input = ReviewInput(
            input_path=input_path,
            content_hash=content_hash,
            payload=payload,
            uploaded_name=uploaded.name,
        )
        store_review_context(review_input)
        uploaded_name = uploaded.name

    # ------------------------------------------------------------------ hero
    render_review_title(review_id, input_path)

    # ------------------------------------------------------------------ extract
    try:
        anfrage = load_anfrage_once(content_hash, input_path)
    except Exception as e:
        st.error(f"❌ Fehler bei der Extraktion: {e}")
        st.stop()

    detect_and_store_agent_language(content_hash, input_path, anfrage)

    # ------------------------------------------------------------------ steps
    render_workflow_steps(active=_derive_active_step())

    st.markdown("&nbsp;", unsafe_allow_html=True)

    # ------------------------------------------------------------------ tabs
    tab_review, tab_offer, tab_agent = st.tabs([
        "  Anfrage prüfen",
        "  Angebot & Matching",
        "  Agent Chat",
    ])

    with tab_review:
        col_doc, col_extract = st.columns([1, 1], gap="large")
        with col_doc:
            render_original_request(input_path, payload)
        with col_extract:
            anfrage = render_editor(anfrage)

    with tab_offer:
        matches = render_matching(anfrage, fuzzy_threshold)
        hydrate_existing_review_state(
            content_hash=content_hash, matches=matches,
        )
        render_review_overview(
            review_id=review_id,
            input_path=input_path,
            anfrage=anfrage,
            matches=matches,
        )
        st.markdown("---")
        render_generate_button(
            anfrage=anfrage,
            matches=matches,
            content_hash=content_hash,
            uploaded_name=uploaded_name,
        )

    with tab_agent:
        matches = render_matching(anfrage, fuzzy_threshold)
        hydrate_existing_review_state(
            content_hash=content_hash, matches=matches,
        )
        render_agent_chat(
            anfrage=anfrage,
            matches=matches,
            content_hash=content_hash,
        )


if __name__ == "__main__":
    run()
