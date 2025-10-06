# MCP API Reference

Complete guide to connecting and using Third Eye MCP with AI agents.

---

## 🔌 Connection Setup

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "third-eye": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/third-eye-mcp/bin/mcp-server.ts"]
    }
  }
}
```

**Important**: Use absolute path, not `~` or relative paths.

Restart Claude Desktop to activate. You'll see 11 Third Eye tools in the MCP tools list.

### Other MCP Clients

Third Eye MCP uses standard stdio transport. Any MCP-compatible client can connect:

```bash
# Start MCP server manually
bun run /path/to/third-eye-mcp/bin/mcp-server.ts

# Server listens on stdin/stdout for JSON-RPC messages
```

---

## 🧿 Available Tools

### 1. `third_eye_navigator`

**Purpose**: Pipeline overview and workflow guidance. Always call this first.

**Input Schema**:
```json
{
  "context": "string (optional) - What you're trying to accomplish"
}
```

**Output**:
```json
{
  "tag": "overseer",
  "ok": true,
  "code": "OK_OVERVIEW",
  "md": "## Pipeline Overview\n...",
  "data": {
    "available_eyes": ["sharingan", "jogan", "rinnegan", ...],
    "recommended_flow": "navigator → sharingan → ..."
  },
  "next": "CALL_SHARINGAN"
}
```

**When to call**: At the start of every session to understand the pipeline.

---

### 2. `third_eye_sharingan_clarify`

**Purpose**: Ambiguity detection and classification (CODE vs GENERAL).

**Input Schema**:
```json
{
  "prompt": "string (required) - User prompt to analyze",
  "sessionId": "string (optional) - Session tracking ID"
}
```

**Output**:
```json
{
  "tag": "sharingan",
  "ok": true | false,
  "code": "OK_CLEAR" | "E_NEEDS_CLARIFICATION",
  "md": "## Classification\nClassified as CODE...",
  "data": {
    "score": 0.3,
    "ambiguous": false,
    "x": 0,
    "is_code_related": true,
    "reasoning_md": "Prompt clearly requests code...",
    "questions_md": null
  },
  "next": "CALL_RINNEGAN_REQUIREMENTS"
}
```

**Delegation Logic**:
- If `ambiguous=true` and `x > 0`: Call `third_eye_prompt_helper` with clarifications
- If `ambiguous=false` and `is_code_related=true`: Call `third_eye_rinnegan_plan_requirements`
- If `ambiguous=false` and `is_code_related=false`: Proceed with text generation

---

### 3. `third_eye_prompt_helper`

**Purpose**: Restructure ambiguous prompts into ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT format.

**Input Schema**:
```json
{
  "prompt": "string (required) - Ambiguous prompt to restructure",
  "clarifications": "object (optional) - Answers to clarifying questions",
  "sessionId": "string (optional)"
}
```

**Output**:
```json
{
  "tag": "helper",
  "ok": true,
  "code": "OK_RESTRUCTURED",
  "md": "## Restructured Prompt\n\n### ROLE\n...",
  "data": {
    "restructured_prompt": "Markdown with sections"
  },
  "next": "CALL_JOGAN_CONFIRM"
}
```

---

### 4. `third_eye_jogan_confirm_intent`

**Purpose**: Validate restructured prompts contain all required sections.

**Input Schema**:
```json
{
  "prompt": "string (required) - Restructured prompt to validate",
  "sessionId": "string (optional)"
}
```

**Output**:
```json
{
  "tag": "jogan",
  "ok": true | false,
  "code": "OK_INTENT_CONFIRMED" | "E_INCOMPLETE_PROMPT",
  "md": "## Validation Result\nAll sections present...",
  "data": {
    "valid": true,
    "missing_sections": [],
    "completeness_score": 1.0
  },
  "next": "CALL_RINNEGAN_REQUIREMENTS"
}
```

---

### 5. `third_eye_rinnegan_plan_requirements`

**Purpose**: Provide plan schema and example.

**Input Schema**:
```json
{
  "task": "string (required) - Brief task description",
  "sessionId": "string (optional)"
}
```

**Output**:
```json
{
  "tag": "rinnegan_requirements",
  "ok": true,
  "code": "OK_SCHEMA_PROVIDED",
  "md": "## Plan Requirements\n\n### Required Sections...",
  "data": {
    "plan_schema": "Markdown template",
    "example_plan": "Example implementation"
  },
  "next": "CREATE_PLAN_THEN_CALL_REVIEW"
}
```

---

### 6. `third_eye_rinnegan_plan_review`

**Purpose**: Review submitted plan against required structure.

**Input Schema**:
```json
{
  "plan": "string (required) - Implementation plan in markdown",
  "sessionId": "string (optional)"
}
```

**Output**:
```json
{
  "tag": "rinnegan_review",
  "ok": true | false,
  "code": "OK_PLAN_APPROVED" | "E_PLAN_INCOMPLETE",
  "md": "## Plan Review\nPlan approved...",
  "data": {
    "approved": true,
    "missing_sections": [],
    "issues": [],
    "suggestions": []
  },
  "next": "CALL_MANGEKYO_SCAFFOLD"
}
```

---

### 7. `third_eye_mangekyo_review_scaffold`

**Purpose**: Validate file structure and architecture.

**Input Schema**:
```json
{
  "scaffold": "string (required) - Proposed file structure",
  "sessionId": "string (optional)"
}
```

**Output**:
```json
{
  "tag": "mangekyo_scaffold",
  "ok": true | false,
  "code": "OK_SCAFFOLD_APPROVED" | "E_SCAFFOLD_REJECTED",
  "md": "## Scaffold Review\nArchitecture validated...",
  "data": {
    "approved": true,
    "issues": [],
    "suggestions": [],
    "architecture_score": 0.95
  },
  "next": "CALL_MANGEKYO_IMPL"
}
```

---

### 8. `third_eye_mangekyo_review_impl`

**Purpose**: Validate code diffs and implementation quality.

**Input Schema**:
```json
{
  "diffs": "string (required) - Code diffs in markdown fences",
  "reasoning": "string (required) - Implementation approach explanation",
  "sessionId": "string (optional)"
}
```

**Output**:
```json
{
  "tag": "mangekyo_impl",
  "ok": true | false,
  "code": "OK_IMPL_APPROVED" | "E_IMPL_REJECTED",
  "md": "## Implementation Review\nCode quality validated...",
  "data": {
    "approved": true,
    "code_quality_score": 0.92,
    "issues": [],
    "security_concerns": []
  },
  "next": "CALL_MANGEKYO_TESTS"
}
```

---

### 9. `third_eye_mangekyo_review_tests`

**Purpose**: Validate test coverage and quality.

**Input Schema**:
```json
{
  "tests": "string (required) - Test code",
  "coverage": "object (optional) - Coverage metrics",
  "sessionId": "string (optional)"
}
```

**Output**:
```json
{
  "tag": "mangekyo_tests",
  "ok": true | false,
  "code": "OK_TESTS_APPROVED" | "E_TESTS_INSUFFICIENT",
  "md": "## Test Review\nCoverage meets thresholds...",
  "data": {
    "approved": true,
    "coverage_score": 0.85,
    "missing_coverage": [],
    "test_quality_score": 0.90
  },
  "next": "CALL_MANGEKYO_DOCS"
}
```

---

### 10. `third_eye_mangekyo_review_docs`

**Purpose**: Validate documentation completeness.

**Input Schema**:
```json
{
  "docs": "string (required) - Documentation in markdown",
  "sessionId": "string (optional)"
}
```

**Output**:
```json
{
  "tag": "mangekyo_docs",
  "ok": true | false,
  "code": "OK_DOCS_APPROVED" | "E_DOCS_INCOMPLETE",
  "md": "## Documentation Review\nDocs complete...",
  "data": {
    "approved": true,
    "completeness_score": 0.95,
    "missing_docs": [],
    "clarity_score": 0.92
  },
  "next": "CALL_RINNEGAN_FINAL_APPROVAL"
}
```

---

### 11. `third_eye_rinnegan_final_approval`

**Purpose**: Aggregate all phase results for final go/no-go decision.

**Input Schema**:
```json
{
  "plan": "string (required) - Approved plan",
  "scaffold": "string (required) - Scaffold review result",
  "implementation": "string (required) - Implementation review result",
  "tests": "string (required) - Tests review result",
  "docs": "string (required) - Docs review result",
  "sessionId": "string (optional)"
}
```

**Output**:
```json
{
  "tag": "rinnegan_approval",
  "ok": true | false,
  "code": "OK_FINAL_APPROVAL" | "E_APPROVAL_BLOCKED",
  "md": "## Final Approval Decision\nAll phases approved...",
  "data": {
    "approved": true,
    "phase_results": {
      "plan": true,
      "scaffold": true,
      "implementation": true,
      "tests": true,
      "docs": true
    },
    "overall_score": 0.95,
    "blockers": []
  },
  "next": "COMPLETE"
}
```

---

### 12. `third_eye_tenseigan_validate_claims`

**Purpose**: Validate factual claims with citations.

**Input Schema**:
```json
{
  "content": "string (required) - Content with claims",
  "sources": "array (optional) - Available sources",
  "sessionId": "string (optional)"
}
```

**Output**:
```json
{
  "tag": "tenseigan",
  "ok": true | false,
  "code": "OK_CLAIMS_VALIDATED" | "E_UNSUPPORTED_CLAIMS",
  "md": "## Claims Validation\n5 claims found...",
  "data": {
    "claims": [
      { "text": "...", "cited": true, "confidence": 0.95, "sources": ["..."] }
    ],
    "overall_confidence": 0.92,
    "unsupported_claims": []
  },
  "next": "PROCEED_OR_REVISE"
}
```

---

### 13. `third_eye_byakugan_consistency_check`

**Purpose**: Detect contradictions against session history.

**Input Schema**:
```json
{
  "content": "string (required) - New content to check",
  "sessionId": "string (required) - Session for history lookup"
}
```

**Output**:
```json
{
  "tag": "byakugan",
  "ok": true | false,
  "code": "OK_CONSISTENT" | "E_INCONSISTENT",
  "md": "## Consistency Check\nNo contradictions found...",
  "data": {
    "consistent": true,
    "contradictions": [],
    "consistency_score": 1.0
  },
  "next": "PROCEED"
}
```

---

## 📊 Response Envelope

All Eyes return a standard JSON envelope:

```typescript
interface Envelope {
  tag: string;           // Eye identifier
  ok: boolean;           // Success flag
  code: string;          // Status code (OK_* or E_*)
  md: string;            // Markdown explanation
  data: object;          // Structured data
  next: string;          // Suggested next action
}
```

### Status Codes

**Success codes** (ok=true):
- `OK_OVERVIEW` - Navigator provided overview
- `OK_CLEAR` - Sharingan found prompt clear
- `OK_RESTRUCTURED` - Prompt helper restructured successfully
- `OK_INTENT_CONFIRMED` - Jōgan confirmed intent
- `OK_SCHEMA_PROVIDED` - Rinnegan provided plan schema
- `OK_PLAN_APPROVED` - Plan passed review
- `OK_SCAFFOLD_APPROVED` - Scaffold validated
- `OK_IMPL_APPROVED` - Implementation approved
- `OK_TESTS_APPROVED` - Tests meet coverage
- `OK_DOCS_APPROVED` - Documentation complete
- `OK_FINAL_APPROVAL` - All phases passed
- `OK_CLAIMS_VALIDATED` - All claims cited
- `OK_CONSISTENT` - No contradictions

**Error codes** (ok=false):
- `E_NEEDS_CLARIFICATION` - Sharingan found ambiguity
- `E_INCOMPLETE_PROMPT` - Jōgan found missing sections
- `E_PLAN_INCOMPLETE` - Rinnegan rejected plan
- `E_SCAFFOLD_REJECTED` - Mangekyō rejected architecture
- `E_IMPL_REJECTED` - Code quality issues
- `E_TESTS_INSUFFICIENT` - Coverage below threshold
- `E_DOCS_INCOMPLETE` - Missing documentation
- `E_APPROVAL_BLOCKED` - Final approval denied
- `E_UNSUPPORTED_CLAIMS` - Claims without citations
- `E_INCONSISTENT` - Contradictions detected
- `E_INTERNAL` - Internal server error

---

## 🔄 Workflow Examples

### Example 1: Code Implementation Flow

```
1. navigator() → Get overview
2. sharingan_clarify() → Classify as CODE, clear
3. rinnegan_plan_requirements() → Get plan schema
4. [Agent creates plan]
5. rinnegan_plan_review() → Plan approved
6. mangekyo_review_scaffold() → Architecture validated
7. [Agent writes code]
8. mangekyo_review_impl() → Code approved
9. [Agent writes tests]
10. mangekyo_review_tests() → Coverage sufficient
11. [Agent updates docs]
12. mangekyo_review_docs() → Docs complete
13. rinnegan_final_approval() → ✅ APPROVED
```

### Example 2: Ambiguous Prompt Flow

```
1. navigator() → Get overview
2. sharingan_clarify() → Ambiguous! x=3 questions
3. [Agent asks user for clarifications]
4. prompt_helper() → Restructured with answers
5. jogan_confirm_intent() → Validated
6. → Continue with code flow or text generation
```

### Example 3: Validation-Only Flow

```
1. [Agent generates content]
2. tenseigan_validate_claims() → Check citations
3. byakugan_consistency_check() → Check contradictions
4. → Fix issues or proceed
```

---

## 🌐 REST API (Alternative to MCP)

If not using MCP, call Eyes via REST:

### Base URL
```
http://localhost:7070
```

### Endpoints

```
POST /mcp/run
Content-Type: application/json

{
  "eye": "sharingan",
  "input": "fix the bug in auth.ts",
  "sessionId": "optional-session-id"
}
```

**Response**: Same envelope structure as MCP.

### Health Check

```
GET /health

Response: { "ok": true, "timestamp": "2025-10-05T..." }
```

---

## 📡 WebSocket API

Connect for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:7070/ws/monitor?sessionId=abc123');

ws.on message', (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'pipeline_event':
      // New Eye execution result
      console.log(data.event);
      break;
    case 'routing_updated':
      // Routing config changed
      console.log(data.routing);
      break;
  }
});
```

---

## 🔒 Authentication

### API Keys (optional)

If you enable API key auth in settings:

```
POST /eyes/sharingan/clarify
X-API-Key: your-api-key
```

### MCP Security

MCP connections via stdio are local-only. No authentication needed.

---

## 📖 Additional Resources

- [Architecture Overview](ARCHITECTURE.md)
- [Persona Customization](PERSONAS.md)
- [Provider Setup](PROVIDERS.md)
- [Troubleshooting](FAQ.md)

---

**Questions?** Open an issue on [GitHub](https://github.com/third-eye-mcp/issues).
