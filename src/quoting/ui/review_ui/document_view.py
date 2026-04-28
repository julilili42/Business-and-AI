"""Original-request preview pane (left side of the review tab).

Renders the uploaded PDF inline so the reviewer can compare extracted
data against the source document at a glance.
"""
from __future__ import annotations

import base64
from pathlib import Path

import streamlit as st


def render_original_request(input_path: Path, payload: bytes) -> None:
    st.markdown(
        '<div class="ek-section-label">Original-Anfrage</div>',
        unsafe_allow_html=True,
    )

    if input_path.suffix.lower() == ".pdf":
        pdf_b64 = base64.b64encode(payload).decode()
        st.markdown(
            f"""
            <iframe
                src="data:application/pdf;base64,{pdf_b64}"
                style="
                    width: 100%;
                    height: 850px;
                    border: 1px solid var(--ek-border);
                    border-radius: 14px;
                    background: white;
                    box-shadow: var(--ek-shadow-1);
                "
            ></iframe>
            """,
            unsafe_allow_html=True,
        )
    else:
        st.warning(
            f"Vorschau für **{input_path.suffix.upper()}**-Dateien wird nicht "
            "unterstützt. Die Datei wird trotzdem extrahiert."
        )
