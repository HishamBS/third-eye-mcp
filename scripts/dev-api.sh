#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"

# Load .env so CLI/API share credentials
if [ -f "$ROOT/.env" ]; then
  # shellcheck disable=SC2046,SC2034
  export $(grep -v '^#' "$ROOT/.env" | xargs)
fi

# Spin local Postgres/Redis via docker compose for CLI usage
(cd "$ROOT" && docker compose up -d postgres redis >/dev/null)

# Run API with uvicorn
cd "$ROOT"
uvicorn third_eye.api.server:app --host 0.0.0.0 --port 8000
