"""React-frontend specific endpoints.

Adds the nine HTTP endpoints the React review UI needs on top of the
existing `review_api`. Logic is **delegated** to the same modules
the Streamlit UI already uses — `review_loader`, `quotation_flow`,
`reviews` — so we don't fork business logic. This file is purely an
HTTP adapter.

Wire-up
-------
In `quoting/api/review_api.py`, after the existing `app = FastAPI(...)`,
add::

    from quoting.api.frontend_router import router as frontend_router
    app.include_router(frontend_router)

That's the entire integration. No changes to existing endpoints, no
behavioural changes for the Streamlit UI or the Outlook plugin.

New endpoints
-------------
- ``GET    /api/reviews``                     — Dashboard list
- ``GET    /api/reviews/{id}``                — Full review state
- ``GET    /api/reviews/{id}/mail``           — Mail meta + body
- ``GET    /api/reviews/{id}/original``       — Original input file
- ``PUT    /api/reviews/{id}/anfrage``        — Persist edited Anfrage
- ``PUT    /api/reviews/{id}/overrides``      — Persist manual price overrides
- ``POST   /api/reviews/{id}/regenerate``     — Rebuild draft PDF
- ``POST   /api/reviews/{id}/finalize``       — Build final PDF (no AI banner)
- ``POST   /api/reviews/upload``              — Direct upload from dashboard
"""
from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from quoting.api.approval_store import load_approval, transition
from quoting.api.progress_store import init_progress
from quoting.api.settings_store import CompanyProfile, load_user_settings
from quoting.core import Anfrage
from quoting.ingestion import Mail, detect_file_type, mail_from_file, parse_mail
from quoting.matching import MatchResult, match_positions
from quoting.output import build_draft_pdf
from quoting.pipeline import QuotingPipeline
from quoting.pricing import build_quotation
from quoting.reviews import (
    draft_pdf_filename,
    final_pdf_filename,
    find_draft_pdf,
    find_final_pdf,
    load_mail_meta,
    read_json,
    write_json,
)
from quoting.ui.review_agent import apply_manual_overrides
from quoting.reviews import scan_reviews, load_saved_quotation

# --------------------------------------------------------------------- setup

PROJECT_ROOT = Path(__file__).resolve().parents[3]
REVIEW_DIR = PROJECT_ROOT / "data" / "reviews"

router = APIRouter(prefix="/api", tags=["frontend"])

# Shared pipeline instance — same lazy-loading guarantees as the
# Streamlit UI's `get_pipeline()`. Stammdaten and the LLM client are
# instantiated once and reused across requests.
_pipeline: QuotingPipeline | None = None


def _get_pipeline() -> QuotingPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = QuotingPipeline()
    return _pipeline


def _review_dir(review_id: str) -> Path:
    """Resolve a review-id to its on-disk folder, raising 404 on miss."""
    folder = REVIEW_DIR / review_id
    if not folder.exists() or not folder.is_dir():
        raise HTTPException(404, f"Review {review_id} not found")
    return folder


# --------------------------------------------------------------- list & detail

@router.get("/reviews")
def list_reviews() -> list[dict]:
    """Dashboard payload — every review on disk, newest first."""
    summaries = scan_reviews(REVIEW_DIR)
    return [
        {
            "review_id":              s.review_id,
            "created_at":             s.created_at.isoformat(),
            "updated_at":             s.updated_at.isoformat(),
            "subject":                s.subject,
            "sender":                 s.sender,
            "positions":              s.positions,
            "confidence_high":        s.confidence_high,
            "confidence_medium":      s.confidence_medium,
            "confidence_low":         s.confidence_low,
            "matches_exact":          s.matches_exact,
            "matches_fuzzy":          s.matches_fuzzy,
            "matches_semantic":       s.matches_semantic,
            "matches_no_match":       s.matches_no_match,
            "total_eur":              s.total_eur,
            "currency":               s.currency,
            "status":                 s.status,
            "has_pdf":                bool(s.pdf_path),
            "manual_overrides_count": s.manual_overrides_count,
            "extracted_articles":     s.extracted_articles,
        }
        for s in summaries
    ]


@router.get("/reviews/{review_id}")
def get_review_detail(review_id: str) -> dict:
    """Full review state — Anfrage, matches, quotation, mail meta, PDF flags.

    Replaces what the Streamlit UI assembles on the fly from disk in
    ``extraction.load_anfrage_once`` + ``quotation_flow.hydrate_existing_review_state``.
    """
    folder = _review_dir(review_id)
    pipeline = _get_pipeline()

    anfrage = _load_or_extract_anfrage(folder, review_id)
    matches = _load_or_recompute_matches(folder, anfrage, pipeline)
    quotation = _load_quotation(folder)
    overrides = read_json(folder / "manual_overrides.json")
    if not isinstance(overrides, list):
        overrides = []
    mail_meta = load_mail_meta(folder) or {}

    return {
        "review_id": review_id,
        "anfrage": anfrage.model_dump(mode="json"),
        "matches": [m.to_dict() for m in matches],
        "quotation": quotation.to_dict() if quotation else None,
        "manual_overrides": overrides,
        "mail": {
            "subject":     str(mail_meta.get("subject") or ""),
            "from":        str(mail_meta.get("from") or mail_meta.get("sender") or ""),
            "body":        str(mail_meta.get("body") or ""),
            "attachments": list(mail_meta.get("attachments") or []),
        },
        "has_draft_pdf": find_draft_pdf(folder, review_id) is not None,
        "has_final_pdf": find_final_pdf(folder, review_id) is not None,
    }


@router.get("/reviews/{review_id}/mail")
def get_review_mail(review_id: str) -> dict:
    folder = _review_dir(review_id)
    meta = load_mail_meta(folder) or {}
    return {
        "subject":     str(meta.get("subject") or ""),
        "from":        str(meta.get("from") or meta.get("sender") or ""),
        "body":        str(meta.get("body") or ""),
        "attachments": list(meta.get("attachments") or []),
    }


@router.get("/reviews/{review_id}/original")
def get_review_original(review_id: str) -> FileResponse:
    """Stream the original input file (PDF/EML/CSV/...).

    Naïve discovery: prefer files that match the supported suffixes and
    are *not* the generated quotation PDF. Mirrors the resolution order
    used by ``review_context._find_review_input_file``.
    """
    folder = _review_dir(review_id)

    supported = {".pdf", ".msg", ".eml", ".xlsx", ".xls", ".csv"}
    preferred: list[Path] = []
    fallback: list[Path] = []
    for path in folder.iterdir():
        if not path.is_file() or path.suffix.lower() not in supported:
            continue
        name = path.name.lower()
        if name.startswith("angebot") or "draft" in name or "_final" in name:
            fallback.append(path)
        else:
            preferred.append(path)

    candidate = next(iter(preferred + fallback), None)
    if candidate is None:
        raise HTTPException(404, "No original input file found for this review")

    return FileResponse(
        candidate,
        media_type=_guess_media_type(candidate),
        filename=candidate.name,
        content_disposition_type="inline",
        headers={
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
        },
    )


# --------------------------------------------------------------- mutations

class AnfragePayload(BaseModel):
    """Loose passthrough — we just round-trip through the Pydantic model."""

    model_config = {"extra": "allow"}


@router.put("/reviews/{review_id}/anfrage")
def put_anfrage(review_id: str, payload: dict) -> dict:
    """Persist edited Anfrage — what step 1 / step 2 forms write back."""
    folder = _review_dir(review_id)
    try:
        anfrage = Anfrage.model_validate(payload)
    except Exception as exc:
        raise HTTPException(400, f"Invalid Anfrage payload: {exc}") from exc

    write_json(folder / "anfrage_reviewed.json", anfrage.model_dump(mode="json"))
    _invalidate_approval(folder)
    return anfrage.model_dump(mode="json")


@router.put("/reviews/{review_id}/overrides")
def put_overrides(review_id: str, payload: list[dict]) -> list[dict]:
    folder = _review_dir(review_id)
    if not isinstance(payload, list):
        raise HTTPException(400, "Overrides payload must be a list")
    write_json(folder / "manual_overrides.json", payload)
    _invalidate_approval(folder)
    return payload


@router.post("/reviews/{review_id}/regenerate")
def regenerate_quotation(review_id: str) -> dict:
    """Rebuild the **draft** PDF (with AI warning) from current state."""
    folder = _review_dir(review_id)
    pipeline = _get_pipeline()

    anfrage = _load_or_extract_anfrage(folder, review_id)
    matches = _load_or_recompute_matches(folder, anfrage, pipeline)
    overrides = read_json(folder / "manual_overrides.json") or []
    company_profile = load_user_settings().company

    quotation = build_quotation(anfrage, matches, pipeline.settings.preise_path)
    if isinstance(overrides, list) and overrides:
        quotation, _ = apply_manual_overrides(quotation, anfrage, overrides, lang="de")

    pdf_path = folder / draft_pdf_filename(review_id)
    build_draft_pdf(
        anfrage,
        quotation,
        pdf_path,
        is_final=False,
        company_profile=company_profile,
    )

    write_json(folder / "quotation_reviewed.json", quotation.to_dict())
    return quotation.to_dict()


class FinalizeRequest(BaseModel):
    actor: str = Field(min_length=1)


@router.post("/reviews/{review_id}/finalize")
def finalize_quotation(review_id: str, payload: FinalizeRequest) -> dict:
    """Build the **final** PDF (no AI banner) and flip approval state."""
    folder = _review_dir(review_id)
    pipeline = _get_pipeline()

    anfrage = _load_or_extract_anfrage(folder, review_id)
    matches = _load_or_recompute_matches(folder, anfrage, pipeline)
    overrides = read_json(folder / "manual_overrides.json") or []
    company_profile = load_user_settings().company

    quotation = build_quotation(anfrage, matches, pipeline.settings.preise_path)
    if isinstance(overrides, list) and overrides:
        quotation, _ = apply_manual_overrides(quotation, anfrage, overrides, lang="de")

    final_path = folder / final_pdf_filename(review_id)
    build_draft_pdf(
        anfrage,
        quotation,
        final_path,
        is_final=True,
        company_profile=company_profile,
    )

    record = transition(
        folder,
        target="approved",
        actor=payload.actor,
        warning_acknowledged=True,
        final_pdf_path=final_path.name,
    )

    return {"final_pdf_path": record.final_pdf_path or final_path.name}


# --------------------------------------------------------------- upload

@router.post("/reviews/upload")
async def upload_review(file: UploadFile = File(...)) -> dict:
    """Direct file upload from the dashboard.

    Creates a new review folder, persists the file as the original input,
    writes a minimal ``mail.json`` so downstream code (review_loader,
    document_view) keeps working, then runs the pipeline synchronously
    so the user lands directly on a ready review.
    """
    if not file.filename:
        raise HTTPException(400, "Uploaded file is missing a filename")

    review_id = uuid.uuid4().hex[:12]
    folder = REVIEW_DIR / review_id
    folder.mkdir(parents=True, exist_ok=True)
    init_progress(folder, review_id)

    safe_name = Path(file.filename).name
    target = folder / safe_name
    with target.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)

    # mail.json sidecar so review_loader sees this folder as a real review.
    write_json(
        folder / "mail.json",
        {
            "subject":     Path(file.filename).stem,
            "from":        "",
            "body":        "",
            "attachments": [{"name": safe_name}],
        },
    )

    # Run the pipeline synchronously. For larger files we'd push this to
    # a BackgroundTask, but for the React migration the dashboard upload
    # path is a power-user shortcut and a blocking call keeps the flow
    # simple.
    try:
        mail = _build_mail(target)
        _get_pipeline().run(mail, output_dir=REVIEW_DIR, work_name=review_id)
    except Exception as exc:
        # Don't roll back the folder — the user can still inspect what
        # was extracted before the failure.
        raise HTTPException(500, f"Pipeline failed: {exc}") from exc

    return {"review_id": review_id}


# --------------------------------------------------------------- helpers

def _build_mail(input_path: Path) -> Mail:
    if detect_file_type(input_path) in ("eml", "msg"):
        return parse_mail(input_path)
    return mail_from_file(input_path)


def _load_or_extract_anfrage(folder: Path, review_id: str) -> Anfrage:
    """Prefer the human-edited Anfrage, fall back to the LLM extraction."""
    for name in (
        "anfrage_reviewed.json",
        "01_extracted.json",
    ):
        data = read_json(folder / name)
        if isinstance(data, dict) and data.get("positionen") is not None:
            return Anfrage.model_validate(data)

    # Last resort: re-run extraction. This shouldn't happen in practice
    # because the original pipeline run always writes 01_extracted.json,
    # but it keeps the endpoint robust.
    pipeline = _get_pipeline()
    mail_meta = load_mail_meta(folder) or {}
    attachments = []
    for att in mail_meta.get("attachments") or []:
        if isinstance(att, dict) and att.get("name"):
            p = folder / att["name"]
            if p.exists():
                attachments.append(p)
    mail = Mail(
        subject=str(mail_meta.get("subject") or ""),
        sender=str(mail_meta.get("from") or ""),
        body=str(mail_meta.get("body") or ""),
        attachments=attachments,
    )
    from quoting.pipeline import StepContext

    return pipeline.extract(mail, StepContext(work_dir=folder))


def _load_or_recompute_matches(
    folder: Path,
    anfrage: Anfrage,
    pipeline: QuotingPipeline,
) -> list[MatchResult]:
    """Prefer cached match results; fall back to a fresh deterministic run."""
    data = read_json(folder / "matches_reviewed.json") or read_json(
        folder / "02_matches.json"
    )
    if isinstance(data, list):
        return [
            MatchResult(
                pos_nr=int(item.get("pos_nr", 0)),
                status=item.get("status", "no_match"),
                score=float(item.get("score", 0) or 0),
                matched_artikelnr=item.get("matched_artikelnr"),
                matched_bezeichnung=item.get("matched_bezeichnung"),
                matched_row=item.get("matched_row"),
            )
            for item in data
            if isinstance(item, dict)
        ]
    return match_positions(
        anfrage.positionen,
        pipeline.stammdaten,
        fuzzy_threshold=pipeline.settings.fuzzy_threshold,
        semantic_threshold=pipeline.settings.semantic_threshold,
    )


def _load_quotation(folder: Path):
    return load_saved_quotation(folder)

def _invalidate_approval(folder: Path) -> None:
    """Edits invalidate any prior approval — flip back to ``reviewed``."""
    record = load_approval(folder)
    if record.state in {"approved", "ready_to_send"}:
        transition(folder, target="reviewed", actor=record.approved_by)


def _guess_media_type(path: Path) -> str:
    suffix = path.suffix.lower()
    return {
        ".pdf":  "application/pdf",
        ".eml":  "message/rfc822",
        ".msg":  "application/vnd.ms-outlook",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls":  "application/vnd.ms-excel",
        ".csv":  "text/csv",
    }.get(suffix, "application/octet-stream")
