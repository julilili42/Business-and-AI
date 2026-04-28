"""Public PDF export entry point.

Keeps the old import path stable:
    from quoting.output import build_draft_pdf
"""
from __future__ import annotations

from pathlib import Path

from ...core import Anfrage, get_logger
from ...pricing import Quotation
from ..json_writer import save_json

log = get_logger()


def build_draft_pdf(
    anfrage: Anfrage,
    quotation: Quotation,
    path: Path,
) -> None:
    """Generate the draft quotation PDF.

    Falls back to JSON if ReportLab is not installed.
    """
    try:
        import reportlab  # noqa: F401
    except ImportError:
        log.warning("reportlab not installed - writing JSON instead of PDF")
        save_json(quotation.to_dict(), path.with_suffix(".json"))
        return

    from .offer import build_offer_pdf

    build_offer_pdf(
        anfrage=anfrage,
        quotation=quotation,
        path=path,
    )