"""End-to-end pipeline orchestrator.

Stages in order:
    1. (no separate ingest stage — caller hands us a Mail)
    2. extract   - body + ALL attachments -> Anfrage (LLM)
    3. match     - positions -> MatchResults (deterministic)
    4. price     - Anfrage + matches -> Quotation
    5. render    - Quotation -> draft PDF + JSON

The pipeline accepts a Mail object only. Whoever calls the pipeline (API,
CLI, tests) is responsible for building that Mail. This keeps the pipeline
generic — it doesn't care whether the source was Outlook JSON, an .eml
file on disk, or a bare PDF wrapped via `mail_from_file`.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

from .core import Anfrage, Settings, add_file_handler, get_logger, load_settings
from .extraction import extract_anfrage
from .ingestion import Mail
from .matching import MatchResult, load_stammdaten, match_positions
from .output import build_draft_pdf, save_json
from .pricing import Quotation, build_quotation

log = get_logger()


@dataclass
class PipelineResult:
    mail: Mail
    work_dir: Path
    anfrage: Anfrage
    matches: list[MatchResult]
    quotation: Quotation
    pdf_path: Path
    duration_s: float

    def summary(self) -> dict:
        return {
            "subject": self.mail.subject,
            "sender": self.mail.sender,
            "attachments": [a.name for a in self.mail.attachments],
            "positions": len(self.anfrage.positionen),
            "exact": sum(1 for m in self.matches if m.status == "exact"),
            "fuzzy": sum(1 for m in self.matches if m.status == "fuzzy"),
            "semantic": sum(1 for m in self.matches if m.status == "semantic"),
            "no_match": sum(1 for m in self.matches if m.status == "no_match"),
            "total_eur": self.quotation.gesamtsumme,
            "duration_s": round(self.duration_s, 2),
            "pdf": str(self.pdf_path),
        }


class QuotingPipeline:
    """Reusable pipeline instance. Cache-friendly: stammdaten loaded once."""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or load_settings()
        self._stammdaten: list[dict] | None = None

    @property
    def stammdaten(self) -> list[dict]:
        if self._stammdaten is None:
            self._stammdaten = load_stammdaten(self.settings.stammdaten_path)
        return self._stammdaten

    def run(
        self,
        mail: Mail,
        output_dir: Path | None = None,
        work_name: str | None = None,
    ) -> PipelineResult:
        """Process a Mail end-to-end.

        Args:
            mail: The incoming RFQ — body and any attachments.
            output_dir: Base directory for run artifacts. Defaults to settings.
            work_name: Subfolder name under output_dir. Defaults to a sensible
                stem derived from the mail (first attachment's stem, otherwise
                a sanitized subject).
        """
        if not mail.has_content:
            raise ValueError(
                "Mail has neither body nor attachments — nothing to extract."
            )

        start = time.time()
        output_dir = output_dir or self.settings.output_dir
        work_dir = output_dir / (work_name or _derive_work_name(mail))
        work_dir.mkdir(parents=True, exist_ok=True)

        add_file_handler(work_dir / "run.log")
        log.info("=" * 60)
        log.info("Subject     : %s", mail.subject or "(no subject)")
        log.info("From        : %s", mail.sender or "(unknown)")
        log.info("Body length : %d chars", len(mail.body))
        log.info("Attachments : %d", len(mail.attachments))
        log.info("Work dir    : %s", work_dir)

        anfrage = self._extract(mail, work_dir)
        matches = self._match(anfrage, work_dir)
        quotation = self._price(anfrage, matches, work_dir)
        pdf_path = self._render(anfrage, quotation, work_dir.name, work_dir)

        duration = time.time() - start
        log.info("Done in %.2fs - total %.2f EUR", duration, quotation.gesamtsumme)

        return PipelineResult(
            mail=mail,
            work_dir=work_dir,
            anfrage=anfrage,
            matches=matches,
            quotation=quotation,
            pdf_path=pdf_path,
            duration_s=duration,
        )

    # ---------- individual stages ----------

    def _extract(self, mail: Mail, work_dir: Path) -> Anfrage:
        log.info(
            "Extract: LLM with %d attachment(s)%s...",
            len(mail.attachments),
            " (body only — no attachments)" if not mail.attachments else "",
        )
        anfrage = extract_anfrage(
            attachments=mail.attachments,
            mail_body=mail.body,
            settings=self.settings,
        )
        save_json(anfrage.model_dump(mode="json"), work_dir / "01_extracted.json")
        for pos in anfrage.positionen:
            log.info(
                "  Pos %d [%s]: %s x%s - %s",
                pos.pos_nr, pos.confidence, pos.artikelnummer,
                pos.menge, pos.bezeichnung[:50],
            )
        return anfrage

    def _match(self, anfrage: Anfrage, work_dir: Path) -> list[MatchResult]:
        log.info("Match: against %d master-data rows...", len(self.stammdaten))
        matches = match_positions(
            anfrage.positionen,
            self.stammdaten,
            fuzzy_threshold=self.settings.fuzzy_threshold,
            semantic_threshold=self.settings.semantic_threshold,
        )
        for pos, m in zip(anfrage.positionen, matches):
            log.info("  Pos %d: %s (score %.2f)", pos.pos_nr, m.status, m.score)
        save_json([m.to_dict() for m in matches], work_dir / "02_matches.json")
        return matches

    def _price(
        self, anfrage: Anfrage, matches: list[MatchResult], work_dir: Path,
    ) -> Quotation:
        log.info("Price: calculating...")
        quotation = build_quotation(anfrage, matches, self.settings.preise_path)
        save_json(quotation.to_dict(), work_dir / "03_quotation.json")
        return quotation

    def _render(
        self, anfrage: Anfrage, quotation: Quotation,
        name: str, work_dir: Path,
    ) -> Path:
        log.info("Render: PDF...")
        pdf_path = work_dir / f"{name}_ANGEBOT_DRAFT.pdf"
        build_draft_pdf(anfrage, quotation, pdf_path)
        return pdf_path


def _derive_work_name(mail: Mail) -> str:
    """Pick a reasonable folder name for this run."""
    if mail.attachments:
        return mail.attachments[0].stem
    if mail.subject:
        # keep it filesystem-safe and short
        safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in mail.subject)
        return safe[:80] or "run"
    return "run"
