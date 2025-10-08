# CLI Reference

Authoritative guide to the `third-eye-mcp` command-line interface.

---

## Overview

The CLI is bundled with the npm package and requires Bun 1.0+. When installed globally, commands are available as `third-eye-mcp` and `third-eye-mcp-server`. When invoked with `bunx`, prepend commands with `bunx`.

```bash
bunx third-eye-mcp --help
```

---

## Core Commands

| Command | Description |
| ------- | ----------- |
| `up` | Start MCP server and dashboard. Runs detached by default. |
| `stop` | Stop all background services tracked via `~/.third-eye-mcp/pids`. |
| `restart` | Restart services (equivalent to `stop` + `up`). |
| `status` | Display running status, ports, and health summary. |
| `logs` | Print aggregated logs. Use `--tail` for live streaming. |
| `server` | Run the MCP server in stdio mode for use inside clients. |
| `db open` | Launch the SQLite inspector bundled with the CLI. |
| `reset` | Wipe database, logs, and background processes (requires confirmation). |
| `release` | Interactive release assistant for maintainers. |
| `release:ship` | Automated pipeline: requires a clean git tree, then bumps version, runs gates, publishes, tags, and optionally pushes. |

Run `third-eye-mcp <command> --help` for command-specific usage.

---

## Options

- `--foreground` / `-f`: Keep processes in the foreground with live output.
- `--verbose` / `-v`: Emit detailed logs for debugging.
- `--quiet` / `-q`: Minimal output (errors only).
- `--no-ui`: Start only the MCP server.
- `--port <number>`: Override server port (default `7070`).
- `--ui-port <number>`: Override dashboard port (default `3300`).
- `--tail`: Follow logs in real time when combined with `logs`.

---

## Background Service Flow

1. `third-eye-mcp up` spawns the MCP server (`bun run apps/server/src/start.ts`).
2. If `--no-ui` is not set, it also launches the dashboard (`bun run --cwd apps/ui dev`).
3. Process IDs are stored under `~/.third-eye-mcp/pids` for later control.
4. Logs are written to `~/.third-eye-mcp/logs`. Use `logs --tail` to monitor.

---

## Environment Shortcuts

- `MCP_DB`: Override database path.
- `MCP_HOST`, `MCP_PORT`: Bind server to a different interface/port.
- `MCP_UI_PORT`: Custom UI port.
- `THIRD_EYE_SECURITY_ENCRYPTION_KEY`: Provide a 64-char key for AES-256-GCM.
- `TELEMETRY_ENABLED=true`: Opt into telemetry and metrics collection.

Detailed configuration reference is available in [Configuration](./configuration.md).

---

## Release Workflow

Maintainers can execute:

```bash
pnpm release:prepare        # Clean, lint, test, build, pack
pnpm release:prepare:dry    # Prepare and run `npm publish --dry-run`
pnpm release:publish        # Full gate + npm publish
```

The CLI `release` command walks through semantic versioning and changelog updates interactively. See [Publishing](./publishing.md) for the complete checklist.
