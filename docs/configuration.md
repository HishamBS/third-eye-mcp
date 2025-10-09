# Configuration

Centralized reference for runtime configuration of Third Eye MCP.

---

## Environment Variables

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `MCP_DB` | Absolute path to SQLite database | `~/.third-eye-mcp/mcp.db` |
| `MCP_HOST` | Host/interface for MCP server | `127.0.0.1` |
| `MCP_PORT` | MCP server port | `7070` |
| `MCP_UI_PORT` | Dashboard port | `3300` |
| `MCP_ALLOWED_ORIGINS` | Comma-separated list of allowed origins for CORS | `http://localhost:3300` |
| `GROQ_API_KEY` | API key for Groq provider | _unset_ |
| `OPENROUTER_API_KEY` | API key for OpenRouter provider | _unset_ |
| `OLLAMA_BASE_URL` | Override Ollama host/port | `http://127.0.0.1:11434` |
| `LMSTUDIO_BASE_URL` | Override LM Studio host/port | `http://127.0.0.1:1234/v1` |
| `THIRD_EYE_SECURITY_ENCRYPTION_KEY` | 64-char AES-256-GCM key for provider-key encryption | Auto-generated (insecure for prod) |
| `TELEMETRY_ENABLED` | Enable opt-in telemetry and metrics | `false` |
| `REQUIRE_API_KEY` | Require API key auth for REST API | `false` |
| `THIRD_EYE_STRICTNESS_PROFILE` | Default strictness (`standard`, `enterprise`, etc.) | `standard` |

Set variables via shell exports, `.env`, or service managers.

---

## Configuration File

Third Eye loads `~/.third-eye-mcp/config.json` when present:

```json
{
  "db": {
    "path": "~/.third-eye-mcp/mcp.db"
  },
  "server": {
    "host": "127.0.0.1",
    "port": 7070
  },
  "ui": {
    "port": 3300,
    "autoOpen": true
  },
  "providers": {
    "groq": {
      "baseUrl": "https://api.groq.com/openai/v1"
    },
    "openrouter": {
      "baseUrl": "https://openrouter.ai/api/v1"
    },
    "ollama": {
      "baseUrl": "http://127.0.0.1:11434"
    },
    "lmstudio": {
      "baseUrl": "http://127.0.0.1:1234/v1"
    }
  },
  "telemetry": {
    "enabled": false
  }
}
```

Values in the config file override defaults but can be superseded by environment variables.

---

## Strictness Profiles

Strictness settings control validation thresholds across the Eyes. Profiles are stored in the `strictness_profiles` table and can be managed via the dashboard.

| Profile | Use Case | Notes |
| ------- | -------- | ----- |
| `casual` | Exploratory sessions | Minimal validation, faster responses |
| `standard` | Daily workflows | Balanced precision vs. latency |
| `enterprise` | Compliance-focused reviews | Tighter thresholds, more fallbacks |
| `security` | Sensitive code or policy reviews | Requires evidence and confirmations |

Create custom profiles via the dashboard or seed scripts. For schema details see [Database Reference](./DATABASE.md).

---

## Telemetry & Metrics

- Enable metrics by setting `TELEMETRY_ENABLED=true` and restarting services.
- Events stream to the dashboard and can be consumed via WebSocket (`/ws/dashboard`).
- Health endpoints return JSON with uptime, provider status, and queue depth.

---

## Security Hardening

1. Generate a secure encryption key:
   ```bash
   openssl rand -hex 32 | tr -d '\n'
   ```
2. Set `THIRD_EYE_SECURITY_ENCRYPTION_KEY` before starting services.
3. Bind the server to localhost for single-machine deployments (default).
4. Enable API key enforcement with `REQUIRE_API_KEY=true`.
5. Rotate provider keys regularly via the dashboard.

---

## Database Maintenance

- Run migrations: `bun run db:migrate`
- Backup database: `bun run backup`
- Restore from backup: `bun run restore`
- Seed personas/routing: `bun run scripts/seed-database.ts`

Backups are stored in `~/.third-eye-mcp/backups` by default. See [Database](./DATABASE.md) for schema diagrams.

---

## Related Documents

- [Provider Setup](./PROVIDERS.md)
- [CLI Reference](./cli.md)
- [FAQ & Troubleshooting](./FAQ.md)
- [Publishing Checklist](./publishing.md)

