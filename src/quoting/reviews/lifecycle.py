"""Reset / cleanup helpers for reviews.

Review state lives in SQLite. The artifact directory only contains
binary files such as uploaded originals and generated PDFs; reset keeps
the originals, drops generated artifacts from disk, and clears derived
database payloads.
"""
from __future__ import annotations

import shutil
from pathlib import Path
from typing import TYPE_CHECKING

from ..core import get_logger
from .sqlite_repository import Payloads, SQLiteReviewRepository, get_default_repository

if TYPE_CHECKING:
    from quoting.api.approval_store import ApprovalStore
    from quoting.api.progress_store import ProgressStore

log = get_logger()


def reset_review_artifacts(
    review_id: str,
    *,
    repo: SQLiteReviewRepository | None = None,
    progress_store: ProgressStore | None = None,
    approval_store: ApprovalStore | None = None,
) -> None:
    """Wipe pipeline outputs while preserving uploaded originals."""
    active_repo = repo or get_default_repository()
    folder = active_repo.artifact_dir(review_id)

    keep_files = _registered_original_paths(review_id, active_repo)
    if folder.exists():
        for entry in folder.iterdir():
            if entry in keep_files:
                continue
            try:
                if entry.is_file():
                    entry.unlink()
                elif entry.is_dir():
                    shutil.rmtree(entry)
            except Exception as exc:
                log.warning("Could not delete %s during reset: %s", entry, exc)

    active_repo.reset_review_state(review_id, keep={Payloads.MAIL})
    active_repo.delete_documents_except(review_id, keep_kinds={"attachment", "original"})

    if progress_store is None:
        from quoting.api.progress_store import ProgressStore

        progress_store = ProgressStore(active_repo)
    if approval_store is None:
        from quoting.api.approval_store import ApprovalStore

        approval_store = ApprovalStore(active_repo)

    progress_store.init(review_id)
    approval_store.reset(review_id)


def _registered_original_paths(
    review_id: str,
    repo: SQLiteReviewRepository,
) -> set[Path]:
    keep: set[Path] = set()
    for kind in ("attachment", "original"):
        for doc in repo.list_documents(review_id, kind=kind):
            path = Path(str(doc.get("storage_path") or ""))
            if path.name:
                keep.add(path)
    return keep
