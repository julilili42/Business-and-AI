from __future__ import annotations

import base64
import json
import os
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from quoting.ingestion import Mail
from quoting.pipeline import QuotingPipeline

PROJECT_ROOT = Path(__file__).resolve().parents[3]
REVIEW_DIR = PROJECT_ROOT / "data" / "reviews"
TUNNEL_FILE = PROJECT_ROOT / ".tunnel_url"

STREAMLIT_BASE_URL = os.getenv("STREAMLIT_BASE_URL", "http://localhost:8501")


def _api_base_url() -> str:
    """Resolve the public base URL the add-in should hit.

    Priority:
      1. <project>/.tunnel_url written by run_review_api.py at runtime
         (always reflects the *current* cloudflared tunnel)
      2. API_BASE_URL from environment (.env fallback)
      3. http://127.0.0.1:8000 (local dev)

    Read on every request so a tunnel restart is picked up without
    bouncing the API.
    """
    try:
        if TUNNEL_FILE.exists():
            url = TUNNEL_FILE.read_text(encoding="utf-8").strip()
            if url:
                return url
    except Exception:
        # Don't let a transient FS hiccup break the request.
        pass
    return os.getenv("API_BASE_URL", "http://127.0.0.1:8000")


app = FastAPI(title="Quoting Pipeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pipeline once — stammdaten cached
_pipeline = QuotingPipeline()


class MailAttachment(BaseModel):
    name: str
    contentType: str | None = None
    size: int | None = None
    id: str | None = None
    contentBase64: str | None = None


class MailReviewRequest(BaseModel):
    model_config = {"populate_by_name": True}

    subject: str
    sender: str = Field(alias="from")
    body: str
    attachments: list[MailAttachment] = []


@app.get("/health")
def health():
    return {"ok": True, "api_base_url": _api_base_url()}


@app.post("/api/reviews")
def create_review(payload: MailReviewRequest):
    review_id = uuid.uuid4().hex[:12]
    folder = REVIEW_DIR / review_id
    folder.mkdir(parents=True, exist_ok=True)

    # 1. Persist mail metadata (without base64 blobs so mail.json stays readable)
    meta = payload.model_dump(by_alias=True, exclude={"attachments"})
    meta["attachments"] = [
        {k: v for k, v in a.model_dump().items() if k != "contentBase64"}
        for a in payload.attachments
    ]
    (folder / "mail.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    # 2. Materialize attachments as files (pipeline reads from disk)
    saved_paths: list[Path] = []
    for att in payload.attachments:
        if not att.contentBase64:
            continue
        safe_name = Path(att.name).name or f"attachment_{len(saved_paths)}"
        target = folder / safe_name
        try:
            target.write_bytes(base64.b64decode(att.contentBase64))
        except Exception as e:
            raise HTTPException(400, f"Bad base64 in attachment '{att.name}': {e}")
        saved_paths.append(target)

    # 3. Build a generic Mail — pipeline decides what to do with body + attachments.
    mail = Mail(
        subject=payload.subject,
        sender=payload.sender,
        body=payload.body,
        attachments=saved_paths,
    )

    if not mail.has_content:
        raise HTTPException(
            status_code=400,
            detail="Mail has neither body text nor attachments — nothing to extract.",
        )

    # 4. Run the pipeline. Output goes into the review folder.
    try:
        result = _pipeline.run(
            mail,
            output_dir=folder,
            work_name="pipeline",
        )
    except Exception as e:
        raise HTTPException(500, f"Pipeline failed: {e}")

    # Resolve the live base URL right now — not at import time.
    api_base = _api_base_url()

    return {
        "review_id": review_id,
        "review_url": f"{STREAMLIT_BASE_URL}?review_id={review_id}",
        "draft_pdf_url": f"{api_base}/api/reviews/{review_id}/pdf",
        "draft_pdf_filename": f"Angebot_Draft_{review_id}.pdf",
        "summary": result.summary(),
    }


@app.get("/api/reviews/{review_id}/pdf")
def get_review_pdf(review_id: str):
    folder = REVIEW_DIR / review_id

    if not folder.exists():
        raise HTTPException(404, f"Review {review_id} not found")

    preferred = [
        folder / f"Angebot_Draft_{review_id}.pdf",
        folder / "draft_angebot.pdf",
    ]

    for pdf in preferred:
        if pdf.exists():
            return FileResponse(
                pdf,
                media_type="application/pdf",
                filename=f"Angebot_Draft_{review_id}.pdf",
                headers={
                    "Cache-Control": "no-store",
                    "Access-Control-Allow-Origin": "*",
                },
            )

    candidates = list(folder.rglob("*_ANGEBOT_DRAFT.pdf"))

    if not candidates:
        raise HTTPException(404, "Draft PDF not generated for this review")

    pdf = candidates[0]

    return FileResponse(
        pdf,
        media_type="application/pdf",
        filename=f"Angebot_Draft_{review_id}.pdf",
        headers={
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
        },
    )