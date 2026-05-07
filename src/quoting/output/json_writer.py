"""JSON snapshot writer."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def save_json(data: Any, path: Path) -> None:
    """Atomically serialize any JSON-ready object to path (UTF-8, pretty)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, indent=2, ensure_ascii=False, default=str)
    tmp = path.with_suffix(path.suffix + ".tmp")
    try:
        tmp.write_text(payload, encoding="utf-8")
        tmp.replace(path)
    except Exception:
        tmp.unlink(missing_ok=True)
        raise
