"""Read-only review queries used by API adapters and workflow services."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from quoting.pricing import Quotation
from quoting.reviews.pdfs import (
    find_current_pdf,
    find_draft_pdf,
    find_final_pdf,
)
from quoting.reviews.quotation_store import load_saved_quotation
from quoting.reviews.sqlite_repository import SQLiteReviewRepository
from quoting.reviews.summary import ReviewSummary, scan_reviews


@dataclass
class ReviewReadService:
    repo: SQLiteReviewRepository

    def scan_reviews(self) -> list[ReviewSummary]:
        return scan_reviews(repo=self.repo)

    def find_current_pdf(self, review_id: str) -> tuple[Path | None, bool]:
        return find_current_pdf(review_id, repo=self.repo)

    def find_draft_pdf(self, review_id: str) -> Path | None:
        return find_draft_pdf(review_id, repo=self.repo)

    def find_final_pdf(self, review_id: str) -> Path | None:
        return find_final_pdf(review_id, repo=self.repo)

    def load_saved_quotation(self, review_id: str) -> Quotation | None:
        return load_saved_quotation(review_id, repo=self.repo)
