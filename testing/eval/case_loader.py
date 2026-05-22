"""Discover and load eval cases from disk.

A case is a directory with this layout::

    case_name/
      input/
        mail.eml | mail.msg                 # one of these is required
        attachments/                        # optional extra attachments
                                            # (parsed from .eml/.msg are
                                            # written here at load time)
      expected/
        anfrage.json                        # required
        matches.json                        # optional
        quotation.json                      # optional
      case.json                             # optional metadata manifest
      notes.md                              # free-text, ignored by loader

The loader does NOT execute the pipeline — it only assembles the inputs
and the expected ground truth. Running the pipeline is `runner.py`.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from quoting.ingestion import Mail, mail_from_file, parse_mail

from .schema import CaseManifest, ExpectedAnfrage, ExpectedMatches, ExpectedQuotation


@dataclass
class LoadedCase:
    """One eval case ready to be run."""

    name: str
    path: Path
    mail: Mail
    expected_anfrage: ExpectedAnfrage
    expected_matches: ExpectedMatches | None
    expected_quotation: ExpectedQuotation | None
    manifest: CaseManifest


def discover_cases(root: Path, *, only: list[str] | None = None) -> list[Path]:
    """Return a sorted list of case directories under `root`.

    `root` is typically `testing/eval/cases`. We look one level deep so
    `cases/real/foo` and `cases/synthetic/bar` are both picked up.

    A directory is treated as a case iff it contains `input/` AND
    `expected/anfrage.json`.

    `only` (if given) is a list of case names to keep. Names match the
    last path component (e.g. `smoke_fastpath_001`).
    """
    candidates: list[Path] = []
    for bucket in sorted(root.iterdir()):
        if not bucket.is_dir() or bucket.name.startswith("."):
            continue
        for candidate in sorted(bucket.iterdir()):
            if not candidate.is_dir():
                continue
            if not (candidate / "input").is_dir():
                continue
            if not (candidate / "expected" / "anfrage.json").is_file():
                continue
            candidates.append(candidate)
    if only is not None:
        wanted = set(only)
        candidates = [c for c in candidates if c.name in wanted]
        missing = wanted - {c.name for c in candidates}
        if missing:
            raise FileNotFoundError(
                f"Requested cases not found: {sorted(missing)} (root={root})"
            )
    return candidates


def load_case(case_dir: Path) -> LoadedCase:
    """Materialise a case directory into a `LoadedCase`.

    Mail attachments referenced from .eml/.msg are extracted into
    `case_dir/input/attachments/` so subsequent reads are stable across
    runs (the production parser would otherwise drop them into a temp
    dir we can't predict).
    """
    input_dir = case_dir / "input"
    expected_dir = case_dir / "expected"

    mail = _load_mail(input_dir)
    expected_anfrage = ExpectedAnfrage.model_validate_json(
        (expected_dir / "anfrage.json").read_text(encoding="utf-8")
    )
    expected_matches = _load_optional(
        expected_dir / "matches.json", ExpectedMatches
    )
    expected_quotation = _load_optional(
        expected_dir / "quotation.json", ExpectedQuotation
    )
    manifest = _load_manifest(case_dir)
    return LoadedCase(
        name=case_dir.name,
        path=case_dir,
        mail=mail,
        expected_anfrage=expected_anfrage,
        expected_matches=expected_matches,
        expected_quotation=expected_quotation,
        manifest=manifest,
    )


def _load_mail(input_dir: Path) -> Mail:
    eml = list(input_dir.glob("mail.eml"))
    msg = list(input_dir.glob("mail.msg"))
    attachments_dir = input_dir / "attachments"
    attachments_dir.mkdir(exist_ok=True)
    if eml or msg:
        mail_path = (eml + msg)[0]
        return parse_mail(mail_path, temp_dir=attachments_dir)
    # Fallback: no mail container — treat each file in attachments/ as a
    # bare attachment with empty body. Useful for tests that feed a CSV
    # or PDF directly.
    files = sorted(p for p in attachments_dir.iterdir() if p.is_file())
    if not files:
        raise FileNotFoundError(
            f"No mail.eml / mail.msg and no files in {attachments_dir}"
        )
    return Mail(subject=files[0].name, sender="", body="", attachments=files)


def _load_optional(path: Path, cls):
    if not path.is_file():
        return None
    return cls.model_validate_json(path.read_text(encoding="utf-8"))


def _load_manifest(case_dir: Path) -> CaseManifest:
    manifest_path = case_dir / "case.json"
    if not manifest_path.is_file():
        return CaseManifest()
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    return CaseManifest.model_validate(data)
