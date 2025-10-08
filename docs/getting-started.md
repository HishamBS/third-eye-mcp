# Getting Started

Comprehensive installation and onboarding instructions for running Third Eye MCP locally.

---

## Prerequisites

- **Bun 1.0+** (required for the CLI runtime)
  - Install via `curl -fsSL https://bun.sh/install | bash`
  - Verify with `bun --version`
- **Node.js 20+** (optional, required for certain development tooling)
- **git 2.40+** for cloning the repository
- **npm** or **pnpm** for dependency management if you prefer a global install

> **Why Bun?** The published CLI binaries (`third-eye-mcp` and `third-eye-mcp-server`) are bundled as Bun executables and depend on the Bun runtime even when invoked from npm.

---

## Installation Options

### Option 1 — Zero-install launch (recommended)

Use `bunx` to download the package on demand and start the stack immediately:

```bash
bunx third-eye-mcp up
```

This command will:
- Download the latest `third-eye-mcp` release from npm
- Seed the local database at `~/.third-eye-mcp/mcp.db` if it does not exist
- Start the MCP server on `http://127.0.0.1:7070`
- Launch the dashboard UI on `http://127.0.0.1:3300`

### Option 2 — Global installation

Install the CLI globally. Bun, npm, and pnpm are supported:

```bash
# Using npm
npm install -g third-eye-mcp

# Using pnpm
pnpm add -g third-eye-mcp

# Using Bun
bun add -g third-eye-mcp
```

Once installed:

```bash
third-eye-mcp up
```

### Option 3 — Clone for development

```bash
git clone https://github.com/HishamBS/third-eye-mcp.git
cd third-eye-mcp
bun install
bun run build:packages
bun run db:migrate
bun run dev
```

---

## First Run Checklist

1. **Start the services**
   ```bash
   bunx third-eye-mcp up
   ```
2. **Open the dashboard** at [http://127.0.0.1:3300](http://127.0.0.1:3300)
3. **Add provider credentials** under **Settings → Providers** (Groq/OpenRouter)
4. **Verify health**
   ```bash
   bun run health:full
   ```
5. **Test WebSocket telemetry**
   ```bash
   bun run ws:check
   ```
6. **Connect your MCP client** using one of the [integration guides](./integrations/README.md)

---

## Managing the Local Data Directory

- Default path: `~/.third-eye-mcp`
- Contains:
  - `mcp.db` — SQLite database with personas, routing, sessions
  - `logs/` — Rotating logs for server and UI
  - `pids/` — Track running background processes
- Remove with caution using `third-eye-mcp reset`

---

## Troubleshooting Startup

- Run with verbose logging: `bunx third-eye-mcp up --foreground --verbose`
- Ensure required ports are free: `lsof -i :7070`, `lsof -i :3300`
- Re-run database migrations if startup fails: `bun run db:migrate`
- Additional help: [Troubleshooting & FAQ](./FAQ.md)

---

## Next Steps

- Learn how to connect Claude, Cursor, Warp, and other clients in the [Usage Guide](./usage.md)
- Configure routing, telemetry, and strictness profiles in [Configuration](./configuration.md)
- Explore the inner workings in the [Architecture](./ARCHITECTURE.md) documentation

