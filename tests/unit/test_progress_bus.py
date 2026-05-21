"""Tests for quoting.api.progress_bus."""
from __future__ import annotations

import asyncio
import threading

from quoting.api.progress_bus import ProgressBus


def _run(coro):
    return asyncio.run(coro)


def test_publish_delivers_to_subscriber():
    async def scenario():
        bus = ProgressBus()
        received = []

        async def consume():
            async for event in bus.subscribe("r1"):
                received.append(event)
                if event["event"] == "done":
                    break

        task = asyncio.create_task(consume())
        await asyncio.sleep(0)
        bus.publish("r1", {"event": "progress", "data": {"step": 1}})
        bus.publish("r1", {"event": "done", "data": {}})
        await task
        return received

    received = _run(scenario())
    assert received == [
        {"event": "progress", "data": {"step": 1}},
        {"event": "done", "data": {}},
    ]


def test_publish_to_review_with_no_subscribers_is_noop():
    bus = ProgressBus()
    bus.publish("nobody-home", {"event": "progress", "data": {}})
    assert bus.subscriber_count("nobody-home") == 0


def test_multiple_subscribers_both_receive():
    async def scenario():
        bus = ProgressBus()
        seen_a, seen_b = [], []

        async def consume(target):
            async for event in bus.subscribe("r1"):
                target.append(event)
                if event["event"] == "done":
                    break

        task_a = asyncio.create_task(consume(seen_a))
        task_b = asyncio.create_task(consume(seen_b))
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        bus.publish("r1", {"event": "progress", "data": {"step": 1}})
        bus.publish("r1", {"event": "done", "data": {}})
        await asyncio.gather(task_a, task_b)
        return seen_a, seen_b

    seen_a, seen_b = _run(scenario())
    assert seen_a == seen_b
    assert {e["event"] for e in seen_a} == {"progress", "done"}


def test_subscriber_is_cleaned_up_on_aclose():
    async def scenario():
        bus = ProgressBus()
        gen = bus.subscribe("r1")
        task = asyncio.create_task(gen.__anext__())
        await asyncio.sleep(0)
        bus.publish("r1", {"event": "x", "data": {}})
        await task
        before = bus.subscriber_count("r1")
        await gen.aclose()
        return before, bus.subscriber_count("r1")

    before, after = _run(scenario())
    assert before == 1
    assert after == 0


def test_cross_thread_publish_uses_call_soon_threadsafe():
    """publish() called from a worker thread must reach the asyncio consumer."""

    async def scenario():
        bus = ProgressBus()
        received = []

        async def consume():
            async for event in bus.subscribe("r1"):
                received.append(event)
                if event["event"] == "done":
                    break

        task = asyncio.create_task(consume())
        await asyncio.sleep(0)

        def worker():
            bus.publish("r1", {"event": "progress", "data": {"thread": "worker"}})
            bus.publish("r1", {"event": "done", "data": {}})

        thread = threading.Thread(target=worker)
        thread.start()
        thread.join()
        await task
        return received

    received = _run(scenario())
    assert received[0]["data"]["thread"] == "worker"
    assert received[-1]["event"] == "done"
