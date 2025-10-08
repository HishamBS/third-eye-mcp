# Usage Guide

Detailed instructions for operating Third Eye MCP once the stack is running.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Connecting AI Agents](#connecting-ai-agents)
- [Using the Overseer Tool](#using-the-overseer-tool)
- [Understanding the Eyes](#understanding-the-eyes)
- [Monitoring Sessions](#monitoring-sessions)
- [Workflows and Examples](#workflows-and-examples)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Complete the [Getting Started](./getting-started.md) guide to install dependencies and launch the stack.
- Ensure the MCP server (`http://127.0.0.1:7070`) and dashboard (`http://127.0.0.1:3300`) are running.
- Configure provider credentials and routing in the dashboard or via environment variables (see [Configuration](./configuration.md)).

---

## Connecting AI Agents

Third Eye MCP exposes a single tool, `third_eye_overseer`, over the Model Context Protocol. Configure your MCP-compatible client to execute the bundled server binary.

### Recommended command

```json
{
  "command": "bunx",
  "args": ["third-eye-mcp", "server"],
  "env": {
    "GROQ_API_KEY": "gsk_your_key_here",
    "OPENROUTER_API_KEY": "sk-or-v1-your_key_here"
  }
}
```

> **Alternative:** If you installed globally using `npm install -g third-eye-mcp`, set `"command": "third-eye-mcp"` instead of `bunx`.

### Claude Desktop

1. Edit `~/.config/claude/mcp_settings.json` (macOS/Linux) or `%APPDATA%\Claude\mcp_settings.json` (Windows).
2. Add the Third Eye MCP entry:

```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "MCP_DB": "~/.third-eye-mcp/mcp.db",
        "GROQ_API_KEY": "gsk_your_key_here",
        "OPENROUTER_API_KEY": "sk-or-v1-your_key_here"
      }
    }
  }
}
```

3. Restart Claude Desktop to load the server.
4. Ask Claude: “List available MCP tools” and confirm `third_eye_overseer` appears.

### Cursor

Add to `~/.cursor/mcp_settings.json`:

```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "GROQ_API_KEY": "gsk_your_key",
        "OPENROUTER_API_KEY": "sk-or-v1-your_key"
      }
    }
  }
}
```

### Warp, Continue.dev, Cline

```json
{
  "models": [
    {
      "title": "Third Eye MCP",
      "provider": "mcp",
      "model": "third-eye-mcp",
      "command": "bunx third-eye-mcp server"
    }
  ]
}
```

### Verification steps

1. Restart your client to reload the MCP configuration.
2. Issue a test request such as “Use `third_eye_overseer` to analyse the text ‘Hello world’.”
3. Open the dashboard monitor to confirm the session appears and the eyes execute.

---

## Using the Overseer Tool

`third_eye_overseer` accepts user intent and optional context, orchestrates eye execution, and returns a structured envelope.

### Payload structure

```json
{
  "userMessage": "Review this pull request for security issues",
  "context": {
    "repo": "https://github.com/HishamBS/third-eye-mcp",
    "branch": "feature/pipeline"
  },
  "sessionId": "optional-session-id",
  "strictness": "enterprise"
}
```

- **`userMessage`**: Required request text.
- **`context`**: Optional metadata (files, history, URLs).
- **`sessionId`**: Provide to resume an existing session; otherwise generated.
- **`strictness`**: One of `casual`, `standard`, `enterprise`, or `security`.

### Response envelope

```json
{
  "eye": "mangekyo",
  "code": "OK",
  "verdict": "PASS",
  "summary": "No critical issues detected. Minor improvements suggested.",
  "metadata": {
    "tokensIn": 1250,
    "tokensOut": 640,
    "latencyMs": 7800,
    "fallbackUsed": false
  },
  "next": {
    "recommendation": "Rerun with security strictness if compliance is required"
  }
}
```

All responses conform to the Envelope schema documented in [MCP API](./MCP_API.md).

---

## Understanding the Eyes

Third Eye MCP ships with eight built-in lenses, each with its own persona and routing defaults:

| Eye | Purpose | Default Primary Model |
| --- | ------- | --------------------- |
| Overseer | Entry point, orchestrator | `groq/llama-3.1-8b-instant` |
| Sharingan | Ambiguity detection | `groq/llama-3.1-8b-instant` |
| Jogan | Intent analysis | `openrouter/meta-llama/llama-3.3-70b` |
| Prompt Helper | Prompt refinement | `openrouter/meta-llama/llama-3.3-70b` |
| Rinnegan | Plan validation | `openrouter/meta-llama/llama-3.3-70b` |
| Mangekyo | Code & quality review | `openrouter/meta-llama/llama-3.3-70b` |
| Tenseigan | Evidence validation | `openrouter/meta-llama/llama-3.3-70b` |
| Byakugan | Consistency enforcement | `openrouter/meta-llama/llama-3.3-70b` |

- Routing and fallback chains are editable in the dashboard under **Models & Routing**.
- Personas are versioned and stored in SQLite; edit from **Personas** tab or via `bun run scripts/seed-database.ts`.
- Strictness profiles adjust acceptance thresholds—see [Configuration](./configuration.md#strictness-profiles).

---

## Monitoring Sessions

Use the Next.js dashboard at [http://127.0.0.1:3300](http://127.0.0.1:3300):

- **Monitor**: real-time timeline of pipeline events.
- **Sessions**: list of active and historical sessions with transcript replay.
- **Models & Routing**: manage primary/fallback providers per eye.
- **Settings**: configure telemetry, encryption key, database location.

Programmatic monitoring endpoints are documented in [API Reference](./API_REFERENCE.md).

---

## Workflows and Examples

| Scenario | Eye Sequence | Notes |
| -------- | ------------ | ----- |
| Clarify ambiguous request | Sharingan → Prompt Helper → Jogan | Ensures the agent gathers missing requirements before execution. |
| Code review with safety checks | Mangekyo → Tenseigan → Byakugan | Combines static analysis, evidence validation, and consistency enforcement. |
| Incident response | Overseer → Rinnegan → Sharingan | Validates runbooks, plans follow-up questions, and confirms clarity. |
| Documentation generation | Prompt Helper → Mangekyo → Overseer | Produces draft docs, then Overseer compiles final response. |

More workflow templates are available in [docs/workflows](./workflows) (coming soon) and via the dashboard presets.

---

## Troubleshooting

- Run health diagnostics: `bun run health:full`
- Tail background service logs: `third-eye-mcp logs --tail`
- Reset persistent state (destructive): `third-eye-mcp reset`
- Refer to the expanded [Troubleshooting & FAQ](./FAQ.md) for platform-specific guidance.

---

## Further Reading

- [Configuration](./configuration.md)
- [CLI Reference](./cli.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Publishing Checklist](./publishing.md)

