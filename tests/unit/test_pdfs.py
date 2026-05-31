from __future__ import annotations

from quoting.api.approval_store import ApprovalStore
from quoting.reviews import find_current_pdf, find_final_pdf


def test_final_pdf_is_hidden_after_approval_revoked(sqlite_repo):
    review_id = "review_pdf_revoke"
    sqlite_repo.create_review(review_id)
    folder = sqlite_repo.artifact_dir(review_id)
    draft = folder / "draft.pdf"
    final = folder / "final.pdf"
    draft.write_bytes(b"%PDF draft")
    final.write_bytes(b"%PDF final")
    sqlite_repo.register_document(
        review_id,
        kind="draft_pdf",
        path=draft,
        filename=draft.name,
        content_type="application/pdf",
    )
    sqlite_repo.register_document(
        review_id,
        kind="final_pdf",
        path=final,
        filename=final.name,
        content_type="application/pdf",
    )
    approvals = ApprovalStore(sqlite_repo)
    approvals.transition(review_id, "approved", final_pdf_path=final.name)

    assert find_final_pdf(review_id, repo=sqlite_repo) == final

    approvals.transition(review_id, "reviewed")

    assert find_final_pdf(review_id, repo=sqlite_repo) is None
    assert find_current_pdf(review_id, repo=sqlite_repo) == (draft, False)
