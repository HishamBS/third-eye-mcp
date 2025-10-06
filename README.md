# 🧿 Third Eye MCP

**Local-first AI orchestration layer for multi-provider LLM workflows**

Third Eye MCP is a TypeScript-based Model Context Protocol (MCP) server that orchestrates specialized AI "Eyes" across multiple providers (Groq, OpenRouter, Ollama, LM Studio). Built with Bun, it provides real-time monitoring, intelligent routing with fallbacks, and persona versioning—all running locally with your own API keys.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black)](https://bun.sh/)

---

## ✨ Features

- **🔀 Intelligent Routing**: Assign any model to any Eye tool with automatic fallback
- **📝 Persona Versioning**: Edit, stage, and activate personas without restart
- **📡 Real-time Monitoring**: WebSocket-powered live session updates
- **🔐 Secure by Default**: AES-256-GCM encryption for API keys, local-first architecture
- **🎨 Clean UI**: Next.js 15 dashboard with Overseer theme (Naruto-inspired palette)
- **🚀 Multi-Provider**: Groq, OpenRouter, Ollama, LM Studio support out-of-the-box
- **🧪 Envelope Validation**: Strict JSON schema validation with retry logic
- **📊 Metrics & Telemetry**: Token tracking, latency monitoring (opt-in telemetry)

---

## 🚀 Quickstart

### Prerequisites

- [Bun](https://bun.sh/) 1.0+
- API keys for Groq/OpenRouter (optional: use Ollama/LM Studio locally)

### Installation

```bash
# Install from npm
npx third-eye-mcp@latest

# Or clone and run locally
git clone https://github.com/yourusername/third-eye-mcp.git
cd third-eye-mcp
bun install
bun run setup    # Seeds database with default personas and routing
bun run dev      # Starts server on :7070 and UI on :3300
```

### First Run

1. **Seed the database**:
   ```bash
   bun run setup
   ```

2. **Start the stack**:
   ```bash
   npx third-eye-mcp up
   # or: bun run dev
   ```

3. **Open the UI**: Navigate to [http://127.0.0.1:3300](http://127.0.0.1:3300)

4. **Configure providers**:
   - Go to **Models & Routing**
   - Add your Groq/OpenRouter API keys
   - Test model availability
   - Assign models to Eyes (Sharingan, Rinnegan, Tenseigan)

5. **Create a session**:
   - Click **New Session**
   - Run your first Eye
   - Watch real-time updates via WebSocket

---

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - System design and data flow
- [Providers Guide](docs/PROVIDERS.md) - Setup for Groq, OpenRouter, Ollama, LM Studio
- [Routing Matrix](docs/ROUTING.md) - Configure Eye-to-Model mappings and fallbacks
- [Personas Guide](docs/PERSONAS.md) - Edit, version, and activate Eye personas
- [MCP API Reference](docs/MCP_API.md) - REST and WebSocket endpoints
- [Database Schema](docs/DATABASE.md) - SQLite schema, migrations, backups
- [Security](docs/SECURITY.md) - Encryption, privacy, and telemetry
- [Extending](docs/EXTENDING.md) - Add new Eyes, providers, or features
- [FAQ](docs/FAQ.md) - Common issues and troubleshooting

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Third Eye MCP Stack                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CLI (npx third-eye-mcp)                               │
│    ↓                                                    │
│  ┌──────────────┐         ┌────────────────┐          │
│  │ Bun Server   │◄───────►│ Next.js 15 UI  │          │
│  │ (Hono)       │  WS     │ (App Router)   │          │
│  │ :7070        │         │ :3300          │          │
│  └──────┬───────┘         └────────────────┘          │
│         │                                              │
│         ↓                                              │
│  ┌──────────────────────────────────────┐             │
│  │     Eye Orchestrator (Core)          │             │
│  │  - Routing resolver                  │             │
│  │  - Persona loader                    │             │
│  │  - Envelope validator                │             │
│  │  - Fallback logic                    │             │
│  └──────────────┬───────────────────────┘             │
│                 │                                      │
│                 ↓                                      │
│  ┌──────────────────────────────────────┐             │
│  │    Provider Factory                  │             │
│  │  ┌─────────┬──────────┬──────────┐   │             │
│  │  │  Groq   │OpenRouter│ Ollama   │   │             │
│  │  └─────────┴──────────┴──────────┘   │             │
│  └──────────────────────────────────────┘             │
│                                                         │
│  SQLite (~/.overseer/overseer.db)                      │
│    - Sessions, Runs, Personas                          │
│    - Routing configs                                   │
│    - Encrypted API keys                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Database
OVERSEER_DB=~/.overseer/overseer.db

# Server
OVERSEER_HOST=127.0.0.1
OVERSEER_PORT=7070

# UI
OVERSEER_UI_PORT=3300
AUTO_OPEN=true

# Providers
GROQ_API_KEY=your-groq-key
OPENROUTER_API_KEY=your-openrouter-key

# Security
THIRD_EYE_SECURITY_ENCRYPTION_KEY=your-64-char-encryption-key

# Telemetry (opt-in)
TELEMETRY_ENABLED=false
```

### Config File (`~/.overseer/config.json`)

```json
{
  "db": {
    "path": "~/.overseer/overseer.db"
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
    "ollama": {
      "baseUrl": "http://127.0.0.1:11434"
    }
  },
  "telemetry": {
    "enabled": false
  }
}
```

---

## 🎯 CLI Commands

```bash
# Start server + UI
npx third-eye-mcp up

# Open DB browser
npx third-eye-mcp db open

# Reset all data (with confirmation)
npx third-eye-mcp reset

# Run with Docker (optional)
npx third-eye-mcp docker up
```

---

## 🧪 Testing

```bash
# Unit tests (Vitest)
bun test

# Integration tests
bun run test:integration

# E2E tests (Playwright)
bun run e2e

# Performance test
bun run test:perf
```

---

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker compose -f docker/docker-compose.yml up

# Production build
docker build -f docker/Dockerfile.bun -t third-eye-mcp .
docker run -p 7070:7070 -p 3300:3300 -v ~/.overseer:/root/.overseer third-eye-mcp
```

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone repo
git clone https://github.com/yourusername/third-eye-mcp.git
cd third-eye-mcp

# Install dependencies
bun install

# Seed database
bun run setup

# Start development
bun run dev

# Run tests
bun test
```

---

## 📜 License

MIT © Third Eye Team

---

## 🙏 Acknowledgments

- Inspired by Naruto's dōjutsu (eye techniques)
- Built with [Bun](https://bun.sh/), [Hono](https://hono.dev/), and [Next.js](https://nextjs.org/)
- Powered by Groq, OpenRouter, Ollama, and LM Studio

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/third-eye-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/third-eye-mcp/discussions)
- **Docs**: [Full Documentation](docs/)

---

**Built with 🧿 by the Third Eye Team**
