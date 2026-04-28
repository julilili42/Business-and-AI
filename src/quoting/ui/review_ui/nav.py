"""Shared step vocabulary + navigation widgets.

The review UI uses a single-active-step layout (no tabs). The user
moves through three named stages — the same names that appear in the
Outlook plugin — and "Zurück" / "Weiter" buttons make the linear flow
explicit.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import streamlit as st


# ---------- shared step vocabulary -----------------------------------------


@dataclass(frozen=True)
class Step:
    num: int
    title: str
    description: str


STEPS: tuple[Step, ...] = (
    Step(1, "Anfrage analysieren",
         "Extrahierte Daten prüfen und Positionen korrigieren."),
    Step(2, "Angebot erstellen",
         "Stammdaten validieren und Angebots-PDF generieren."),
    Step(3, "Angebot versenden",
         "Per Chat anpassen und PDF für die Kundenmail bereitstellen."),
)


# ---------- step state -----------------------------------------------------


_STATE_KEY = "active_step"


def get_step() -> int:
    return int(st.session_state.get(_STATE_KEY, 1))


def set_step(n: int) -> None:
    st.session_state[_STATE_KEY] = max(1, min(len(STEPS), int(n)))


def reset_step() -> None:
    st.session_state[_STATE_KEY] = 1


# ---------- visual indicator ----------------------------------------------


def render_step_indicator() -> None:
    """Three cards in a row showing where the user is."""
    current = get_step()
    parts = ['<div class="ek-steps">']
    for s in STEPS:
        cls = "ek-step"
        if s.num < current:
            cls += " done"
        elif s.num == current:
            cls += " active"
        marker = "✓" if s.num < current else f"{s.num:02d}"
        parts.append(
            f'<div class="{cls}">'
            f'  <div class="ek-step-num">{marker}</div>'
            f'  <div class="ek-step-title">{s.title}</div>'
            f'  <p class="ek-step-desc">{s.description}</p>'
            "</div>"
        )
    parts.append("</div>")
    st.markdown("".join(parts), unsafe_allow_html=True)


# ---------- nav buttons ----------------------------------------------------


def render_step_nav(
    *,
    can_advance: bool = True,
    advance_disabled_reason: str = "",
    on_finish: Callable[[], None] | None = None,
    finish_label: str = "Fertig stellen",
) -> None:
    """Bottom navigation bar inside a step.

    - On step 1: only ``Weiter →``
    - On step 2: both buttons
    - On step 3: ``← Zurück`` + optional ``finish`` action
    """
    current = get_step()
    total = len(STEPS)

    cols = st.columns([1, 2, 1])

    with cols[0]:
        if current > 1:
            if st.button(
                "← Zurück",
                key=f"_nav_back_{current}",
                use_container_width=True,
            ):
                set_step(current - 1)
                st.rerun()

    with cols[2]:
        if current < total:
            if st.button(
                "Weiter →",
                key=f"_nav_next_{current}",
                type="primary",
                disabled=not can_advance,
                use_container_width=True,
                help=advance_disabled_reason if not can_advance else None,
            ):
                set_step(current + 1)
                st.rerun()
        elif on_finish is not None:
            if st.button(
                finish_label,
                key=f"_nav_finish_{current}",
                type="primary",
                use_container_width=True,
            ):
                on_finish()
