"""Tests for quoting.api.progress_store."""
from __future__ import annotations

from pathlib import Path

import pytest

from quoting.api.progress_store import (
    PIPELINE_STEPS,
    complete_progress,
    fail_progress,
    init_progress,
    read_progress,
    update_step,
    write_progress,
)


@pytest.fixture
def review_dir(tmp_path: Path) -> Path:
    d = tmp_path / "review_prog"
    d.mkdir()
    return d


def test_init_creates_progress_file(review_dir):
    data = init_progress(review_dir, "abc123")
    assert (review_dir / "progress.json").exists()
    assert data["review_id"] == "abc123"
    assert data["status"] == "running"
    assert data["progress_percent"] == 0


def test_init_sets_created_at(review_dir):
    data = init_progress(review_dir, "abc123")
    assert "created_at" in data
    assert data["created_at"] is not None


def test_init_creates_all_pipeline_steps(review_dir):
    data = init_progress(review_dir, "x")
    step_names = [s["name"] for s in data["steps"]]
    assert step_names == PIPELINE_STEPS


def test_read_progress_returns_none_when_missing(review_dir):
    assert read_progress(review_dir) is None


def test_read_progress_after_init(review_dir):
    init_progress(review_dir, "y")
    data = read_progress(review_dir)
    assert data is not None
    assert data["review_id"] == "y"


def test_update_step_marks_running(review_dir):
    init_progress(review_dir, "z")
    update_step(review_dir, "Extraktion", "started", "LLM läuft")
    data = read_progress(review_dir)
    step = next(s for s in data["steps"] if s["name"] == "Extraktion")
    assert step["status"] == "running"
    assert step["detail"] == "LLM läuft"


def test_update_step_advances_percent(review_dir):
    init_progress(review_dir, "z")
    update_step(review_dir, "Mail vorbereiten", "completed", "")
    data = read_progress(review_dir)
    assert data["progress_percent"] > 0


def test_complete_progress(review_dir):
    init_progress(review_dir, "z")
    complete_progress(review_dir, {"draft_pdf_url": "/pdf/draft.pdf"})
    data = read_progress(review_dir)
    assert data["status"] == "completed"
    assert data["progress_percent"] == 100
    assert data["result"]["draft_pdf_url"] == "/pdf/draft.pdf"
    for step in data["steps"]:
        assert step["status"] in ("completed", "skipped")


def test_fail_progress(review_dir):
    init_progress(review_dir, "z")
    update_step(review_dir, "Extraktion", "started", "")
    fail_progress(review_dir, "LLM API timeout")
    data = read_progress(review_dir)
    assert data["status"] == "failed"
    assert data["error"] == "LLM API timeout"


def test_atomic_write_no_tmp_leftover(review_dir):
    init_progress(review_dir, "z")
    tmp_files = list(review_dir.glob("*.tmp"))
    assert tmp_files == [], "Temporary .tmp file should not remain after write"


def test_write_progress_roundtrip(review_dir):
    init_progress(review_dir, "z")
    data = read_progress(review_dir)
    data["custom_field"] = "hello"
    write_progress(review_dir, data)
    reloaded = read_progress(review_dir)
    assert reloaded["custom_field"] == "hello"
