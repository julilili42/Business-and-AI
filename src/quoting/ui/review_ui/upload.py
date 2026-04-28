"""Helpers for the file-upload path in the dashboard sidebar.

The dashboard reads its primary review list from ``data/reviews/`` (where
the Outlook flow writes). For ad-hoc uploads done from the sidebar we
fall back to a per-content-hash temp dir so the user can run through
the review steps without polluting the persistent review history.

If the user later clicks "Save & generate PDF" inside the review,
``quotation_flow._persist_review_outputs`` will mirror the result back
to ``data/reviews/{content_hash}/``.
"""
from __future__ import annotations

import hashlib
import tempfile
from pathlib import Path

from quoting.ui.review_ui.review_context import ReviewInput


_UPLOAD_ROOT = Path(tempfile.gettempdir()) / "quoting_uploads"

# Same suffixes the file-uploader accepts.
SUPPORTED_SUFFIXES = {".pdf", ".msg", ".eml", ".xlsx", ".xls"}


# --------------------------------------------------------------- upload save


def content_hash_from_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()[:16]


def save_upload_stable(uploaded, content_hash: str) -> Path:
    """Write the uploaded file to a stable temp path keyed by content hash."""
    upload_dir = _UPLOAD_ROOT / content_hash
    upload_dir.mkdir(parents=True, exist_ok=True)
    input_path = upload_dir / Path(uploaded.name).name
    if not input_path.exists():
        input_path.write_bytes(uploaded.getvalue())
    return input_path


def handle_upload(uploaded) -> tuple[Path, str, bytes]:
    payload = uploaded.getvalue()
    content_hash = content_hash_from_bytes(payload)
    input_path = save_upload_stable(uploaded, content_hash)
    return input_path, content_hash, payload


# --------------------------------------------------------------- lookup


def lookup_uploaded_review(content_hash: str) -> ReviewInput | None:
    """Find a previously-uploaded file in the temp dir.

    Used as a fallback when ``data/reviews/{id}`` doesn't exist — i.e.
    the user uploaded a file from the dashboard and we redirected them
    into the review-detail flow before any pipeline output has been
    persisted to ``data/reviews/``.
    """
    upload_dir = _UPLOAD_ROOT / content_hash
    if not upload_dir.exists() or not upload_dir.is_dir():
        return None

    candidate: Path | None = None
    for path in upload_dir.iterdir():
        if path.is_file() and path.suffix.lower() in SUPPORTED_SUFFIXES:
            candidate = path
            break

    if candidate is None:
        return None

    payload = candidate.read_bytes()
    return ReviewInput(
        input_path=candidate,
        content_hash=content_hash,
        payload=payload,
        uploaded_name=candidate.name,
        review_id=None,
        review_dir=None,
    )
