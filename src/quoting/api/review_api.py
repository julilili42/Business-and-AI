from __future__ import annotations

import base64
import json
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

import os
from quoting.pipeline import QuotingPipeline

PROJECT_ROOT = Path(__file__).resolve().parents[3]
REVIEW_DIR = PROJECT_ROOT / "data" / "reviews"

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
STREAMLIT_BASE_URL = os.getenv("STREAMLIT_BASE_URL", "http://localhost:8501")


app = FastAPI(title="Quoting Pipeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost:5173",
        "http://localhost:5173",
        "https://outlook.office.com",
        "https://outlook.office365.com",
        "https://outlook.live.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pipeline einmal initialisieren — Stammdaten werden gecached
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
    return {"ok": True}


@app.post("/api/reviews")
def create_review(payload: MailReviewRequest):
    review_id = uuid.uuid4().hex[:12]
    folder = REVIEW_DIR / review_id
    folder.mkdir(parents=True, exist_ok=True)

    # 1. Mail-Metadaten speichern (ohne base64-Blobs, damit mail.json lesbar bleibt)
    meta = payload.model_dump(by_alias=True, exclude={"attachments"})
    meta["attachments"] = [
        {k: v for k, v in a.model_dump().items() if k != "contentBase64"}
        for a in payload.attachments
    ]
    (folder / "mail.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    # 2. Attachments als Dateien rausschreiben
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

    # 3. Pipeline-Input wählen — erstes PDF gewinnt
    pdf_inputs = [p for p in saved_paths if p.suffix.lower() == ".pdf"]
    if not pdf_inputs:
        raise HTTPException(
            status_code=400,
            detail="No PDF attachment found in mail. Pipeline expects a PDF RFQ.",
        )

    rfq_pdf = pdf_inputs[0]

    # 4. Pipeline laufen lassen — Output landet in folder/<stem>/...
    try:
        result = _pipeline.run(
            input_path=rfq_pdf,
            output_dir=folder,
            mail_body=payload.body,
        )
    except Exception as e:
        raise HTTPException(500, f"Pipeline failed: {e}")

    # 5. URL für die generierte Draft-PDF zurückgeben
    return {
        "review_id": review_id,
        "review_url": f"{STREAMLIT_BASE_URL}?review_id={review_id}",
        "draft_pdf_url": f"{API_BASE_URL}/api/reviews/{review_id}/pdf",
        "draft_pdf_filename": f"Angebot_Draft_{review_id}.pdf",
        "summary": result.summary(),
    }


@app.get("/api/reviews/{review_id}/pdf")
def get_review_pdf(review_id: str):
    folder = REVIEW_DIR / review_id
    if not folder.exists():
        raise HTTPException(404, f"Review {review_id} not found")

    candidates = list(folder.rglob("*_ANGEBOT_DRAFT.pdf"))
    if not candidates:
        raise HTTPException(404, "Draft PDF not generated for this review")

    pdf = candidates[0]
    return FileResponse(
        pdf,
        media_type="application/pdf",
        filename=f"Angebot_Draft_{review_id}.pdf",
        headers={"Cache-Control": "public, max-age=300"},
    )