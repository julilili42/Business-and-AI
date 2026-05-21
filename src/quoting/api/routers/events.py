"""Server-Sent Events stream for live review pipeline updates.

On connect, replays the current DB snapshot (progress / extracted /
matched / priced) so a fresh or reconnecting client catches up to the
pipeline's current position, then live-subscribes to the in-process
ProgressBus until the run terminates.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncGenerator, AsyncIterator
from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from quoting.api import _common
from quoting.api.progress_bus import default_progress_bus

_log = logging.getLogger("quoting.api.events")

router = APIRouter()

_KEEPALIVE_INTERVAL_S = 15.0


def _sse_frame(event: str, data: Any) -> bytes:
    payload = json.dumps(data, default=str)
    return f"event: {event}\ndata: {payload}\n\n".encode()


@router.get("/reviews/{review_id}/events")
async def stream_review_events(review_id: str) -> StreamingResponse:
    _common.require_review(review_id)
    repo = _common.get_review_repo()
    bus = default_progress_bus()

    async def generator() -> AsyncGenerator[bytes, None]:
        progress = repo.load_progress(review_id)
        if progress:
            yield _sse_frame("progress", progress)

        extracted = repo.load_extracted(review_id)
        if extracted:
            yield _sse_frame("extracted", extracted)

        matches = repo.load_matches(review_id)
        if matches:
            yield _sse_frame("matched", matches)

        quotation = repo.load_quotation(review_id)
        if quotation:
            yield _sse_frame("priced", quotation)

        if progress and progress.get("status") == "completed":
            yield _sse_frame("done", progress)
            return
        if progress and progress.get("status") == "failed":
            yield _sse_frame("error", progress)
            return

        async for event in bus.subscribe(review_id):
            try:
                yield _sse_frame(event["event"], event["data"])
            except (KeyError, TypeError):
                _log.warning("malformed bus event for %s: %r", review_id, event)
                continue
            if event["event"] in {"done", "error"}:
                return

    async def with_keepalive() -> AsyncIterator[bytes]:
        gen = generator()
        try:
            while True:
                try:
                    chunk = await asyncio.wait_for(
                        gen.__anext__(), timeout=_KEEPALIVE_INTERVAL_S
                    )
                except asyncio.TimeoutError:
                    yield b": keepalive\n\n"
                    continue
                except StopAsyncIteration:
                    return
                yield chunk
        finally:
            await gen.aclose()

    return StreamingResponse(
        with_keepalive(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
