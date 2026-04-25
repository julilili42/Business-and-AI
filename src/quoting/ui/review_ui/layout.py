from __future__ import annotations

import base64
from pathlib import Path

import streamlit as st


ASSETS_DIR = Path(__file__).resolve().parents[1] / "assets"


def img_to_base64(path: Path) -> str | None:
    if not path.exists():
        return None

    return base64.b64encode(path.read_bytes()).decode()


def apply_style() -> None:
    st.markdown(
        """
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');

            html, body, [data-testid="stAppViewContainer"] {
                font-family: 'Inter', sans-serif;
                background-color: #fcfcfc;
            }

            .header-container {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                gap: 50px;
                padding: 30px 20px;
                background: white;
                border-bottom: 1px solid #eee;
                margin-bottom: 38px;
            }

            .support-label {
                font-size: 13px;
                font-weight: 700;
                color: #adb5bd;
                text-transform: uppercase;
                letter-spacing: 2px;
            }

            .partner-logo {
                height: 80px;
                width: auto;
                object-fit: contain;
            }

            .review-title-block {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 24px;
                padding: 4px 0 6px 0;
            }

            .review-title {
                font-size: 42px;
                line-height: 1.1;
                margin: 0;
                color: #111827;
                font-weight: 900;
            }

            .review-subtitle {
                margin-top: 8px;
                color: #6b7280;
                font-size: 15px;
            }

            .review-subtitle code {
                background: #eef2ff;
                color: #1e3a8a;
                padding: 3px 7px;
                border-radius: 7px;
                font-size: 13px;
            }

            [data-testid="stSidebar"] {
                background-color: #ffffff !important;
                border-right: 1px solid #f1f5f9;
            }

            .stButton>button {
                border-radius: 10px;
                font-weight: bold;
                padding: 0.75rem 2rem;
            }

            [data-testid="stMetric"] {
                background: #ffffff;
                border: 1px solid #eef2f7;
                border-radius: 16px;
                padding: 16px;
                box-shadow: 0 6px 20px rgba(15, 23, 42, 0.04);
            }

            .review-id-box {
                background: #ecfdf5;
                color: #047857;
                border: 1px solid #bbf7d0;
                border-radius: 14px;
                padding: 14px;
                font-weight: 800;
                margin-bottom: 12px;
            }

            .sidebar-caption {
                color: #6b7280;
                font-size: 13px;
                line-height: 1.5;
                margin-bottom: 24px;
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_header() -> None:
    st_logo = img_to_base64(ASSETS_DIR / "logo_bw_stiftung.png")
    wp_logo = img_to_base64(ASSETS_DIR / "logo_bw_wappen.png")
    bw_bank_logo = img_to_base64(ASSETS_DIR / "logo_bw_bank.png")

    header_html = '<div class="header-container"><span class="support-label">Unterstützt durch</span>'

    if st_logo:
        header_html += f'<img src="data:image/png;base64,{st_logo}" class="partner-logo">'

    if wp_logo:
        header_html += f'<img src="data:image/png;base64,{wp_logo}" class="partner-logo">'

    if bw_bank_logo:
        header_html += f'<img src="data:image/png;base64,{bw_bank_logo}" class="partner-logo">'

    header_html += "</div>"

    st.markdown(header_html, unsafe_allow_html=True)


def render_sidebar(review_id: str | None = None):
    with st.sidebar:
        elring_logo = img_to_base64(ASSETS_DIR / "logo_elringklinger.png")

        if elring_logo:
            st.markdown(
                f'<img src="data:image/png;base64,{elring_logo}" '
                f'style="width: 100%; margin-bottom: 24px;">',
                unsafe_allow_html=True,
            )
        else:
            st.title("ElringKlinger")

        uploaded = None

        if review_id:
            st.markdown(
                f'<div class="review-id-box">Review geladen<br><code>{review_id}</code></div>',
                unsafe_allow_html=True,
            )
            st.markdown(
                '<div class="sidebar-caption">'
                "Änderungen werden in diesem Review gespeichert und überschreiben "
                "die aktuelle Review-Version."
                "</div>",
                unsafe_allow_html=True,
            )
        else:
            st.markdown("### 📥 Dateiupload")
            uploaded = st.file_uploader(
                "Anfrage hochladen",
                type=["pdf", "msg", "eml", "xlsx", "xls"],
                label_visibility="collapsed",
            )

        st.markdown("---")

        fuzzy_threshold = st.slider(
            "Fuzzy-Match Schwellenwert",
            min_value=50,
            max_value=100,
            value=85,
        )

        st.info(
            "💡 **Workflow:**\n"
            "1. Anfrage prüfen\n"
            "2. Daten korrigieren\n"
            "3. Match prüfen\n"
            "4. PDF aktualisieren"
        )

    return uploaded, fuzzy_threshold