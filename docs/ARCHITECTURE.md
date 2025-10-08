# Third Eye MCP Architecture

## System Overview

Third Eye MCP is a professional-grade AI orchestration server built on modern TypeScript tooling. It provides a unified interface for routing requests across multiple AI providers with intelligent fallback, retry logic, and real-time monitoring.

```
┌─────────────────────────────────────────────────────────────┐
│                      Third Eye Portal (UI)                  │
│                    Next.js 15 App Router                    │
│                   http://127.0.0.1:3300                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTP + WebSocket
                 │
┌────────────────▼────────────────────────────────────────────┐
│                 Third Eye MCP Server                        │
│                   Bun + Hono Framework                      │
│                   http://127.0.0.1:7070                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Eye Orchestrator (Core Logic)                │  │
│  │  - Request routing and provider selection            │  │
│  │  - Retry logic with exponential backoff              │  │
│  │  - Fallback to alternative providers                 │  │
│  │  - Persona injection and context building            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Provider Abstraction Layer                   │  │
│  │  - Groq        (API key required)                    │  │
│  │  - OpenRouter  (API key required)                    │  │
│  │  - Ollama      (Local, no key)                       │  │
│  │  - LM Studio   (Local, no key)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         WebSocket Manager                            │  │
│  │  - Real-time session monitoring                      │  │
│  │  - Broadcast run updates to connected clients        │  │
│  │  - Connection health checks (ping/pong)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         SQLite Database (Drizzle ORM)                │  │
│  │  - Sessions, Runs, Routing configs                   │  │
│  │  - Personas with version control                     │  │
│  │  - Encrypted API keys (AES-256-GCM)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ API Calls
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐      ┌────────┐      ┌────────┐
    │  Groq  │      │OpenRtr │      │ Ollama │
    └────────┘      └────────┘      └────────┘
```

## Core Components

### 1. Eye Orchestrator (`packages/core`)

**Purpose**: Central orchestration engine that routes requests to appropriate AI providers

**Key Features**:
- **Eye Registry**: Manages different "Eyes" (Sharingan, Rinnegan, Tenseigan) with unique personas
- **Routing Resolution**: Determines primary and fallback provider/model for each Eye
- **Retry Logic**: Exponential backoff (100ms → 300ms → 900ms) on transient failures
- **Fallback Chain**: Automatic failover to fallback provider if primary fails
- **Persona Injection**: Loads active persona and injects into system prompt
- **Envelope Standardization**: Returns consistent `Envelope` format across all providers

**File**: `packages/core/orchestrator.ts`

```typescript
export class EyeOrchestrator {
  async run(eye: string, input: string, sessionId: string): Promise<Envelope> {
    // 1. Resolve routing config (primary + fallback)
    // 2. Load persona for this Eye
    // 3. Build completion request with persona
    // 4. Try primary provider with retry logic
    // 5. If primary fails, try fallback provider
    // 6. Return Envelope with response or error
  }
}
```

### 2. Provider Abstraction (`packages/providers`)

**Purpose**: Unified interface for multiple AI providers

**Interface**: `ProviderClient`
- `listModels()`: Fetch available models
- `complete(request)`: Execute completion request
- `health()`: Check provider availability

**Implementations**:
- **GroqProvider** (`providers/groq.ts`): OpenAI-compatible API (api.groq.com)
- **OpenRouterProvider** (`providers/openrouter.ts`): OpenRouter API (openrouter.ai)
- **OllamaProvider** (`providers/ollama.ts`): Local Ollama server (127.0.0.1:11434)
- **LMStudioProvider** (`providers/lmstudio.ts`): Local LM Studio server (127.0.0.1:1234)

**Factory Pattern**: `ProviderFactory` creates provider instances based on routing config

### 3. Database Layer (`packages/db`)

**Technology**: SQLite with Drizzle ORM

**Schema Tables**:
```sql
-- Eye routing configurations
routing (
  id INTEGER PRIMARY KEY,
  eye TEXT NOT NULL,  -- 'sharingan' | 'rinnegan' | 'tenseigan'
  primaryProvider TEXT,
  primaryModel TEXT,
  fallbackProvider TEXT,
  fallbackModel TEXT
)

-- Persona templates with versioning
personas (
  id INTEGER PRIMARY KEY,
  eye TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  template TEXT NOT NULL,  -- System prompt
  isActive BOOLEAN DEFAULT FALSE,
  createdAt INTEGER
)

-- User sessions
sessions (
  id TEXT PRIMARY KEY,
  userId TEXT,
  metadata TEXT,  -- JSON blob
  createdAt INTEGER
)

-- Individual runs (Eye invocations)
runs (
  id TEXT PRIMARY KEY,
  sessionId TEXT REFERENCES sessions(id),
  eye TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT,  -- JSON envelope
  status TEXT,  -- 'pending' | 'success' | 'error'
  createdAt INTEGER
)

-- Encrypted provider API keys
providerKeys (
  id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL,
  label TEXT,
  encryptedKey TEXT NOT NULL,  -- AES-256-GCM encrypted
  iv TEXT NOT NULL,
  tag TEXT NOT NULL,
  createdAt INTEGER
)
```

**Encryption**: API keys encrypted with AES-256-GCM using PBKDF2-derived key from `THIRD_EYE_SECURITY_ENCRYPTION_KEY` env var

**File**: `packages/db/schema.ts`

### 4. HTTP Server (`apps/server`)

**Framework**: Hono (lightweight Express alternative)

**Routes**:
```
GET  /health                    - Server health check
GET  /ws/monitor?sessionId=X    - WebSocket upgrade endpoint

GET  /api/sessions              - List all sessions
POST /api/sessions              - Create new session
GET  /api/sessions/:id          - Get session details
GET  /api/sessions/:id/runs     - Get runs for session

POST /mcp/run                   - Main MCP orchestration endpoint
  Body: { eye, input, sessionId }
  Returns: Envelope

GET  /api/routing               - List Eye routing configs
POST /api/routing               - Update routing config
  Body: { eye, primaryProvider, primaryModel, ... }

GET  /api/personas              - List personas for Eye
POST /api/personas              - Create/activate persona
GET  /api/personas/:id          - Get persona by ID
PUT  /api/personas/:id/activate - Activate persona

GET  /api/models/:provider      - List models for provider
POST /api/provider-keys         - Save encrypted API key
  Body: { provider, label, apiKey }
```

**WebSocket Protocol**:
```typescript
// Client → Server
{ type: 'ping' }

// Server → Client
{ type: 'pong', timestamp }
{ type: 'run_started', sessionId, data: { runId, eye, input } }
{ type: 'run_completed', sessionId, data: { runId, envelope } }
{ type: 'error', sessionId, data: { message } }
```

**File**: `apps/server/src/index.ts`

### 5. Web Portal (`apps/ui`)

**Framework**: Next.js 15 (App Router, React Server Components)

**Pages**:
```
/                        - Landing page with quick start
/session/[id]           - Session monitor with real-time updates
/models                 - Provider setup, API keys, routing matrix
/personas               - Persona CRUD and version management
/settings               - Global configuration
```

**Key Features**:
- **WebSocket Integration**: Live updates when runs complete
- **API Key Management**: Encrypted storage with visual feedback (🔒)
- **Model Selection**: Dynamic dropdowns populated from provider APIs
- **Routing Matrix**: Configure primary/fallback for each Eye
- **Persona Editor**: Markdown support for system prompts

**File**: `apps/ui/src/app/session/[id]/page.tsx`

## Data Flow

### Example: Running Sharingan Eye

```
1. User clicks "Run sharingan" in UI
   ↓
2. UI sends POST /mcp/run
   Body: { eye: 'sharingan', input: 'Explain recursion', sessionId: 'abc123' }
   ↓
3. Server routes to mcp.ts handler
   ↓
4. EyeOrchestrator.run() called
   ↓
5. Fetch routing config from DB
   → Primary: groq/llama-3.3-70b-versatile
   → Fallback: openrouter/meta-llama/llama-3.1-70b-instruct
   ↓
6. Fetch active persona for sharingan
   → Template: "You are a code generation expert..."
   ↓
7. Build CompletionRequest
   → messages: [{ role: 'system', content: persona }, { role: 'user', content: input }]
   ↓
8. ProviderFactory creates GroqProvider
   ↓
9. GroqProvider.complete() called (with retry logic)
   → Attempt 1: 500 Internal Server Error → wait 100ms
   → Attempt 2: 500 Internal Server Error → wait 300ms
   → Attempt 3: Success!
   ↓
10. Envelope created
    → { tag: 'ok', value: { output: '...' } }
    ↓
11. Save run to database
    ↓
12. Broadcast WebSocket message
    → { type: 'run_completed', sessionId: 'abc123', data: { envelope } }
    ↓
13. UI receives WebSocket message and refreshes run list
    ↓
14. User sees response
```

## Security

### API Key Encryption

**Algorithm**: AES-256-GCM (Authenticated Encryption)

**Process**:
1. User enters API key in UI
2. UI sends key to `/api/provider-keys`
3. Server generates random IV (12 bytes)
4. Server derives key from `THIRD_EYE_SECURITY_ENCRYPTION_KEY` env var using PBKDF2
5. Server encrypts key with AES-256-GCM
6. Server stores `{ encryptedKey, iv, tag }` in database
7. On provider use, server decrypts key and injects into provider client

**File**: `packages/db/encryption.ts`

### Environment Variables

```bash
THIRD_EYE_SECURITY_ENCRYPTION_KEY=your-secure-key-here  # Required for API key encryption
MCP_PORT=7070                                           # Server port (default: 7070)
MCP_HOST=127.0.0.1                                      # Server host (bind 0.0.0.0 only when secured)
MCP_ALLOWED_ORIGINS=http://localhost:3300               # Comma-separated CORS whitelist and MCP clients
MCP_AUTO_OPEN=true                                      # Auto-open portal on start
MCP_UI_PORT=3300                                        # Next.js UI port
MCP_DB=~/.third-eye-mcp/mcp.db                          # SQLite database path
```

## Deployment

### Development

```bash
bun install
bun run setup    # Seed database
bun run dev      # Start server + UI
```

### Production (Docker)

```bash
cd docker
docker compose up -d
```

**Stack**:
- `server` (Bun container, port 7070)
- `ui` (Next.js container, port 3300)
- `ollama` (Optional, for local AI)

### Global Installation (npm)

```bash
bunx third-eye-mcp up
```

Starts the MCP server and dashboard using the Bun runtime (Bun must be installed).

## Testing

**Framework**: Vitest (unit) + Playwright (E2E)

**Structure**:
```
packages/providers/__tests__/groq.test.ts    # Provider unit tests
packages/core/__tests__/orchestrator.test.ts # Orchestrator logic
apps/server/__tests__/mcp.test.ts            # API integration tests
apps/ui/tests/e2e/session-flow.spec.ts       # E2E user flows
```

**Commands**:
```bash
bun test           # Unit tests
bun run e2e        # E2E tests
tsc --noEmit       # Type check
```

## Performance Considerations

### Retry Backoff

Exponential backoff prevents overwhelming failing providers:
- Attempt 1: Immediate
- Attempt 2: +100ms
- Attempt 3: +300ms
- Total: ~400ms max retry time

### WebSocket Cleanup

Stale connections removed every 5 minutes (30-minute threshold).

### Database

SQLite with indexed foreign keys for fast session/run lookups.

### Streaming

Future enhancement: Support streaming completions via Server-Sent Events (SSE).

## Extensibility

### Adding a New Eye

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

2. Seed database:
```bash
bun run setup
```

3. Update UI in `apps/ui/src/app/session/[id]/page.tsx`:
```typescript
const EYES = ['sharingan', 'rinnegan', 'tenseigan', 'byakugan'];
```

### Adding a New Provider

1. Create provider class in `packages/providers/your-provider.ts`:
```typescript
export class YourProvider implements ProviderClient {
  async listModels(): Promise<ModelInfo[]> { /* ... */ }
  async complete(req: CompletionRequest): Promise<CompletionResponse> { /* ... */ }
  async health(): Promise<HealthResponse> { /* ... */ }
}
```

2. Update factory in `packages/providers/factory.ts`:
```typescript
case 'your-provider':
  return new YourProvider(config.baseUrl, config.apiKey);
```

3. Update types in `packages/types/providers.ts`:
```typescript
export type ProviderId = 'groq' | 'openrouter' | 'ollama' | 'lmstudio' | 'your-provider';
```

## Monitoring

### Server Logs

```bash
🚀 Third Eye MCP Server running at http://127.0.0.1:7070
📡 WebSocket endpoint: ws://127.0.0.1:7070/ws/monitor?sessionId=<id>
🌐 Opening Third Eye Portal: http://127.0.0.1:3300

📡 WebSocket connected: abc-123 → session:xyz-789
📡 Broadcasted run_completed to 2 connections for session:xyz-789
```

### Health Endpoint

```bash
curl http://127.0.0.1:7070/health
# {"status":"ok","timestamp":1704067200000}
```

## Troubleshooting

See [FAQ.md](./FAQ.md) for common issues and solutions.

## References

- [Bun Documentation](https://bun.sh/docs)
- [Hono Framework](https://hono.dev)
- [Next.js 15](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [WebSocket Protocol (RFC 6455)](https://datatracker.ietf.org/doc/html/rfc6455)
