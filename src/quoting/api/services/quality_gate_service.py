"""Server-side approval quality gate.

The React UI has a client-side quality gate for ergonomics, but the
finalize endpoint must enforce the same class of checks before it writes
a final PDF and marks the review approved.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Literal

from quoting.core import Anfrage
from quoting.matching import MatchResult
from quoting.pricing import Quotation

IssueSeverity = Literal["blocker", "warning"]
IssueStep = Literal["positions", "customer"]

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


@dataclass(frozen=True)
class QualityIssue:
    id: str
    severity: IssueSeverity
    step: IssueStep
    title: str
    description: str = ""


@dataclass(frozen=True)
class QualityGateResult:
    blockers: list[QualityIssue]
    warnings: list[QualityIssue]
    stats: dict[str, int | float]

    @property
    def can_approve(self) -> bool:
        return len(self.blockers) == 0

    @property
    def requires_acknowledgement(self) -> bool:
        return bool(self.blockers or self.warnings)

    def to_dict(self) -> dict:
        return {
            "blockers": [asdict(issue) for issue in self.blockers],
            "warnings": [asdict(issue) for issue in self.warnings],
            "canApprove": self.can_approve,
            "stats": self.stats,
        }


def evaluate_quality_gate(
    anfrage: Anfrage,
    matches: list[MatchResult],
    quotation: Quotation | None,
    overrides: list[dict] | None = None,
) -> QualityGateResult:
    blockers: list[QualityIssue] = []
    warnings: list[QualityIssue] = []
    overrides = overrides or []

    positions = list(anfrage.positionen)
    total_positions = len(positions)
    active_pos_nrs = {pos.pos_nr for pos in positions}
    active_matches = [match for match in matches if match.pos_nr in active_pos_nrs]

    price_override_pos_nrs = _price_override_pos_nrs(overrides)
    price_override_articles = _price_override_articles(overrides)

    unmatched = [match for match in active_matches if match.status == "no_match"]
    unmatched_without_price_override = [
        match
        for match in unmatched
        if not _has_price_override(match, price_override_pos_nrs, price_override_articles)
    ]
    unmatched_blocker_pos_nrs = {match.pos_nr for match in unmatched_without_price_override}

    matched_count = len([match for match in active_matches if match.status != "no_match"])
    match_rate = 1.0 if total_positions == 0 else matched_count / total_positions

    for match in unmatched_without_price_override:
        blockers.append(
            QualityIssue(
                id=f"unmatched:{match.pos_nr}",
                severity="blocker",
                step="positions",
                title=f"Pos {match.pos_nr}: kein Stammdaten-Treffer",
                description=(
                    "Bitte einen Artikel manuell zuordnen oder einen Stückpreis eintragen."
                ),
            )
        )

    if not _text(anfrage.kunde_firma):
        blockers.append(
            QualityIssue(
                id="customer:firma",
                severity="blocker",
                step="customer",
                title="Kundenfirma fehlt",
                description="Pflichtfeld auf dem PDF-Header.",
            )
        )

    if not _text(anfrage.kunde_email) and not _text(anfrage.kunde_ansprechpartner):
        blockers.append(
            QualityIssue(
                id="customer:contact",
                severity="blocker",
                step="customer",
                title="Ansprechpartner oder E-Mail fehlt",
                description="Mindestens eines der beiden Felder muss gesetzt sein.",
            )
        )

    if quotation is not None:
        for item in quotation.items:
            if item.pos_nr in unmatched_blocker_pos_nrs:
                continue
            if item.einzelpreis <= 0 or item.gesamtpreis <= 0:
                blockers.append(
                    QualityIssue(
                        id=f"price:zero:{item.pos_nr}",
                        severity="blocker",
                        step="positions",
                        title=f"Pos {item.pos_nr}: Preis ist 0,00 EUR",
                        description="Bitte Stückpreis und Gesamtpreis vor der Freigabe prüfen.",
                    )
                )

    if not _text(anfrage.belegnummer):
        warnings.append(
            QualityIssue(
                id="belegnummer-missing",
                severity="warning",
                step="customer",
                title="Belegnummer leer",
                description="Ohne Belegnummer ist die Zuordnung im Backoffice mühsam.",
            )
        )

    if not _text(anfrage.kundennummer):
        warnings.append(
            QualityIssue(
                id="kundennummer-missing",
                severity="warning",
                step="customer",
                title="Kundennummer fehlt",
            )
        )

    if not _text(anfrage.datum):
        warnings.append(
            QualityIssue(
                id="datum-missing",
                severity="warning",
                step="customer",
                title="Anfragedatum fehlt",
            )
        )

    email = _text(anfrage.kunde_email)
    if email and not _EMAIL_RE.match(email):
        warnings.append(
            QualityIssue(
                id="email-format",
                severity="warning",
                step="customer",
                title="E-Mail-Adresse wirkt unvollständig",
                description=f'"{email}" sieht nicht wie eine gültige Adresse aus.',
            )
        )

    price_warning_count = len(quotation.warnungen) if quotation is not None else 0
    if price_warning_count > 0:
        warnings.append(
            QualityIssue(
                id="price-warnings",
                severity="warning",
                step="positions",
                title=f"{price_warning_count} Preiswarnung(en) aus Kalkulation",
                description="Das Pricing hat Auffälligkeiten gemeldet.",
            )
        )

    if total_positions >= 3 and match_rate < 0.5:
        warnings.append(
            QualityIssue(
                id="low-match-rate",
                severity="warning",
                step="positions",
                title=f"Niedrige Trefferquote ({round(match_rate * 100)}%)",
                description="Weniger als die Hälfte der Positionen wurde sicher zugeordnet.",
            )
        )

    return QualityGateResult(
        blockers=blockers,
        warnings=warnings,
        stats={
            "totalPositions": total_positions,
            "unmatched": len(unmatched),
            "unmatchedWithoutPriceOverride": len(unmatched_without_price_override),
            "matchRate": match_rate,
        },
    )


def _text(value: object) -> str:
    return str(value).strip() if value is not None else ""


def _price_override_pos_nrs(overrides: list[dict]) -> set[int]:
    result: set[int] = set()
    for override in overrides:
        if not isinstance(override, dict):
            continue
        if override.get("target") != "pos":
            continue
        if override.get("mode") not in {"unit_price_eur", "total_price_eur"}:
            continue
        try:
            result.add(int(override.get("pos_nr") or 0))
        except (TypeError, ValueError):
            continue
    return result


def _price_override_articles(overrides: list[dict]) -> set[str]:
    result: set[str] = set()
    for override in overrides:
        if not isinstance(override, dict):
            continue
        if override.get("target") != "artikel":
            continue
        if override.get("mode") not in {"unit_price_eur", "total_price_eur"}:
            continue
        article = _text(override.get("artikel_nr"))
        if article:
            result.add(article)
    return result


def _has_price_override(
    match: MatchResult,
    price_override_pos_nrs: set[int],
    price_override_articles: set[str],
) -> bool:
    if match.pos_nr in price_override_pos_nrs:
        return True
    return bool(match.matched_artikelnr and match.matched_artikelnr in price_override_articles)
