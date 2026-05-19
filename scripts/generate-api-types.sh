#!/usr/bin/env bash
# Generate TypeScript types for the review UI from the FastAPI OpenAPI spec.
#
# Runs offline — imports the FastAPI app in-process and dumps /openapi.json,
# then pipes it to openapi-typescript. No running backend required.
#
# Output: review-ui/src/shared/api-types.ts
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$REPO_ROOT/review-ui/src/shared/api-types.ts"
TMP="$(mktemp -t openapi.XXXXXX.json)"
trap 'rm -f "$TMP"' EXIT

cd "$REPO_ROOT"
uv run python -c "from quoting.api.review_api import app; import json,sys; json.dump(app.openapi(), sys.stdout)" > "$TMP"

npx --prefix review-ui openapi-typescript "$TMP" --output "$OUT"

echo "Wrote $OUT"
