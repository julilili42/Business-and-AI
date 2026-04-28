"""Dashboard — landing page for the Streamlit review UI.

Shows every review on disk with its current status, plus value-oriented
statistics (extraction quality, match rate, time saved). Each row links
into the review detail via ``?review_id=…``.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime
from pathlib import Path

import streamlit as st

from quoting.ui.review_ui.review_loader import ReviewSummary, scan_reviews


# Conservative estimate: how long would a human take to do one review by
# hand (open mail, read RFQ, look up master data, type quotation)? Used
# only for the "time saved" headline.
MINUTES_PER_MANUAL_REVIEW = 15


_STATUS_LABEL = {
    "abgeschlossen": "Abgeschlossen",
    "pdf_bereit":    "PDF bereit",
    "in_arbeit":     "In Arbeit",
}

_STATUS_PILL_CLASS = {
    "abgeschlossen": "ek-pill ek-pill-success",
    "pdf_bereit":    "ek-pill ek-pill-info",
    "in_arbeit":     "ek-pill ek-pill-warning",
}


# ---------------------------------------------------------------- entry point


def render_dashboard(reviews_root: Path) -> None:
    """Top-level dashboard renderer."""
    summaries = scan_reviews(reviews_root)

    _render_hero()

    if not summaries:
        _render_empty_state()
        return

    st.markdown("&nbsp;", unsafe_allow_html=True)
    _render_value_metrics(summaries)

    st.markdown("---")
    _render_status_filter_and_list(summaries)

    st.markdown("---")
    _render_insights(summaries)


# ------------------------------------------------------------------- hero


def _render_hero() -> None:
    st.markdown(
        """
        <div class="ek-title-block">
            <h1 class="ek-title">
                Quoting-Übersicht<span class="ek-accent-dot">.</span>
            </h1>
            <p class="ek-subtitle">
                Alle Anfragen, die durch die KI-Pipeline gelaufen sind —
                inklusive Status, Match-Qualität und Bearbeitungsverlauf.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _render_empty_state() -> None:
    st.info(
        "Noch keine Reviews vorhanden. Sobald aus Outlook eine Anfrage "
        "an die Review-API gesendet wird, erscheint sie hier — "
        "alternativ links eine Datei hochladen und ein Angebot manuell "
        "generieren.",
        icon="📭",
    )


# ------------------------------------------------------------------- metrics


def _render_value_metrics(summaries: list[ReviewSummary]) -> None:
    """Headline KPIs that show *operational* value of the solution."""
    total = len(summaries)

    avg_positions = (
        sum(s.positions for s in summaries) / total if total else 0
    )

    matched = sum(s.matched for s in summaries)
    total_positions = sum(s.positions for s in summaries)
    avg_match_rate = matched / total_positions if total_positions else 0.0

    high_conf = sum(s.confidence_high for s in summaries)
    conf_rate = high_conf / total_positions if total_positions else 0.0

    minutes_saved = total * MINUTES_PER_MANUAL_REVIEW
    hours_saved = minutes_saved / 60

    st.markdown(
        '<div class="ek-section-label">Operative Wirkung</div>',
        unsafe_allow_html=True,
    )

    c1, c2, c3, c4 = st.columns(4)
    c1.metric(
        "Reviews bearbeitet",
        f"{total}",
        help="Gesamtanzahl der Anfragen, die durch die Pipeline gelaufen sind.",
    )
    c2.metric(
        "Ø Positionen",
        f"{avg_positions:.1f}",
        help="Durchschnittliche Anzahl Positionen pro Anfrage.",
    )
    c3.metric(
        "Ø Match-Quote",
        f"{avg_match_rate:.0%}",
        help=(
            "Anteil aller Positionen, für die ein Stammdaten-Treffer "
            "gefunden wurde — weniger manuelle Suche."
        ),
    )
    c4.metric(
        "Geschätzte Zeitersparnis",
        f"{hours_saved:.1f} h",
        help=(
            f"Annahme: ~{MINUTES_PER_MANUAL_REVIEW} Min pro Anfrage manuell. "
            "Konservativ geschätzt."
        ),
    )

    # Secondary row: extraction-quality breakdown
    st.markdown("&nbsp;", unsafe_allow_html=True)
    c5, c6, c7, c8 = st.columns(4)
    c5.metric(
        "KI-Konfidenz hoch",
        f"{conf_rate:.0%}",
        help="Anteil Positionen, die das Modell mit hoher Sicherheit extrahiert hat.",
    )
    c6.metric(
        "Konfidenz mittel",
        sum(s.confidence_medium for s in summaries),
        help="Positionen mit mittlerer Sicherheit — manuelles Auge empfohlen.",
    )
    c7.metric(
        "Konfidenz gering",
        sum(s.confidence_low for s in summaries),
        help="Positionen mit geringer Sicherheit — sollten geprüft werden.",
    )
    c8.metric(
        "Kein Stammdaten-Treffer",
        sum(s.matches_no_match for s in summaries),
        help="Positionen ohne Stammdaten-Match — manueller Review notwendig.",
    )


# ------------------------------------------------------------------ list view


def _render_status_filter_and_list(summaries: list[ReviewSummary]) -> None:
    st.markdown(
        '<div class="ek-section-label">Reviews</div>',
        unsafe_allow_html=True,
    )

    col_filter, _spacer, col_search = st.columns([2, 1, 2])
    with col_filter:
        status_filter = st.radio(
            "Status",
            options=["Alle", "In Arbeit", "PDF bereit", "Abgeschlossen"],
            horizontal=True,
            label_visibility="collapsed",
        )
    with col_search:
        query = st.text_input(
            "Suche",
            placeholder="🔍 Betreff oder Absender…",
            label_visibility="collapsed",
        )

    filtered = _apply_filters(summaries, status_filter, query)

    if not filtered:
        st.caption(
            f"Keine Reviews mit Filter „{status_filter}“ gefunden."
        )
        return

    st.caption(f"{len(filtered)} von {len(summaries)} Reviews")

    for s in filtered:
        _render_review_row(s)


def _apply_filters(
    summaries: list[ReviewSummary],
    status_filter: str,
    query: str,
) -> list[ReviewSummary]:
    target = {
        "Alle": None,
        "In Arbeit": "in_arbeit",
        "PDF bereit": "pdf_bereit",
        "Abgeschlossen": "abgeschlossen",
    }.get(status_filter)

    q = (query or "").strip().lower()
    out = []
    for s in summaries:
        if target and s.status != target:
            continue
        if q and q not in s.subject.lower() and q not in s.sender.lower():
            continue
        out.append(s)
    return out


def _render_review_row(s: ReviewSummary) -> None:
    """One review as a horizontal card with a deep-link button."""
    pdf_marker = "📄 PDF" if s.pdf_path else "—"
    overrides_marker = (
        f"✏️ {s.manual_overrides_count} Anpassungen"
        if s.manual_overrides_count
        else ""
    )

    st.markdown(
        f"""
        <div class="ek-review-row">
            <div class="ek-review-row-head">
                <span class="{_STATUS_PILL_CLASS[s.status]}">
                    <span class="ek-pill-dot"></span>
                    {_STATUS_LABEL[s.status]}
                </span>
                <code class="ek-review-id">{s.review_id}</code>
                <span class="ek-review-date">{_format_date(s.updated_at)}</span>
            </div>
            <div class="ek-review-subject">{_safe_html(s.subject)}</div>
            <div class="ek-review-meta">
                <span>{_safe_html(s.sender) or "—"}</span>
                <span>·</span>
                <span>{s.positions} Positionen</span>
                <span>·</span>
                <span>Match {s.match_rate:.0%}</span>
                <span>·</span>
                <span>{s.total_eur:,.2f} {s.currency}</span>
                <span>·</span>
                <span>{pdf_marker}</span>
                {f'<span>·</span><span>{overrides_marker}</span>' if overrides_marker else ''}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    col_open, col_pdf, _spacer = st.columns([1, 1, 4])
    with col_open:
        if st.button(
            "Öffnen →",
            key=f"open_{s.review_id}",
            use_container_width=True,
            type="primary",
        ):
            st.query_params["review_id"] = s.review_id
            st.rerun()
    with col_pdf:
        if s.pdf_path and s.pdf_path.exists():
            st.download_button(
                label="PDF",
                data=s.pdf_path.read_bytes(),
                file_name=s.pdf_path.name,
                mime="application/pdf",
                key=f"pdf_{s.review_id}",
                use_container_width=True,
            )

    st.markdown(
        '<div style="height:8px;"></div>',
        unsafe_allow_html=True,
    )


# ------------------------------------------------------------------ insights


def _render_insights(summaries: list[ReviewSummary]) -> None:
    st.markdown(
        '<div class="ek-section-label">Insights</div>',
        unsafe_allow_html=True,
    )

    col_a, col_b = st.columns(2)

    with col_a:
        st.markdown("**Match-Verteilung über alle Reviews**")
        match_breakdown = {
            "Exakt":          sum(s.matches_exact for s in summaries),
            "Fuzzy":          sum(s.matches_fuzzy for s in summaries),
            "Semantisch":     sum(s.matches_semantic for s in summaries),
            "Kein Treffer":   sum(s.matches_no_match for s in summaries),
        }
        st.bar_chart(match_breakdown, height=240)
        st.caption(
            "Je höher der Anteil exakter Treffer, desto weniger manuelle "
            "Stammdatensuche fällt im Vertrieb an."
        )

    with col_b:
        st.markdown("**KI-Konfidenz der extrahierten Positionen**")
        conf_breakdown = {
            "Hoch":   sum(s.confidence_high for s in summaries),
            "Mittel": sum(s.confidence_medium for s in summaries),
            "Gering": sum(s.confidence_low for s in summaries),
        }
        st.bar_chart(conf_breakdown, height=240)
        st.caption(
            "Sehr viele „Mittel“ oder „Gering“ deuten auf schlecht "
            "lesbare Quelldokumente hin (OCR, Scan-Qualität)."
        )

    # Top extracted articles — operational insight, NOT a sales metric
    article_counter: Counter[str] = Counter()
    for s in summaries:
        for art in s.extracted_articles:
            if art:
                article_counter[art] += 1

    top = article_counter.most_common(10)
    if top:
        st.markdown(
            '<div class="ek-section-label" style="margin-top:24px;">'
            "Häufigste angefragte Artikel"
            "</div>",
            unsafe_allow_html=True,
        )
        st.dataframe(
            [{"Artikel-Nr.": a, "Anfragen": n} for a, n in top],
            use_container_width=True,
            hide_index=True,
        )
        st.caption(
            "Artikel mit hoher Anfragefrequenz lohnen besonders genaue "
            "Stammdaten-Pflege und Preisstaffeln."
        )


# ------------------------------------------------------------------ helpers


def _format_date(dt: datetime) -> str:
    if dt.year < 2000:
        return "—"
    return dt.strftime("%d.%m.%Y · %H:%M")


def _safe_html(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
