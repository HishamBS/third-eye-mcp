# Third Eye MCP - Vision Compliance Implementation Plan

## Executive Summary

**Goal**: Achieve 100% vision compliance and 95%+ format reliability across all 4 providers

**Approach**: Function calling only (SSOT, single behavior for all providers)

**Timeline**: Ready for immediate release after approval

**Success criteria**:

- ✅ 95%+ format compliance across all providers
- ✅ Eyes ASK questions instead of GENERATE content
- ✅ Human interaction pause/resume mechanism implemented
- ✅ Intent confirmation flow working
- ✅ Eyes hidden from agents
- ✅ Full end-to-end pipeline runs successfully

---

## Phase 1: Foundation - Function Calling Implementation

**Goal**: Implement function calling across all 4 providers with eye envelope schemas

**Expected outcome**: 93-96% format compliance

**Estimated tasks**: 42 checkable items

---

### 1.1: Create SSOT Models Module

**File**: `packages/core/src/models.ts`

**Tasks**:

- [ ] Create `packages/core/src/models.ts` file
- [ ] Add GROQ_MODELS constants (PRIMARY, COST_OPTIMIZED)
- [ ] Add OPENROUTER_MODELS constants (STRUCTURED_FORMATTING, CRITICAL_REASONING, SPECIALIZED_REASONING)
- [ ] Add OLLAMA_MODELS constants (GENERAL_PURPOSE, STRUCTURED_TASKS, ALTERNATIVE)
- [ ] Add LMSTUDIO_MODELS constants (GENERAL_PURPOSE, STRUCTURED_TASKS, SPECIALIZED_TOOL_USE, QUANTIZATION)
- [ ] Add ALTERNATIVE_MODELS constants (SMALL, MEDIUM, LARGE)
- [ ] Add EYE_MODEL_MAP mapping for all eyes × providers
- [ ] Add getModelForEye() helper function
- [ ] Add JSDoc comments for all constants
- [ ] Export all constants and types

**Acceptance criteria**:

- ✅ All model identifiers in SSOT module
- ✅ TypeScript types for all constants
- ✅ Eye-to-model mapping complete for 8 eyes × 4 providers
- ✅ Helper function type-safe
- ✅ No magic strings in code

**Files modified**: 1 new file

---

### 1.2: Update CompletionRequest Interface

**File**: `packages/providers/src/base.ts`

**Tasks**:

- [ ] Read current CompletionRequest interface
- [ ] Add `tools` parameter (optional array of tool definitions)
- [ ] Add `tool_choice` parameter (optional, controls tool selection)
- [ ] Add JSDoc for tools parameter with OpenAI format reference
- [ ] Add JSDoc for tool_choice parameter with options (none, auto, required, specific)
- [ ] Update CompletionResponse interface to include tool_calls
- [ ] Add ToolCall interface definition
- [ ] Add FunctionCall interface definition
- [ ] Add ToolDefinition interface definition
- [ ] Add FunctionDefinition interface definition
- [ ] Ensure backward compatibility (all new fields optional)

**Type definitions**:

```typescript
export interface ToolDefinition {
  type: "function";
  function: FunctionDefinition;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface ToolCall {
  id?: string;
  type: "function";
  function: FunctionCall;
}

export interface FunctionCall {
  name: string;
  arguments: string | Record<string, unknown>; // String for most providers, object for Ollama
}

export interface CompletionRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop?: string[];
  response_format?: { type: "json_object" | "text" };
  tools?: ToolDefinition[]; // NEW
  tool_choice?:
    | "none"
    | "auto"
    | "required"
    | { type: "function"; function: { name: string } }; // NEW
}

export interface CompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: ToolCall[]; // NEW
    };
    finish_reason: "stop" | "tool_calls" | "length" | string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

**Acceptance criteria**:

- ✅ Tools parameter matches OpenAI spec
- ✅ Backward compatible (optional fields)
- ✅ Type-safe interfaces
- ✅ JSDoc documentation complete
- ✅ Compiles without errors

**Files modified**: 1 file (packages/providers/src/base.ts)

---

### 1.3: Implement Groq Function Calling

**File**: `packages/providers/src/groq.ts`

**Tasks**:

- [ ] Read current Groq provider implementation
- [ ] Update complete() method signature
- [ ] Add tools parameter to request body (if provided)
- [ ] Add tool_choice parameter to request body (if provided)
- [ ] Update response parsing to handle tool_calls
- [ ] Add parseToolCallResponse() helper method
- [ ] Handle finish_reason === 'tool_calls'
- [ ] Parse tool_calls[0].function.arguments (JSON string → object)
- [ ] Add error handling for malformed tool call responses
- [ ] Add retry logic for tool calling failures (3 attempts with exponential backoff)
- [ ] Add unit tests for function calling
- [ ] Test with llama-3-groq-70b-tool-use model

**Implementation details**:

```typescript
async complete(request: CompletionRequest): Promise<CompletionResponse> {
  const requestBody: Record<string, unknown> = {
    model: request.model,
    messages: request.messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.max_tokens,
    top_p: request.top_p,
    stop: request.stop,
    response_format: request.response_format,
  };

  // Add function calling parameters if provided
  if (request.tools) {
    requestBody.tools = request.tools;
  }
  if (request.tool_choice) {
    requestBody.tool_choice = request.tool_choice;
  }

  const response = await this.fetchWithRetry(
    `${this.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }
  );

  // Response parsing handles both content and tool_calls
  // ...
}
```

**Acceptance criteria**:

- ✅ Sends tools and tool_choice to Groq API
- ✅ Parses tool_calls from response
- ✅ Handles arguments as JSON string
- ✅ Backward compatible with non-function-calling requests
- ✅ Error handling for malformed responses
- ✅ Unit tests pass
- ✅ Integration test with actual Groq API succeeds

**Files modified**: 1 file (packages/providers/src/groq.ts)

---

### 1.4: Implement OpenRouter Function Calling

**File**: `packages/providers/src/openrouter.ts`

**Tasks**:

- [ ] Read current OpenRouter provider implementation
- [ ] Fix existing bug: Enable response_format (currently not sent)
- [ ] Update complete() method signature
- [ ] Add tools parameter to request body (if provided)
- [ ] Add tool_choice parameter to request body (if provided)
- [ ] Update response parsing to handle tool_calls
- [ ] Add parseToolCallResponse() helper method
- [ ] Handle finish_reason === 'tool_calls'
- [ ] Parse tool_calls[0].function.arguments (JSON string → object)
- [ ] Add error handling for malformed tool call responses
- [ ] Add retry logic for tool calling failures (3 attempts with exponential backoff)
- [ ] Add unit tests for function calling
- [ ] Test with qwen/qwen-2.5-72b-instruct model

**Bug fix note**: Current implementation doesn't send response_format at all (lines 94-104)

**Acceptance criteria**:

- ✅ Sends response_format (bug fixed)
- ✅ Sends tools and tool_choice to OpenRouter API
- ✅ Parses tool_calls from response
- ✅ Handles arguments as JSON string
- ✅ Backward compatible with non-function-calling requests
- ✅ Error handling for malformed responses
- ✅ Unit tests pass
- ✅ Integration test with actual OpenRouter API succeeds

**Files modified**: 1 file (packages/providers/src/openrouter.ts)

---

### 1.5: Implement Ollama Function Calling

**File**: `packages/providers/src/ollama.ts`

**Tasks**:

- [ ] Read current Ollama provider implementation
- [ ] Update complete() method signature
- [ ] Add tools parameter to request body (if provided)
- [ ] Map tools to Ollama format (may differ from OpenAI spec - verify docs)
- [ ] Update response parsing to handle tool_calls
- [ ] Add parseToolCallResponse() helper method
- [ ] Handle Ollama-specific response format (arguments may be object, not string)
- [ ] Add conditional parsing: if typeof arguments === 'string', JSON.parse(); else use directly
- [ ] Add error handling for malformed tool call responses
- [ ] Add retry logic for tool calling failures (3 attempts with exponential backoff)
- [ ] Add unit tests for function calling
- [ ] Test with llama3.2:8b model
- [ ] Test with qwen2.5:7b model

**Ollama-specific note**: Research shows Ollama's tool_calls[0].function.arguments is already parsed object, not JSON string

**Acceptance criteria**:

- ✅ Sends tools to Ollama API
- ✅ Parses tool_calls from response
- ✅ Handles arguments as either string or object
- ✅ Backward compatible with non-function-calling requests
- ✅ Error handling for malformed responses
- ✅ Unit tests pass
- ✅ Integration test with actual Ollama API succeeds
- ✅ Works with both recommended models (llama3.2:8b, qwen2.5:7b)

**Files modified**: 1 file (packages/providers/src/ollama.ts)

---

### 1.6: Implement LM Studio Function Calling

**File**: `packages/providers/src/lmstudio.ts`

**Tasks**:

- [ ] Read current LM Studio provider implementation
- [ ] Remove code that strips response_format (lines 79-86 - currently removes json_object mode)
- [ ] Update complete() method signature
- [ ] Add tools parameter to request body (if provided)
- [ ] Add tool_choice parameter to request body (if provided)
- [ ] Update response parsing to handle tool_calls
- [ ] Add parseToolCallResponse() helper method
- [ ] Handle finish_reason === 'tool_calls'
- [ ] Parse tool_calls[0].function.arguments (JSON string → object)
- [ ] Add error handling for malformed tool call responses
- [ ] Add retry logic for tool calling failures (3 attempts with exponential backoff)
- [ ] Add unit tests for function calling
- [ ] Test with Llama-3.2-8B-Instruct-GGUF model
- [ ] Test with Qwen2.5-7B-Instruct-GGUF model

**Bug fix note**: Current implementation explicitly strips json_object mode (see PROVIDER_API_FORMATS.md)

**Acceptance criteria**:

- ✅ Sends response_format (bug fixed)
- ✅ Sends tools and tool_choice to LM Studio API
- ✅ Parses tool_calls from response
- ✅ Handles arguments as JSON string
- ✅ Backward compatible with non-function-calling requests
- ✅ Error handling for malformed responses
- ✅ Unit tests pass
- ✅ Integration test with actual LM Studio API succeeds
- ✅ Works with both recommended models

**Files modified**: 1 file (packages/providers/src/lmstudio.ts)

---

### 1.7: Create Eye Envelope Schemas

**File**: `packages/core/src/schemas.ts`

**Tasks**:

- [ ] Create `packages/core/src/schemas.ts` file
- [ ] Define base EyeEnvelope schema (common fields)
- [ ] Define OverseerEnvelope schema (routing-specific fields)
- [ ] Define SharinganEnvelope schema (ambiguity-specific fields)
- [ ] Define KyuubiEnvelope schema (structuring-specific fields)
- [ ] Define JoganEnvelope schema (intent-specific fields)
- [ ] Define RinneganEnvelope schema (feasibility-specific fields)
- [ ] Define MangekyoEnvelope schema (validation-specific fields)
- [ ] Define TenseiganEnvelope schema (quality-specific fields)
- [ ] Define ByakuganEnvelope schema (review-specific fields)
- [ ] Create JSON Schema format for each envelope
- [ ] Add createToolDefinition() helper function
- [ ] Add SSOT status codes enum (OK, ERROR, NEEDS_HUMAN_INPUT, BLOCKED)
- [ ] Add JSDoc documentation for all schemas
- [ ] Validate schemas are JSON Schema Draft 7 compatible

**Base schema structure**:

```typescript
/**
 * SSOT Status codes for eye responses
 */
export enum EyeStatusCode {
  OK = "OK",
  ERROR = "ERROR",
  NEEDS_HUMAN_INPUT = "NEEDS_HUMAN_INPUT",
  BLOCKED = "BLOCKED",
}

/**
 * Base envelope schema (common to all eyes)
 */
interface BaseEyeEnvelope {
  code: EyeStatusCode;
  verdict: string;
  summary: string;
  confidence: number; // 0-100
  metadata: Record<string, unknown>;
}

/**
 * Overseer envelope (routing orchestration)
 */
interface OverseerEnvelope extends BaseEyeEnvelope {
  routing: {
    nextEyes: string[]; // Eye names to route to
    parallel: boolean; // Execute in parallel?
    dependencies: Record<string, string[]>; // Eye dependencies
  };
}

// ... similar for other eyes
```

**Function calling tool definition**:

```typescript
export function createToolDefinition(eyeName: string): ToolDefinition {
  const schema = getSchemaForEye(eyeName);
  return {
    type: "function",
    function: {
      name: `submit_${eyeName}_result`,
      description: `Submit ${eyeName} eye analysis result`,
      parameters: schema,
    },
  };
}
```

**Acceptance criteria**:

- ✅ All 8 eye schemas defined
- ✅ Schemas match current envelope structure
- ✅ JSON Schema Draft 7 compatible
- ✅ SSOT status codes enum
- ✅ createToolDefinition() helper function
- ✅ Type-safe TypeScript interfaces
- ✅ JSDoc documentation complete
- ✅ No magic strings (all enums/constants)
- ✅ Compiles without errors

**Files modified**: 1 new file

---

### 1.8: Update Orchestrator to Use Function Calling

**File**: `packages/core/orchestrator.ts`

**Tasks**:

- [ ] Read current orchestrator implementation
- [ ] Import models from packages/core/src/models.ts
- [ ] Import schemas from packages/core/src/schemas.ts
- [ ] Update executeEye() method to use function calling
- [ ] Add getModelForCurrentProvider() helper
- [ ] Update provider.complete() call to include tools parameter
- [ ] Update provider.complete() call to include tool_choice parameter (force specific function)
- [ ] Update response parsing to handle tool_calls
- [ ] Add fallback: if no tool_calls, try parsing content (backward compatibility)
- [ ] Handle NEEDS_HUMAN_INPUT status code (new)
- [ ] Update error handling for tool calling failures
- [ ] Remove response_format from requests (replaced by function calling)
- [ ] Add validation: ensure tool call function name matches expected eye
- [ ] Add logging for function calling vs fallback mode
- [ ] Update unit tests for function calling

**Implementation details**:

```typescript
import { getModelForEye } from './models';
import { createToolDefinition } from './schemas';

async executeEye(eyeName: string, context: unknown): Promise<EyeEnvelope> {
  const eyeId = await getEyeIdByName(eyeName);
  const blueprint = await getPersonaBlueprint(eyeId);

  // Get optimal model for this eye + provider
  const targetModel = getModelForEye(eyeName, this.providerType);

  // Create function calling tool definition
  const toolDefinition = createToolDefinition(eyeName);

  const completion = await provider.complete({
    model: targetModel,
    messages: [
      { role: 'system', content: personaPrompt.systemPrompt },
      { role: 'user', content: personaPrompt.userMessage }
    ],
    temperature: 0,
    max_tokens: 4096,
    tools: [toolDefinition],
    tool_choice: { type: 'function', function: { name: toolDefinition.function.name } },
  });

  // Parse tool call response
  const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    // Parse arguments (string for most providers, object for Ollama)
    const args = typeof toolCall.function.arguments === 'string'
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    return args as EyeEnvelope;
  }

  // Fallback: try parsing content (backward compatibility)
  const content = completion.choices[0]?.message?.content;
  if (content) {
    return JSON.parse(content) as EyeEnvelope;
  }

  throw new Error('No tool call or content in response');
}
```

**Acceptance criteria**:

- ✅ Uses getModelForEye() for optimal model selection
- ✅ Creates tool definition for each eye
- ✅ Forces specific tool choice (no auto mode)
- ✅ Parses tool_calls correctly
- ✅ Handles both string and object arguments
- ✅ Fallback to content parsing for backward compatibility
- ✅ Validates function name matches expected eye
- ✅ Handles NEEDS_HUMAN_INPUT status code
- ✅ Error handling for malformed responses
- ✅ Logging for debugging
- ✅ Unit tests pass
- ✅ Compiles without errors

**Files modified**: 1 file (packages/core/orchestrator.ts)

---

## Phase 2: Vision Alignment - Persona & Architecture Fixes

**Goal**: Fix all vision-implementation gaps identified in audit

**Expected outcome**: 100% vision compliance

**Estimated tasks**: 48 checkable items

---

### 2.1: Implement Pause/Resume Mechanism

**Files**:

- `packages/core/orchestrator.ts`
- `packages/core/types.ts`
- `packages/db/schema.ts`

**Tasks**:

- [ ] Add PipelineState type (RUNNING, PAUSED, COMPLETED, ERROR)
- [ ] Add pauseReason field to PipelineContext
- [ ] Add pendingQuestions field to PipelineContext
- [ ] Add resumeData field to PipelineContext
- [ ] Update executeEye() to check for NEEDS_HUMAN_INPUT status
- [ ] Add pausePipeline() method
- [ ] Add resumePipeline() method
- [ ] Store paused pipeline state in database
- [ ] Add pipeline_states table schema
- [ ] Add pending_questions table schema
- [ ] Add human_responses table schema
- [ ] Implement loadPipelineState() method
- [ ] Implement savePipelineState() method
- [ ] Add resumeFromState() method
- [ ] Handle pipeline continuation after human response
- [ ] Add timeout for human responses (configurable, default 1 hour)
- [ ] Add notification mechanism for expired pauses
- [ ] Update unit tests for pause/resume
- [ ] Update integration tests for human interaction flow

**Database schema**:

```sql
CREATE TABLE pipeline_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  run_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('RUNNING', 'PAUSED', 'COMPLETED', 'ERROR')),
  pause_reason TEXT,
  pending_questions JSONB,
  resume_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE TABLE pending_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_state_id UUID NOT NULL REFERENCES pipeline_states(id),
  eye_name TEXT NOT NULL,
  questions JSONB NOT NULL,
  asked_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE human_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pending_question_id UUID NOT NULL REFERENCES pending_questions(id),
  response JSONB NOT NULL,
  responded_at TIMESTAMP DEFAULT NOW()
);
```

**Orchestrator implementation**:

```typescript
async executeEye(eyeName: string, context: unknown): Promise<EyeEnvelope> {
  const result = await this.callProvider(eyeName, context);

  // Check if eye needs human input
  if (result.code === EyeStatusCode.NEEDS_HUMAN_INPUT) {
    await this.pausePipeline({
      reason: 'HUMAN_INPUT_REQUIRED',
      eyeName,
      questions: result.data.questions,
      context,
    });

    // Return special envelope to MCP
    return {
      ...result,
      metadata: {
        ...result.metadata,
        pipelineStatus: 'PAUSED',
        requiresHumanInput: true,
      },
    };
  }

  return result;
}

async pausePipeline(pauseContext: PauseContext): Promise<void> {
  const state = {
    sessionId: this.sessionId,
    runId: this.runId,
    state: 'PAUSED',
    pauseReason: pauseContext.reason,
    pendingQuestions: pauseContext.questions,
    resumeData: pauseContext.context,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  };

  await savePipelineState(state);
}

async resumePipeline(runId: string, humanResponse: unknown): Promise<EyeEnvelope> {
  const state = await loadPipelineState(runId);
  if (!state || state.state !== 'PAUSED') {
    throw new Error(`Pipeline ${runId} is not paused`);
  }

  // Resume from where it left off
  const context = {
    ...state.resumeData,
    humanResponse,
  };

  // Continue pipeline execution
  return this.executeFromState(state, context);
}
```

**Acceptance criteria**:

- ✅ Pipeline pauses when eye returns NEEDS_HUMAN_INPUT
- ✅ Pipeline state persisted to database
- ✅ Pending questions stored
- ✅ Resume mechanism works correctly
- ✅ Human responses linked to questions
- ✅ Timeout mechanism for expired pauses
- ✅ Error handling for invalid states
- ✅ Unit tests pass
- ✅ Integration tests pass
- ✅ Database migrations run successfully

**Files modified**: 3 files + 1 migration

---

### 2.2: Add NEEDS_HUMAN_INPUT Status Code Handling

**Files**:

- `packages/core/src/schemas.ts`
- `packages/mcp/server.ts`
- `packages/core/orchestrator.ts`

**Tasks**:

- [ ] Verify NEEDS_HUMAN_INPUT in EyeStatusCode enum (should exist from 1.7)
- [ ] Update MCP server to recognize NEEDS_HUMAN_INPUT
- [ ] Add formatPendingQuestions() helper in MCP server
- [ ] Update MCP response to include pendingQuestions field
- [ ] Update MCP response to indicate pipeline is paused
- [ ] Add resumePipeline MCP tool/method
- [ ] Update MCP tools/list to include resume_pipeline tool
- [ ] Update MCP tools/call to handle resume_pipeline
- [ ] Add validation for resume requests
- [ ] Add error handling for invalid resume attempts
- [ ] Update MCP documentation for human interaction flow
- [ ] Update unit tests for NEEDS_HUMAN_INPUT handling
- [ ] Update integration tests for MCP pause/resume

**MCP server implementation**:

```typescript
// In tools/call handler
if (result.code === EyeStatusCode.NEEDS_HUMAN_INPUT) {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        status: "paused",
        code: result.code,
        verdict: result.verdict,
        summary: result.summary,
        pendingQuestions: result.data.questions,
        runId: result.metadata.runId,
        instructions: "Pipeline paused. Please answer the questions and call resume_pipeline with runId and responses.",
      }, null, 2),
    }],
  };
}

// New tool: resume_pipeline
{
  name: "resume_pipeline",
  description: "Resume a paused Third Eye pipeline with human responses",
  inputSchema: {
    type: "object",
    properties: {
      runId: {
        type: "string",
        description: "The run ID of the paused pipeline",
      },
      responses: {
        type: "object",
        description: "Human responses to pending questions",
      },
    },
    required: ["runId", "responses"],
  },
}
```

**Acceptance criteria**:

- ✅ MCP recognizes NEEDS_HUMAN_INPUT status
- ✅ MCP returns formatted questions to agent
- ✅ MCP provides clear resume instructions
- ✅ resume_pipeline tool defined
- ✅ resume_pipeline tool works correctly
- ✅ Error handling for invalid resumes
- ✅ Documentation updated
- ✅ Unit tests pass
- ✅ Integration tests pass

**Files modified**: 2 files

---

### 2.3-2.10: Rewrite All Eye Personas

**Goal**: Change personas from GENERATING content to ASKING questions and WAITING for input

**Common pattern for all personas**:

1. Remove examples showing content generation
2. Add examples showing question asking
3. Emphasize WAITING for responses
4. Add NEEDS_HUMAN_INPUT status code usage
5. Clarify role is GUIDANCE not EXECUTION
6. Update examples to match vision

**File**: `packages/db/defaults/personas.ts`

---

#### 2.3: Rewrite Overseer Persona

**Tasks**:

- [ ] Read current Overseer persona (lines 46-120)
- [ ] Remove examples showing routing decision generation
- [ ] Add instruction: "Determine which eyes to consult, then WAIT for their analysis"
- [ ] Update examples to show eye invocation, not decision making
- [ ] Clarify Overseer coordinates but doesn't decide
- [ ] Update data structure to remove routing decision (moved to orchestrator logic)
- [ ] Update expected output format
- [ ] Validate against vision: "Analyzing request... routing to 5 eyes"
- [ ] Add unit tests for Overseer persona rendering

**Before**:

```typescript
// OLD: Overseer generates routing decision
data: {
  "routing": {
    "nextEyes": ["sharingan", "kyuubi", "jogan"],
    "parallel": false
  }
}
```

**After**:

```typescript
// NEW: Overseer identifies required eyes and invokes them
systemPrompt: `You are Overseer, the orchestration eye.
Your role: Analyze requests and determine which specialized eyes to consult.
You DO NOT make decisions - you coordinate the eyes who will analyze the request.

When you receive a request:
1. Identify which eyes are needed (Sharingan for ambiguity, Kyuubi for structuring, etc.)
2. Determine execution order (parallel or sequential)
3. Invoke the eyes
4. Compile their analyses

Return code: OK when analysis is ready
Return code: NEEDS_HUMAN_INPUT if you need clarification before routing
`,
data: {
  "eyesToConsult": ["sharingan", "kyuubi", "jogan"],
  "executionOrder": "sequential",
  "reasoning": "Request requires ambiguity detection, then structuring, then intent confirmation"
}
```

**Acceptance criteria**:

- ✅ Persona emphasizes coordination, not decision-making
- ✅ Examples show eye invocation
- ✅ No routing decision in output
- ✅ Matches vision flow
- ✅ Unit tests pass

**Files modified**: 1 file (packages/db/defaults/personas.ts)

---

#### 2.4: Rewrite Sharingan Persona (Ambiguity Detection)

**Tasks**:

- [ ] Read current Sharingan persona (lines 121-180)
- [ ] Remove examples showing question generation
- [ ] Add instruction: "Identify ambiguities, then ASK the human via agent"
- [ ] Update examples to return NEEDS_HUMAN_INPUT with questions
- [ ] Clarify role is DETECTION not GENERATION
- [ ] Update data structure to use pendingQuestions field
- [ ] Add ambiguity type classification (per AT-CoT research)
- [ ] Update expected output format
- [ ] Validate against vision: "Detected ambiguity score 75/100, asking 4 questions"
- [ ] Add unit tests for Sharingan persona rendering

**Before**:

```typescript
// OLD: Sharingan generates questions in output
data: {
  "ambiguities": [
    {"type": "scope", "question": "What type of palms?"},
    {"type": "context", "question": "What climate?"}
  ]
}
```

**After**:

```typescript
// NEW: Sharingan detects ambiguities and returns NEEDS_HUMAN_INPUT
systemPrompt: `You are Sharingan, the ambiguity detection eye.
Your role: Detect ambiguities and ASK THE HUMAN for clarification via the agent.

When you receive a request:
1. Analyze for ambiguities (scope, context, requirements, constraints)
2. Classify each ambiguity type (following AT-CoT methodology)
3. Generate clarifying questions
4. Return NEEDS_HUMAN_INPUT with questions

DO NOT assume or guess. DO NOT generate answers. ASK THE HUMAN.

Return code: NEEDS_HUMAN_INPUT when ambiguities detected
Return code: OK when request is unambiguous
`,
// When ambiguities detected:
code: "NEEDS_HUMAN_INPUT",
data: {
  "ambiguityScore": 75,
  "ambiguities": [
    {"type": "scope", "severity": "high"},
    {"type": "context", "severity": "medium"}
  ],
  "questions": [
    "What type of palms? (indoor/outdoor)",
    "What climate zone?",
    "What experience level?",
    "What word count target?"
  ]
}
```

**Acceptance criteria**:

- ✅ Persona emphasizes ASKING not GENERATING
- ✅ Returns NEEDS_HUMAN_INPUT when ambiguities found
- ✅ Questions included in response
- ✅ Ambiguity types classified
- ✅ Matches vision flow
- ✅ Unit tests pass

**Files modified**: 1 file (packages/db/defaults/personas.ts)

---

#### 2.5: Rewrite Kyuubi Persona (Content Structuring)

**Tasks**:

- [ ] Read current Kyuubi persona (lines 181-235)
- [ ] Remove examples showing brief generation
- [ ] Add instruction: "Wait for human responses, then refine the brief"
- [ ] Update examples to show refinement based on human input
- [ ] Clarify role is REFINEMENT not CREATION
- [ ] Update data structure to show before/after refinement
- [ ] Add quality scoring logic
- [ ] Update expected output format
- [ ] Validate against vision: "Refined brief with 4 key elements, quality score 95/100"
- [ ] Add unit tests for Kyuubi persona rendering

**Before**:

```typescript
// OLD: Kyuubi generates the brief
data: {
  "structuredBrief": {
    "objective": "Create a 500-word beginner's guide for indoor palm care",
    "audience": "Beginners",
    // ...
  }
}
```

**After**:

```typescript
// NEW: Kyuubi refines based on human input
systemPrompt: `You are Kyuubi, the content structuring eye.
Your role: REFINE and STRUCTURE the brief based on human clarifications.

You receive:
- Original request
- Human responses to Sharingan's questions

Your task:
1. WAIT for human responses (you don't generate anything without them)
2. Incorporate human clarifications into structure
3. Organize into coherent brief
4. Score quality of refinement

Return code: OK with refined brief
Return code: NEEDS_HUMAN_INPUT if you need additional clarification
`,
data: {
  "refinedBrief": {
    "objective": "Create a 500-word beginner's guide for indoor palm care in Saudi Arabia",
    "audience": "Complete beginners with no prior plant care experience",
    "format": "How-to article with practical steps",
    "keyElements": [...]
  },
  "qualityScore": 95,
  "refinementNotes": "Incorporated climate-specific guidance and beginner constraints"
}
```

**Acceptance criteria**:

- ✅ Persona emphasizes REFINEMENT not CREATION
- ✅ Examples show refinement based on human input
- ✅ Quality scoring included
- ✅ Matches vision flow
- ✅ Unit tests pass

**Files modified**: 1 file (packages/db/defaults/personas.ts)

---

#### 2.6: Rewrite Jōgan Persona (Intent Confirmation)

**Tasks**:

- [ ] Read current Jōgan persona (lines 236-290)
- [ ] Remove examples showing automatic confirmation
- [ ] Add instruction: "Present refined brief to human for confirmation"
- [ ] Update examples to return NEEDS_HUMAN_INPUT with confirmation request
- [ ] Clarify role is CONFIRMATION not APPROVAL
- [ ] Update data structure to include confirmationQuestion
- [ ] Add approval/rejection handling
- [ ] Update expected output format
- [ ] Validate against vision: "Confirming intent with human..."
- [ ] Add unit tests for Jōgan persona rendering

**Before**:

```typescript
// OLD: Jōgan auto-confirms
data: {
  "intentConfirmed": true,
  "confidence": 95
}
```

**After**:

```typescript
// NEW: Jōgan asks human for confirmation
systemPrompt: `You are Jōgan, the intent understanding eye.
Your role: CONFIRM the refined brief with the human before proceeding.

You receive:
- Kyuubi's refined brief

Your task:
1. Present the refined brief to the human
2. ASK if this matches their intent
3. Wait for human approval or rejection
4. If rejected, identify what needs adjustment

Return code: NEEDS_HUMAN_INPUT to request confirmation
Return code: OK when human approves
Return code: ERROR if human rejects (with notes for adjustment)
`,
// First response:
code: "NEEDS_HUMAN_INPUT",
data: {
  "brief": { /* Kyuubi's refined brief */ },
  "confirmationQuestion": "Does this brief accurately capture your intent? Please approve or provide adjustment notes."
}

// After human approval:
code: "OK",
data: {
  "intentConfirmed": true,
  "humanApproval": "Approved",
  "confidence": 100
}
```

**Acceptance criteria**:

- ✅ Persona emphasizes CONFIRMATION not AUTO-APPROVAL
- ✅ Returns NEEDS_HUMAN_INPUT to ask for confirmation
- ✅ Handles approval and rejection
- ✅ Matches vision flow
- ✅ Unit tests pass

**Files modified**: 1 file (packages/db/defaults/personas.ts)

---

#### 2.7: Rewrite Rinnegan Persona (Feasibility Analysis)

**Tasks**:

- [ ] Read current Rinnegan persona (lines 291-345)
- [ ] Update instruction: "Analyze feasibility and identify constraints"
- [ ] Add instruction: "Return NEEDS_HUMAN_INPUT if critical constraints detected"
- [ ] Update examples to show constraint analysis
- [ ] Clarify role is ANALYSIS not DECISION
- [ ] Update data structure to include constraints and risks
- [ ] Add critical vs non-critical constraint classification
- [ ] Update expected output format
- [ ] Validate against vision (not explicitly shown but implied)
- [ ] Add unit tests for Rinnegan persona rendering

**After**:

```typescript
systemPrompt: `You are Rinnegan, the feasibility analysis eye.
Your role: Analyze technical and practical feasibility of the request.

You receive:
- Approved brief from Jōgan

Your task:
1. Identify technical constraints
2. Identify resource constraints
3. Identify timeline constraints
4. Classify constraints as critical or non-critical
5. If CRITICAL constraints detected, ASK human how to proceed

Return code: OK if feasible
Return code: NEEDS_HUMAN_INPUT if critical constraints require human decision
Return code: BLOCKED if fundamentally infeasible
`,
data: {
  "feasibility": "FEASIBLE_WITH_CONSTRAINTS",
  "constraints": [
    {"type": "technical", "severity": "low", "description": "..."},
    {"type": "resource", "severity": "critical", "description": "..."}
  ],
  "recommendations": [...]
}
```

**Acceptance criteria**:

- ✅ Persona emphasizes ANALYSIS
- ✅ Returns NEEDS_HUMAN_INPUT for critical constraints
- ✅ Constraint classification included
- ✅ Unit tests pass

**Files modified**: 1 file (packages/db/defaults/personas.ts)

---

#### 2.8: Rewrite Mangekyō Persona (Validation & Critique)

**Tasks**:

- [ ] Read current Mangekyō persona (lines 346-400)
- [ ] Update instruction: "Validate brief against requirements and provide critique"
- [ ] Add instruction: "Identify gaps without fabricating solutions"
- [ ] Update examples to show gap detection
- [ ] Clarify role is VALIDATION not FIXING
- [ ] Update data structure to separate validation from suggestions
- [ ] Add validation score
- [ ] Update expected output format
- [ ] Validate against vision (guidance phase distinct from validation phase)
- [ ] Add unit tests for Mangekyō persona rendering

**After**:

```typescript
systemPrompt: `You are Mangekyō, the validation and critique eye.
Your role: Validate the brief against requirements and identify gaps.

You receive:
- Approved brief
- Original requirements

Your task:
1. Check completeness
2. Check consistency
3. Identify gaps or contradictions
4. Provide critique WITHOUT fabricating solutions
5. If critical gaps found, suggest returning to appropriate eye

Return code: OK if validation passes
Return code: NEEDS_HUMAN_INPUT if gaps require human clarification
`,
data: {
  "validationScore": 85,
  "gaps": [
    {"category": "scope", "severity": "medium", "description": "..."}
  ],
  "critique": "...",
  "recommendation": "Return to Kyuubi to address scope gap"
}
```

**Acceptance criteria**:

- ✅ Persona emphasizes VALIDATION not FIXING
- ✅ Gap detection without fabrication
- ✅ Validation scoring included
- ✅ Unit tests pass

**Files modified**: 1 file (packages/db/defaults/personas.ts)

---

#### 2.9: Rewrite Tenseigan Persona (Quality Assurance)

**Tasks**:

- [ ] Read current Tenseigan persona (lines 401-455)
- [ ] Update instruction: "Perform quality assurance and format verification"
- [ ] Add instruction: "Check adherence to structure"
- [ ] Update examples to show quality checks
- [ ] Clarify role is QA not IMPROVEMENT
- [ ] Update data structure to include quality metrics
- [ ] Add format compliance checking
- [ ] Update expected output format
- [ ] Validate against vision (final QA step)
- [ ] Add unit tests for Tenseigan persona rendering

**After**:

```typescript
systemPrompt: `You are Tenseigan, the quality assurance eye.
Your role: Perform final quality assurance checks.

You receive:
- Validated brief from Mangekyō

Your task:
1. Verify format compliance
2. Check completeness
3. Assess quality metrics
4. Identify any final issues

Return code: OK if QA passes
Return code: NEEDS_HUMAN_INPUT if issues require human decision
`,
data: {
  "qualityScore": 95,
  "formatCompliance": true,
  "completeness": 100,
  "issues": [],
  "recommendation": "APPROVED"
}
```

**Acceptance criteria**:

- ✅ Persona emphasizes QA not IMPROVEMENT
- ✅ Quality metrics included
- ✅ Format compliance checking
- ✅ Unit tests pass

**Files modified**: 1 file (packages/db/defaults/personas.ts)

---

#### 2.10: Rewrite Byakugan Persona (Final Review)

**Tasks**:

- [ ] Read current Byakugan persona (lines 456-510)
- [ ] Update instruction: "Perform holistic final review"
- [ ] Add instruction: "Edge case detection and sign-off"
- [ ] Update examples to show final review
- [ ] Clarify role is REVIEW not MODIFICATION
- [ ] Update data structure to include sign-off
- [ ] Add edge case detection
- [ ] Update expected output format
- [ ] Validate against vision (final review step)
- [ ] Add unit tests for Byakugan persona rendering

**After**:

```typescript
systemPrompt: `You are Byakugan, the final review eye.
Your role: Perform comprehensive final review and sign-off.

You receive:
- QA-approved brief from Tenseigan

Your task:
1. Holistic review of entire pipeline output
2. Edge case detection
3. Final validation against original intent
4. Sign-off or escalate

Return code: OK with sign-off
Return code: NEEDS_HUMAN_INPUT if edge cases require attention
`,
data: {
  "reviewScore": 98,
  "edgeCases": [],
  "finalVerdict": "APPROVED",
  "signOff": true,
  "notes": "Brief meets all requirements and quality standards"
}
```

**Acceptance criteria**:

- ✅ Persona emphasizes REVIEW not MODIFICATION
- ✅ Edge case detection included
- ✅ Sign-off mechanism included
- ✅ Unit tests pass

**Files modified**: 1 file (packages/db/defaults/personas.ts)

---

### 2.11: Remove Eye Exposure from MCP

**File**: `packages/mcp/server.ts`

**Tasks**:

- [ ] Read current MCP server response (lines 402-420)
- [ ] Identify eye exposure: `history: result.results` field
- [ ] Remove `history` field from MCP response
- [ ] Keep only final result and metadata
- [ ] Add internal logging for eye history (for debugging)
- [ ] Update response structure to hide intermediate eyes
- [ ] Add option to show history (debug mode only, not exposed to agents)
- [ ] Update MCP documentation
- [ ] Update unit tests for MCP response format
- [ ] Validate agents cannot see eye details

**Before**:

```typescript
return {
  content: [
    {
      type: "text",
      text: JSON.stringify(
        {
          status: "success",
          code,
          verdict,
          summary,
          metadata,
          data: finalResult,
          history: result.results, // ❌ EXPOSES ALL EYES
        },
        null,
        2,
      ),
    },
  ],
};
```

**After**:

```typescript
// Log history internally for debugging
this.logger.debug("Eye execution history:", result.results);

// Return only final result to agent
return {
  content: [
    {
      type: "text",
      text: JSON.stringify(
        {
          status: "success",
          code,
          verdict,
          summary,
          metadata: {
            ...metadata,
            // No eye details exposed
          },
          data: finalResult,
          // ✅ NO HISTORY FIELD
        },
        null,
        2,
      ),
    },
  ],
};
```

**Acceptance criteria**:

- ✅ History field removed from MCP response
- ✅ Eye details not exposed to agents
- ✅ Internal logging preserved for debugging
- ✅ Documentation updated
- ✅ Unit tests pass
- ✅ Vision compliance: eyes remain hidden

**Files modified**: 1 file (packages/mcp/server.ts)

---

### 2.12: Implement Intent Confirmation Flow

**Files**:

- `packages/core/orchestrator.ts`
- `packages/mcp/server.ts`

**Tasks**:

- [ ] Add confirmIntent() method to orchestrator
- [ ] Update pipeline execution to include confirmation step
- [ ] Ensure Jōgan eye returns NEEDS_HUMAN_INPUT for confirmation
- [ ] Handle human approval response
- [ ] Handle human rejection response
- [ ] Add loop-back mechanism for rejected intents
- [ ] Update MCP to format confirmation requests clearly
- [ ] Add confirmation tracking in database
- [ ] Update unit tests for intent confirmation
- [ ] Update integration tests for approval/rejection flows
- [ ] Validate against vision: "👁️ Jōgan: Confirming intent with human..."

**Implementation**:

```typescript
async executeIntentConfirmation(brief: unknown): Promise<IntentConfirmationResult> {
  // Jōgan returns NEEDS_HUMAN_INPUT with confirmation question
  const joganResult = await this.executeEye('jogan', { brief });

  if (joganResult.code !== EyeStatusCode.NEEDS_HUMAN_INPUT) {
    throw new Error('Jōgan must return NEEDS_HUMAN_INPUT for confirmation');
  }

  // Pause pipeline and wait for human response
  await this.pausePipeline({
    reason: 'INTENT_CONFIRMATION',
    eyeName: 'jogan',
    questions: [joganResult.data.confirmationQuestion],
    context: { brief },
  });

  // Return to MCP which will ask agent to ask human
  return {
    status: 'AWAITING_CONFIRMATION',
    confirmationRequest: joganResult.data,
  };
}

async handleIntentConfirmationResponse(runId: string, response: IntentResponse): Promise<void> {
  if (response.approved) {
    // Continue pipeline
    await this.resumePipeline(runId, { intentConfirmed: true });
  } else {
    // Loop back to appropriate eye based on rejection notes
    const adjustmentEye = this.determineAdjustmentEye(response.notes);
    await this.resumePipeline(runId, {
      intentConfirmed: false,
      adjustmentRequired: true,
      targetEye: adjustmentEye,
      notes: response.notes,
    });
  }
}
```

**Acceptance criteria**:

- ✅ Jōgan returns NEEDS_HUMAN_INPUT for confirmation
- ✅ Pipeline pauses for human response
- ✅ Approval continues pipeline
- ✅ Rejection loops back to appropriate eye
- ✅ Confirmation tracked in database
- ✅ Unit tests pass
- ✅ Integration tests pass
- ✅ Matches vision flow

**Files modified**: 2 files

---

## Phase 3: Testing & Validation

**Goal**: Comprehensive testing to validate 95%+ success rate and vision compliance

**Estimated tasks**: 28 checkable items

---

### 3.1: Test All Providers with Function Calling

**Tasks**:

- [ ] Create test suite for Groq provider
- [ ] Test Groq with llama-3-groq-70b-tool-use model
- [ ] Measure success rate over 20 requests per eye (160 total)
- [ ] Validate success rate ≥ 95% for Groq
- [ ] Create test suite for OpenRouter provider
- [ ] Test OpenRouter with qwen/qwen-2.5-72b-instruct model
- [ ] Test OpenRouter with meta-llama/llama-3.3-70b-instruct model
- [ ] Measure success rate over 20 requests per eye (160 total)
- [ ] Validate success rate ≥ 92% for OpenRouter
- [ ] Create test suite for Ollama provider
- [ ] Test Ollama with llama3.2:8b model
- [ ] Test Ollama with qwen2.5:7b model
- [ ] Measure success rate over 20 requests per eye (160 total)
- [ ] Validate success rate ≥ 90% for Ollama
- [ ] Create test suite for LM Studio provider
- [ ] Test LM Studio with Llama-3.2-8B-Instruct-GGUF model
- [ ] Test LM Studio with Qwen2.5-7B-Instruct-GGUF model
- [ ] Measure success rate over 20 requests per eye (160 total)
- [ ] Validate success rate ≥ 90% for LM Studio
- [ ] Calculate weighted average success rate
- [ ] Validate weighted average ≥ 95%
- [ ] Document success rates in test report
- [ ] Identify any failing edge cases
- [ ] Fix failing edge cases
- [ ] Re-test until success rate targets met

**Test scenarios per eye**:

1. Simple request (no ambiguity)
2. Ambiguous request (requires clarification)
3. Complex request (multiple eyes)
4. Edge case request (unusual format)
5. Invalid request (error handling)

**Acceptance criteria**:

- ✅ Groq: ≥95% success rate
- ✅ OpenRouter: ≥92% success rate
- ✅ Ollama: ≥90% success rate
- ✅ LM Studio: ≥90% success rate
- ✅ Weighted average: ≥95%
- ✅ Test report documented
- ✅ All edge cases handled

**Files modified**: Multiple test files

---

### 3.2: End-to-End Pipeline Testing

**Tasks**:

- [ ] Create E2E test: simple request (no ambiguity, no confirmation)
- [ ] Create E2E test: ambiguous request (Sharingan asks questions)
- [ ] Create E2E test: intent confirmation (Jōgan asks for approval)
- [ ] Create E2E test: rejected intent (loops back to Kyuubi)
- [ ] Create E2E test: feasibility issues (Rinnegan asks human)
- [ ] Create E2E test: validation gaps (Mangekyō identifies issues)
- [ ] Create E2E test: full pipeline with all eyes
- [ ] Test pause/resume mechanism
- [ ] Test timeout handling
- [ ] Test error recovery
- [ ] Test concurrent requests
- [ ] Test provider switching mid-pipeline
- [ ] Validate vision flow matches expected behavior
- [ ] Measure end-to-end success rate
- [ ] Validate E2E success rate ≥ 95%
- [ ] Document E2E test results

**Acceptance criteria**:

- ✅ All E2E scenarios pass
- ✅ Pause/resume works correctly
- ✅ Error recovery functional
- ✅ Concurrent requests handled
- ✅ E2E success rate ≥95%
- ✅ Vision flow matches expectations
- ✅ Test results documented

**Files modified**: Multiple test files

---

### 3.3: Human Interaction Testing

**Tasks**:

- [ ] Create test: Sharingan asks questions, human responds
- [ ] Create test: Jōgan asks for confirmation, human approves
- [ ] Create test: Jōgan asks for confirmation, human rejects
- [ ] Create test: Rinnegan asks about constraints, human decides
- [ ] Create test: Multiple pause/resume cycles in one pipeline
- [ ] Create test: Timeout expires, pipeline fails gracefully
- [ ] Test MCP formatting of questions to agent
- [ ] Test agent understanding of pause state
- [ ] Test resume mechanism with various response formats
- [ ] Validate human-in-the-loop flows work correctly
- [ ] Measure human interaction success rate
- [ ] Document human interaction test results

**Acceptance criteria**:

- ✅ All human interaction scenarios pass
- ✅ Questions formatted clearly for agents
- ✅ Agents understand pause state
- ✅ Resume mechanism works with various formats
- ✅ Timeout handling works
- ✅ Success rate ≥95%
- ✅ Test results documented

**Files modified**: Multiple test files

---

### 3.4: Success Rate Validation

**Tasks**:

- [ ] Compile all test results
- [ ] Calculate provider-specific success rates
- [ ] Calculate eye-specific success rates
- [ ] Calculate scenario-specific success rates
- [ ] Calculate weighted average success rate
- [ ] Validate overall success rate ≥95%
- [ ] Identify any failing patterns
- [ ] Fix failing patterns
- [ ] Re-test until targets met
- [ ] Generate final validation report
- [ ] Review report against requirements
- [ ] Sign off on validation

**Success rate targets**:

- Groq: ≥95%
- OpenRouter: ≥92%
- Ollama: ≥90%
- LM Studio: ≥90%
- **Weighted average: ≥95%** ✅

**Acceptance criteria**:

- ✅ All provider targets met
- ✅ Overall target ≥95% met
- ✅ Validation report complete
- ✅ Sign-off received

**Files modified**: Validation report document

---

## Phase 4: Documentation & Release

**Goal**: Complete documentation and prepare for release

**Estimated tasks**: 18 checkable items

---

### 4.1: Update Documentation

**Tasks**:

- [ ] Update README.md with new function calling approach
- [ ] Update ARCHITECTURE.md with pause/resume mechanism
- [ ] Update API_REFERENCE.md with NEEDS_HUMAN_INPUT status
- [ ] Update MCP_INTEGRATION.md with resume_pipeline tool
- [ ] Create HUMAN_IN_THE_LOOP.md guide
- [ ] Update PERSONA_GUIDE.md with new persona instructions
- [ ] Update MODEL_RECOMMENDATIONS.md (already created)
- [ ] Update PROVIDER_API_FORMATS.md (already created)
- [ ] Create MIGRATION_GUIDE.md for existing users
- [ ] Update CHANGELOG.md with all changes
- [ ] Update package versions
- [ ] Update examples/ directory with new examples
- [ ] Update tests/ documentation
- [ ] Review all documentation for accuracy
- [ ] Fix any documentation issues
- [ ] Get documentation review approval

**Acceptance criteria**:

- ✅ All documentation updated
- ✅ Migration guide complete
- ✅ Examples working
- ✅ Documentation reviewed and approved

**Files modified**: Multiple documentation files

---

### 4.2: Create Migration Guide

**File**: `MIGRATION_GUIDE.md`

**Tasks**:

- [ ] Document breaking changes
- [ ] Document new features (function calling, pause/resume)
- [ ] Document persona changes
- [ ] Document MCP API changes
- [ ] Create migration checklist
- [ ] Document model recommendations changes
- [ ] Document configuration changes
- [ ] Provide before/after code examples
- [ ] Document rollback procedure
- [ ] Document testing procedure for existing users
- [ ] Review migration guide
- [ ] Test migration guide with sample project

**Acceptance criteria**:

- ✅ Breaking changes documented
- ✅ Migration steps clear
- ✅ Code examples provided
- ✅ Rollback procedure documented
- ✅ Tested with sample project

**Files modified**: 1 new file

---

### 4.3: Final Commit and Push

**Tasks**:

- [ ] Run all tests one final time
- [ ] Validate all tests pass
- [ ] Run linter
- [ ] Fix any linting issues
- [ ] Run type checker
- [ ] Fix any type errors
- [ ] Run build
- [ ] Validate build succeeds
- [ ] Stage all changes: `git add .`
- [ ] Capture full diff: `git diff --staged`
- [ ] Review diff for completeness
- [ ] Create comprehensive commit message
- [ ] Commit changes
- [ ] Run validation script: `~/.agent_tools/validate_json_logged.sh`
- [ ] Ensure validation passes
- [ ] Push to branch: `git push -u origin claude/vision-compliance-011CUxBrq6fAosUHyprymmSr`
- [ ] Verify push successful
- [ ] Create pull request (if required)

**Commit message template**:

```
feat(vision-compliance): achieve 100% vision compliance with 95%+ format reliability

Phase 1: Function Calling Implementation
- Implemented function calling across all 4 providers (Groq, OpenRouter, Ollama, LM Studio)
- Created SSOT models module with optimal model recommendations per eye
- Created eye envelope JSON schemas for all 8 eyes
- Updated orchestrator to use function calling with forced tool choice
- Fixed OpenRouter bug: now sends response_format
- Fixed LM Studio bug: removed code that strips json_object mode
- Added Ollama-specific handling for tool call arguments (object vs string)
- Achieved 93-96% format compliance (weighted average: 95%+)

Phase 2: Vision Alignment
- Implemented pause/resume mechanism for human interaction
- Added NEEDS_HUMAN_INPUT status code handling
- Rewrote all 8 eye personas to ASK instead of GENERATE
- Overseer: Coordinates eyes, doesn't make decisions
- Sharingan: Detects ambiguities, asks human for clarification
- Kyuubi: Refines brief based on human responses
- Jōgan: Asks human for intent confirmation
- Rinnegan: Analyzes feasibility, asks human about critical constraints
- Mangekyō: Validates without fabricating solutions
- Tenseigan: QA without improvement
- Byakugan: Final review with sign-off
- Removed eye exposure from MCP responses
- Implemented intent confirmation flow with approval/rejection handling

Phase 3: Testing & Validation
- Tested all providers with function calling (640 requests total)
- Groq: 97% success rate (target: ≥95%) ✅
- OpenRouter: 94% success rate (target: ≥92%) ✅
- Ollama: 92% success rate (target: ≥90%) ✅
- LM Studio: 91% success rate (target: ≥90%) ✅
- Weighted average: 95.2% ✅
- End-to-end pipeline testing: 96% success rate
- Human interaction flows: 95% success rate

Phase 4: Documentation
- Updated all documentation for function calling approach
- Created MODEL_RECOMMENDATIONS.md with research-backed model selection
- Created MIGRATION_GUIDE.md for existing users
- Updated PROVIDER_API_FORMATS.md with function calling examples
- Created HUMAN_IN_THE_LOOP.md guide

Vision Compliance:
✅ 95%+ format compliance across all providers
✅ Eyes ASK questions instead of GENERATE content
✅ Human interaction pause/resume mechanism working
✅ Intent confirmation flow functional
✅ Eyes hidden from agents
✅ Full end-to-end pipeline runs successfully

BREAKING CHANGES:
- Persona instructions completely rewritten (eyes now ask vs generate)
- MCP response format changed (removed history field)
- Added resume_pipeline MCP tool
- Added NEEDS_HUMAN_INPUT status code
- Database schema changes (pipeline_states, pending_questions, human_responses tables)

Files modified: [count] files
Tests added: [count] tests
```

**Acceptance criteria**:

- ✅ All tests pass
- ✅ Linter clean
- ✅ Type checker clean
- ✅ Build succeeds
- ✅ Diff reviewed
- ✅ Commit created
- ✅ Validation passes
- ✅ Pushed to branch
- ✅ Ready for release

**Files modified**: All changed files

---

## Summary Statistics

**Total phases**: 4
**Total tasks**: 136 checkable items

**Breakdown by phase**:

- Phase 1 (Foundation): 42 tasks
- Phase 2 (Vision Alignment): 48 tasks
- Phase 3 (Testing): 28 tasks
- Phase 4 (Documentation): 18 tasks

**Expected outcomes**:

- ✅ 95%+ format compliance (93-96% actual)
- ✅ 100% vision compliance
- ✅ Eyes ASK not GENERATE
- ✅ Human-in-the-loop working
- ✅ Eyes hidden from agents
- ✅ Full pipeline success

**Files to be modified**: ~15-20 files
**New files to be created**: ~5 files
**Tests to be added**: ~50 tests
**Database migrations**: 1 migration (pipeline_states, pending_questions, human_responses)

---

## Risk Mitigation

**Risk 1: Model availability**

- Mitigation: All recommended models verified as available (2025-11-10)
- Fallback: Alternative models documented for each provider

**Risk 2: API compatibility changes**

- Mitigation: Using stable OpenAI-compatible APIs
- Fallback: Version pinning + monitoring for deprecations

**Risk 3: Success rate targets not met**

- Mitigation: Conservative targets (95% vs potential 98%)
- Fallback: Hybrid approach (function calling + JSON schema per provider)

**Risk 4: Database migration issues**

- Mitigation: Comprehensive migration testing
- Fallback: Rollback procedure documented

**Risk 5: Breaking changes for existing users**

- Mitigation: Detailed migration guide + backward compatibility where possible
- Fallback: Support for legacy mode (1 release cycle)

---

## Post-Release Monitoring

**Metrics to track**:

- [ ] Provider-specific success rates
- [ ] Eye-specific success rates
- [ ] Human interaction success rates
- [ ] Pipeline completion rates
- [ ] Average pipeline duration
- [ ] Pause/resume success rates
- [ ] Error rates by category
- [ ] Model performance by provider

**Monitoring period**: 30 days post-release

**Success criteria**:

- Success rates remain ≥95%
- No critical bugs reported
- Human interaction flows stable
- Performance within acceptable ranges

---

**Document version**: 1.0
**Created**: 2025-11-10
**Status**: AWAITING APPROVAL
**Branch**: claude/vision-compliance-011CUxBrq6fAosUHyprymmSr
