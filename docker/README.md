# 🐳 Third Eye MCP - Docker Deployment

Run Third Eye MCP stack with Docker Compose (Server + UI + Optional Ollama).

## Quick Start

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

## Services

### Server (Port 7070)
- **Bun-based REST + WebSocket API**
- Handles Eye orchestration, routing, personas
- Persistent SQLite database in Docker volume

### UI (Port 3300)
- **Next.js 15 portal**
- Models configuration, personas editor, session monitor
- Access at: http://localhost:3300

### Ollama (Port 11434) - Optional
- **Local LLM runtime**
- Pre-configured for llama3.1:8b
- No API key required

## Configuration

### Environment Variables

Edit `docker-compose.yml` to customize:

```yaml
server:
  environment:
    - GROQ_API_KEY=your-groq-key
    - OPENROUTER_API_KEY=your-openrouter-key
    - THIRD_EYE_SECURITY_ENCRYPTION_KEY=your-encryption-key
```

### Data Persistence

- Server data: `third-eye-data` volume → `/data/overseer.db`
- Ollama models: `ollama-data` volume → `/root/.ollama`

### Pre-pull Ollama Models

Uncomment in `docker-compose.yml`:

```yaml
ollama:
  command: ["ollama", "pull", "llama3.1:8b"]
```

## Advanced Usage

### Custom Build

```bash
# Build images locally
docker compose build

# Build specific service
docker compose build server
```

### Production Deployment

```bash
# Run with restart policy
docker compose up -d --restart=always

# Scale (if needed)
docker compose up -d --scale server=2
```

### Networking

Services communicate via `third-eye-network`:
- Server: `http://server:7070`
- UI: `http://ui:3300`
- Ollama: `http://ollama:11434`

## Troubleshooting

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f server
```

### Reset Data

```bash
# Remove volumes (WARNING: deletes all data)
docker compose down -v
```

### Health Check

```bash
# Server health
curl http://localhost:7070/health

# WebSocket status
curl http://localhost:7070/ws/status
```

## Development

### Hot Reload (Not in Docker)

For development with hot reload, run locally:

```bash
# Exit Docker environment
docker compose down

# Run locally with Bun
bun run dev
```

## Architecture

```
┌──────────────────────────────────────┐
│           Docker Network             │
│  ┌────────────┐   ┌──────────────┐  │
│  │   Server   │◄──┤     UI       │  │
│  │  (Bun)     │   │  (Next.js)   │  │
│  │  :7070     │   │  :3300       │  │
│  └─────┬──────┘   └──────────────┘  │
│        │                             │
│        ↓                             │
│  ┌────────────┐                      │
│  │   Ollama   │                      │
│  │  :11434    │                      │
│  └────────────┘                      │
│                                      │
│  Volumes: third-eye-data, ollama-data│
└──────────────────────────────────────┘
```

## Support

- **Issues**: File on GitHub
- **Docs**: See `/docs` directory
- **Logs**: `docker compose logs -f`
