"""Streamlit editor for the extracted Anfrage.

Lets the reviewer correct customer details and per-position fields.
The data is stored back into ``st.session_state["anfrage"]`` and returned
so callers can keep using a fresh reference.
"""
from __future__ import annotations

import streamlit as st

from quoting.core import Anfrage


_CONFIDENCE_META = {
    "high":   {"icon": "🟢", "label": "Hohe Sicherheit",   "tone": "success"},
    "medium": {"icon": "🟡", "label": "Mittlere Sicherheit","tone": "warning"},
    "low":    {"icon": "🔴", "label": "Geringe Sicherheit", "tone": "danger"},
}


def _customer_block(anfrage: Anfrage) -> None:
    """Editable customer / header information."""
    with st.expander("Kunde & Header", expanded=True):
        c_k1, c_k2 = st.columns(2)
        anfrage.kunde_firma = c_k1.text_input(
            "Firma",
            anfrage.kunde_firma or "",
            placeholder="z. B. Musterfirma GmbH",
        )
        anfrage.kunde_ansprechpartner = c_k2.text_input(
            "Ansprechpartner",
            anfrage.kunde_ansprechpartner or "",
            placeholder="z. B. Frau Müller",
        )
        anfrage.kunde_email = c_k1.text_input(
            "E-Mail",
            anfrage.kunde_email or "",
            placeholder="kontakt@firma.de",
        )
        anfrage.belegnummer = c_k2.text_input(
            "Referenz-Nr.",
            anfrage.belegnummer or "",
            placeholder="z. B. ANF-2024-001",
        )


def _position_block(anfrage: Anfrage) -> list:
    """Editable per-position blocks. Returns the edited positions list."""
    st.markdown(
        '<div class="ek-section-label" style="margin-top:18px;">'
        f"Positionen · {len(anfrage.positionen)}"
        "</div>",
        unsafe_allow_html=True,
    )

    edited_positions = []
    for i, pos in enumerate(anfrage.positionen):
        meta = _CONFIDENCE_META.get(
            pos.confidence,
            {"icon": "⚪", "label": "Unbekannt", "tone": ""},
        )
        label = (
            f"{meta['icon']}  Pos {pos.pos_nr} · "
            f"{pos.artikelnummer or 'Unbekannt'}  ·  "
            f"{int(pos.menge)} {pos.einheit}"
        )

        with st.expander(label):
            st.caption(f"KI-Sicherheit: **{meta['label']}**")

            c1, c2 = st.columns(2)
            with c1:
                pos.artikelnummer = st.text_input(
                    "Artikelnummer",
                    pos.artikelnummer,
                    key=f"art_{i}",
                )
                pos.menge = st.number_input(
                    "Menge",
                    value=float(pos.menge),
                    key=f"mng_{i}",
                )
                pos.einheit = st.text_input(
                    "Einheit",
                    pos.einheit,
                    key=f"eh_{i}",
                )
            with c2:
                pos.liefertermin = st.text_input(
                    "Liefertermin",
                    pos.liefertermin or "",
                    key=f"lt_{i}",
                )
                pos.werkstoff = st.text_input(
                    "Werkstoff",
                    pos.werkstoff or "",
                    key=f"ws_{i}",
                )
                pos.zeichnungsnummer = st.text_input(
                    "Zeichnungs-Nr.",
                    pos.zeichnungsnummer or "",
                    key=f"zn_{i}",
                )

            pos.bezeichnung = st.text_area(
                "Bezeichnung",
                pos.bezeichnung,
                key=f"bez_{i}",
                height=72,
            )

            if pos.source_quote:
                st.caption(
                    f'**Quelle:** "{pos.source_quote[:120]}'
                    f'{"…" if len(pos.source_quote) > 120 else ""}"'
                )

        edited_positions.append(pos)
    return edited_positions


def render_editor(anfrage: Anfrage) -> Anfrage:
    """Render the full editor for an extracted Anfrage."""
    st.markdown(
        '<div class="ek-section-label">KI-extrahierte Daten · '
        "Bitte prüfen und korrigieren</div>",
        unsafe_allow_html=True,
    )

    _customer_block(anfrage)
    anfrage.positionen = _position_block(anfrage)

    st.session_state["anfrage"] = anfrage
    return anfrage
