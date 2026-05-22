"""Matching-step metrics.

Given a list of `MatchResult` (one per actual position) and an
`ExpectedMatches` ground truth, score:

- ``top1_accuracy`` — fraction of positions whose ``matched_artikelnr``
                      equals the expected one
- ``status_ok``      — if the expected case lists ``acceptable_status``,
                      check that the actual status is in that list

Top-5 recall would require the matcher to expose top-k candidates,
which it currently doesn't. Leaving the metric stubbed for later.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from quoting.matching import MatchResult

from ..schema import ExpectedMatches


@dataclass
class MatchingScore:
    top1_accuracy: float
    total: int
    correct: int
    status_violations: list[str] = field(default_factory=list)
    per_position: list[dict] = field(default_factory=list)


def score_matching(
    actual: list[MatchResult], expected: ExpectedMatches
) -> MatchingScore:
    actual_by_pos = {m.pos_nr: m for m in actual}
    correct = 0
    total = 0
    status_violations: list[str] = []
    per_position: list[dict] = []
    for exp in expected.matches:
        total += 1
        act = actual_by_pos.get(exp.pos_nr)
        actual_nr = act.matched_artikelnr if act else None
        is_correct = _norm(actual_nr) == _norm(exp.matched_artikelnr)
        if is_correct:
            correct += 1
        if exp.acceptable_status and act is not None:
            if act.status not in exp.acceptable_status:
                status_violations.append(
                    f"pos {exp.pos_nr}: status {act.status!r} not in "
                    f"{exp.acceptable_status}"
                )
        per_position.append(
            {
                "pos_nr": exp.pos_nr,
                "expected": exp.matched_artikelnr,
                "actual": actual_nr,
                "status": act.status if act else None,
                "score": act.score if act else None,
                "correct": is_correct,
            }
        )
    return MatchingScore(
        top1_accuracy=(correct / total if total else 0.0),
        total=total,
        correct=correct,
        status_violations=status_violations,
        per_position=per_position,
    )


def _norm(s: str | None) -> str:
    if s is None:
        return ""
    return "".join(s.upper().split())
