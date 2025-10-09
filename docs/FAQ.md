# Troubleshooting & FAQ

Practical fixes for common issues plus quick-reference answers for operating Third Eye MCP.

---

## Installation & Startup

### How do I install Third Eye MCP globally?

```bash
npm install -g third-eye-mcp
# or
pnpm add -g third-eye-mcp
# or
bun add -g third-eye-mcp
```

Then run:

```bash
third-eye-mcp up
```

### Can I launch without installing globally?

Yes—use Bun's on-demand runner:

```bash
bunx third-eye-mcp up
```

### How do I run from source?

```bash
git clone https://github.com/HishamBS/third-eye-mcp.git
cd third-eye-mcp
bun install
bun run build:packages
bun run db:migrate
bun run dev
```

### What are the prerequisites?

- Bun **1.0+** (required for the CLI runtime)
- Node.js **20+** (for development tooling)
- 2 GB RAM minimum (4 GB recommended)
- 500 MB disk (1 GB recommended)

### The dashboard did not open automatically

1. Ensure `MCP_AUTO_OPEN=true` and `MCP_UI_PORT=3300`
2. Open manually:
   ```bash
   open http://127.0.0.1:3300      # macOS
   start http://127.0.0.1:3300     # Windows
   xdg-open http://127.0.0.1:3300  # Linux
   ```

### The CLI says Bun is not found

Install Bun (`curl -fsSL https://bun.sh/install | bash`) and ensure `$HOME/.bun/bin` is on your `PATH`.

---

## Providers & Credentials

### My API key is rejected

- **Groq**: Keys start with `gsk_`. Verify at [console.groq.com/keys](https://console.groq.com/keys).
- **OpenRouter**: Keys start with `sk-or-`. Check credits at [openrouter.ai/account](https://openrouter.ai/account).

### Where are API keys stored?

Keys are encrypted in SQLite using **AES-256-GCM** with PBKDF2 key derivation. Provide a strong key via:

```bash
export THIRD_EYE_SECURITY_ENCRYPTION_KEY="$(openssl rand -hex 32)"
```

### Ollama returns “connection refused”

1. Start service: `ollama serve`
2. Pull a model: `ollama pull llama3.2`
3. Verify: `curl http://127.0.0.1:11434/api/tags`

### LM Studio models are missing

1. Launch LM Studio and start the local server
2. Verify endpoint: `curl http://127.0.0.1:1234/v1/models`
3. Override port if needed: `export LMSTUDIO_BASE_URL=http://127.0.0.1:5678/v1`

---

## Eyes & Personas

### What does each Eye do?

| Eye | Focus | Default Model |
| --- | ----- | ------------- |
| Overseer | Entry point, orchestration | `groq/llama-3.1-8b-instant` |
| Sharingan | Ambiguity detection | `groq/llama-3.1-8b-instant` |
| Prompt Helper | Prompt refinement | `openrouter/meta-llama/llama-3.3-70b` |
| Jogan | Intent analysis | `openrouter/meta-llama/llama-3.3-70b` |
| Rinnegan | Plan validation | `openrouter/meta-llama/llama-3.3-70b` |
| Mangekyo | Code review & quality gates | `openrouter/meta-llama/llama-3.3-70b` |
| Tenseigan | Evidence verification | `openrouter/meta-llama/llama-3.3-70b` |
| Byakugan | Consistency enforcement | `openrouter/meta-llama/llama-3.3-70b` |

### How do I customize personas?

Dashboard → **Personas**:
1. Select an Eye
2. Edit the Markdown persona template
3. Click **Save Draft** to create a new version
4. Activate to promote the persona to production

Seed via script: `bun run scripts/seed-database.ts`.

### Can I maintain multiple personas per Eye?

Yes. Personas are versioned. Activate the one you need or roll back via the dashboard.

---

## Diagnostics & Maintenance

### Quick health check

```bash
bun run health:full
```

### Test WebSocket reliability

```bash
bun run ws:check
```

### Tail logs

```bash
third-eye-mcp logs --tail
```

### Reset the local state (destructive)

```bash
third-eye-mcp reset
```

### Where is data stored?

Default directory: `~/.third-eye-mcp`
- `mcp.db` — SQLite database
- `logs/` — Rotating service logs
- `pids/` — Background process IDs

Set `MCP_DB` to relocate the database.

### How do I back up or restore the database?

```bash
bun run backup   # create timestamped backup in ~/.third-eye-mcp/backups
bun run restore  # select and restore a backup
```

---

## Performance & Reliability

### Slow responses

- Assign faster models to Sharingan/Overseer (`llama-3.1-8b-instant`)
- Enable telemetry to inspect per-eye latency
- Check provider status in dashboard Settings

### CLI fails to stop services

- Use `third-eye-mcp status` to inspect orphaned PIDs
- Remove stale PID files from `~/.third-eye-mcp/pids`
- Restart with `third-eye-mcp restart`

### Need structured debugging logs

Run in foreground with verbose logging:

```bash
bunx third-eye-mcp up --foreground --verbose
```

---

## Getting Help

- Documentation index: [docs/README.md](./README.md)
- Integration guides: [docs/integrations](./integrations/README.md)
- Provider setup: [docs/PROVIDERS.md](./PROVIDERS.md)
- Configuration reference: [docs/configuration.md](./configuration.md)
- Issues & feature requests: [GitHub Issues](https://github.com/HishamBS/third-eye-mcp/issues)
