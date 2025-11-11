# Third Eye MCP - Complete Implementation Plan Analysis

**Date**: 2025-11-11
**Analysis by**: Claude (Sonnet 4.5)
**Scope**: Complete review of implementation plan against vision + conversation insights
**Status**: **COMPREHENSIVE OVERHAUL REQUIRED**

---

## Executive Summary

After deep analysis of 11 documentation files (10,615 lines) + our complete conversation, the current implementation plan has **CRITICAL GAPS** that prevent the vision from being realized.

### The Core Misalignment

**Current plan assumes**: Fixed linear pipeline with all eyes always running
**Actual vision requires**: Fully dynamic routing where Overseer decides which eyes to use per request

**This changes EVERYTHING.**

---

## Part 1: What Must Be ADDED to Implementation Plan

### 🚨 CRITICAL ADDITIONS (Vision Blockers)

#### A1. Dynamic Routing System (MISSING ENTIRELY)

**Current plan says**: "Overseer routes to specific eyes"
**What's missing**: HOW Overseer decides dynamically

**Must add**:

```typescript
// Dynamic Route Selection Algorithm
interface DynamicRouter {
  // Capability-based selection
  analyzeRequest(request: string): {
    requestType: 'new_task' | 'draft_review' | 'factual_question' | 'planning';
    contentDomain: 'text' | 'code' | 'plan' | 'mixed';
    complexity: 'simple' | 'moderate' | 'complex';
    capabilitiesNeeded: CapabilityTag[];
  };

  // Dynamic eye selection
  selectEyes(analysis: RequestAnalysis, availableEyes: Eye[]): {
    eyes: EyeName[];
    sequence: 'sequential' | 'parallel';
    reasoning: string;
  };

  // No fixed routes - pure capability matching
  matchCapabilities(needed: CapabilityTag[], available: Eye[]): Eye[];
}
```

**Implementation details needed**:
1. Overseer LLM prompt that returns dynamic route based on request
2. No hardcoded "if X then route to [Y, Z]" logic
3. Capability tag matching algorithm
4. Route optimization (skip unnecessary eyes)
5. Parallel vs sequential execution decisions

**Database changes**:
```sql
-- Add capability tags to eyes table
ALTER TABLE eyes ADD COLUMN capability_tags JSON NOT NULL DEFAULT '[]';

-- Store dynamic routing decisions for analytics
CREATE TABLE routing_decisions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  request_analysis JSON NOT NULL,
  selected_eyes JSON NOT NULL,
  reasoning TEXT NOT NULL,
  execution_mode TEXT NOT NULL, -- sequential | parallel
  created_at INTEGER NOT NULL
);
```

---

#### A2. Three Routing Modes (NEW REQUIREMENT from conversation)

**What's missing**: User choice between Dynamic/Constrained/Fixed

**Must add**:

```typescript
// Routing Modes
enum RoutingMode {
  FULLY_DYNAMIC = 'fully_dynamic',     // Overseer decides everything
  CONSTRAINED_DYNAMIC = 'constrained', // Overseer + user policies
  FIXED_TEMPLATE = 'fixed'             // User-defined exact sequence
}

// Routing Policies (for Constrained mode)
interface RoutingPolicy {
  id: string;
  name: string;
  mandatoryEyes: EyeName[];          // Always include these
  forbiddenEyes?: EyeName[];         // Never use these
  minValidationEyes?: number;        // Minimum validation steps
  securityRequired?: boolean;        // Must include security validation
  alwaysConfirmIntent?: boolean;     // Jōgan always required
  customConstraints?: Constraint[];
}

// Fixed Templates
interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  eyes: EyeName[];                   // Exact sequence
  strict: boolean;                   // No deviations allowed
  autoTriggerPattern?: string;       // Regex for automatic triggering
}
```

**UI components needed**:
1. `/pipelines` page - NOT showing default pipeline, showing capability matrix
2. Policy builder - Create/edit routing policies
3. Template builder - Visual pipeline designer for fixed templates
4. Mode selector - Choose Dynamic/Constrained/Fixed per session or global

**Database schema**:
```sql
CREATE TABLE routing_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  mandatory_eyes JSON NOT NULL,
  forbidden_eyes JSON,
  min_validation_eyes INTEGER,
  security_required BOOLEAN DEFAULT false,
  always_confirm_intent BOOLEAN DEFAULT false,
  custom_constraints JSON,
  is_active BOOLEAN DEFAULT true,
  created_at INTEGER NOT NULL
);

CREATE TABLE pipeline_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  eyes JSON NOT NULL,
  strict BOOLEAN DEFAULT true,
  auto_trigger_pattern TEXT,
  created_by TEXT,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
```

---

#### A3. Pause/Resume Mechanism (COMPLETELY MISSING)

**Current plan has**: AWAIT_INPUT status codes
**What's missing**: Actual implementation of pause/resume

**Must add**:

```typescript
// Pause/Resume State Management
interface PipelineState {
  sessionId: string;
  status: 'running' | 'paused_for_human' | 'paused_for_agent' | 'completed';
  currentEye: EyeName;
  pauseReason: 'clarification' | 'confirmation' | 'validation_failed';
  pendingQuestions?: Question[];
  pendingConfirmation?: Confirmation;
  resumeToken: string;  // For secure resume
}

// Question Queue
interface PendingQuestion {
  id: string;
  sessionId: string;
  eyeName: EyeName;
  questions: string[];
  context: Record<string, unknown>;
  status: 'pending' | 'answered' | 'expired';
  expiresAt: number;
}

// Resume Handler
async function resumePipeline(
  sessionId: string,
  humanResponse: HumanResponse
): Promise<PipelineResult> {
  // 1. Load pipeline state
  const state = await loadPipelineState(sessionId);

  // 2. Validate human response matches pending questions
  const validation = await validateHumanResponse(state, humanResponse);

  // 3. Resume from paused eye
  const result = await continueFromEye(state.currentEye, humanResponse);

  // 4. Update state
  await updatePipelineState(sessionId, 'running');

  return result;
}
```

**Database schema**:
```sql
CREATE TABLE pipeline_states (
  session_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  current_eye TEXT NOT NULL,
  pause_reason TEXT,
  pending_data JSON,
  resume_token TEXT NOT NULL,
  paused_at INTEGER,
  expires_at INTEGER
);

CREATE TABLE pending_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  eye_name TEXT NOT NULL,
  questions JSON NOT NULL,
  context JSON,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE human_responses (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  answers JSON NOT NULL,
  source TEXT NOT NULL, -- 'human' | 'agent'
  validated BOOLEAN DEFAULT false,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (question_id) REFERENCES pending_questions(id)
);
```

---

#### A4. Function Calling Implementation (CRITICAL for reliability)

**Current plan has**: JSON schema only
**Research shows**: Function calling = 95%+ success, JSON schema = 70-85%

**Must add**:

```typescript
// Per-provider function calling
interface EyeFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, PropertySchema>;
    required: string[];
  };
}

// Provider-specific implementations
class GroqFunctionProvider {
  async callEye(eye: Eye, input: Input): Promise<Envelope> {
    const response = await groq.chat.completions.create({
      model: 'llama-3-groq-70b-tool-use',
      messages: [...],
      tools: [createEyeFunction(eye)],
      tool_choice: { type: 'function', function: { name: eye.functionName } }
    });

    // Parse from tool_calls (NOT message.content)
    const result = response.choices[0].message.tool_calls[0].function.arguments;
    return JSON.parse(result);
  }
}

class OllamaSchemaProvider {
  async callEye(eye: Eye, input: Input): Promise<Envelope> {
    const response = await ollama.chat({
      model: 'qwen2.5:7b',
      messages: [...],
      format: { type: 'json', schema: eye.schema }, // Constrained generation = 100%
    });

    return JSON.parse(response.message.content);
  }
}
```

**Hybrid Strategy** (from research):
- **Groq**: Function calling with `llama-3-groq-70b-tool-use` (95-98%)
- **OpenRouter**: Function calling with tool-capable models (85-95%)
- **Ollama**: JSON Schema with constrained generation (100%)
- **LM Studio**: JSON Schema with grammar sampling (100%)

**Code changes needed**:
1. `packages/providers/` - Add function calling support to each provider
2. `packages/core/orchestrator.ts` - Route to function calling vs schema based on provider
3. `packages/eyes/schemas/` - Convert JSON schemas to function definitions
4. Response parsing - Handle `tool_calls` vs `message.content`

---

#### A5. Persona Instructions Overhaul (CRITICAL)

**Current personas say**: "Generate content", "Create brief", "Structure output"
**Vision requires**: "Ask questions", "Guide thinking", "Validate answers"

**Must rewrite ALL 8 personas**:

**Before (Kyuubi current)**:
```
## GUIDANCE Phase
Transform clarified requirements into structured brief.

Response:
{
  "data": {
    "structuredBrief": {
      "objective": "Create 500-word guide...",
      "audience": "Beginners...",
      ...
    }
  }
}
```

**After (Kyuubi corrected)**:
```
## GUIDANCE Phase
Your role: Guide the agent to think through structure by asking questions.
DO NOT create the brief yourself.

Questions to ask:
1. "What is the exact objective of this content?"
2. "Who is the target audience and what do they already know?"
3. "What format is most appropriate and why?"
4. "What are the must-have elements that define success?"

Response:
{
  "action": "ask_questions",
  "questions": [/* above questions */],
  "next": "wait_for_agent"
}
```

**Implementation**:
1. Rewrite all 8 persona files in `packages/db/defaults/personas.ts`
2. Separate guidance from validation phases (different personas)
3. Add examples of ASKING not GENERATING
4. Update persona guard validations

---

#### A6. Eye Invisibility (Currently Exposed)

**Current implementation**: MCP returns `history` with all eye envelopes
**Vision requires**: Agent never sees eyes

**Must add**:

```typescript
// MCP Response (Current - WRONG)
return {
  content: [{
    type: "text",
    text: JSON.stringify({
      status: "success",
      verdict: "APPROVED",
      history: result.results  // ❌ EXPOSES ALL EYES
    })
  }]
};

// MCP Response (Corrected)
return {
  content: [{
    type: "text",
    text: JSON.stringify({
      status: "success",
      verdict: "APPROVED",
      summary: "Analysis complete",
      data: result.finalResult,  // Only final output
      sessionId: result.sessionId,  // For developer monitoring
      portalUrl: `http://127.0.0.1:3300/monitor/${result.sessionId}`  // Dev only
    })
  }]
};
```

**Changes needed**:
1. Remove `history` from all MCP responses
2. Only return final result + session ID
3. Developers use portal URL to see eyes (not agent)

---

#### A7. Best-in-Class Pipeline Builder

**Current plan has**: Basic React Flow canvas
**Conversation requires**: Most professional best-in-class builder

**Must add**:

1. **Capability Matrix View** (new primary view):
   - Show all eyes with capability tags
   - Visual capability mapping (tags → eyes)
   - NOT a linear pipeline diagram

2. **Dynamic Route Visualizer**:
   - Show Overseer's decision-making in real-time
   - For each request, display: "Request → Analysis → Selected Route"
   - Reasoning explanation

3. **Three Builder Modes**:
   - **Dynamic Mode**: Show capability matrix only (no pipeline editing)
   - **Constrained Mode**: Policy builder UI (add constraints)
   - **Fixed Template Mode**: Visual pipeline editor (drag-and-drop)

4. **Policy Builder** (new component):
   - Visual constraint selector
   - Mandatory eyes: checkbox list
   - Min validation eyes: slider
   - Security required: toggle
   - Preview: "With these policies, Overseer might route..."

5. **Template Library** (new component):
   - Predefined templates: "Fast Code Review", "Research Article", "Security Audit"
   - Import/export JSON
   - Auto-trigger patterns: regex editor
   - Usage analytics per template

6. **Live Routing Decisions** (new panel):
   - Show each session's routing decision
   - Display: Request type → Capabilities needed → Eyes selected → Reasoning

**UI Components to create**:
```
apps/ui/src/components/pipeline-builder/
├── CapabilityMatrix.tsx           (NEW)
├── DynamicRouteVisualizer.tsx     (NEW)
├── PolicyBuilder.tsx              (NEW)
├── TemplateLibrary.tsx            (NEW)
├── TemplateDesigner.tsx           (UPDATE - add template mode)
├── LiveRoutingPanel.tsx           (NEW)
└── PipelineModeSelector.tsx       (NEW)
```

---

#### A8. Model Recommendations Per Eye

**Current plan has**: Generic model selection
**Research shows**: Different eyes need different model types

**Must add**:

```typescript
// Eye-optimized model mapping
const EYE_MODEL_MAP = {
  groq: {
    overseer: 'llama-3-groq-70b-tool-use',      // Routing
    sharingan: 'llama-3-groq-70b-tool-use',     // Ambiguity detection
    kyuubi: 'llama-3-groq-70b-tool-use',        // Structuring
    jogan: 'llama-3-groq-70b-tool-use',         // Intent
    rinnegan: 'llama-3-groq-70b-tool-use',      // Feasibility
    mangekyo: 'llama-3-groq-70b-tool-use',      // Code review
    tenseigan: 'llama-3-groq-70b-tool-use',     // Quality
    byakugan: 'llama-3-groq-70b-tool-use'       // Final review
  },
  openrouter: {
    overseer: 'meta-llama/llama-3.3-70b-instruct',        // Structured
    sharingan: 'qwen/qwen-2.5-72b-instruct',               // Reasoning
    kyuubi: 'meta-llama/llama-3.3-70b-instruct',          // Structured
    jogan: 'qwen/qwen-2.5-72b-instruct',                   // Reasoning
    rinnegan: 'deepseek/deepseek-r1-distill-llama-70b',   // Reasoning
    mangekyo: 'qwen/qwen-2.5-72b-instruct',                // Reasoning
    tenseigan: 'meta-llama/llama-3.3-70b-instruct',       // Structured
    byakugan: 'qwen/qwen-2.5-72b-instruct'                 // Reasoning
  },
  ollama: {
    overseer: 'llama3.2:8b',      // General purpose
    sharingan: 'qwen2.5:7b',       // Structured
    kyuubi: 'qwen2.5:7b',          // Structured
    jogan: 'qwen2.5:7b',           // Structured
    rinnegan: 'llama3.2:8b',       // General
    mangekyo: 'qwen2.5:7b',        // Structured
    tenseigan: 'qwen2.5:7b',       // Structured
    byakugan: 'qwen2.5:7b'         // Structured
  },
  lmstudio: {
    overseer: 'Llama-3.2-8B-Instruct-GGUF',
    sharingan: 'Qwen2.5-7B-Instruct-GGUF',
    kyuubi: 'Qwen2.5-7B-Instruct-GGUF',
    jogan: 'Qwen2.5-7B-Instruct-GGUF',
    rinnegan: 'Llama-3.2-8B-Instruct-GGUF',
    mangekyo: 'Qwen2.5-7B-Instruct-GGUF',
    tenseigan: 'Qwen2.5-7B-Instruct-GGUF',
    byakugan: 'Qwen2.5-7B-Instruct-GGUF'
  }
};
```

**UI component needed**:
- Model recommendation panel per eye
- Show reasoning: "Qwen excels at asking clarifying questions"
- Allow override to custom model (with warning)

---

#### A9. Intent Confirmation Flow (Implementation Missing)

**Current plan has**: Jōgan persona mentions confirmation
**What's missing**: Actual confirmation implementation

**Must add**:

```typescript
// Intent Confirmation
interface IntentConfirmation {
  id: string;
  sessionId: string;
  intentSummary: string;
  scope: string[];
  estimatedEffort: string;
  risks: string[];
  status: 'pending' | 'confirmed' | 'rejected';
  confirmedBy: 'human' | 'agent';
  confirmedAt?: number;
}

// Jōgan returns confirmation request
{
  "action": "request_confirmation",
  "confirmationPrompt": "I understand you want to create a 500-word palm care guide...",
  "scope": ["research existing care guides", "write 500 words", "include citations"],
  "estimatedEffort": "~15 minutes",
  "risks": ["may need additional plant science references"],
  "next": "wait_for_human"
}

// MCP pauses, agent asks human
"Before I start, please confirm this is what you want: [prompt]. Reply YES to confirm."

// Human confirms, agent resumes pipeline
resumePipeline(sessionId, { confirmed: true });
```

**Database schema**:
```sql
CREATE TABLE intent_confirmations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  intent_summary TEXT NOT NULL,
  scope JSON NOT NULL,
  estimated_effort TEXT NOT NULL,
  risks JSON NOT NULL,
  status TEXT NOT NULL,
  confirmed_by TEXT,
  confirmed_at INTEGER,
  created_at INTEGER NOT NULL
);
```

---

#### A10. Narrative Monitoring (Currently Missing Agent/Human Events)

**Current plan has**: Eye events only
**Vision shows**: Cinematic conversation view

**Must add**:

```typescript
// Conversation Events (not just eye events)
interface ConversationEvent {
  sessionId: string;
  type: 'overseer' | 'eye' | 'agent' | 'human' | 'system';
  speaker: string;
  message: string;
  icon: string;
  color: string;
  timestamp: number;
}

// Emit all participants
ws.broadcast(sessionId, {
  type: 'conversation_event',
  data: {
    speaker: 'sharingan',
    message: 'Detected ambiguity score 75/100, asking 4 questions',
    icon: '🔍',
    color: 'warning'
  }
});

ws.broadcast(sessionId, {
  type: 'conversation_event',
  data: {
    speaker: 'agent',
    message: 'Asking human for clarifications...',
    icon: '🤖',
    color: 'info'
  }
});

ws.broadcast(sessionId, {
  type: 'conversation_event',
  data: {
    speaker: 'human',
    message: 'Indoor palms, beginners, 500 words, Saudi Arabia',
    icon: '👤',
    color: 'success'
  }
});
```

**UI component**:
- Conversation timeline view (not just eye pipeline)
- Show agent/human messages interleaved with eye decisions

---

## Part 2: What Must Be REMOVED from Implementation Plan

### ❌ R1. Fixed Pipeline Assumptions

**Remove**:
- Any concept of "default pipeline"
- Linear flow diagrams showing all eyes in sequence
- Assumptions that all eyes run for every request
- Hardcoded routing rules like "code review always goes to Mangekyo"

**Why**: Vision requires fully dynamic routing

---

### ❌ R2. JSON-Only Approach

**Remove**:
- JSON Schema as the only structured output approach
- Current `response_format: { type: "json_object" }` code

**Replace with**: Hybrid approach (function calling for remote, schema for local)

---

### ❌ R3. Content Generation Personas

**Remove**:
- All examples showing eyes generating content
- Instructions telling eyes to "create", "generate", "structure" content
- Response examples with fully-formed briefs/templates/plans

**Replace with**: Examples showing eyes asking questions

---

### ❌ R4. Single-Phase Personas

**Remove**:
- Combined guidance+validation personas
- Single persona prompt containing both phases

**Replace with**: Separate personas per phase (e.g., `sharingan_guidance.ts`, `sharingan_validation.ts`)

---

### ❌ R5. Eye Exposure in MCP Responses

**Remove**:
- `history` field in MCP responses
- Any eye names/details visible to agent
- Tool descriptions mentioning "Overseer", "Sharingan", etc.

**Replace with**: Generic descriptions, session ID for dev monitoring only

---

### ❌ R6. Static Model Configuration

**Remove**:
- Single model per provider
- No differentiation between eyes

**Replace with**: Eye-optimized model recommendations

---

### ❌ R7. Sync-Only Execution

**Remove**:
- Assumption that pipeline always runs synchronously
- No pause/resume consideration

**Replace with**: Async state machine with pause/resume support

---

### ❌ R8. Order Guard (Currently Bypassed)

**Remove or Fix**:
- Current order guard that's disabled for auto-router
- Sequential order enforcement

**Replace with**: Dynamic dependency resolution (only enforce actual dependencies, not fixed order)

---

## Part 3: Complete Corrected Implementation Plan

### Phase 1: Foundation Fixes (Week 1)

#### Day 1-2: Dynamic Routing Core

**Tasks**:
1. Implement dynamic route selection algorithm
2. Add capability tags to eyes table
3. Create routing decisions table
4. Write Overseer persona for dynamic routing (not fixed routes)
5. Test: Request → Overseer → Dynamic route selection

**Acceptance criteria**:
- Overseer can analyze request and select eyes dynamically
- No hardcoded routes
- Routing decision logged with reasoning

---

#### Day 3-4: Function Calling Implementation

**Tasks**:
1. Add function calling to Groq provider
2. Add function calling to OpenRouter provider
3. Keep JSON Schema for Ollama (constrained generation)
4. Keep JSON Schema for LM Studio (grammar sampling)
5. Update response parsing to handle both formats

**Acceptance criteria**:
- 95%+ format success rate on Groq
- 100% format success rate on Ollama/LM Studio
- All eyes work with new format

---

#### Day 5-7: Persona Overhaul

**Tasks**:
1. Rewrite all 8 personas to ASK not GENERATE
2. Separate guidance from validation phases
3. Update examples to show question-asking behavior
4. Remove content generation examples

**Acceptance criteria**:
- All personas instruct asking questions
- No examples of content generation
- Separate guidance and validation persona files

---

### Phase 2: Pause/Resume & Confirmation (Week 2)

#### Day 8-10: Pause/Resume Mechanism

**Tasks**:
1. Create pipeline states table
2. Create pending questions table
3. Create human responses table
4. Implement pause handler (stores state)
5. Implement resume handler (loads state, continues)
6. Update orchestrator to handle AWAIT_INPUT status

**Acceptance criteria**:
- Pipeline can pause when eye returns AWAIT_INPUT
- MCP returns questions to agent
- Agent can resume with answers
- Pipeline continues from paused point

---

#### Day 11-12: Intent Confirmation

**Tasks**:
1. Create intent confirmations table
2. Implement Jōgan confirmation flow
3. Update MCP to handle confirmation pause
4. Track confirmation source (human vs agent)

**Acceptance criteria**:
- Jōgan asks for human confirmation
- Pipeline pauses until confirmed
- Confirmation stored with source

---

#### Day 13-14: Eye Invisibility

**Tasks**:
1. Remove `history` from MCP responses
2. Only return final result + session ID
3. Update tool descriptions to remove eye mentions
4. Ensure agent never sees internal structure

**Acceptance criteria**:
- Agent receives generic responses only
- Developers can still monitor via portal
- No eye names in agent-visible output

---

### Phase 3: Three Routing Modes (Week 3)

#### Day 15-17: Routing Policies (Constrained Dynamic Mode)

**Tasks**:
1. Create routing policies table
2. Implement policy validation logic
3. Update Overseer to respect policies
4. Create policy builder UI
5. Add policy testing tool

**Acceptance criteria**:
- User can create policies (mandatory eyes, constraints)
- Overseer routes within policy bounds
- Reasoning explains policy compliance

---

#### Day 18-19: Fixed Templates

**Tasks**:
1. Create pipeline templates table
2. Implement template executor (bypasses Overseer)
3. Create template designer UI
4. Add auto-trigger pattern matching
5. Template import/export

**Acceptance criteria**:
- User can create fixed pipeline templates
- Templates execute exact sequence
- Auto-trigger works based on regex

---

#### Day 20-21: Mode Selection & UI Integration

**Tasks**:
1. Create mode selector component
2. Add mode to session settings
3. Integrate three modes into `/pipelines` page
4. Add mode analytics

**Acceptance criteria**:
- User can choose Dynamic/Constrained/Fixed per session
- UI adapts to selected mode
- Analytics track which mode performs best

---

### Phase 4: Best-in-Class Pipeline Builder (Week 4)

#### Day 22-24: Capability Matrix & Dynamic Visualizer

**Tasks**:
1. Create CapabilityMatrix component
2. Create DynamicRouteVisualizer component
3. Create LiveRoutingPanel component
4. Update `/pipelines` page to show capabilities (not fixed pipeline)

**Acceptance criteria**:
- Users see capability matrix as primary view
- Live routing decisions displayed per session
- No "default pipeline" diagram

---

#### Day 25-26: Policy Builder UI

**Tasks**:
1. Create PolicyBuilder component
2. Add constraint selectors (checkboxes, sliders, toggles)
3. Add policy preview ("With these constraints, Overseer might...")
4. Policy save/load/edit/delete

**Acceptance criteria**:
- Intuitive visual policy creation
- Real-time preview of policy effects
- Policy library management

---

#### Day 27-28: Template Library & Designer

**Tasks**:
1. Create TemplateLibrary component
2. Create TemplateDesigner component (visual pipeline editor)
3. Add predefined templates (Fast Code Review, Research Article, Security Audit)
4. Template import/export (JSON)
5. Usage analytics per template

**Acceptance criteria**:
- Users can browse template library
- Users can create custom templates visually
- Import/export works
- Popular templates highlighted

---

### Phase 5: Model Recommendations & Optimization (Week 5)

#### Day 29-30: Eye-Specific Model Mapping

**Tasks**:
1. Implement `EYE_MODEL_MAP` with researched recommendations
2. Add model recommendation explanations
3. Create model override UI with warnings
4. Add success rate tracking per model per eye

**Acceptance criteria**:
- Each eye uses optimized model
- Users see reasoning for recommendations
- Can override with custom models
- Analytics show success rates

---

#### Day 31-32: Narrative Monitoring

**Tasks**:
1. Add conversation events (not just eye events)
2. Track agent messages
3. Track human messages
4. Create conversation timeline UI
5. Update WebSocket events

**Acceptance criteria**:
- Monitor shows full conversation (overseer, eyes, agent, human)
- Cinematic narrative view
- Timestamps and icons

---

#### Day 33-35: Testing & Polish

**Tasks**:
1. End-to-end test: Palm care article scenario
2. End-to-end test: Code review scenario
3. End-to-end test: Planning scenario
4. Performance testing (parallel vs sequential)
5. Bug fixes and polish

**Acceptance criteria**:
- All three scenarios work end-to-end
- No pipeline failures
- 95%+ format success rate
- Human-in-the-loop works correctly

---

## Part 4: Database Schema Changes

### New Tables

```sql
-- Dynamic routing decisions
CREATE TABLE routing_decisions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  request_analysis JSON NOT NULL,
  selected_eyes JSON NOT NULL,
  reasoning TEXT NOT NULL,
  execution_mode TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Routing policies
CREATE TABLE routing_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  mandatory_eyes JSON NOT NULL,
  forbidden_eyes JSON,
  min_validation_eyes INTEGER,
  security_required BOOLEAN DEFAULT false,
  always_confirm_intent BOOLEAN DEFAULT false,
  custom_constraints JSON,
  is_active BOOLEAN DEFAULT true,
  created_at INTEGER NOT NULL
);

-- Pipeline templates
CREATE TABLE pipeline_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  eyes JSON NOT NULL,
  strict BOOLEAN DEFAULT true,
  auto_trigger_pattern TEXT,
  created_by TEXT,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Pipeline states (for pause/resume)
CREATE TABLE pipeline_states (
  session_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  current_eye TEXT NOT NULL,
  pause_reason TEXT,
  pending_data JSON,
  resume_token TEXT NOT NULL,
  paused_at INTEGER,
  expires_at INTEGER
);

-- Pending questions
CREATE TABLE pending_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  eye_name TEXT NOT NULL,
  questions JSON NOT NULL,
  context JSON,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Human responses
CREATE TABLE human_responses (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  answers JSON NOT NULL,
  source TEXT NOT NULL,
  validated BOOLEAN DEFAULT false,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (question_id) REFERENCES pending_questions(id)
);

-- Intent confirmations
CREATE TABLE intent_confirmations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  intent_summary TEXT NOT NULL,
  scope JSON NOT NULL,
  estimated_effort TEXT NOT NULL,
  risks JSON NOT NULL,
  status TEXT NOT NULL,
  confirmed_by TEXT,
  confirmed_at INTEGER,
  created_at INTEGER NOT NULL
);

-- Conversation events
CREATE TABLE conversation_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  speaker TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  created_at INTEGER NOT NULL
);
```

### Modified Tables

```sql
-- Add capability tags to eyes
ALTER TABLE eyes ADD COLUMN capability_tags JSON NOT NULL DEFAULT '[]';

-- Add routing mode to sessions
ALTER TABLE sessions ADD COLUMN routing_mode TEXT NOT NULL DEFAULT 'fully_dynamic';
ALTER TABLE sessions ADD COLUMN policy_id TEXT;
ALTER TABLE sessions ADD COLUMN template_id TEXT;
```

---

## Part 5: File Structure Changes

### New Files

```
packages/core/
├── dynamic-router.ts               (NEW - dynamic routing logic)
├── policy-validator.ts             (NEW - validates policies)
├── template-executor.ts            (NEW - executes fixed templates)
├── pause-resume-manager.ts         (NEW - pause/resume state)
└── models.ts                       (NEW - model recommendations)

packages/db/defaults/
├── personas-guidance/              (NEW - guidance-phase personas)
│   ├── overseer-guidance.ts
│   ├── sharingan-guidance.ts
│   └── ...
├── personas-validation/            (NEW - validation-phase personas)
│   ├── mangekyo-validation.ts
│   ├── tenseigan-validation.ts
│   └── ...
└── policies.ts                     (NEW - default policies)
└── templates.ts                    (NEW - predefined templates)

packages/providers/
├── groq/groq-functions.ts          (NEW - function calling)
├── openrouter/openrouter-functions.ts  (NEW)
├── ollama/ollama-schema.ts         (UPDATE - constrained gen)
└── lmstudio/lmstudio-schema.ts     (UPDATE - grammar sampling)

apps/ui/src/components/pipeline-builder/
├── CapabilityMatrix.tsx            (NEW)
├── DynamicRouteVisualizer.tsx      (NEW)
├── PolicyBuilder.tsx               (NEW)
├── TemplateLibrary.tsx             (NEW)
├── TemplateDesigner.tsx            (UPDATE)
├── LiveRoutingPanel.tsx            (NEW)
├── PipelineModeSelector.tsx        (NEW)
└── ConversationTimeline.tsx        (NEW)
```

### Files to Modify

```
packages/core/
├── orchestrator.ts                 (UPDATE - add pause/resume)
├── auto-router.ts                  (UPDATE - use dynamic router)
└── persona-guards.ts               (UPDATE - add all eyes)

packages/mcp/
└── server.ts                       (UPDATE - remove history, add function calling)

packages/db/
└── schema.ts                       (UPDATE - add new tables)
└── migrations/                     (ADD - new migration files)
```

---

## Part 6: Testing Strategy

### Integration Tests

1. **Dynamic Routing Test**:
   - Input: Various request types
   - Expected: Overseer selects different eyes per type
   - Verify: No fixed routes

2. **Pause/Resume Test**:
   - Input: Ambiguous request
   - Expected: Pipeline pauses with questions
   - Action: Provide answers
   - Expected: Pipeline resumes from pause point

3. **Intent Confirmation Test**:
   - Input: Content creation request
   - Expected: Jōgan asks for confirmation
   - Action: Confirm
   - Expected: Pipeline continues

4. **Three Modes Test**:
   - Test Dynamic mode: Overseer decides
   - Test Constrained mode: Respects policies
   - Test Fixed template: Executes exact sequence

5. **Function Calling Test**:
   - Test Groq: 95%+ success rate
   - Test OpenRouter: 85%+ success rate
   - Test Ollama: 100% success rate
   - Test LM Studio: 100% success rate

---

## Part 7: Migration Path

### For Existing Users

1. **Database Migration**:
   - Run new migrations (add new tables)
   - Migrate existing sessions to new format
   - Add default capability tags to eyes

2. **Persona Migration**:
   - Backup old personas
   - Deploy new question-asking personas
   - Notify users of behavior change

3. **UI Migration**:
   - Update `/pipelines` page (remove fixed pipeline view)
   - Add capability matrix as default
   - Show migration guide: "Pipelines now dynamic"

4. **Mode Selection**:
   - Default to "Fully Dynamic" for new users
   - Keep existing users on "Constrained Dynamic" (preserve behavior)
   - Offer opt-in to new dynamic mode

---

## Summary of Changes

### Critical Additions (10)
1. ✅ Dynamic routing system
2. ✅ Three routing modes (Dynamic/Constrained/Fixed)
3. ✅ Pause/resume mechanism
4. ✅ Function calling implementation
5. ✅ Persona instructions overhaul
6. ✅ Eye invisibility fixes
7. ✅ Best-in-class pipeline builder
8. ✅ Model recommendations per eye
9. ✅ Intent confirmation flow
10. ✅ Narrative monitoring

### Critical Removals (8)
1. ❌ Fixed pipeline assumptions
2. ❌ JSON-only approach
3. ❌ Content generation personas
4. ❌ Single-phase personas
5. ❌ Eye exposure in MCP responses
6. ❌ Static model configuration
7. ❌ Sync-only execution
8. ❌ Order guard bypass

### Database Changes
- 8 new tables
- 3 table modifications
- Full migration scripts needed

### File Changes
- 20+ new files
- 10+ files to modify
- Persona structure reorganization

### Timeline
- **Week 1**: Foundation fixes
- **Week 2**: Pause/resume & confirmation
- **Week 3**: Three routing modes
- **Week 4**: Pipeline builder
- **Week 5**: Model optimization & testing

**Total**: 5 weeks to complete vision

---

## Next Steps

1. **Review this analysis** - Confirm all additions/removals are correct
2. **Prioritize phases** - Which week to start first?
3. **Create detailed tickets** - Break down each day into tasks
4. **Assign resources** - Who works on what?
5. **Start implementation** - Begin Week 1, Day 1

**This plan transforms Third Eye from POC to production-ready vision-compliant system.**

---

**End of Analysis**
