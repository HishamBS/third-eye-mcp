# Third Eye MCP API Reference

Complete API documentation for all Third Eye MCP endpoints.

## Base URL

```
http://127.0.0.1:7070
```

## Authentication

Optional API key authentication. Set `REQUIRE_API_KEY=true` in `.env` to enable.

**Header**: `X-API-Key: your-api-key`
**Query Parameter**: `?apiKey=your-api-key`

## Rate Limits

- **MCP Routes** (`/mcp/*`): 100 requests/minute per session/IP
- **Session Routes** (`/sessions/*`): 200 requests/minute per session/IP
- **Duel Routes** (`/duel/*`): 50 requests/minute per session/IP

Headers returned:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## MCP Endpoints

### GET /mcp/tools

List all registered Eyes with metadata.

**Response**: `200 OK`
```json
{
  "tools": [
    {
      "name": "sharingan",
      "description": "Ambiguity Radar - Detects vague requests",
      "version": "1.0.0",
      "tags": ["clarification", "validation"],
      "inputSchema": { "type": "object", ... },
      "outputSchema": { "type": "object", ... }
    }
  ],
  "count": 8
}
```

### GET /mcp/quickstart

Get workflow recommendations and routing suggestions.

**Response**: `200 OK`
```json
{
  "quickstart": {
    "workflows": {
      "clarification": {
        "description": "For ambiguous requests",
        "sequence": ["sharingan", "prompt-helper", "jogan"]
      }
    },
    "routing": {
      "sharingan": "Works best with fast models like llama3.1-8b"
    },
    "primers": {
      "newSession": "Start with Sharingan if intent unclear"
    }
  }
}
```

### GET /mcp/schemas

Get all Eye JSON schemas and error codes.

**Response**: `200 OK`
```json
{
  "envelope": {
    "type": "object",
    "properties": { ... },
    "required": ["eye", "code", "verdict", "summary"]
  },
  "errorCodes": {
    "success": ["OK", "OK_WITH_NOTES"],
    "rejection": ["REJECT_AMBIGUOUS", ...],
    "clarification": ["NEED_CLARIFICATION", ...]
  }
}
```

### GET /mcp/examples/:eye

Get example inputs/outputs for a specific Eye.

**Parameters**:
- `eye` (path): Eye name (sharingan, jogan, etc.)

**Response**: `200 OK`
```json
{
  "eye": "sharingan",
  "examples": [
    {
      "input": "make it better",
      "output": {
        "eye": "sharingan",
        "code": "NEED_CLARIFICATION",
        "verdict": "NEEDS_INPUT",
        "summary": "Request is too vague",
        "metadata": {
          "ambiguityScore": 85,
          "clarifyingQuestions": ["What needs improvement?"]
        }
      },
      "description": "Extremely vague request"
    }
  ]
}
```

**Errors**:
- `404 Not Found`: Eye not found

### POST /mcp/run

Execute an Eye with input.

**Request Body**:
```json
{
  "eye": "sharingan",
  "input": { "prompt": "make it better" },
  "sessionId": "optional-session-id"
}
```

Or auto-routing mode:
```json
{
  "task": "implement user authentication",
  "sessionId": "optional-session-id"
}
```

**Response**: `200 OK`
```json
{
  "eye": "sharingan",
  "code": "NEED_CLARIFICATION",
  "verdict": "NEEDS_INPUT",
  "summary": "Request requires clarification",
  "metadata": { ... }
}
```

**Errors**:
- `400 Bad Request`: Validation error, order guard violation
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Execution failed

### GET /mcp/health

Check MCP service health.

**Response**: `200 OK`
```json
{
  "ok": true,
  "service": "third-eye-mcp",
  "timestamp": "2025-10-06T12:00:00.000Z"
}
```

---

## Session Endpoints

### POST /sessions

Create a new session.

**Request Body** (optional):
```json
{
  "config": {
    "userIntent": "implement feature",
    "projectContext": "..."
  }
}
```

**Response**: `200 OK`
```json
{
  "sessionId": "abc123",
  "portalUrl": "http://127.0.0.1:3300/session/abc123",
  "session": {
    "id": "abc123",
    "status": "active",
    "createdAt": "2025-10-06T12:00:00.000Z"
  }
}
```

### GET /sessions/:id

Get session details.

**Response**: `200 OK`
```json
{
  "id": "abc123",
  "status": "active",
  "createdAt": "2025-10-06T12:00:00.000Z",
  "configJson": { ... }
}
```

### GET /sessions/:id/runs

Get all runs for a session.

**Query Parameters**:
- `limit` (default: 100): Number of runs to return
- `offset` (default: 0): Pagination offset

**Response**: `200 OK`
```json
{
  "sessionId": "abc123",
  "runs": [
    {
      "id": "run-1",
      "eye": "sharingan",
      "model": "llama3.1-8b",
      "latencyMs": 1234,
      "tokensIn": 50,
      "tokensOut": 100,
      "createdAt": "2025-10-06T12:00:00.000Z"
    }
  ],
  "limit": 100,
  "offset": 0
}
```

### GET /sessions/:id/context

Get session context.

**Response**: `200 OK`
```json
{
  "sessionId": "abc123",
  "context": {
    "projectName": {
      "value": "Third Eye MCP",
      "source": "user",
      "addedAt": "2025-10-06T12:00:00.000Z"
    }
  }
}
```

### POST /sessions/:id/context

Add context item to session.

**Request Body**:
```json
{
  "source": "user",
  "key": "projectName",
  "value": "Third Eye MCP"
}
```

**Response**: `200 OK`
```json
{
  "sessionId": "abc123",
  "context": { ... }
}
```

**Errors**:
- `400 Bad Request`: Invalid source (must be 'user' or 'eye')

### DELETE /sessions/:id/context/:key

Remove context item from session.

**Response**: `200 OK`
```json
{
  "sessionId": "abc123",
  "context": { ... }
}
```

### POST /sessions/:id/kill

Stop all Eyes in session (kill switch).

**Response**: `200 OK`
```json
{
  "sessionId": "abc123",
  "status": "killed",
  "stoppedEyes": ["sharingan", "jogan"],
  "message": "Killed session and stopped 2 Eye(s)"
}
```

**Errors**:
- `400 Bad Request`: Session already killed
- `404 Not Found`: Session not found

### POST /sessions/:id/clarifications/:clarificationId/validate

Validate clarification answer.

**Request Body**:
```json
{
  "answer": "I want to implement user authentication"
}
```

**Response**: `200 OK`
```json
{
  "valid": true,
  "clarificationId": "clarif-123",
  "answer": "I want to implement user authentication"
}
```

Or if invalid:
```json
{
  "valid": false,
  "reason": "Answer too short",
  "suggestion": "Please provide more detail"
}
```

### GET /sessions/:id/export

Export session data in multiple formats.

**Query Parameters**:
- `format` (default: json): Export format (json|md|csv)

**Response**: `200 OK`

**JSON Format**:
```json
{
  "session": { ... },
  "runs": [ ... ],
  "events": [ ... ],
  "exportedAt": "2025-10-06T12:00:00.000Z"
}
```

**Markdown Format**: Human-readable timeline
**CSV Format**: Metrics-only (eye,model,latency_ms,tokens_in,tokens_out,verdict)

**Errors**:
- `400 Bad Request`: Invalid format

---

## Duel Endpoints

### POST /duel/v2

Start model comparison duel.

**Request Body**:
```json
{
  "eyeName": "sharingan",
  "modelA": "claude-sonnet-4",
  "modelB": "gpt-4-turbo",
  "input": "make it better",
  "iterations": 5
}
```

**Response**: `200 OK`
```json
{
  "duelId": "duel-123",
  "status": "pending",
  "message": "Duel started"
}
```

**Errors**:
- `400 Bad Request`: Missing required fields, iterations > 10

### GET /duel/:id/status

Get duel progress.

**Response**: `200 OK`
```json
{
  "duelId": "duel-123",
  "status": "running",
  "eyeName": "sharingan",
  "modelA": "claude-sonnet-4",
  "modelB": "gpt-4-turbo",
  "iterations": 5,
  "createdAt": "2025-10-06T12:00:00.000Z"
}
```

### GET /duel/:id/results

Get final duel results (only when completed).

**Response**: `200 OK`
```json
{
  "duelId": "duel-123",
  "winner": "modelA",
  "results": {
    "modelA": {
      "approvals": 4,
      "avgLatency": 1234,
      "results": [ ... ]
    },
    "modelB": {
      "approvals": 3,
      "avgLatency": 2345,
      "results": [ ... ]
    }
  },
  "completedAt": "2025-10-06T12:05:00.000Z"
}
```

**Errors**:
- `400 Bad Request`: Duel not yet completed
- `404 Not Found`: Duel not found

---

## Error Codes

### HTTP Status Codes
- `200 OK`: Success
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing/invalid API key
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Eye Error Codes
- **Success**: `OK`, `OK_WITH_NOTES`
- **Rejection**: `REJECT_AMBIGUOUS`, `REJECT_UNSAFE`, `REJECT_INCOMPLETE`, `REJECT_INCONSISTENT`, `REJECT_NO_EVIDENCE`, `REJECT_BAD_PLAN`, `REJECT_CODE_ISSUES`
- **Clarification**: `NEED_CLARIFICATION`, `NEED_MORE_CONTEXT`, `SUGGEST_ALTERNATIVE`
- **Error**: `EYE_ERROR`, `EYE_TIMEOUT`, `INVALID_ENVELOPE`

---

## Examples

### Complete Workflow Example

```bash
# 1. Create session
curl -X POST http://127.0.0.1:7070/sessions \
  -H "Content-Type: application/json" \
  -d '{"config": {"userIntent": "implement auth"}}'

# 2. Run Sharingan
curl -X POST http://127.0.0.1:7070/mcp/run \
  -H "Content-Type: application/json" \
  -d '{
    "eye": "sharingan",
    "input": {"prompt": "make it better"},
    "sessionId": "abc123"
  }'

# 3. Export session
curl "http://127.0.0.1:7070/sessions/abc123/export?format=json" \
  -o session-export.json
```

### Auto-Routing Example

```bash
curl -X POST http://127.0.0.1:7070/mcp/run \
  -H "Content-Type": "application/json" \
  -d '{
    "task": "implement user authentication with JWT",
    "sessionId": "abc123"
  }'
```

### Duel Mode Example

```bash
# Start duel
curl -X POST http://127.0.0.1:7070/duel/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "eyeName": "sharingan",
    "modelA": "claude-sonnet-4",
    "modelB": "gpt-4-turbo",
    "input": "implement feature X",
    "iterations": 5
  }'

# Poll status
curl http://127.0.0.1:7070/duel/duel-123/status

# Get results
curl http://127.0.0.1:7070/duel/duel-123/results
```

---

## Security

### Best Practices

1. **API Keys**: Enable for production deployments (`REQUIRE_API_KEY=true`)
2. **Localhost Binding**: Default is `127.0.0.1` (localhost only)
3. **Rate Limiting**: Enforced automatically on all routes
4. **Input Validation**: All inputs sanitized to prevent XSS/SQL injection

### Network Exposure

**Development**: Binds to `127.0.0.1` (localhost only)
**Production**: Set `HOST=0.0.0.0` to expose on network (requires API key)

---

*Last Updated: 2025-10-06*
