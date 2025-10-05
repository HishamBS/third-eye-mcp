.PHONY: install dev run api cli test lint format mcp docker-up docker-down terraform-validate

install:
	uv pip install -e .[test]

dev:
	uvicorn src.third_eye.api.server:app --reload

run:
	python -m third_eye.cli rinnegan --prompt "Hello"

test:
	pytest -q

mcp:
	cd mcp-bridge && bun run src/index.ts

docker-up:
	docker compose up --build

docker-down:
	docker compose down

terraform-validate:
	./scripts/terraform-validate.sh
