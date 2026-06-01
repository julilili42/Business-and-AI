from __future__ import annotations

import logging
from dataclasses import dataclass

from pydantic import ValidationError

from quoting.api.services.review_service import (
    ReviewDataService,
    enrich_exact_article_edits,
    match_from_dict,
    match_positions_with_settings,
)
from quoting.api.settings_store import load_user_settings
from quoting.api.use_cases.errors import UseCaseBadRequest, UseCaseUnprocessable
from quoting.core import Anfrage
from quoting.pipeline import QuotingPipeline
from quoting.reviews.sqlite_repository import SQLiteReviewRepository
from quoting.api.use_cases.common import SettingsLoader

log = logging.getLogger("quoting.frontend_router")


@dataclass
class UpdateAnfrageUseCase:
    repo: SQLiteReviewRepository
    pipeline: QuotingPipeline
    review_data: ReviewDataService
    settings_loader: SettingsLoader = load_user_settings

    def execute(self, review_id: str, payload: dict) -> dict:
        try:
            anfrage = Anfrage.model_validate(payload)
        except ValidationError as exc:
            raise UseCaseBadRequest(f"Invalid Anfrage payload: {exc}") from exc

        previous = self.review_data.try_load_anfrage(review_id)
        anfrage = enrich_exact_article_edits(anfrage, previous, self.pipeline)

        self.repo.save_anfrage_reviewed(review_id, anfrage.model_dump(mode="json"))

        # Re-run automatic matching so edits to match-relevant fields
        # (Artikelnummer, Bezeichnung, Werkstoff, Abmessungen) are reflected
        # in both the match chip and the price. Manually pinned matches
        # ("Artikel zuordnen" / Custom-Artikel) carry manual=True and are
        # preserved — the recompute never overwrites them.
        manual_by_pos = {
            match.pos_nr: match
            for match in (
                match_from_dict(item)
                for item in self.repo.load_matches(review_id)
                if isinstance(item, dict)
            )
            if match.manual
        }
        try:
            recomputed = match_positions_with_settings(
                anfrage,
                self.pipeline,
                self.settings_loader,
            )
        except Exception as exc:
            log.exception("put_anfrage: match recompute failed for %s", review_id)
            raise UseCaseUnprocessable(f"Matching fehlgeschlagen: {exc}") from exc
        matches = [manual_by_pos.get(m.pos_nr, m) for m in recomputed]

        if self.repo.has_matches_reviewed(review_id) or manual_by_pos:
            self.repo.save_matches_reviewed(review_id, [m.to_dict() for m in matches])
        else:
            self.repo.save_matches_initial(review_id, [m.to_dict() for m in matches])

        self.review_data.invalidate_approval(review_id)
        return anfrage.model_dump(mode="json")


@dataclass
class SaveOverridesUseCase:
    repo: SQLiteReviewRepository
    review_data: ReviewDataService

    def execute(self, review_id: str, payload: list[dict]) -> list[dict]:
        if not isinstance(payload, list):
            raise UseCaseBadRequest("Overrides payload must be a list")

        self.repo.save_overrides(review_id, payload)
        self.review_data.invalidate_approval(review_id)
        return payload
