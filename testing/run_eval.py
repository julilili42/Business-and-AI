"""CLI entry point for the eval harness.

Usage::

    python testing/run_eval.py                    # all cases, write report
    python testing/run_eval.py --case smoke_001   # one case
    python testing/run_eval.py --no-report        # don't write report.md

The default output directory is `data/eval_runs/`.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Make src/ + the project root importable when run directly.
_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))
sys.path.insert(0, str(_ROOT / "src"))

from testing.eval.orchestrator import evaluate_all  # noqa: E402
from testing.eval.report import write_report  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the quoting-pipeline eval harness.")
    parser.add_argument(
        "--cases-root",
        type=Path,
        default=_ROOT / "testing" / "eval" / "cases",
        help="Directory containing real/ and synthetic/ case folders.",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=None,
        help="Where pipeline working artefacts go. Default: temp dir.",
    )
    parser.add_argument(
        "--report-dir",
        type=Path,
        default=_ROOT / "data" / "eval_runs",
        help="Where the Markdown + JSON report is written.",
    )
    parser.add_argument(
        "--case",
        action="append",
        default=None,
        help="Run only the named case(s). Repeatable.",
    )
    parser.add_argument(
        "--label",
        default="",
        help="Optional label appended to the report filename.",
    )
    parser.add_argument(
        "--no-report",
        action="store_true",
        help="Skip writing the Markdown/JSON report.",
    )
    args = parser.parse_args(argv)

    scored = evaluate_all(
        args.cases_root,
        only=args.case,
        output_root=args.output_root,
    )

    if not scored:
        print(f"No cases discovered under {args.cases_root}", file=sys.stderr)
        return 1

    failed = [s for s in scored if not s.run.success or s.threshold_failures]
    for s in scored:
        status = "ok" if not (s.threshold_failures or not s.run.success) else "FAIL"
        print(f"[{status}] {s.case_name}")
        for f in s.threshold_failures:
            print(f"   - {f}")
        if not s.run.success:
            first_line = (s.run.error or "").strip().splitlines()[-1:]
            print(f"   - crash: {first_line[0] if first_line else 'unknown'}")

    if not args.no_report:
        md, js = write_report(scored, args.report_dir, label=args.label)
        print(f"\nReport: {md}")
        print(f"JSON:   {js}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
