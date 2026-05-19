"""Tests for the server-side approval quality gate."""
from __future__ import annotations

import pytest

from quoting.api.services.quality_gate_service import evaluate_quality_gate
from quoting.core import Anfrage, Position
from quoting.matching import MatchResult
from quoting.pricing import Quotation, QuotationItem


def _position(pos_nr: int = 1) -> Position:
    return Position(
        pos_nr=pos_nr,
        artikelnummer=f"ART-{pos_nr}",
        bezeichnung="Gleitstück",
        menge=1,
        einheit="Stück",
        confidence="high",
        source_quote="Pos 1",
    )


def _anfrage(**updates) -> Anfrage:
    data = {
        "kunde_firma": "Muster GmbH",
        "kunde_ansprechpartner": "Max Mustermann",
        "kunde_email": "max@example.com",
        "kundennummer": "K-100",
        "belegnummer": "RFQ-1",
        "datum": "2026-05-19",
        "positionen": [_position()],
    }
    data.update(updates)
    return Anfrage(**data)


def _quotation(*items: QuotationItem, warnungen: list[str] | None = None) -> Quotation:
    return Quotation(
        kunde_firma="Muster GmbH",
        kunde_ansprechpartner="Max Mustermann",
        kunde_email="max@example.com",
        kundennummer="K-100",
        belegnummer="RFQ-1",
        incoterms=None,
        zahlungsbedingungen=None,
        items=list(items),
        gesamtsumme=sum(item.gesamtpreis for item in items),
        waehrung="EUR",
        warnungen=warnungen or [],
    )


def _item(pos_nr: int = 1, einzelpreis: float = 12.5, gesamtpreis: float = 12.5) -> QuotationItem:
    return QuotationItem(
        pos_nr=pos_nr,
        artikel_nr=f"ART-{pos_nr}",
        bezeichnung="Gleitstück",
        menge=1,
        einheit="Stück",
        einzelpreis=einzelpreis,
        rabatt_prozent=0,
        gesamtpreis=gesamtpreis,
        bemerkung="",
    )


def test_blocks_unmatched_position_without_manual_price() -> None:
    gate = evaluate_quality_gate(
        _anfrage(),
        [MatchResult(pos_nr=1, status="no_match", score=0)],
        _quotation(_item()),
        [],
    )

    assert [issue.id for issue in gate.blockers] == ["unmatched:1"]
    assert gate.can_approve is False
    assert gate.requires_acknowledgement is True


def test_manual_position_price_clears_unmatched_blocker() -> None:
    gate = evaluate_quality_gate(
        _anfrage(),
        [MatchResult(pos_nr=1, status="no_match", score=0)],
        _quotation(_item(einzelpreis=50, gesamtpreis=50)),
        [{"target": "pos", "pos_nr": 1, "mode": "unit_price_eur", "unit_price_eur": 50}],
    )

    assert gate.blockers == []


@pytest.mark.parametrize(
    ("einzelpreis", "gesamtpreis"),
    [(0, 10), (10, 0), (-1, 10), (10, -1)],
)
def test_blocks_zero_or_negative_prices(einzelpreis: float, gesamtpreis: float) -> None:
    gate = evaluate_quality_gate(
        _anfrage(),
        [
            MatchResult(
                pos_nr=1,
                status="exact",
                score=1,
                matched_artikelnr="ART-1",
                matched_bezeichnung="Gleitstück",
            )
        ],
        _quotation(_item(einzelpreis=einzelpreis, gesamtpreis=gesamtpreis)),
        [],
    )

    assert [issue.id for issue in gate.blockers] == ["price:zero:1"]


def test_customer_contact_fields_are_enforced() -> None:
    gate = evaluate_quality_gate(
        _anfrage(kunde_firma="", kunde_ansprechpartner="", kunde_email=""),
        [],
        _quotation(),
        [],
    )

    assert {issue.id for issue in gate.blockers} == {"customer:firma", "customer:contact"}


def test_missing_backoffice_fields_are_warnings() -> None:
    gate = evaluate_quality_gate(
        _anfrage(belegnummer="", kundennummer="", datum="", kunde_email="broken"),
        [],
        _quotation(warnungen=["Pos 1: fuzzy match"]),
        [],
    )

    assert {issue.id for issue in gate.warnings} == {
        "belegnummer-missing",
        "kundennummer-missing",
        "datum-missing",
        "email-format",
        "price-warnings",
    }
    assert gate.can_approve is True
    assert gate.requires_acknowledgement is True
