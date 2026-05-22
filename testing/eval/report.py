"""Aggregate a batch of eval runs into a Markdown report.

The report has two layers:

1. A summary table — one row per case, headline metrics + pass/fail.
2. A details section per case — what went wrong, broken-out per step.

A machine-readable companion `.json` is written next to the `.md` so
the baseline-comparison mode can read it back.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path

from .metrics import (
    ExtractionScore,
    MatchingScore,
    PricingScore,
    RenderingScore,
)
from .runner import RunResult


@dataclass
class CaseScores:
    """All scores produced for one case. Any field may be None if the
    case did not provide that ground truth."""

    case_name: str
    run: RunResult
    extraction: ExtractionScore | None = None
    matching: MatchingScore | None = None
    pricing: PricingScore | None = None
    rendering: RenderingScore | None = None
    threshold_failures: list[str] = field(default_factory=list)


def write_report(
    scores: list[CaseScores], output_dir: Path, *, label: str = ""
) -> tuple[Path, Path]:
    """Write `<timestamp>.md` + `<timestamp>.json`. Return their paths."""
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    suffix = f"_{label}" if label else ""
    md_path = output_dir / f"{timestamp}{suffix}.md"
    json_path = output_dir / f"{timestamp}{suffix}.json"

    md_path.write_text(_format_markdown(scores, timestamp), encoding="utf-8")
    json_path.write_text(_format_json(scores), encoding="utf-8")
    return md_path, json_path


def _format_markdown(scores: list[CaseScores], timestamp: str) -> str:
    lines: list[str] = []
    lines.append(f"# Eval Report — {timestamp}")
    lines.append("")
    lines.append(f"Cases: **{len(scores)}**")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(
        "| Case | Crashed | Extr. F1 | Pos. count | Match acc. | Pricing total | PDF | Failures |"
    )
    lines.append(
        "|------|---------|----------|------------|------------|---------------|-----|----------|"
    )
    for s in scores:
        lines.append(_summary_row(s))
    lines.append("")
    lines.append("## Per-case detail")
    lines.append("")
    for s in scores:
        lines.append(_detail_block(s))
    return "\n".join(lines) + "\n"


def _summary_row(s: CaseScores) -> str:
    crashed = "yes" if not s.run.success else ""
    extr = (
        f"{s.extraction.overall_f1:.2f}"
        if s.extraction is not None
        else "—"
    )
    pos = (
        f"{s.extraction.actual_position_count}/"
        f"{s.extraction.expected_position_count}"
        if s.extraction is not None
        else "—"
    )
    match = (
        f"{s.matching.top1_accuracy:.0%} ({s.matching.correct}/{s.matching.total})"
        if s.matching is not None
        else "—"
    )
    pricing = "—"
    if s.pricing is not None:
        if s.pricing.total_ok is None:
            pricing = "n/a"
        elif s.pricing.total_ok:
            pricing = "ok"
        else:
            pricing = f"off €{s.pricing.total_diff_eur:.2f}"
    rendering = "—"
    if s.rendering is not None:
        rendering = "ok" if s.rendering.file_ok else "fail"
    failures = ", ".join(s.threshold_failures) if s.threshold_failures else ""
    return (
        f"| `{s.case_name}` | {crashed} | {extr} | {pos} | "
        f"{match} | {pricing} | {rendering} | {failures} |"
    )


def _detail_block(s: CaseScores) -> str:
    lines = [f"### `{s.case_name}`", ""]
    lines.append(f"- duration: {s.run.duration_s:.2f}s")
    lines.append(f"- extraction path: {s.run.extraction_path or '—'}")
    if s.run.token_usage:
        lines.append(f"- token usage: {s.run.token_usage}")
    if not s.run.success:
        lines.append("")
        lines.append("**Crashed:**")
        lines.append("```")
        lines.append((s.run.error or "").strip())
        lines.append("```")
        return "\n".join(lines) + "\n"
    if s.extraction is not None:
        lines.append("")
        lines.append("**Extraction**")
        for name, recall in sorted(s.extraction.per_field_recall.items()):
            h, t = s.extraction.per_field_counts[name]
            lines.append(f"- {name}: {recall:.0%} ({h}/{t})")
        if s.extraction.missing_positions:
            lines.append(f"- missing positions: {s.extraction.missing_positions}")
        if s.extraction.extra_positions:
            lines.append(f"- extra positions: {s.extraction.extra_positions}")
        for m in s.extraction.mismatches[:20]:
            lines.append(f"  - {m}")
        if len(s.extraction.mismatches) > 20:
            lines.append(f"  - … +{len(s.extraction.mismatches) - 20} more")
    if s.matching is not None:
        lines.append("")
        lines.append("**Matching**")
        for row in s.matching.per_position:
            tag = "ok " if row["correct"] else "MISS"
            lines.append(
                f"- pos {row['pos_nr']:>3} [{tag}] "
                f"expected={row['expected']!r}  "
                f"actual={row['actual']!r} "
                f"({row['status']}, score={row['score']})"
            )
        for v in s.matching.status_violations:
            lines.append(f"- {v}")
    if s.pricing is not None:
        lines.append("")
        lines.append("**Pricing**")
        lines.append(
            f"- items ok: {s.pricing.items_ok}/{s.pricing.items_total}"
        )
        if s.pricing.total_ok is not None:
            lines.append(
                f"- total: {'ok' if s.pricing.total_ok else 'off'} "
                f"(€{s.pricing.total_diff_eur:.2f})"
            )
        for issue in s.pricing.item_issues:
            lines.append(f"  - {issue}")
    if s.rendering is not None:
        lines.append("")
        lines.append("**Rendering**")
        lines.append(
            f"- file ok: {s.rendering.file_ok}  "
            f"size: {s.rendering.size_bytes} bytes  "
            f"pages: {s.rendering.page_count}"
        )
        if s.rendering.issue:
            lines.append(f"- issue: {s.rendering.issue}")
    return "\n".join(lines) + "\n"


def _format_json(scores: list[CaseScores]) -> str:
    """Serialise scores for baseline comparison.

    We strip the heavy artefacts (Anfrage, Quotation objects) and keep
    just the numbers — that's all the baseline-compare path needs.
    """
    payload = []
    for s in scores:
        payload.append(
            {
                "case_name": s.case_name,
                "success": s.run.success,
                "duration_s": s.run.duration_s,
                "extraction_path": s.run.extraction_path,
                "extraction": asdict(s.extraction) if s.extraction else None,
                "matching": asdict(s.matching) if s.matching else None,
                "pricing": asdict(s.pricing) if s.pricing else None,
                "rendering": asdict(s.rendering) if s.rendering else None,
                "threshold_failures": s.threshold_failures,
            }
        )
    return json.dumps(payload, indent=2, default=str)
