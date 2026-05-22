"""Pricing-step metrics.

Pricing is fully deterministic, so we compare with absolute tolerance
(per-item and on the total). Each expected item carries its own
tolerance so different cases can be strict or loose.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from quoting.pricing import Quotation

from ..schema import ExpectedQuotation


@dataclass
class PricingScore:
    total_ok: bool | None
    total_diff_eur: float | None
    items_ok: int
    items_total: int
    item_issues: list[str] = field(default_factory=list)


def score_pricing(
    actual: Quotation, expected: ExpectedQuotation
) -> PricingScore:
    total_ok: bool | None = None
    total_diff: float | None = None
    if expected.gesamtsumme is not None:
        total_diff = abs(actual.gesamtsumme - expected.gesamtsumme)
        total_ok = total_diff <= expected.gesamtsumme_tolerance_eur

    actual_by_pos = {item.pos_nr: item for item in actual.items}
    items_ok = 0
    items_total = len(expected.items)
    issues: list[str] = []
    for exp in expected.items:
        act = actual_by_pos.get(exp.pos_nr)
        if act is None:
            issues.append(f"pos {exp.pos_nr}: missing from quotation")
            continue
        problems: list[str] = []
        if exp.artikel_nr is not None and exp.artikel_nr != act.artikel_nr:
            problems.append(
                f"artikel_nr {act.artikel_nr!r} != {exp.artikel_nr!r}"
            )
        if exp.menge is not None and abs(act.menge - exp.menge) > 1e-6:
            problems.append(f"menge {act.menge} != {exp.menge}")
        if exp.einzelpreis is not None and (
            abs(act.einzelpreis - exp.einzelpreis) > exp.price_tolerance_eur
        ):
            problems.append(
                f"einzelpreis {act.einzelpreis} vs {exp.einzelpreis} "
                f"(tol {exp.price_tolerance_eur})"
            )
        if exp.gesamtpreis is not None and (
            abs(act.gesamtpreis - exp.gesamtpreis) > exp.price_tolerance_eur
        ):
            problems.append(
                f"gesamtpreis {act.gesamtpreis} vs {exp.gesamtpreis} "
                f"(tol {exp.price_tolerance_eur})"
            )
        if problems:
            issues.append(f"pos {exp.pos_nr}: " + "; ".join(problems))
        else:
            items_ok += 1

    return PricingScore(
        total_ok=total_ok,
        total_diff_eur=total_diff,
        items_ok=items_ok,
        items_total=items_total,
        item_issues=issues,
    )
