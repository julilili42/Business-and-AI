"""Pytest entry point for the eval harness.

Marked with ``eval`` so it doesn't run during the default ``pytest``
invocation. Run explicitly with::

    uv run pytest testing/ -m eval
"""
from __future__ import annotations

from pathlib import Path

import pytest

from quoting.pipeline.orchestrator import QuotingPipeline

from testing.eval.case_loader import discover_cases, load_case
from testing.eval.orchestrator import evaluate_one

CASES_ROOT = Path(__file__).parent / "eval" / "cases"


def _case_ids():
    """Discover cases at collection time so each gets its own pytest item."""
    if not CASES_ROOT.exists():
        return []
    return [c.name for c in discover_cases(CASES_ROOT)]


@pytest.fixture(scope="module")
def pipeline() -> QuotingPipeline:
    """One pipeline per pytest run; amortises stammdaten loading."""
    return QuotingPipeline()


@pytest.mark.eval
@pytest.mark.parametrize("case_name", _case_ids())
def test_case(case_name: str, pipeline: QuotingPipeline, tmp_path: Path) -> None:
    matches = [c for c in discover_cases(CASES_ROOT) if c.name == case_name]
    assert matches, f"case {case_name!r} disappeared between collection and run"
    case = load_case(matches[0])

    scores = evaluate_one(case, pipeline=pipeline, output_root=tmp_path)

    assert scores.run.success, f"pipeline crashed: {scores.run.error}"
    assert not scores.threshold_failures, (
        f"threshold failures: {scores.threshold_failures}"
    )
