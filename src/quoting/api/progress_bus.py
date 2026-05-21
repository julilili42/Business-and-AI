"""In-memory pub/sub bridge between the pipeline worker and SSE consumers.

The pipeline runs in a background thread (`JobWorker`), but SSE consumers
live in the asyncio loop. `asyncio.Queue.put_nowait` is not safe to call
from another thread, so each subscriber records the loop it's running
on and `publish()` delivers events via `loop.call_soon_threadsafe`.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

_log = logging.getLogger("quoting.progress_bus")


@dataclass
class _Subscriber:
    queue: asyncio.Queue
    loop: asyncio.AbstractEventLoop


@dataclass
class ProgressBus:
    _subscribers: dict[str, list[_Subscriber]] = field(default_factory=dict)

    def publish(self, review_id: str, event: dict[str, Any]) -> None:
        """Broadcast ``event`` to every subscriber of ``review_id``.

        Safe to call from any thread.
        """
        subscribers = self._subscribers.get(review_id)
        if not subscribers:
            return
        for sub in list(subscribers):
            try:
                sub.loop.call_soon_threadsafe(sub.queue.put_nowait, event)
            except RuntimeError:
                _log.debug("dropping subscriber on closed loop for %s", review_id)
                self._remove_subscriber(review_id, sub)

    async def subscribe(self, review_id: str) -> AsyncIterator[dict[str, Any]]:
        """Yield events for ``review_id`` until the consumer cancels."""
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue = asyncio.Queue()
        sub = _Subscriber(queue=queue, loop=loop)
        self._subscribers.setdefault(review_id, []).append(sub)
        try:
            while True:
                event = await queue.get()
                yield event
        finally:
            self._remove_subscriber(review_id, sub)

    def subscriber_count(self, review_id: str) -> int:
        return len(self._subscribers.get(review_id, []))

    def _remove_subscriber(self, review_id: str, sub: _Subscriber) -> None:
        subscribers = self._subscribers.get(review_id)
        if not subscribers:
            return
        try:
            subscribers.remove(sub)
        except ValueError:
            return
        if not subscribers:
            self._subscribers.pop(review_id, None)


_DEFAULT_BUS: ProgressBus | None = None


def default_progress_bus() -> ProgressBus:
    global _DEFAULT_BUS
    if _DEFAULT_BUS is None:
        _DEFAULT_BUS = ProgressBus()
    return _DEFAULT_BUS


def reset_default_progress_bus() -> None:
    """Test helper for code that needs a fresh bus instance."""
    global _DEFAULT_BUS
    _DEFAULT_BUS = None
