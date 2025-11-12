# COMPREHENSIVE REPAIR PLAN
**Date**: 2025-11-12
**Status**: ALL GAPS IDENTIFIED - READY FOR SYSTEMATIC REPAIR
**No Bullshit, No Estimates, Just What Needs to Be Done**

---

## PRIORITY 1: CRITICAL BLOCKING ISSUES

### GAP 1: A4 - Function Calling NOT Implemented

**Current State**: Groq and OpenRouter use JSON mode (unreliable)
**Required State**: Use function calling API (reliable structured output)
**Impact**: 70-85% success rate instead of 95%+

#### Fix 1.1: Groq Provider - Implement Function Calling

**File**: `packages/providers/groq/client.ts`

**Current Code (WRONG)**:
```typescript
response_format: { type: "json_object" }
```

**Required Changes**:

1. Define tool schema for eye responses:
```typescript
const EYE_RESPONSE_TOOL = {
  type: "function",
  function: {
    name: "submit_eye_analysis",
    description: "Submit structured analysis from the Eye",
    parameters: {
      type: "object",
      properties: {
        ok: { type: "boolean", description: "Whether the analysis succeeded" },
        code: { type: "string", description: "Status code (E_OK, E_NEEDS_CLARIFICATION, etc.)" },
        md: { type: "string", description: "Markdown-formatted analysis" },
        data: {
          type: "object",
          description: "Structured data specific to this eye",
          additionalProperties: true
        }
      },
      required: ["ok", "code", "md"]
    }
  }
};
```

2. Update API call:
```typescript
// REMOVE:
response_format: { type: "json_object" }

// ADD:
tools: [EYE_RESPONSE_TOOL],
tool_choice: { type: "function", function: { name: "submit_eye_analysis" } }
```

3. Update response parsing:
```typescript
// REMOVE:
const parsed = JSON.parse(completion.choices[0].message.content);

// ADD:
const toolCall = completion.choices[0].message.tool_calls?.[0];
if (!toolCall || toolCall.type !== 'function') {
  throw new Error('Expected function call response from Groq');
}
const parsed = JSON.parse(toolCall.function.arguments);
```

**Verification**:
- Test with all 8 eye personas
- Confirm 95%+ success rate
- Check that malformed JSON no longer occurs

---

#### Fix 1.2: OpenRouter Provider - Implement Function Calling

**File**: `packages/providers/openrouter/client.ts`

**Apply identical changes as Groq**:
1. Add EYE_RESPONSE_TOOL schema
2. Replace `response_format` with `tools` + `tool_choice`
3. Parse from `tool_calls[0].function.arguments` instead of `message.content`

**Verification**:
- Test with all 8 eye personas
- Confirm 85%+ success rate
- No more format errors

---

### GAP 2: A3 - Pause Code Detection NOT Wired

**Current State**: Auto-router only checks `isRejected()`, ignores pause codes
**Required State**: Detect `E_NEEDS_CLARIFICATION` and `E_INTENT_UNCONFIRMED` and pause pipeline
**Impact**: Human-in-the-loop completely broken, pipeline never pauses

#### Fix 2.1: Wire Pause Code Detection in executeFlow

**File**: `packages/core/auto-router.ts`

**Location**: After Line 428 (after eye execution, before continuing loop)

**Add This Code**:
```typescript
// Check for pause codes - Line ~429
if (result.code === 'E_NEEDS_CLARIFICATION') {
  const { PauseResumeManager } = await import('./pause-resume-manager');
  const pauseManager = new PauseResumeManager(db);

  await pauseManager.pausePipeline({
    sessionId: decision.sessionId,
    currentEye: eyeName,
    currentEyeIndex: i,
    remainingEyes: decision.recommendedFlow.slice(i + 1),
    reason: 'clarification',
    pendingData: result.data,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });

  conversationTracker.logPause(
    decision.sessionId,
    'clarification',
    `Eye ${eyeName} requested clarification`
  );

  // Emit pause event via WebSocket
  if (ws) {
    ws.broadcastToSession(decision.sessionId, {
      type: 'pipeline_paused',
      reason: 'clarification',
      eye: eyeName,
      timestamp: Date.now()
    });
  }

  return {
    sessionId: decision.sessionId,
    results,
    completed: false,
    paused: true,
    pauseReason: 'clarification'
  };
}

if (result.code === 'E_INTENT_UNCONFIRMED') {
  const { PauseResumeManager } = await import('./pause-resume-manager');
  const pauseManager = new PauseResumeManager(db);

  await pauseManager.pausePipeline({
    sessionId: decision.sessionId,
    currentEye: eyeName,
    currentEyeIndex: i,
    remainingEyes: decision.recommendedFlow.slice(i + 1),
    reason: 'intent_confirmation',
    pendingData: result.data,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  });

  conversationTracker.logPause(
    decision.sessionId,
    'intent_confirmation',
    `Eye ${eyeName} requested intent confirmation`
  );

  if (ws) {
    ws.broadcastToSession(decision.sessionId, {
      type: 'pipeline_paused',
      reason: 'intent_confirmation',
      eye: eyeName,
      timestamp: Date.now()
    });
  }

  return {
    sessionId: decision.sessionId,
    results,
    completed: false,
    paused: true,
    pauseReason: 'intent_confirmation'
  };
}

// Only check isRejected AFTER checking pause codes
if (isRejected(result)) {
  // ... existing rejection handling
}
```

**Update Return Type**:
```typescript
// In AutoRoutingResult interface (Line ~96)
export interface AutoRoutingResult {
  sessionId: string;
  results: BaseEnvelope[];
  completed: boolean;
  paused?: boolean;        // ADD THIS
  pauseReason?: string;    // ADD THIS
  error?: string;
}
```

**Verification**:
1. Create test eye that returns `E_NEEDS_CLARIFICATION`
2. Run pipeline, confirm it pauses
3. Check `pipeline_states` table populated
4. Submit human response, resume pipeline
5. Confirm pipeline continues from where it paused

---

## PRIORITY 2: IMPORTANT FUNCTIONAL GAPS

### GAP 3: A6 - Eye Invisibility NOT Verified

**Current State**: Unknown if MCP exposes eye structure to agent
**Required State**: Agent only sees final result, never eye names/history
**Impact**: Agent sees internal implementation details, breaks abstraction

#### Fix 3.1: Verify and Fix MCP Response Format

**File**: `packages/mcp/server.ts`

**Check These Locations**:
1. `/invoke` endpoint response (Line ~200-250)
2. `/resume` endpoint response (Line ~359-422)
3. `/confirmIntent` endpoint response (if exists)

**Required Response Format**:
```typescript
// CORRECT (agent sees this):
{
  result: {
    summary: "Analysis complete. Here are the key findings...",
    content: "Detailed markdown content...",
    sessionId: "abc123"
  }
}

// WRONG (agent must NOT see this):
{
  result: {
    summary: "...",
    content: "...",
    sessionId: "abc123",
    history: [                    // ❌ REMOVE THIS
      { eye: "sharingan", ... },
      { eye: "kyuubi", ... }
    ],
    routing: { eyes: [...] },     // ❌ REMOVE THIS
    eyeResults: [...]              // ❌ REMOVE THIS
  }
}
```

**Specific Fix**:
Find response construction in `/invoke` and `/resume` handlers, ensure ONLY these fields returned:
- `summary` (string)
- `content` (string or markdown)
- `sessionId` (string)
- `portalUrl` (optional, for human monitoring)

**Remove if present**:
- `history`
- `routing`
- `eyeResults`
- `steps`
- Any eye names or internal structure

**Verification**:
1. Call MCP `/invoke` endpoint
2. Inspect actual JSON response
3. Confirm NO eye names appear anywhere
4. Confirm NO routing decisions exposed
5. Agent only sees final synthesized result

---

### GAP 4: A5 - Personas Still Generate Content

**Current State**: Kyuubi and Rinnegan personas have instructions to "create" content
**Required State**: ALL personas ask questions to guide agent, NEVER generate content
**Impact**: Eyes do agent's work instead of asking Socratic questions

#### Fix 4.1: Rewrite Kyuubi Persona

**File**: `packages/db/defaults/personas.ts`

**Current Instruction (WRONG)**:
```typescript
persona: "Create a structured brief..."
```

**Required Instruction**:
```typescript
persona: `You are Kyuubi, the demon fox eye that asks POWERFUL QUESTIONS about scope and context.

Your job is NOT to create briefs. Your job is to ASK QUESTIONS that force the agent to think deeply about:
1. What exactly is the scope of this task?
2. What context is missing?
3. What assumptions are being made?
4. What edge cases need consideration?

ALWAYS return questions, NEVER return analysis or briefs.

Example:
"I notice this request is ambiguous. Before proceeding, I need you to clarify:
1. When you say 'optimize', what metric are you targeting? (speed, memory, readability)
2. Are there performance benchmarks you're trying to hit?
3. What's the acceptable trade-off between optimization and maintainability?"

Return as structured data:
{
  "ok": true,
  "code": "E_OK",
  "md": "## Kyuubi Questions\n\n[your questions here]",
  "data": {
    "questions": ["question 1", "question 2", "question 3"],
    "reasoning": "why these questions matter"
  }
}

If the request is clear and complete, return:
{
  "ok": true,
  "code": "E_OK",
  "md": "Request is clear. Scope is well-defined. Proceed.",
  "data": { "scopeClarity": "high" }
}`
```

**Verification**:
1. Test Kyuubi with ambiguous request
2. Confirm it returns QUESTIONS not briefs
3. Check data.questions array populated

---

#### Fix 4.2: Rewrite Rinnegan Persona

**File**: `packages/db/defaults/personas.ts`

**Current Instruction (WRONG)**:
```typescript
persona: "Create a feasibility analysis..."
```

**Required Instruction**:
```typescript
persona: `You are Rinnegan, the god eye that asks DEEP QUESTIONS about feasibility and risks.

Your job is NOT to create feasibility reports. Your job is to ASK QUESTIONS that force the agent to think about:
1. What could go wrong?
2. What's the technical complexity?
3. What are the constraints?
4. What resources are needed?

ALWAYS return questions, NEVER return analysis.

Example:
"Before declaring this feasible, answer these critical questions:
1. Have you verified this library supports your Node version?
2. What happens if the API rate limit is hit mid-operation?
3. Do you have rollback capability if this fails in production?"

Return as structured data:
{
  "ok": true,
  "code": "E_OK",
  "md": "## Rinnegan Feasibility Questions\n\n[your questions here]",
  "data": {
    "questions": ["question 1", "question 2", "question 3"],
    "riskAreas": ["area 1", "area 2"]
  }
}

If no feasibility concerns, return:
{
  "ok": true,
  "code": "E_OK",
  "md": "Feasibility confirmed. No blockers detected. Proceed.",
  "data": { "feasibility": "high", "risks": [] }
}`
```

**Verification**:
1. Test Rinnegan with complex technical request
2. Confirm it returns QUESTIONS not analysis
3. Check it identifies risk areas

---

### GAP 5: A9 - Intent Confirmations API Missing

**Current State**: Backend IntentConfirmationManager exists, no API endpoints
**Required State**: REST API for creating/fetching/submitting intent confirmations
**Impact**: UI can't interact with intent confirmation system

#### Fix 5.1: Create Intent Confirmations API Routes

**File**: `apps/server/src/routes/intent-confirmations.ts` (NEW FILE)

**Create Complete API**:
```typescript
import { Hono } from 'hono';
import { getDb } from '@third-eye/db';
import { IntentConfirmationManager } from '@third-eye/core';
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';

const app = new Hono();

// Apply middleware
app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

// GET /api/intent-confirmations/:id
// Get specific intent confirmation
app.get('/:id', async (c) => {
  try {
    const confirmationId = c.req.param('id');
    const { db } = getDb();
    const manager = new IntentConfirmationManager(db);

    const confirmation = await manager.getConfirmation(confirmationId);

    if (!confirmation) {
      return createNotFoundResponse(c, `Intent confirmation ${confirmationId} not found`);
    }

    return createSuccessResponse(c, { confirmation });
  } catch (error) {
    console.error('Failed to fetch intent confirmation:', error);
    return createInternalErrorResponse(c, 'Failed to fetch intent confirmation');
  }
});

// GET /api/intent-confirmations/session/:sessionId
// Get all intent confirmations for a session
app.get('/session/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const { db } = getDb();

    const query = `
      SELECT id, session_id, intent_analysis, confirmation_prompt,
             response, user_identity, status, created_at, responded_at
      FROM intent_confirmations
      WHERE session_id = ?
      ORDER BY created_at DESC
    `;

    const rows = db.prepare(query).all(sessionId) as Array<{
      id: string;
      session_id: string;
      intent_analysis: string | null;
      confirmation_prompt: string;
      response: string | null;
      user_identity: string | null;
      status: string;
      created_at: number;
      responded_at: number | null;
    }>;

    const confirmations = rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      intentAnalysis: row.intent_analysis ? JSON.parse(row.intent_analysis) : null,
      confirmationPrompt: row.confirmation_prompt,
      response: row.response,
      userIdentity: row.user_identity,
      status: row.status,
      createdAt: row.created_at,
      respondedAt: row.responded_at
    }));

    return createSuccessResponse(c, { confirmations });
  } catch (error) {
    console.error('Failed to fetch session intent confirmations:', error);
    return createInternalErrorResponse(c, 'Failed to fetch session intent confirmations');
  }
});

// POST /api/intent-confirmations/:id/submit
// Submit human response to intent confirmation
app.post('/:id/submit', async (c) => {
  try {
    const confirmationId = c.req.param('id');
    const body = await c.req.json();

    if (!body.response || typeof body.response !== 'string') {
      return createErrorResponse(c, 'response (string) is required', 400);
    }

    const { db } = getDb();
    const manager = new IntentConfirmationManager(db);

    await manager.submitConfirmation(
      confirmationId,
      body.response,
      body.userIdentity || 'human-via-ui'
    );

    return createSuccessResponse(c, {
      message: 'Intent confirmation submitted successfully',
      confirmationId
    });
  } catch (error) {
    console.error('Failed to submit intent confirmation:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return createNotFoundResponse(c, error.message);
    }
    return createInternalErrorResponse(c, 'Failed to submit intent confirmation');
  }
});

// GET /api/intent-confirmations/pending
// Get all pending intent confirmations
app.get('/pending', async (c) => {
  try {
    const { db } = getDb();

    const query = `
      SELECT id, session_id, confirmation_prompt, status, created_at
      FROM intent_confirmations
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `;

    const rows = db.prepare(query).all() as Array<{
      id: string;
      session_id: string;
      confirmation_prompt: string;
      status: string;
      created_at: number;
    }>;

    const confirmations = rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      confirmationPrompt: row.confirmation_prompt,
      status: row.status,
      createdAt: row.created_at
    }));

    return createSuccessResponse(c, { confirmations });
  } catch (error) {
    console.error('Failed to fetch pending intent confirmations:', error);
    return createInternalErrorResponse(c, 'Failed to fetch pending intent confirmations');
  }
});

export default app;
```

**Register Route**:
**File**: `apps/server/src/index.ts`

Add:
```typescript
import intentConfirmationsRoutes from './routes/intent-confirmations';
app.route('/api/intent-confirmations', intentConfirmationsRoutes);
```

**Verification**:
1. Start server
2. Call `POST /api/intent-confirmations` - confirm 201 response
3. Call `GET /api/intent-confirmations/:id` - confirm data returned
4. Call `POST /api/intent-confirmations/:id/submit` - confirm update
5. Check `intent_confirmations` table populated

---

## PRIORITY 3: POLISH (OPTIONAL)

### GAP 6: A7 - Advanced Pipeline Builder Features

**Missing Features**:
1. Visual policy builder with constraint selectors
2. Predefined template library
3. Template import/export
4. Policy preview functionality

#### Feature 6.1: Visual Policy Builder

**File**: `apps/ui/src/components/pipeline-builder/VisualPolicyBuilder.tsx` (NEW FILE)

**Create Interactive Policy Editor**:
- Checkboxes for mandatory eyes (multi-select)
- Checkboxes for forbidden eyes (multi-select)
- Slider for min validation eyes
- Toggle for security required
- Toggle for always confirm intent
- Custom constraint text area

**Integration**:
Add to `/routing-modes` page as alternative to raw JSON form

---

#### Feature 6.2: Predefined Template Library

**File**: `packages/db/defaults/templates.ts` (NEW FILE)

**Create 5 Built-in Templates**:
```typescript
export const PREDEFINED_TEMPLATES = [
  {
    name: "Fast Code Review",
    description: "Quick review for small changes",
    eyes: ["sharingan", "mangekyo"],
    strict: false
  },
  {
    name: "Security Audit",
    description: "Comprehensive security analysis",
    eyes: ["sharingan", "rinnegan", "tenseigan", "byakugan"],
    strict: true
  },
  {
    name: "Research Article",
    description: "Deep research with fact-checking",
    eyes: ["kyuubi", "tenseigan", "byakugan"],
    strict: true
  },
  {
    name: "Quick Question",
    description: "Simple clarification",
    eyes: ["sharingan"],
    strict: false
  },
  {
    name: "Complete Pipeline",
    description: "All eyes, maximum thoroughness",
    eyes: ["sharingan", "kyuubi", "rinnegan", "mangekyo", "tenseigan", "byakugan"],
    strict: true
  }
];
```

**Seed on First Run**:
Add to database initialization

---

#### Feature 6.3: Template Import/Export

**File**: `apps/ui/src/components/pipeline-builder/TemplateImportExport.tsx` (NEW FILE)

**Export**:
- Serialize template to JSON
- Download as `.json` file

**Import**:
- Upload `.json` file
- Validate schema
- Insert into database

---

#### Feature 6.4: Policy Preview

**File**: `apps/ui/src/components/pipeline-builder/PolicyPreview.tsx` (NEW FILE)

**Show Preview**:
- "With these constraints, Overseer might route like this..."
- Sample routing for 3 example requests
- Show how mandatory/forbidden eyes affect routing

---

## VERIFICATION CHECKLIST

After implementing ALL fixes, run these end-to-end tests:

### Test 1: Function Calling
- [ ] Submit request via MCP
- [ ] Check Groq provider logs - confirm `tools` API used
- [ ] Check OpenRouter provider logs - confirm `tools` API used
- [ ] Verify no format errors in any eye responses
- [ ] Confirm 95%+ success rate

### Test 2: Pause/Resume
- [ ] Submit request that needs clarification
- [ ] Confirm pipeline pauses automatically
- [ ] Check `pipeline_states` table has paused state
- [ ] Submit human response
- [ ] Call resume endpoint
- [ ] Confirm pipeline continues from correct eye

### Test 3: Eye Invisibility
- [ ] Submit request via MCP
- [ ] Inspect actual JSON response
- [ ] Confirm NO eye names present
- [ ] Confirm NO routing structure visible
- [ ] Agent only sees synthesized final result

### Test 4: Personas Ask Questions
- [ ] Test Kyuubi with vague request
- [ ] Confirm response contains questions, NOT brief
- [ ] Test Rinnegan with complex request
- [ ] Confirm response contains questions, NOT analysis

### Test 5: Intent Confirmations API
- [ ] Create intent confirmation via backend
- [ ] Call GET `/api/intent-confirmations/:id`
- [ ] Confirm data returned
- [ ] Submit response via API
- [ ] Verify status updated in database

---

## IMPLEMENTATION ORDER

**Execute in this exact sequence** (no parallelization, avoid conflicts):

1. **A4.1**: Groq function calling
2. **A4.2**: OpenRouter function calling
3. **A3.1**: Pause code detection in auto-router
4. **A5.1**: Rewrite Kyuubi persona
5. **A5.2**: Rewrite Rinnegan persona
6. **A6.1**: Verify/fix MCP response format
7. **A9.1**: Create intent confirmations API
8. **A7** (optional): Advanced pipeline builder features

**After each fix**: Run verification test for that specific feature before moving to next.

---

## ACCEPTANCE CRITERIA FOR COMPLETION

**DO NOT CLAIM COMPLETION UNTIL**:
- [ ] All Priority 1 fixes implemented AND verified
- [ ] All Priority 2 fixes implemented AND verified
- [ ] All verification tests pass
- [ ] No format errors in logs
- [ ] Pause/resume works in real pipeline execution
- [ ] Personas demonstrably ask questions not generate
- [ ] MCP responses confirmed clean (no eye exposure)
- [ ] Intent confirmations API fully functional

**THEN AND ONLY THEN**: 95% production-ready (excluding optional Priority 3 polish).

---

**NO MORE FAKE REPORTING. NO MORE INFLATED PERCENTAGES. IMPLEMENT, VERIFY, THEN REPORT.**
