"""Extraction-step metrics.

Compares an actual `Anfrage` to an `ExpectedAnfrage` and reports:

- ``position_count_correct``      — produced N positions iff expected N
- ``per_field_recall``            — per scored field, what fraction was
                                    correctly extracted
- ``overall_f1``                  — micro-averaged F1 over all scored
                                    (position, field) cells. Precision
                                    and recall are equal here because
                                    we score one cell per expected one
                                    AND penalize extra positions in
                                    precision, so we report F1.

Positions are aligned by ``pos_nr``. If the model produced a position
with no expected counterpart, every field on it counts as a false
positive.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from quoting.core import Anfrage, Position

from ..schema import ExpectedAnfrage, ExpectedPosition

# Header fields on the Anfrage itself (not on positions).
_HEADER_FIELDS = (
    "belegnummer",
    "kunde_firma",
    "kunde_ansprechpartner",
    "kunde_email",
    "incoterms",
    "zahlungsbedingungen",
)

# Position fields that an `ExpectedPosition` may carry.
_POSITION_FIELDS = (
    "artikelnummer",
    "bezeichnung",
    "menge",
    "einheit",
    "werkstoff",
    "abmessungen",
    "zeichnungsnummer",
    "ist_zertifikat",
)


@dataclass
class ExtractionScore:
    position_count_correct: bool
    expected_position_count: int
    actual_position_count: int
    per_field_recall: dict[str, float] = field(default_factory=dict)
    per_field_counts: dict[str, tuple[int, int]] = field(default_factory=dict)
    # Free-form per-position issues for the report.
    missing_positions: list[int] = field(default_factory=list)
    extra_positions: list[int] = field(default_factory=list)
    mismatches: list[str] = field(default_factory=list)
    overall_f1: float = 0.0


def score_extraction(actual: Anfrage, expected: ExpectedAnfrage) -> ExtractionScore:
    actual_by_pos = {p.pos_nr: p for p in actual.positionen}
    expected_by_pos = {p.pos_nr: p for p in expected.positionen}

    missing = sorted(set(expected_by_pos) - set(actual_by_pos))
    extra = sorted(set(actual_by_pos) - set(expected_by_pos))

    per_field_counts: dict[str, tuple[int, int]] = {}
    mismatches: list[str] = []

    # Header fields (one cell per scored field, total).
    for field_name in _HEADER_FIELDS:
        exp = getattr(expected, field_name)
        if exp is None:
            continue
        act = getattr(actual, field_name)
        hits, totals = per_field_counts.get(field_name, (0, 0))
        if _values_equal(act, exp):
            hits += 1
        else:
            mismatches.append(
                f"header.{field_name}: expected {exp!r}, got {act!r}"
            )
        totals += 1
        per_field_counts[field_name] = (hits, totals)

    # Position fields (one cell per (position, field) pair).
    for pos_nr, exp_pos in expected_by_pos.items():
        actual_pos = actual_by_pos.get(pos_nr)
        for field_name in _POSITION_FIELDS:
            exp = getattr(exp_pos, field_name)
            if exp is None:
                continue
            hits, totals = per_field_counts.get(field_name, (0, 0))
            if actual_pos is None:
                mismatches.append(
                    f"pos {pos_nr}.{field_name}: position missing entirely"
                )
            else:
                act = getattr(actual_pos, field_name)
                if _values_equal(act, exp):
                    hits += 1
                else:
                    mismatches.append(
                        f"pos {pos_nr}.{field_name}: expected {exp!r}, got {act!r}"
                    )
            totals += 1
            per_field_counts[field_name] = (hits, totals)

    per_field_recall = {
        name: (hits / totals if totals else 0.0)
        for name, (hits, totals) in per_field_counts.items()
    }

    # Micro-F1: precision penalises every scored field on every extra
    # position; recall penalises every missing expected cell.
    total_expected_cells = sum(t for _, t in per_field_counts.values())
    total_correct_cells = sum(h for h, _ in per_field_counts.values())
    extra_cells = len(extra) * _count_scored_position_fields(expected_by_pos)
    precision_denom = total_correct_cells + (
        total_expected_cells - total_correct_cells
    ) + extra_cells
    precision = (
        total_correct_cells / precision_denom if precision_denom else 0.0
    )
    recall = (
        total_correct_cells / total_expected_cells
        if total_expected_cells
        else 0.0
    )
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall)
        else 0.0
    )

    return ExtractionScore(
        position_count_correct=(len(missing) == 0 and len(extra) == 0),
        expected_position_count=len(expected_by_pos),
        actual_position_count=len(actual_by_pos),
        per_field_recall=per_field_recall,
        per_field_counts=per_field_counts,
        missing_positions=missing,
        extra_positions=extra,
        mismatches=mismatches,
        overall_f1=f1,
    )


def _count_scored_position_fields(
    expected_by_pos: dict[int, ExpectedPosition],
) -> int:
    """Average scored-fields-per-position, rounded."""
    if not expected_by_pos:
        return 0
    total = sum(
        sum(1 for f in _POSITION_FIELDS if getattr(p, f) is not None)
        for p in expected_by_pos.values()
    )
    return total // len(expected_by_pos)


def _values_equal(actual, expected) -> bool:
    """Forgiving equality: numbers compare with tolerance, strings stripped+casefolded."""
    if isinstance(expected, float) or isinstance(actual, float):
        try:
            return abs(float(actual) - float(expected)) < 1e-6
        except (TypeError, ValueError):
            return False
    if isinstance(expected, bool) or isinstance(actual, bool):
        return bool(actual) == bool(expected)
    if isinstance(expected, str):
        if actual is None:
            return False
        return str(actual).strip().casefold() == expected.strip().casefold()
    return actual == expected


def _position_field_value(pos: Position, name: str):
    return getattr(pos, name, None)
