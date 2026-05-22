"""Top-level orchestration: cases on disk → scored reports.

The CLI and the pytest harness both go through `evaluate_all`, so the
glue between case loader, runner, metrics, and report lives in exactly
one place.
"""
from __future__ import annotations

from pathlib import Path

from quoting.pipeline.orchestrator import QuotingPipeline

from .case_loader import LoadedCase, discover_cases, load_case
from .metrics import (
    score_extraction,
    score_matching,
    score_pricing,
    score_rendering,
)
from .report import CaseScores
from .runner import run_case


def evaluate_all(
    cases_root: Path,
    *,
    only: list[str] | None = None,
    output_root: Path | None = None,
    pipeline: QuotingPipeline | None = None,
) -> list[CaseScores]:
    """Run every discovered case and return scored results."""
    pipeline = pipeline or QuotingPipeline()
    scored: list[CaseScores] = []
    for case_dir in discover_cases(cases_root, only=only):
        case = load_case(case_dir)
        scored.append(
            evaluate_one(case, pipeline=pipeline, output_root=output_root)
        )
    return scored


def evaluate_one(
    case: LoadedCase,
    *,
    pipeline: QuotingPipeline,
    output_root: Path | None = None,
) -> CaseScores:
    """Run one case and score whichever ground truth it ships."""
    run = run_case(case, pipeline=pipeline, output_root=output_root)
    scores = CaseScores(case_name=case.name, run=run)

    if not run.success or run.anfrage is None:
        # Pipeline crashed — no point computing per-step metrics, the
        # report formatter shows the traceback instead.
        return scores

    scores.extraction = score_extraction(run.anfrage, case.expected_anfrage)
    if case.expected_matches is not None:
        scores.matching = score_matching(run.matches, case.expected_matches)
    if case.expected_quotation is not None and run.quotation is not None:
        scores.pricing = score_pricing(run.quotation, case.expected_quotation)
    scores.rendering = score_rendering(run.pdf_path)

    scores.threshold_failures = _check_thresholds(case, scores)
    return scores


def _check_thresholds(case: LoadedCase, scores: CaseScores) -> list[str]:
    failures: list[str] = []
    m = case.manifest
    if m.min_extraction_f1 is not None and scores.extraction is not None:
        if scores.extraction.overall_f1 < m.min_extraction_f1:
            failures.append(
                f"extraction F1 {scores.extraction.overall_f1:.2f} "
                f"< {m.min_extraction_f1:.2f}"
            )
    if m.min_match_accuracy is not None and scores.matching is not None:
        if scores.matching.top1_accuracy < m.min_match_accuracy:
            failures.append(
                f"match accuracy {scores.matching.top1_accuracy:.2f} "
                f"< {m.min_match_accuracy:.2f}"
            )
    return failures
