# 🧿 Third Eye MCP ![Coverage](docs/badges/coverage.svg)

Local-first AI orchestration layer for multi-provider LLM workflows.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black)](https://bun.sh/)

---

Third Eye MCP is a Bun-powered Model Context Protocol (MCP) server that coordinates eight specialised "Eyes" across Groq, OpenRouter, Ollama, and LM Studio providers. It delivers intelligent routing with automatic fallbacks, persona versioning, strict envelope validation, and a real-time monitoring dashboard—while keeping all data on your machine.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Installation Options](#installation-options)
- [Core Workflow](#core-workflow)
- [Documentation Hub](#documentation-hub)
- [Monorepo Layout](#monorepo-layout)
- [Development](#development)
- [Release & Publishing](#release--publishing)
- [Support](#support)
- [License](#license)

---

## Quick Start

> **Requirement:** Bun 1.0+ must be installed. Verify with `bun --version`.

```bash
# Launch without installing globally
bunx third-eye-mcp up

# MCP server → http://127.0.0.1:7070
# Dashboard  → http://127.0.0.1:3300
```

What happens on first run:

- Seeds SQLite database at `~/.third-eye-mcp/mcp.db`
- Activates all eight Eyes with default personas
- Starts Next.js dashboard with live pipeline telemetry
- Preloads intelligent routing and fallback chains

Need the CLI on your PATH? Install globally after Bun is installed:

```bash
npm install -g third-eye-mcp           # or bun add -g
third-eye-mcp up
```

---

## Installation Options

- **Zero-install (recommended)** – `bunx third-eye-mcp up`
- **Global CLI** – `npm install -g third-eye-mcp` then run `third-eye-mcp up`
- **From source**
  ```bash
  git clone https://github.com/HishamBS/third-eye-mcp.git
  cd third-eye-mcp
  bun install
  bun run build:packages
  bun run db:migrate
  bun run dev
  ```

Hardware & accounts:

- Groq and/or OpenRouter API keys (or local Ollama / LM Studio)
- Claude Desktop, Cursor, Cline, Continue.dev, or Warp for MCP client integration

---

## Core Workflow

1. **Start services** – `bunx third-eye-mcp up`
2. **Open dashboard** – [http://127.0.0.1:3300](http://127.0.0.1:3300)
3. **Configure providers** – Settings → Providers (Groq/OpenRouter keys) or local runtimes
4. **Adjust routing** – Models & Routing tab (primary + fallback models per Eye)
5. **Connect your MCP client** – follow [docs/integrations](docs/integrations/README.md)
6. **Monitor sessions** – live pipeline telemetry, persona versioning, replay history

For end-to-end usage scenarios, see [docs/usage.md](docs/usage.md).

---

## Documentation Hub

| Topic            | Docs                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Getting started  | [docs/getting-started.md](docs/getting-started.md) – prerequisites, installation, first run checklist  |
| Daily operations | [docs/usage.md](docs/usage.md) – connecting agents, workflows, troubleshooting                         |
| CLI reference    | [docs/cli.md](docs/cli.md) – commands, options, background process model                               |
| Configuration    | [docs/configuration.md](docs/configuration.md) – env vars, strictness profiles, security               |
| Providers        | [docs/PROVIDERS.md](docs/PROVIDERS.md) – Groq/OpenRouter/Ollama/LM Studio setup                        |
| API surface      | [docs/API_REFERENCE.md](docs/API_REFERENCE.md) & [docs/MCP_API.md](docs/MCP_API.md)                    |
| Architecture     | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – system design & components                              |
| Database         | [docs/DATABASE.md](docs/DATABASE.md) – schema diagrams, migrations, backups                            |
| Integrations     | [docs/integrations/README.md](docs/integrations/README.md) – Claude, Cursor, Cline, Warp, Continue.dev |
| Workflows        | [docs/workflows/README.md](docs/workflows/README.md) – reusable pipeline templates                     |
| Publishing       | [docs/publishing.md](docs/publishing.md) – release workflow & npm publishing checklist                 |
| Troubleshooting  | [docs/FAQ.md](docs/FAQ.md) – common fixes & FAQs                                                       |

---

## Monorepo Layout

```
apps/            Next.js dashboard + Bun server entrypoints
packages/        Core orchestrator, providers, database, utilities
cli/             TypeScript CLI source (bundled via Bun)
dist/            Bundled CLI executables (generated)
docs/            Documentation hub (this README links here)
scripts/         Operational scripts (setup, seed, health checks)
__tests__/       Unit test suites
examples/        Sample configs and scenario playbooks
```

---

## Development

```bash
bun install                # install workspace dependencies
bun run build              # build packages, server, UI, CLI (alias for release pipeline)

bun run lint               # type-check monorepo
bun run test:coverage      # run Vitest with coverage
bun run test:e2e           # Playwright end-to-end tests

third-eye-mcp reset        # wipe ~/.third-eye-mcp (destructive)
third-eye-mcp logs --tail  # follow combined logs
```

Key scripts:

- `bun run health:full` – comprehensive diagnostics
- `bun run ws:check` – WebSocket reconnect simulation
- `bun run scripts/seed-defaults.ts` – reseed personas, routing, strictness, app defaults, integrations

---

## Release & Publishing

Third Eye MCP ships to npm as `third-eye-mcp`. For an end-to-end automated release (version prompt → gates → publish → tag), run:

```bash
bunx third-eye-mcp release:ship
```

Prefer manual control? Follow the publishing checklist in [docs/publishing.md](docs/publishing.md):

```bash
bun run release:prepare    # clean → lint → test → build → pack
bun run release:prepare:dry  # add npm publish --dry-run
npm publish --access public
```

Before publishing:

- Ensure `dist/cli.js` and `dist/mcp-server.js` are rebuilt with `bun run build:cli`
- Update version and changelog via `bunx third-eye-mcp release` or manual edits
- Verify archive artefact (`third-eye-mcp-<version>.tgz`) and generated docs

---

## Support

- Dashboard: [http://127.0.0.1:3300](http://127.0.0.1:3300)
- Health check: `bun run health:full`
- Logs: `third-eye-mcp logs --tail`
- Issues & feature requests: [github.com/HishamBS/third-eye-mcp/issues](https://github.com/HishamBS/third-eye-mcp/issues)

---

## License

Released under the [MIT License](LICENSE).

Commercial support or enterprise features? File an issue or start a discussion—contributors welcome.
