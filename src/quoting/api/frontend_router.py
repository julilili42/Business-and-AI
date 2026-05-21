"""Aggregator for the React frontend's HTTP surface.

The actual handlers live in :mod:`quoting.api.routers`. Shared globals
live in :mod:`quoting.api._common`. Pure business logic lives in
:mod:`quoting.api.services`. Import directly from those modules.

Wire-up in ``quoting/api/review_api.py``:

    from quoting.api.frontend_router import router as frontend_router
    app.include_router(frontend_router)
"""

from __future__ import annotations

from fastapi import APIRouter

from quoting.api.routers import (
    attachments as _attachments_router,
)
from quoting.api.routers import (
    debug as _debug_router,
)
from quoting.api.routers import (
    events as _events_router,
)
from quoting.api.routers import (
    metrics as _metrics_router,
)
from quoting.api.routers import (
    reviews as _reviews_router,
)
from quoting.api.routers import (
    stammdaten as _stammdaten_router,
)
from quoting.api.routers import (
    upload as _upload_router,
)

router = APIRouter(prefix="/api", tags=["frontend"])
router.include_router(_metrics_router.router)
router.include_router(_reviews_router.router)
router.include_router(_events_router.router)
router.include_router(_attachments_router.router)
router.include_router(_upload_router.router)
router.include_router(_stammdaten_router.router)
router.include_router(_debug_router.router)
