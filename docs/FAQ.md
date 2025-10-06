# Frequently Asked Questions

## Installation & Setup

### How do I install Third Eye MCP globally?

```bash
npx third-eye-mcp
```

This will:
1. Download and install the package
2. Start the server on port 7070
3. Auto-open the portal at http://127.0.0.1:3300

### Can I run Third Eye without npm/npx?

Yes, clone and run locally:

```bash
git clone https://github.com/yourusername/third-eye-mcp.git
cd third-eye-mcp
bun install
bun run setup    # Seed database
bun run dev      # Start server + UI
```

### What are the system requirements?

**Minimum**:
- Bun 1.0+ (or Node.js 20+)
- 2GB RAM
- 500MB disk space

**Recommended**:
- Bun 1.0+
- 4GB RAM
- 1GB disk space
- For local AI: 8GB+ RAM, GPU optional

### Portal doesn't open automatically

**Check configuration**:

```bash
# .env or environment
AUTO_OPEN=true
UI_PORT=3300
```

**Manual open**:
```bash
open http://127.0.0.1:3300  # macOS
start http://127.0.0.1:3300 # Windows
xdg-open http://127.0.0.1:3300 # Linux
```

---

## Provider Setup

### My API key isn't working

**Groq**:
- Key must start with `gsk_`
- Get key at [console.groq.com](https://console.groq.com)
- Verify at: https://console.groq.com/keys

**OpenRouter**:
- Key must start with `sk-or-`
- Get key at [openrouter.ai](https://openrouter.ai)
- Check credits at: https://openrouter.ai/credits

### How are API keys stored?

Keys are encrypted using **AES-256-GCM** and stored in SQLite database.

**Encryption details**:
- Algorithm: AES-256-GCM (authenticated encryption)
- Key derivation: PBKDF2 with 100,000 iterations
- Random IV per key
- Authentication tag verified on decryption

**Set encryption key**:
```bash
export ENCRYPTION_KEY="your-secure-random-key"
bun run dev
```

If not set, a default key is used (not recommended for production).

### Can I use multiple API keys for the same provider?

Currently, only one key per provider is supported. This is by design to keep configuration simple.

**Workaround**: Use environment variables for different keys:

```bash
GROQ_API_KEY="key1" bun run dev      # Session 1
GROQ_API_KEY="key2" bun run dev      # Session 2
```

### Ollama says "connection refused"

**Check if Ollama is running**:
```bash
ollama serve
```

**Verify health**:
```bash
curl http://127.0.0.1:11434/api/tags
```

**Check port**:
Default is `11434`. If using custom port:
```bash
export OLLAMA_BASE_URL=http://127.0.0.1:8080
```

### LM Studio models not showing up

**Ensure server is started**:
1. Open LM Studio
2. Click **Local Server** tab
3. Select a model
4. Click **Start Server**

**Check endpoint**:
```bash
curl http://127.0.0.1:1234/v1/models
```

If using different port:
```bash
export LMSTUDIO_BASE_URL=http://127.0.0.1:5678/v1
```

---

## Running Eyes

### What's the difference between Eyes?

| Eye | Purpose | Persona |
|-----|---------|---------|
| **Sharingan** | Code generation, debugging | Code expert |
| **Rinnegan** | Planning, architecture, review | Senior architect |
| **Tenseigan** | Testing, QA, edge cases | QA specialist |

You can customize personas in the **Personas** page.

### How do I customize an Eye's persona?

1. Go to **Personas** page
2. Select an Eye (e.g., Sharingan)
3. Edit the **Persona Template** (Markdown supported)
4. Click **Save & Activate**
5. Version increments automatically (e.g., v1 → v2)

**Example persona**:
```markdown
You are a senior Python developer specializing in async code.

Rules:
- Always use type hints
- Prefer asyncio over threading
- Write docstrings for all functions
```

### Can I create multiple personas for one Eye?

Yes! Each Eye supports versioned personas.

**Workflow**:
1. Create persona v1 (initial)
2. Edit and save → creates v2
3. Edit and save → creates v3
4. Activate any version to use it

**Use case**: A/B test different prompts for code generation.

### How does routing work?

Each Eye has:
- **Primary Provider/Model**: First choice
- **Fallback Provider/Model**: Used if primary fails

**Example**:
```
Sharingan Routing:
  Primary:  groq / llama-3.3-70b-versatile
  Fallback: ollama / llama3.2
```

If Groq fails (rate limit, downtime), Third Eye automatically retries with Ollama.

### What happens if both primary and fallback fail?

Third Eye returns an error envelope:

```json
{
  "tag": "error",
  "error": {
    "message": "All providers failed after retries",
    "code": "PROVIDER_FAILURE"
  }
}
```

The error is displayed in the UI and logged to the database.

---

## Real-Time Updates

### WebSocket not connecting

**Check server is running**:
```bash
curl http://127.0.0.1:7070/health
```

**Check WebSocket endpoint**:
```bash
wscat -c "ws://127.0.0.1:7070/ws/monitor?sessionId=test123"
```

**Install wscat** (if needed):
```bash
npm install -g wscat
```

**Common causes**:
- Firewall blocking WebSocket connections
- Server running on different port (check `PORT` env var)
- Session ID mismatch

### UI shows "Offline" even though server is running

**Verify WebSocket connection** in browser DevTools:
1. Open **Console** tab
2. Look for messages like:
   - ✅ `📡 WebSocket connected`
   - ❌ `WebSocket connection failed`

**Check session ID**:
The session ID in the URL must match the WebSocket connection.

**Manual test**:
```javascript
const ws = new WebSocket('ws://127.0.0.1:7070/ws/monitor?sessionId=abc123');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
```

### Runs aren't updating in real-time

**Check WebSocket broadcasts** in server logs:
```
📡 Broadcasted run_completed to 2 connections for session:abc123
```

If you don't see this, the run might not have completed successfully.

**Refresh manually**:
Click the refresh button in the UI or reload the page.

---

## Database

### Where is the database stored?

**Default location**:
```
./data/third-eye.db
```

**Custom location**:
```bash
export DATABASE_PATH=/path/to/custom.db
bun run dev
```

### How do I reset the database?

**Delete and reseed**:
```bash
rm -f data/third-eye.db
bun run setup
```

This will:
1. Delete existing database
2. Create new schema
3. Seed default personas and routing

### Can I migrate data from the old Python version?

Not directly. The database schema has changed significantly.

**Manual migration** (advanced):
1. Export data from old Python DB (PostgreSQL or SQLite)
2. Transform to new schema format
3. Import into new SQLite database

See [ARCHITECTURE.md](./ARCHITECTURE.md) for schema details.

### How do I back up my data?

**Simple backup** (SQLite file):
```bash
cp data/third-eye.db data/third-eye-backup.db
```

**Scheduled backups** (cron):
```bash
# Add to crontab
0 2 * * * cp /path/to/third-eye.db /backups/third-eye-$(date +\%Y\%m\%d).db
```

**Docker volumes**:
Volumes are persisted in Docker, but you can back up:
```bash
docker cp third-eye-server:/data/third-eye.db ./backup.db
```

---

## Performance

### Responses are slow

**Local providers (Ollama/LM Studio)**:
- Use smaller models (3B instead of 70B)
- Enable GPU acceleration (if available)
- Increase context window in model config
- Check CPU/RAM usage (`top` or `htop`)

**Cloud providers (Groq/OpenRouter)**:
- Check internet speed (should be >10 Mbps)
- Try different models (Groq is fastest)
- Check provider status pages:
  - [Groq Status](https://status.groq.com)
  - [OpenRouter Status](https://status.openrouter.ai)

**General**:
- Reduce input length (shorter prompts)
- Use streaming (future feature)
- Check logs for retry delays

### How do retries work?

**Exponential backoff**:
- Attempt 1: Immediate
- Attempt 2: +100ms delay
- Attempt 3: +300ms delay
- Total: ~400ms overhead

**Triggering conditions**:
- 5xx server errors (500, 502, 503)
- Network timeouts
- Rate limit errors (429)

**When retries stop**:
- 4xx client errors (401, 400) → no retry
- 200 success → return immediately

### Can I disable retries?

Not currently configurable. Retry logic is hardcoded in the orchestrator.

**Future enhancement**: Add retry config to routing table.

---

## Docker

### How do I run Third Eye in Docker?

```bash
cd docker
docker compose up -d
```

This starts:
- `server` (port 7070)
- `ui` (port 3300)
- `ollama` (optional, port 11434)

### Ollama doesn't work in Docker

**Pull models inside container**:
```bash
docker exec -it third-eye-ollama ollama pull llama3.2
```

**Check Ollama health**:
```bash
docker exec -it third-eye-ollama curl http://localhost:11434/api/tags
```

**View logs**:
```bash
docker logs third-eye-ollama
```

### How do I persist data in Docker?

Data is persisted in Docker volumes:

```yaml
volumes:
  - third-eye-data:/data  # Database
  - ollama-models:/root/.ollama  # Ollama models
```

**Backup volume**:
```bash
docker run --rm -v third-eye-data:/data -v $(pwd):/backup ubuntu tar czf /backup/data.tar.gz /data
```

### Can I use GPU in Docker?

**Yes, for Ollama**:

Edit `docker-compose.yml`:
```yaml
services:
  ollama:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

Requires **NVIDIA Container Toolkit**.

---

## Troubleshooting

### Server won't start

**Check port availability**:
```bash
lsof -i :7070
```

If port is in use, kill the process or use different port:
```bash
PORT=8080 bun run dev
```

**Check Bun version**:
```bash
bun --version
# Should be 1.0.0 or higher
```

**View logs**:
```bash
bun run dev 2>&1 | tee third-eye.log
```

### UI shows blank page

**Check Next.js build**:
```bash
cd apps/ui
npm run build
```

**Check browser console** for errors (DevTools → Console)

**Verify UI server is running**:
```bash
curl http://127.0.0.1:3300
```

### "Module not found" errors

**Reinstall dependencies**:
```bash
rm -rf node_modules bun.lock
bun install
```

**Check workspace setup**:
Ensure `package.json` has:
```json
{
  "workspaces": ["packages/*", "apps/*", "cli"]
}
```

### TypeScript errors

**Run type check**:
```bash
tsc --noEmit
```

**Common issues**:
- Missing `@types/*` packages
- Outdated dependencies
- Conflicting versions

**Fix**:
```bash
bun update
bun add -D @types/node @types/react
```

---

## Security

### Is it safe to store API keys?

**Yes**, with proper encryption key:

1. Set strong encryption key:
```bash
export ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

2. Store in `.env` (don't commit to Git):
```bash
echo "ENCRYPTION_KEY=your-key-here" >> .env
echo ".env" >> .gitignore
```

3. Keys are encrypted with AES-256-GCM before storage.

### Can I run Third Eye in production?

**Yes**, but follow best practices:

1. **Use HTTPS** (reverse proxy with Nginx/Caddy)
2. **Set strong encryption key** (see above)
3. **Use environment variables** for secrets
4. **Enable authentication** (future feature)
5. **Run in Docker** for isolation
6. **Regular backups** of database

**Not recommended**:
- Exposing server directly to internet (use reverse proxy)
- Using default encryption key
- Running as root

### How do I report security issues?

**Do not open public issues for security bugs.**

Email: security@example.com (replace with actual email)

Include:
- Description of vulnerability
- Steps to reproduce
- Potential impact

---

## Contributing

### How can I contribute?

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

**Quick start**:
```bash
git clone https://github.com/yourusername/third-eye-mcp.git
cd third-eye-mcp
bun install
bun run setup
bun test
```

### How do I add a new provider?

1. Create provider class in `packages/providers/`:
```typescript
export class MyProvider implements ProviderClient {
  async listModels(): Promise<ModelInfo[]> { /* ... */ }
  async complete(req: CompletionRequest): Promise<CompletionResponse> { /* ... */ }
  async health(): Promise<HealthResponse> { /* ... */ }
}
```

2. Update factory in `packages/providers/factory.ts`
3. Add to types in `packages/types/providers.ts`
4. Write tests in `packages/providers/__tests__/`

See [CONTRIBUTING.md](../CONTRIBUTING.md) for examples.

### How do I add a new Eye?

1. Register in `packages/core/registry.ts`:
```typescript
export const EYES_REGISTRY = {
  byakugan: {
    name: 'Byakugan',
    description: 'Your Eye description',
    personaTemplate: `System prompt...`,
    defaultRouting: { /* ... */ }
  }
};
```

2. Run `bun run setup` to seed database
3. Update UI in `apps/ui/src/app/session/[id]/page.tsx`

---

## Advanced

### Can I use Third Eye as a library?

**Yes**, import the orchestrator:

```typescript
import { EyeOrchestrator } from '@third-eye/core';
import { getDb } from '@third-eye/db';

const db = getDb();
const orchestrator = new EyeOrchestrator(db);

const envelope = await orchestrator.run(
  'sharingan',
  'Write a function to sort an array',
  'session-123'
);

console.log(envelope);
```

### How do I enable debug logging?

```bash
export DEBUG=third-eye:*
bun run dev
```

**View WebSocket messages**:
```bash
export DEBUG=third-eye:ws
```

### Can I use Third Eye with other MCP servers?

**Yes**, Third Eye implements MCP protocol and can chain with other servers.

**Example**:
```typescript
// Call Third Eye from another MCP server
const response = await fetch('http://127.0.0.1:7070/mcp/run', {
  method: 'POST',
  body: JSON.stringify({
    eye: 'sharingan',
    input: 'Generate code',
    sessionId: 'external-123'
  })
});

const envelope = await response.json();
```

---

## Getting Help

### Where can I get support?

- **GitHub Discussions**: Ask questions, share ideas
- **GitHub Issues**: Report bugs, request features
- **Documentation**: [README](../README.md), [ARCHITECTURE](./ARCHITECTURE.md), [PROVIDERS](./PROVIDERS.md)

### How do I report a bug?

**Create a GitHub issue** with:
1. **Description**: What's the bug?
2. **Steps to Reproduce**: 1, 2, 3...
3. **Expected**: What should happen?
4. **Actual**: What actually happens?
5. **Environment**: OS, Bun version, browser
6. **Logs**: Server logs, browser console errors

### Feature requests

**Open a GitHub issue** with:
1. **Use Case**: Why is this needed?
2. **Proposal**: How should it work?
3. **Alternatives**: Other approaches considered?

### I found a typo in the docs

**Pull requests welcome!**

```bash
git checkout -b fix/typo-in-faq
# Edit docs/FAQ.md
git commit -m "docs: fix typo in FAQ"
git push origin fix/typo-in-faq
# Open PR on GitHub
```

---

## What's Next?

- Explore [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Read [PROVIDERS.md](./PROVIDERS.md) for provider setup
- Check [CONTRIBUTING.md](../CONTRIBUTING.md) to contribute
- Star us on GitHub! ⭐
