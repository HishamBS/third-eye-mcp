#!/usr/bin/env bash
set -euo pipefail

if [ -f /app/config.yaml ]; then
  echo "Using configuration at /app/config.yaml"
fi

exec "$@"
