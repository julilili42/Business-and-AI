"""Small application dependency container for the API layer."""
from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from quoting.pipeline import QuotingPipeline
from quoting.reviews.sqlite_repository import SQLiteReviewRepository, get_default_repository

if TYPE_CHECKING:
    from quoting.api.approval_store import ApprovalStore
    from quoting.api.progress_store import ProgressStore
    from quoting.api.services.review_read_service import ReviewReadService
    from quoting.api.services.review_service import ReviewDataService
    from quoting.api.services.review_workflow_service import (
        ApprovalTransition,
        PdfBuilder,
        QualityGateEvaluator,
        QuotationBuilder,
        ReviewDataLoader,
        ReviewWorkflowService,
        SettingsLoader,
    )


@dataclass
class AppContainer:
    """Lazily owns long-lived API dependencies."""

    _pipeline: QuotingPipeline | None = None

    def pipeline(self) -> QuotingPipeline:
        if self._pipeline is None:
            self._pipeline = QuotingPipeline()
        return self._pipeline

    def review_repo(self) -> SQLiteReviewRepository:
        return get_default_repository()

    def approval_store(
        self,
        repo: SQLiteReviewRepository | None = None,
    ) -> ApprovalStore:
        from quoting.api.approval_store import ApprovalStore

        return ApprovalStore(repo or self.review_repo())

    def progress_store(
        self,
        repo: SQLiteReviewRepository | None = None,
    ) -> ProgressStore:
        from quoting.api.progress_store import ProgressStore

        return ProgressStore(repo or self.review_repo())

    def review_data_service(
        self,
        repo: SQLiteReviewRepository | None = None,
        approval_store: ApprovalStore | None = None,
    ) -> ReviewDataService:
        from quoting.api.services.review_service import ReviewDataService

        active_repo = repo or self.review_repo()
        approvals = approval_store or self.approval_store(active_repo)
        return ReviewDataService(active_repo, approval_store=approvals)

    def review_read_service(
        self,
        repo: SQLiteReviewRepository | None = None,
    ) -> ReviewReadService:
        from quoting.api.services.review_read_service import ReviewReadService

        return ReviewReadService(repo or self.review_repo())

    def review_workflow_service(
        self,
        *,
        pipeline: QuotingPipeline | None = None,
        review_ui_base_url: str = "http://localhost:8501",
        settings_loader: SettingsLoader | None = None,
        review_data_loader: ReviewDataLoader | None = None,
        quotation_builder: QuotationBuilder | None = None,
        quality_gate_evaluator: QualityGateEvaluator | None = None,
        pdf_builder: PdfBuilder | None = None,
        approval_transition: ApprovalTransition | None = None,
    ) -> ReviewWorkflowService:
        from quoting.api.services.quality_gate_service import evaluate_quality_gate
        from quoting.api.services.quotation_service import build_quotation_with_overrides
        from quoting.api.services.review_workflow_service import ReviewWorkflowService
        from quoting.api.settings_store import load_user_settings
        from quoting.output import build_draft_pdf

        repo = self.review_repo()
        approvals = self.approval_store(repo)
        review_data = self.review_data_service(repo, approval_store=approvals)
        review_reads = self.review_read_service(repo)

        return ReviewWorkflowService(
            repo=repo,
            pipeline=pipeline or self.pipeline(),
            review_ui_base_url=review_ui_base_url,
            settings_loader=settings_loader or load_user_settings,
            review_data_loader=review_data_loader,
            quotation_builder=quotation_builder or build_quotation_with_overrides,
            quality_gate_evaluator=quality_gate_evaluator or evaluate_quality_gate,
            pdf_builder=pdf_builder or build_draft_pdf,
            approval_store=approvals,
            progress_store=self.progress_store(repo),
            review_data=review_data,
            review_read_service=review_reads,
            approval_transition=approval_transition,
        )


_DEFAULT_CONTAINER: AppContainer | None = None


def get_app_container() -> AppContainer:
    global _DEFAULT_CONTAINER
    if _DEFAULT_CONTAINER is None:
        _DEFAULT_CONTAINER = AppContainer()
    return _DEFAULT_CONTAINER


def reset_app_container() -> None:
    """Test helper for code that needs to rebuild lazily-owned dependencies."""
    global _DEFAULT_CONTAINER
    _DEFAULT_CONTAINER = None
