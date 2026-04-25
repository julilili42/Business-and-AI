"""API launcher for Outlook add-in integration.

Run from project root:

    python run_api.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import uvicorn

_ROOT = Path(__file__).resolve().parent
_SRC = _ROOT / "src"

for p in (_ROOT, _SRC):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))


if __name__ == "__main__":
    uvicorn.run("quoting.api.review_api:app", host="127.0.0.1", port=8000, reload=True)