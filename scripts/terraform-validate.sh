#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
TERRAFORM_DIR="$ROOT_DIR/infra/terraform"

if [[ ! -d "$TERRAFORM_DIR" ]]; then
  echo "Terraform directory not found: $TERRAFORM_DIR" >&2
  exit 1
fi

run_terraform() {
  terraform -chdir="$TERRAFORM_DIR" "$@"
}

if command -v terraform >/dev/null 2>&1; then
  run_terraform init -backend=false >/dev/null
  run_terraform validate
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Terraform binary not found and Docker is unavailable. Install Terraform or Docker to run validation." >&2
  exit 1
fi

docker run --rm \
  -v "$ROOT_DIR":/workspace \
  -w /workspace/infra/terraform \
  hashicorp/terraform:1.6.6 \
  init -backend=false >/dev/null

docker run --rm \
  -v "$ROOT_DIR":/workspace \
  -w /workspace/infra/terraform \
  hashicorp/terraform:1.6.6 \
  validate
