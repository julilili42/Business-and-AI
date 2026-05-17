"""finalize_quotation must roll back the final PDF when the approval transition fails.

Without the rollback the filesystem ends up holding a freshly-built final PDF
while ``approval.json`` still says the review is not approved — a state the
Outlook workflow cannot recover from gracefully.
"""
from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from quoting.api import _common
from quoting.api.approval_store import ApprovalRecord, load_approval, save_approval
from quoting.api.routers import reviews as reviews_router
from quoting.api.routers.reviews import FinalizeRequest, finalize_quotation


def _prepare_review(tmp_path: Path) -> Path:
    folder = tmp_path / "review-finalize"
    folder.mkdir()
    save_approval(folder, ApprovalRecord(state="reviewed"))
    return folder


def _patch_handler_dependencies(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(_common, "REVIEW_DIR", tmp_path)
    monkeypatch.setattr(_common, "_pipeline", MagicMock())

    monkeypatch.setattr(
        reviews_router,
        "_load_review_data",
        lambda *_a, **_k: (MagicMock(), [], []),
    )
    monkeypatch.setattr(
        reviews_router,
        "build_quotation_with_overrides",
        lambda *_a, **_k: MagicMock(),
    )

    def fake_build(_anfrage, _quotation, pdf_path, *, is_final, company_profile):
        Path(pdf_path).write_bytes(b"%PDF-1.4 fake")

    monkeypatch.setattr(reviews_router, "build_draft_pdf", fake_build)


def test_finalize_rolls_back_pdf_when_transition_fails(tmp_path, monkeypatch):
    folder = _prepare_review(tmp_path)
    _patch_handler_dependencies(monkeypatch, tmp_path)

    def failing_transition(*_args, **_kwargs):
        raise RuntimeError("simulated approval crash")

    monkeypatch.setattr(
        "quoting.api.approval_store.transition",
        failing_transition,
    )

    with pytest.raises(HTTPException) as exc_info:
        finalize_quotation(
            "review-finalize",
            FinalizeRequest(actor="user", filename="Angebot_Test.pdf"),
        )

    assert exc_info.value.status_code == 500
    assert not (folder / "Angebot_Test.pdf").exists()
    assert load_approval(folder).state == "reviewed"


def test_finalize_keeps_pdf_and_marks_approved_on_success(tmp_path, monkeypatch):
    folder = _prepare_review(tmp_path)
    _patch_handler_dependencies(monkeypatch, tmp_path)

    response = finalize_quotation(
        "review-finalize",
        FinalizeRequest(actor="user", filename="Angebot_Test.pdf"),
    )

    assert response["final_pdf_path"] == "Angebot_Test.pdf"
    assert (folder / "Angebot_Test.pdf").exists()

    record = load_approval(folder)
    assert record.state == "approved"
    assert record.final_pdf_path == "Angebot_Test.pdf"
    assert record.approved_by == "user"
