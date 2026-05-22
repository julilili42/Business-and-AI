"""Rendering-step smoke checks.

PDF byte-level diffs are noisy (timestamps, font subsetting, object
ordering all jitter), so we don't compare bytes. We assert:

- the file exists
- it's non-trivially sized (>4 KB)
- the first 4 bytes are ``%PDF``
- the page count is >= 1

Anything stricter (visual diff, layout regression) belongs in a later
phase with a dedicated tool — we won't roll our own here.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass
class RenderingScore:
    file_ok: bool
    size_bytes: int
    page_count: int | None  # None if we couldn't parse
    issue: str | None


def score_rendering(pdf_path: Path | None) -> RenderingScore:
    if pdf_path is None or not pdf_path.is_file():
        return RenderingScore(False, 0, None, "pdf_path missing")
    size = pdf_path.stat().st_size
    if size < 4096:
        return RenderingScore(False, size, None, "pdf < 4 KB — likely empty")
    head = pdf_path.read_bytes()[:4]
    if head != b"%PDF":
        return RenderingScore(False, size, None, f"bad magic: {head!r}")
    try:
        import fitz  # type: ignore[import-not-found]

        with fitz.open(pdf_path) as doc:
            pages = doc.page_count
    except Exception as exc:  # pragma: no cover - defensive
        return RenderingScore(False, size, None, f"fitz failed: {exc}")
    if pages < 1:
        return RenderingScore(False, size, pages, "0 pages")
    return RenderingScore(True, size, pages, None)
