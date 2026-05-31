"""Review list, detail, mail, and mutation endpoints (PUT anfrage/overrides, regenerate, finalize)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from quoting.api import _common
from quoting.api.response_models import (
    FinalizeResponse,
    MailMeta,
    ManualOverridePayload,
    QuotationModel,
    ReplyBodyResponse,
    ReviewDetail,
    ReviewListItem,
)
from quoting.api.services.quality_gate_service import evaluate_quality_gate
from quoting.api.services.quotation_service import build_quotation_with_overrides
from quoting.api.services.review_workflow_service import (
    ReviewWorkflowService,
    format_mail_dict,
)
from quoting.api.services.review_workflow_service import (
    load_review_data as _service_load_review_data,
)
from quoting.api.settings_store import load_user_settings
from quoting.core import Anfrage
from quoting.extraction.llm import build_llm
from quoting.output import build_draft_pdf
from quoting.output.reply_body_prompt import detect_language, generate_reply_body
from quoting.pipeline import QuotingPipeline
from quoting.pricing import Quotation, QuotationItem

log = logging.getLogger("quoting.frontend_router")

router = APIRouter()


def _fallback_reply_body(language: str) -> str:
    """Template cover note used when the LLM is unavailable.

    Keeps the last step of the workflow working even if the model errors —
    the user can still create the Outlook reply, just without the
    contextual phrasing.
    """
    if language == "en":
        return (
            "Dear Sir or Madam,\n\n"
            "thank you for your inquiry. Please find our quotation attached as a PDF.\n\n"
            "Best regards\n[Absender]"
        )
    return (
        "Sehr geehrte Damen und Herren,\n\n"
        "vielen Dank für Ihre Anfrage. Anbei erhalten Sie unser Angebot als PDF.\n\n"
        "Mit freundlichen Grüßen\n[Absender]"
    )


def _format_mail_dict(mail_meta: dict) -> dict:
    return format_mail_dict(mail_meta)


def _workflow_service(
    *,
    pipeline: QuotingPipeline | None = None,
) -> ReviewWorkflowService:
    return _common.get_review_workflow_service(
        pipeline=pipeline or _common.get_pipeline(),
        settings_loader=load_user_settings,
        review_data_loader=_load_review_data,
        quotation_builder=build_quotation_with_overrides,
        quality_gate_evaluator=evaluate_quality_gate,
        pdf_builder=build_draft_pdf,
    )


def _load_review_data(
    review_id: str,
    pipeline: QuotingPipeline,
) -> tuple:
    return _service_load_review_data(
        review_id,
        pipeline,
        repo=_common.get_review_repo(),
    )


@router.get("/reviews", response_model=list[ReviewListItem])
def list_reviews() -> list[dict]:
    return _workflow_service().list_reviews()


def _review_by_outlook_item_status(outlook_item_id: str) -> dict:
    """Compact status payload for the review bound to ``outlook_item_id``.

    Used by the Outlook add-in to render the right workflow card without
    keeping any state in localStorage. 404 when no review is bound.
    """
    status = _workflow_service().get_outlook_item_status(outlook_item_id)
    if status is None:
        raise HTTPException(404, f"No review bound to Outlook item {outlook_item_id}")
    return status


@router.get("/reviews/by-outlook-item")
def get_review_by_outlook_item_query(outlook_item_id: str) -> dict:
    """Query-param variant for Outlook IDs containing slashes."""
    return _review_by_outlook_item_status(outlook_item_id)


@router.get("/reviews/by-outlook-item/{outlook_item_id}")
def get_review_by_outlook_item(outlook_item_id: str) -> dict:
    return _review_by_outlook_item_status(outlook_item_id)


def _detach_outlook_item(outlook_item_id: str) -> Response:
    """Unlink the review currently bound to ``outlook_item_id``.

    The review is preserved (still reachable via the overview); the
    Outlook plugin reverts to "new" for this mail.
    """
    _workflow_service().detach_outlook_item(outlook_item_id)
    return Response(status_code=204)


@router.post("/reviews/by-outlook-item/detach", status_code=204)
def detach_outlook_item_query(outlook_item_id: str) -> Response:
    """Query-param variant for Outlook IDs containing slashes."""
    return _detach_outlook_item(outlook_item_id)


@router.post("/reviews/by-outlook-item/{outlook_item_id}/detach", status_code=204)
def detach_outlook_item(outlook_item_id: str) -> Response:
    return _detach_outlook_item(outlook_item_id)


@router.post("/reviews/{review_id}/mark-opened")
def mark_review_opened(review_id: str) -> dict:
    """Record the first time the Review-UI was opened for ``review_id``."""
    _common.require_review(review_id)
    return _workflow_service().mark_review_opened(review_id)


@router.get("/reviews/{review_id}", response_model=ReviewDetail)
def get_review_detail(review_id: str) -> dict:
    _common.require_review(review_id)
    return _common.run_use_case(lambda: _workflow_service().get_detail(review_id))


@router.delete("/reviews/{review_id}", status_code=204)
def delete_review(review_id: str) -> Response:
    _common.require_review(review_id)
    _common.run_use_case(lambda: _workflow_service().delete_review(review_id))
    return Response(status_code=204)


@router.get("/reviews/{review_id}/mail", response_model=MailMeta)
def get_review_mail(review_id: str) -> dict:
    _common.require_review(review_id)
    return _workflow_service().get_mail(review_id)


# --------------------------------------------------------------------------- mutations
class AnfragePayload(BaseModel):
    model_config = {"extra": "allow"}


@router.put("/reviews/{review_id}/anfrage", response_model=Anfrage)
def put_anfrage(review_id: str, payload: dict) -> dict:
    _common.require_review(review_id)
    return _common.run_use_case(
        lambda: _workflow_service().update_anfrage(review_id, payload)
    )


@router.put("/reviews/{review_id}/overrides", response_model=list[ManualOverridePayload])
def put_overrides(review_id: str, payload: list[dict]) -> list[dict]:
    _common.require_review(review_id)
    return _common.run_use_case(
        lambda: _workflow_service().save_overrides(review_id, payload)
    )


class RequirementsAckRequest(BaseModel):
    indices: list[int] = Field(default_factory=list)


@router.put("/reviews/{review_id}/requirements-ack")
def put_requirements_ack(review_id: str, payload: RequirementsAckRequest) -> dict:
    """Persist which extracted requirements have been acknowledged by the user.

    Acknowledgments are stored by positional index. This is safe because the
    only path that changes a review's ``anforderungen`` is re-extraction, which
    runs exclusively via reset — and reset wipes every payload except the mail
    (``reset_review_state(keep={MAIL})``), clearing these acknowledgments too.
    So indices can never silently re-point at a different requirement. The
    range check below additionally rejects stale/out-of-range indices, and the
    quality gate fails safe (an unmatched index simply leaves a requirement
    unacknowledged, blocking approval rather than waving it through).
    """
    _common.require_review(review_id)
    repo = _common.get_review_repo()

    anfrage_dict = repo.load_anfrage(review_id) or {}
    total = len(anfrage_dict.get("anforderungen", []) or [])
    for idx in payload.indices:
        if idx < 0 or idx >= total:
            raise HTTPException(
                422,
                f"Index {idx} is out of range (0..{total - 1 if total else -1})",
            )

    repo.save_requirements_acknowledged(review_id, payload.indices)
    return {"indices": repo.load_requirements_acknowledged(review_id)}


@router.post("/reviews/{review_id}/regenerate", response_model=QuotationModel)
def regenerate_quotation(review_id: str, build_pdf: bool = True) -> dict:
    """Recompute prices (and optionally rebuild the draft PDF).

    During editing the UI passes ``build_pdf=false`` so each keystroke-blur
    only reprices (cheap); the draft PDF — only ever shown on the approval
    step — is rebuilt once when the user gets there.
    """
    _common.require_review(review_id)
    return _common.run_use_case(
        lambda: _workflow_service().regenerate_quotation(review_id, build_pdf=build_pdf)
    )


class FinalizeRequest(BaseModel):
    actor: str = Field(min_length=1)
    filename: str | None = None
    warning_acknowledged: bool = False
    exception_reason: str | None = Field(default=None, max_length=1000)


def _quotation_from_dict(data: dict) -> Quotation:
    items = [QuotationItem(**item) for item in data.get("items", [])]
    payload = {k: v for k, v in data.items() if k != "items"}
    return Quotation(items=items, **payload)


@router.get("/reviews/{review_id}/reply-body", response_model=ReplyBodyResponse)
def get_reply_body(review_id: str) -> ReplyBodyResponse:
    """Generate a short, contextual cover-letter body for the Outlook reply."""
    _common.require_review(review_id)
    repo = _common.get_review_repo()

    anfrage_dict = repo.load_anfrage(review_id)
    quotation_dict = repo.load_quotation(review_id)
    mail = repo.load_mail(review_id) or {}
    if not anfrage_dict or not quotation_dict:
        raise HTTPException(409, "Anfrage or quotation not yet available for this review")

    try:
        anfrage = Anfrage.model_validate(anfrage_dict)
        quotation = _quotation_from_dict(quotation_dict)
    except (TypeError, ValueError) as exc:
        raise HTTPException(500, f"Stored review data is malformed: {exc}") from exc

    acknowledged_indices = set(repo.load_requirements_acknowledged(review_id))
    acknowledged_requirements = [
        req
        for idx, req in enumerate(anfrage.anforderungen)
        if idx in acknowledged_indices
    ]
    outgoing_attachment_names = [
        str(doc.get("filename") or "")
        for doc in repo.list_documents(review_id, kind="mail_attachment")
        if str(doc.get("filename") or "").strip()
    ]

    workflow = load_user_settings().workflow
    style_hint = workflow.llm_email_body_style_hint or ""

    pipeline = _common.get_pipeline()
    llm = build_llm(pipeline.settings)
    model_name = (
        pipeline.settings.gemini_model
        if pipeline.settings.llm_provider == "gemini"
        else pipeline.settings.azure_model
    )

    try:
        body, language = generate_reply_body(
            anfrage=anfrage,
            quotation=quotation,
            mail_body=str(mail.get("body") or ""),
            style_hint=style_hint,
            llm=llm,
            acknowledged_requirements=acknowledged_requirements,
            outgoing_attachment_names=outgoing_attachment_names,
            usage_callback=lambda usage: repo.record_llm_usage(
                review_id,
                source="reply_body",
                usage=usage,
                model=model_name,
            ),
        )
    except Exception as exc:
        log.warning(
            "Reply-body generation failed for %s; using template fallback: %s",
            review_id,
            exc,
        )
        language = detect_language(str(mail.get("body") or ""))
        return ReplyBodyResponse(
            body=_fallback_reply_body(language),
            language=language,
            model="fallback",
        )

    return ReplyBodyResponse(body=body, language=language, model=model_name)


@router.post("/reviews/{review_id}/finalize", response_model=FinalizeResponse)
def finalize_quotation(review_id: str, payload: FinalizeRequest) -> dict:
    _common.require_review(review_id)
    return _common.run_use_case(
        lambda: _workflow_service().finalize_quotation(
            review_id,
            actor=payload.actor,
            filename=payload.filename,
            warning_acknowledged=payload.warning_acknowledged,
            exception_reason=payload.exception_reason,
        )
    )


class EscalateRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)
    actor: str | None = None


@router.post("/reviews/{review_id}/escalate")
def escalate_review(review_id: str, payload: EscalateRequest) -> dict:
    """Flag a review for hand-off to Engineering/Plant (the as-is branch for
    inquiries Sales cannot answer automatically). Keeps the review and its
    audit trail; reset clears the flag like any other pipeline output.
    """
    _common.require_review(review_id)
    repo = _common.get_review_repo()
    record = {
        "escalated": True,
        "reason": payload.reason.strip(),
        "actor": (payload.actor or "").strip() or None,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    repo.save_escalation(review_id, record)
    return record


@router.delete("/reviews/{review_id}/escalate", status_code=204)
def clear_escalation(review_id: str) -> Response:
    """Withdraw an escalation (back to normal review)."""
    _common.require_review(review_id)
    _common.get_review_repo().delete_payload(review_id, "escalation")
    return Response(status_code=204)


@router.post("/reviews/{review_id}/cancel")
def cancel_pipeline(review_id: str) -> dict:
    """Stop a running pipeline. Cooperative: drops queued steps and flags the
    run cancelled so the coordinator won't enqueue the next step. A step that
    is already executing finishes, but nothing further runs. No-op if the run
    isn't currently in progress.
    """
    _common.require_review(review_id)
    container = _common.get_container()
    repo = _common.get_review_repo()
    progress_store = container.progress_store(repo)

    current = progress_store.read(review_id) or {}
    if current.get("status") != "running":
        return {
            "review_id": review_id,
            "status": current.get("status"),
            "removed_jobs": 0,
        }

    removed = container.job_queue(repo).cancel_pending(review_id)
    progress_store.cancel(review_id)
    return {"review_id": review_id, "status": "cancelled", "removed_jobs": removed}
