"""Run the quoting pipeline against a loaded eval case.

The runner is deliberately thin: it instantiates `QuotingPipeline`,
calls each step, captures outputs + timing, and returns a `RunResult`.
Scoring lives in `metrics/`; reporting in `report.py`.

The runner does NOT swallow exceptions. A pipeline crash means the case
failed — that's a real outcome the report should show, not something to
hide. The CLI / pytest wrapper is responsible for catching at the
boundary if it wants to keep iterating across other cases.
"""
from __future__ import annotations

import tempfile
import time
import traceback
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from quoting.core import Anfrage
from quoting.matching import MatchResult
from quoting.pipeline.orchestrator import QuotingPipeline
from quoting.pricing import Quotation

from .case_loader import LoadedCase


@dataclass
class RunResult:
    """Everything one pipeline run produced for one case."""

    case_name: str
    success: bool
    duration_s: float
    anfrage: Anfrage | None = None
    matches: list[MatchResult] = field(default_factory=list)
    quotation: Quotation | None = None
    pdf_path: Path | None = None
    extraction_path: str | None = None  # "fast_path" or "llm"
    token_usage: dict[str, Any] | None = None
    error: str | None = None  # traceback, populated iff success=False


def run_case(
    case: LoadedCase,
    pipeline: QuotingPipeline | None = None,
    *,
    output_root: Path | None = None,
) -> RunResult:
    """Execute the full pipeline for one case.

    `pipeline` is reusable across cases — pass the same instance to
    amortise stammdaten loading. `output_root` is where the pipeline
    writes its working artefacts (PDFs etc.); a temp dir is used if not
    given.
    """
    pipeline = pipeline or QuotingPipeline()
    if output_root is None:
        output_root = Path(tempfile.mkdtemp(prefix="eval_run_"))

    start = time.time()
    try:
        result = pipeline.run(
            case.mail,
            output_dir=output_root,
            work_name=case.name,
        )
    except Exception:
        return RunResult(
            case_name=case.name,
            success=False,
            duration_s=time.time() - start,
            error=traceback.format_exc(),
        )

    return RunResult(
        case_name=case.name,
        success=True,
        duration_s=result.duration_s,
        anfrage=result.anfrage,
        matches=result.matches,
        quotation=result.quotation,
        pdf_path=result.pdf_path,
        extraction_path=result.extraction_path,
        token_usage=result.token_usage,
    )
