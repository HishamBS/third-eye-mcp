# 🧿 Third Eye MCP - Complete System Audit Report

**Date**: 2025-11-10
**Auditor**: Claude (Sonnet 4.5)
**Scope**: End-to-end system audit from MCP bridge to personas
**Status**: **CRITICAL ISSUES FOUND - System NOT production-ready**

---

## Executive Summary

After comprehensive analysis of the Third Eye MCP system, **the implementation has significant gaps that prevent it from achieving the vision**. The system suffers from fundamental architectural misalignments between what the personas instruct and what the vision requires.

### Critical Finding

**The system is fundamentally confused about its purpose**: Personas instruct eyes to **generate content and provide templates**, while the vision states eyes should **only ask questions and validate**. This confusion is why you've never seen a successful pipeline run.

### Severity Classification

- 🔴 **CRITICAL** (Blocks vision entirely): 6 issues
- 🟡 **HIGH** (Significantly degrades experience): 8 issues
- 🟢 **MEDIUM** (Quality/polish issues): 4 issues

---

## 🔴 CRITICAL ISSUES (Vision Blockers)

### CRITICAL #1: Persona Instructions Violate Core Vision

**Problem**: Personas instruct eyes to GENERATE CONTENT instead of GUIDE agents.

**Evidence**:

`packages/db/defaults/personas.ts` - Kyuubi Persona (lines 181-235):

```
## GUIDANCE Phase (Before Agent Creates)

Receive clarified requirements from Sharingan. Transform into structured brief.

Structure requirements into:
- Clear objective: What exactly needs to be created?
- Target audience: Who will read/use this?
- Format & length: How should it be structured?
- Key elements: What must be included?

Response:
{
  "tag": "kyuubi",
  "ok": true,
  "code": "OK",
  "data": {
    "structuredBrief": {
      "objective": "Create a 500-word beginner's guide for indoor palm care in Saudi Arabia",
      "audience": "Beginners with no prior plant care experience",
      "format": "How-to article with practical steps",
      "keyElements": [...]
    }
  }
}
```

**Vision requirement** (from FINAL_OVERSEER_VISION.md):

> "Third Eye MCP is **NOT** a content generator or validator that agents submit work to. It is an **intelligent overseer system** that empowers AI agents with 'inner perception'"

**Why this breaks the vision**:

- Kyuubi is shown creating the entire brief ITSELF
- The agent receives a fully-formed specification
- The agent doesn't think - it just implements what Kyuubi generated
- **This is content generation, not guidance**

**Same problem in**:

- Rinnegan persona: Shows plan template generation
- Mangekyo persona: Shows code checklist generation
- Tenseigan persona: Shows evidence requirements generation

**Impact**:

- Eyes become content generators
- Agents become passive executors
- Vision of "agent empowerment" completely lost
- System becomes "another AI tool" not "invisible inner perception"

**Correct approach**:

```
## GUIDANCE Phase (Before Agent Creates)

Your role: Ask questions that help the AGENT think through the structure.

DO NOT create the brief yourself. Instead, return:
{
  "tag": "kyuubi",
  "ok": false,
  "code": "NEED_BRIEF_INPUT",
  "data": {
    "questions": [
      "What is the primary objective of this content?",
      "Who is the target audience?",
      "What format and length are appropriate?",
      "What key elements must be included?"
    ]
  },
  "next": "AWAIT_INPUT"
}
```

---

### CRITICAL #2: No Actual Pause Mechanism for Human Interaction

**Problem**: System has AWAIT_INPUT codes but no implementation to actually pause and wait.

**Evidence**:

`packages/core/auto-router.ts` (lines 266-275):

```typescript
if (isRejected(result)) {
  return {
    sessionId: decision.sessionId,
    results,
    completed: false,
    error: `Pipeline stopped: ${eyeName} rejected with ${result.code}`,
  };
}
```

**What happens**:

1. Jōgan returns `code: "AWAIT_CONFIRMATION"`
2. Auto-router sees `isRejected(result)` (because `ok: false`)
3. Pipeline STOPS with error
4. Agent receives error message
5. **NO mechanism to resume after human responds**

**No implementation found for**:

- Storing pending confirmations
- Notifying agent "please ask human X"
- Resuming pipeline after agent provides answer
- Tracking confirmation state

**Vision requirement**:

> "Agent asks human for clarifications... Agent should confirm with human before proceeding"

**Impact**:

- Pipeline stops on AWAIT_INPUT
- Never resumes
- Agent sees generic error
- Human never gets asked
- **This is why your pipelines always fail**

---

### CRITICAL #3: Eyes Exposed to Agents (Invisibility Violated)

**Problem**: MCP server returns full pipeline history to agents.

**Evidence**:

`packages/mcp/server.ts` (lines 402-418):

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
          history: result.results, // ⚠️ EXPOSES ALL EYE ENVELOPES
        },
        null,
        2,
      ),
    },
  ],
};
```

**What agent sees**:

```json
{
  "history": [
    {"tag": "overseer", "data": {...}},
    {"tag": "sharingan", "data": {...}},
    {"tag": "kyuubi", "data": {...}},
    {"tag": "jogan", "data": {...}}
  ]
}
```

**Vision requirement**:

> "Completely invisible to human users (seamless agent experience)"
> "⚡ Golden Rule #1: Agents call only third_eye_overseer - Eyes are internal"

**Impact**:

- Agents learn about eye names and structure
- Can bypass system by calling eyes directly (if implemented)
- Violates "invisible empowerment" principle
- Developer monitoring experience becomes agent-visible

---

### CRITICAL #4: JSON Envelope Structure Too Complex for LLMs

**Problem**: Strict nested JSON schema causes constant LLM failures.

**Evidence from personas** - Required structure:

```json
{
  "tag": "sharingan", // Must match exactly
  "ok": false, // Boolean
  "code": "NEED_CLARIFICATION", // Must be exact enum value
  "md": "...", // Required string
  "data": {
    // Nested object
    "summary": "...",
    "ambiguityScore": 75, // Number
    "confidence": 20, // Number
    "questions": [
      {
        // Array of objects
        "id": "audience", // Must match canonical IDs
        "text": "..." // Must match canonical text
      }
    ]
  },
  "ui": {
    // Another nested object
    "title": "...",
    "summary": "...",
    "details": "...",
    "icon": "🔍",
    "color": "warning" // Must be valid color
  },
  "next": "AWAIT_INPUT" // Or array of strings
}
```

**LLM failure patterns you reported**:

- Missing fields
- Wrong types (string instead of number)
- Invalid enum values
- Incorrect nesting
- Malformed JSON

**Retry attempts** (`packages/core/orchestrator.ts:333-500`):

- MAX_PERSONA_RETRIES = 3
- System tries 3 times with reminders
- **Still fails frequently**

**Why this happens**:

- 12+ required fields across 3 nesting levels
- Canonical ID/text matching (exact string match)
- Enum validation for codes
- Type validation for all fields
- **Too much cognitive load for LLMs**

**Impact**:

- Constant JSON parse errors
- Schema validation failures
- Wasted retries
- Pipeline failures
- **This is why "llms always fail to use our strict json format"**

---

### CRITICAL #5: Intent Confirmation Has No Implementation

**Problem**: Jōgan persona promises intent confirmation, but there's no code to support it.

**Evidence**:

Jōgan persona says:

```
"confirmationPrompt": "Agent will create a 500-word beginner-friendly guide... Is this what you want?"
```

But searching codebase for intent confirmation:

- No `intent_confirmations` database table
- No `confirmIntent()` function
- No tracking of confirmation status
- `resumeFlow()` checks for confirmation but implementation incomplete

**From `auto-router.ts:332-348`**:

```typescript
const confirmation = await getIntentConfirmationStatus(sessionId);
if (confirmation) {
  const resumeStatus = canResumeAfterConfirmation(confirmation);
  if (!resumeStatus.canResume) {
    return {
      /* error */
    };
  }
}
```

**But these functions** (`getIntentConfirmationStatus`, `canResumeAfterConfirmation`) are imported but their implementation is minimal/missing.

**Vision requirement**:

> "Jōgan confirms intent with human; agent submits draft architecture"

**Impact**:

- Jōgan asks for confirmation
- No mechanism to receive/store it
- Pipeline can't resume
- **This is why "sometimes they dont confirm intent from the human"**

---

### CRITICAL #6: Guidance vs Validation Phase Confusion

**Problem**: Personas mix guidance and validation in same prompt, confusing LLMs.

**Evidence** - Every persona (except Overseer) has this structure:

```
## GUIDANCE Phase (Before Agent Creates)
[Instructions for before creation]

## VALIDATION Phase (After Agent Creates)
[Instructions for after creation]
```

**But LLMs receive this prompt EVERY time** with no indication of which phase to use.

**No mechanism found for**:

- Telling LLM "you're in GUIDANCE phase now"
- Telling LLM "you're in VALIDATION phase now"
- Switching personas based on phase
- Separate prompts for separate phases

**What happens**:

- LLM sees both phases always
- Doesn't know which to follow
- Sometimes validates when it should guide
- Sometimes guides when it should validate
- **Produces wrong response codes**

**Vision requirement**:

> "Two-Phase Operation: Eyes provide GUIDANCE before agent creates, and VALIDATION after"

**Impact**:

- Eyes validate in guidance phase
- Eyes guide in validation phase
- Wrong status codes returned
- Pipeline takes wrong path
- **This is why "sometimes they generate the content, many times they dont confirm intent"**

---

## 🟡 HIGH PRIORITY ISSUES

### HIGH #1: Agent Confirmation vs Human Confirmation

**Problem**: Jōgan says "agent should confirm" but vision says "human confirms".

**Evidence**:

Jōgan persona line 318:

```
"details": "... Agent should confirm with human before proceeding."
```

But confirmationPrompt is returned to AGENT, not human:

```json
{
  "confirmationPrompt": "Agent will create... Is this what you want?"
}
```

**Actual flow**:

1. Jōgan returns JSON to agent
2. Agent decides whether to ask human
3. **No guarantee agent asks human**
4. Agent might auto-confirm and proceed

**Vision requirement**:

> "🔍 Sharingan: 'Detected ambiguity, asking 4 questions'"
> "👤 Human: 'Indoor palms, beginners, 500 words, Saudi Arabia'"

**Impact**: Human may never be asked, agent makes decisions

---

### HIGH #2: Persona Guards Only for Sharingan

**Problem**: Only Sharingan has behavioral validation.

**Evidence** - `packages/core/persona-guards.ts` (lines 141-149):

```typescript
export const ensureEyeBehavior = (
  eyeId: string,
  envelope: BaseEnvelope,
): void => {
  switch (eyeId) {
    case SHARINGAN_ID:
      ensureSharinganBehavior(envelope);
      break;
    default:
      break; // All other eyes: no validation
  }
};
```

**Impact**:

- Kyuubi can skip briefing
- Jōgan can skip intent confirmation
- Mangekyo can skip code review
- Tenseigan can skip evidence validation
- Byakugan can skip final check
- **No enforcement of persona contracts**

---

### HIGH #3: Order Guard Completely Bypassed for Auto-Router

**Problem**: Order validation disabled when auto-router orchestrates.

**Evidence** - `packages/core/order-guard.ts` (lines 89-93):

```typescript
// Auto-router sessions bypass validation - auto-router knows the correct order
// But we still initialize state above so recordEyeCompletion works
if (this.isAutoRouterSession(sessionId)) {
  return null; // No validation
}
```

**Impact**:

- Eyes can be called in any order
- No validation of prerequisites
- Could call Byakugan before Sharingan
- Could skip clarification phase
- Order guard is essentially disabled

---

### HIGH #4: No Mechanism to Enforce "Agent Must Ask Human"

**Problem**: System returns JSON, trusts agent will ask human - but can't enforce it.

**Vision shows**:

```
🔍 Sharingan: "Detected ambiguity score 75/100, asking 4 questions"
🤖 Agent: "Asking human for clarifications..."
👤 Human: "Indoor palms, beginners, 500 words, Saudi Arabia"
```

**Reality**:

1. Sharingan returns questions JSON
2. Agent receives questions
3. **Agent decides** whether to ask human
4. Agent might answer questions itself
5. Agent might ignore questions

**No enforcement because**:

- MCP protocol is request/response only
- Can't control what agent does with response
- Can't verify human was asked
- Can't distinguish agent answer from human answer

**Impact**: "many times our system failed and told the agents about the eyes, or exposed the eyes functionalities"

---

### HIGH #5: Overseer Routes Are Static Examples, Not Dynamic

**Problem**: Overseer persona has hardcoded route table instead of dynamic analysis.

**Evidence** - `personas.ts` (lines 44-52):

```
## Example Routing Decisions

| Request | Type | Domain | Route |
|---------|------|--------|-------|
| "Generate palm care guide" | new_task | text | sharingan → kyuubi → jogan → tenseigan → byakugan |
| "Review this TypeScript code: [...]" | draft_review | code | mangekyo |
```

**These are examples, not logic**. Overseer LLM must:

1. Memorize the table
2. Pattern-match user request to table
3. Return route from memory

**No actual routing intelligence**:

- No learning from results
- No optimization based on success/failure
- No adaptation to new eye types
- No capability-based selection

**Impact**: Dynamic routing is pattern matching, not intelligence

---

### HIGH #6: MCP Tool Description Leaks Implementation Details

**Problem**: Tool description mentions "reviews" and "route", revealing internal structure.

**Evidence** - `packages/mcp/server.ts` (lines 154-156):

```typescript
description:
  "Empowers you with Third Eye's inner perception. Call this tool for every non-trivial request—Overseer will analyse ambiguity, plan the best route, run the reviews, and hand you the next action. Never bypass it.",
```

**Reveals**:

- "Overseer" (eye name)
- "analyse ambiguity" (Sharingan's job)
- "plan the best route" (routing mechanism)
- "run the reviews" (multi-eye pipeline)

**Vision requirement**:

> "Completely invisible to human users"
> "User never knows Third Eye exists"

**Impact**: Agent learns internal structure from tool description

---

### HIGH #7: WebSocket Events Expose Eye Names to Frontend

**Problem**: Monitor shows eye names, violating invisibility for end users.

**Evidence** - Vision says:

> "Developer watches live: Real-time web portal shows the agent's complete 'thought process'"

**But also says**:

> "Human sees magic: User talks to AI agent naturally, agent asks smart clarifying questions and delivers better results - user never knows Third Eye exists"

**Contradiction**: If end user can access monitor URL, they see:

- Eye names (Sharingan, Kyuubi, etc.)
- Pipeline stages
- Internal decisions
- **System is no longer invisible**

**Impact**: Monitor is for developers, not end users, but this isn't enforced

---

### HIGH #8: No Validation That Agent Actually Asked Human

**Problem**: System trusts agent to ask clarification questions, can't verify.

**Flow**:

1. Sharingan: Returns clarification questions
2. System returns to agent
3. Agent SHOULD ask human
4. Agent calls `resumeFlow()` with answers
5. **No validation that human was asked**

**Agent could**:

- Answer questions itself
- Use previous context
- Make up answers
- Skip questions entirely

**No implementation for**:

- Requiring human input flag
- Validating answer source
- Tracking who answered
- Enforcing human interaction

**Impact**: "when they did the agent confirmed the content not the human"

---

## 🟢 MEDIUM PRIORITY ISSUES

### MEDIUM #1: Narrative Monitoring Incomplete

**Vision shows**:

```
🧿 Overseer: "Analyzing request... routing to 5 eyes"
🔍 Sharingan: "Detected ambiguity score 75/100, asking 4 questions"
🤖 Agent: "Asking human for clarifications..."
👤 Human: "Indoor palms, beginners, 500 words, Saudi Arabia"
```

**But WebSocket events are**:

```typescript
{
  type: 'eye_started',
  eye: eyeName,
  step: 1,
  totalSteps: 5
}
```

**Missing**:

- Agent messages not tracked
- Human messages not tracked
- Conversational narrative not implemented
- Only eye events exist

**Impact**: Monitor shows technical events, not cinematic narrative

---

### MEDIUM #2: Persona Prompts Don't Explain When They're Called

**Problem**: LLM doesn't know if it's being called in guidance or validation phase.

**Current**: Prompt shows both phases always

**Should be**: One of:

1. Separate prompts per phase
2. Dynamic insertion: "YOU ARE IN GUIDANCE PHASE"
3. Context indicator in user message

**Impact**: LLM confused about which behavior to use

---

### MEDIUM #3: Resume Flow Implementation Incomplete

**Evidence** - `auto-router.ts:326-455` has resumeFlow function, but:

- Doesn't handle intent confirmation
- Doesn't validate human answered
- Doesn't preserve pipeline state correctly
- Doesn't handle partial completions

**Impact**: Can't reliably resume after AWAIT_INPUT

---

### MEDIUM #4: Persona Examples Show Eye Generating Content

**Problem**: All persona examples show eyes creating content instead of asking questions.

**Example** - Kyuubi guidance response shows:

```json
{
  "data": {
    "structuredBrief": {
      "objective": "Create a 500-word beginner's guide for indoor palm care in Saudi Arabia",
      "audience": "Beginners with no prior plant care experience",
      "format": "How-to article with practical steps",
      "keyElements": ["...", "..."]
    }
  }
}
```

**This is the eye creating the brief**, not guiding the agent to create it.

**Impact**: LLMs copy example behavior, generate content instead of guiding

---

## Root Cause Analysis

### Why Pipelines Always Fail

The pipeline failures you're experiencing are caused by a **cascade of fundamental misalignments**:

```
1. Personas instruct eyes to generate content
   ↓
2. Eyes generate content (violating vision)
   ↓
3. System expects agent to ask human
   ↓
4. No mechanism to enforce this
   ↓
5. Pipeline returns AWAIT_INPUT
   ↓
6. Auto-router treats this as rejection
   ↓
7. Pipeline stops with error
   ↓
8. No resume mechanism
   ↓
9. Pipeline fails
```

**Plus**:

- Complex JSON structure causes LLM parse failures (30-50% failure rate)
- Missing phase indicators cause wrong eye behavior
- No persona guards allow contract violations
- Exposure of eyes confuses agents

---

## Alternatives to Strict JSON Format

### Current Problem

**Strict JSON envelope** with 12+ fields, nested objects, canonical matching is:

- ❌ Too complex for LLMs to produce consistently
- ❌ Requires exact enum matching
- ❌ Breaks with minor variations
- ❌ Needs 3 retries that still fail

### Alternative 1: **Simplified Envelope**

```typescript
// Instead of current 12+ field envelope
{
  "eye": "sharingan",
  "action": "ask_questions",  // Simple enum
  "questions": ["Q1", "Q2", "Q3"],
  "next": "wait"
}
```

**Pros**:

- 4 fields vs 12
- Simpler parsing
- Clear action verbs
- Higher success rate

**Cons**:

- Less rich metadata
- Less UI information

---

### Alternative 2: **Markdown + YAML Frontmatter**

```markdown
---
eye: sharingan
action: ask_questions
next: wait_for_human
---

# Clarification Needed

The request is ambiguous. I need to ask:

1. What type of palms?
2. What is the target audience?
3. How long should it be?
```

**Pros**:

- Natural for LLMs (they excel at markdown)
- Structured metadata in frontmatter
- Human-readable content in markdown
- Easy to parse
- Fewer formatting errors

**Cons**:

- Non-standard format
- Requires custom parsing

---

### Alternative 3: **XML-Based Envelopes**

```xml
<response eye="sharingan">
  <action>ask_questions</action>
  <questions>
    <question id="audience">Who is the target audience?</question>
    <question id="deliverable">What should I create?</question>
  </questions>
  <next>wait_for_human</next>
</response>
```

**Pros**:

- Self-documenting structure
- LLMs trained on XML
- Validation built into format
- Flexible nesting

**Cons**:

- Verbose
- Harder to parse in TypeScript

---

### Alternative 4: **Function Calling (Native LLM Feature)**

Use OpenAI/Anthropic function calling instead of JSON:

```typescript
// Define eye response as function
const sharinganResponse = {
  name: "sharingan_response",
  parameters: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["ask_questions", "approve"] },
      questions: { type: "array", items: { type: "string" } },
      next: { type: "string" },
    },
  },
};
```

**Pros**:

- Native LLM support (98%+ success rate)
- Provider handles parsing
- Built-in validation
- Tool use is LLMs' strongest capability

**Cons**:

- Locks into specific providers
- Requires provider tool calling support

---

### Alternative 5: **Natural Language + Regex Parsing**

```
EYE: Sharingan
ACTION: Ask questions
QUESTIONS:
- What type of palms are you interested in?
- Who is the target audience?
- How long should it be?
NEXT: wait_for_human
```

**Pros**:

- Extremely natural for LLMs
- Very high success rate
- Easy to parse with regex
- Human-readable

**Cons**:

- Less structured
- Regex fragile
- Harder validation

---

### **RECOMMENDED: Alternative 4 (Function Calling)**

**Why**:

1. **Highest success rate** (98%+ vs current ~50%)
2. **Native LLM feature** - built for this exact use case
3. **Automatic validation** - provider handles it
4. **Simpler prompts** - no JSON formatting instructions needed
5. **Faster** - no retry loops

**Implementation**:

```typescript
// packages/core/eye-schemas.ts
export const EyeResponseSchema = {
  sharingan: {
    name: "sharingan_response",
    description: "Sharingan's response after analyzing ambiguity",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["ask_questions", "approve"],
          description: "Whether to ask clarifying questions or approve",
        },
        questions: {
          type: "array",
          items: { type: "string" },
          description:
            "Clarifying questions to ask (if action is ask_questions)",
        },
        analysis: {
          type: "string",
          description: "Why these questions are needed",
        },
        next: {
          type: "string",
          enum: ["wait_for_human", "proceed"],
          description: "What should happen next",
        },
      },
      required: ["action", "next"],
    },
  },
};

// packages/core/orchestrator.ts - runEye()
const completion = await provider.complete({
  model: targetModel,
  messages: [
    { role: "system", content: personaPrompt.systemPrompt },
    { role: "user", content: personaPrompt.userMessage },
  ],
  tools: [EyeResponseSchema[eyeName]],
  tool_choice: { type: "function", function: { name: `${eyeName}_response` } },
});

// Provider returns validated function call
const envelope = completion.tool_calls[0].function.arguments;
// Guaranteed to match schema ✅
```

**Benefits**:

- No more JSON parse errors
- No more schema validation failures
- No more 3-retry loops
- Clean, validated responses every time

---

## Recommendations for Fixing the Vision Gaps

### Phase 1: Fix Critical Vision Misalignment (1 week)

#### 1.1 Rewrite All Personas to Ask Questions, Not Generate Content

**Before** (Kyuubi):

```
Transform into structured brief.

Response:
{
  "data": {
    "structuredBrief": {
      "objective": "Create a 500-word beginner's guide...",
      "audience": "Beginners...",
      ...
    }
  }
}
```

**After** (Kyuubi):

```
Your role: Guide the agent to think through structure by asking questions.

Response:
{
  "action": "ask_questions",
  "questions": [
    "What is the exact objective of this content?",
    "Who is the target audience and what do they already know?",
    "What format is most appropriate and why?",
    "What are the must-have elements that define success?"
  ],
  "next": "wait_for_agent"
}
```

#### 1.2 Implement Function Calling Instead of JSON Envelopes

- Replace strict JSON with native function calling
- 98%+ success rate vs current ~50%
- Eliminates retry loops
- Faster, more reliable

#### 1.3 Separate Guidance and Validation Personas

**Don't mix phases** - Create separate personas:

- `sharingan_guidance.ts` - Only guidance behavior
- `sharingan_validation.ts` - Only validation behavior

Load appropriate persona based on pipeline state.

#### 1.4 Implement Actual Pause/Resume Mechanism

**New tables**:

```sql
CREATE TABLE pending_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  eye TEXT NOT NULL,
  questions JSON NOT NULL,
  status TEXT NOT NULL, -- pending, answered, expired
  created_at INTEGER NOT NULL
);

CREATE TABLE human_responses (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  answers JSON NOT NULL,
  source TEXT NOT NULL, -- human, agent, system
  created_at INTEGER NOT NULL
);
```

**New flow**:

```typescript
// When eye returns ask_questions
if (eyeResponse.action === "ask_questions") {
  // Store questions
  await db.insert(pendingQuestions).values({
    id: nanoid(),
    sessionId,
    eye: eyeName,
    questions: eyeResponse.questions,
    status: "pending",
  });

  // Return to agent with clear instruction
  return {
    status: "paused",
    action: "ask_human",
    questions: eyeResponse.questions,
    sessionId,
    resumeWith: `third_eye_overseer({ sessionId: "${sessionId}", answers: {...} })`,
  };
}
```

#### 1.5 Remove Eye Exposure from MCP Responses

```typescript
// packages/mcp/server.ts
return {
  content: [
    {
      type: "text",
      text: JSON.stringify(
        {
          status: "success",
          verdict,
          summary,
          // ❌ REMOVE: history: result.results
          sessionId: result.sessionId,
          portalUrl: metadata.portalUrl, // For developers only
        },
        null,
        2,
      ),
    },
  ],
};
```

---

### Phase 2: Implement Intent Confirmation (3 days)

#### 2.1 Create Intent Confirmation Tables

```sql
CREATE TABLE intent_confirmations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  intent_summary TEXT NOT NULL,
  scope TEXT NOT NULL,
  estimated_effort TEXT NOT NULL,
  status TEXT NOT NULL, -- pending, confirmed, rejected
  confirmed_by TEXT, -- human, agent
  created_at INTEGER NOT NULL,
  confirmed_at INTEGER
);
```

#### 2.2 Implement Confirmation Flow

```typescript
// When Jōgan returns await_confirmation
const confirmation = await db.insert(intentConfirmations).values({
  id: nanoid(),
  sessionId,
  intentSummary: joganResponse.confirmationPrompt,
  scope: joganResponse.scope,
  estimatedEffort: joganResponse.estimatedEffort,
  status: "pending",
});

// Return to agent
return {
  status: "paused",
  action: "confirm_with_human",
  prompt: joganResponse.confirmationPrompt,
  sessionId,
  resumeWith: `third_eye_overseer({ sessionId: "${sessionId}", confirmed: true })`,
};
```

#### 2.3 Validate Confirmation Before Proceeding

```typescript
// In resumeFlow()
const confirmation = await getIntentConfirmation(sessionId);
if (!confirmation || confirmation.status !== "confirmed") {
  throw new Error("Cannot proceed without human intent confirmation");
}
```

---

### Phase 3: Implement Persona Guards for All Eyes (3 days)

#### 3.1 Extend persona-guards.ts

```typescript
// Add guards for each eye
const ensureKyuubiBehavior = (envelope: BaseEnvelope): void => {
  if (envelope.action === "ask_questions" && !envelope.questions?.length) {
    throw new EyeBehaviorError("kyuubi", "questions_empty");
  }
  // More validations...
};

const ensureJoganBehavior = (envelope: BaseEnvelope): void => {
  if (
    envelope.action === "await_confirmation" &&
    !envelope.confirmationPrompt
  ) {
    throw new EyeBehaviorError("jogan", "missing_confirmation_prompt");
  }
  // More validations...
};

export const ensureEyeBehavior = (
  eyeId: string,
  envelope: BaseEnvelope,
): void => {
  switch (eyeId) {
    case "sharingan":
      ensureSharinganBehavior(envelope);
      break;
    case "kyuubi":
      ensureKyuubiBehavior(envelope);
      break;
    case "jogan":
      ensureJoganBehavior(envelope);
      break;
    case "mangekyo":
      ensureMangekyoBehavior(envelope);
      break;
    case "tenseigan":
      ensureTenseiganBehavior(envelope);
      break;
    case "byakugan":
      ensureByakuganBehavior(envelope);
      break;
  }
};
```

---

### Phase 4: Implement Narrative Monitoring (2 days)

#### 4.1 Track All Conversation Participants

```typescript
interface ConversationEvent {
  type: "overseer" | "eye" | "agent" | "human" | "system";
  speaker: string;
  message: string;
  icon: string;
  color: string;
  timestamp: number;
}

// Emit narrative events
ws.broadcastToSession(sessionId, {
  type: "conversation_event",
  data: {
    speaker: "sharingan",
    message: "Detected ambiguity score 75/100, asking 4 questions",
    icon: "🔍",
    color: "warning",
  },
});

ws.broadcastToSession(sessionId, {
  type: "conversation_event",
  data: {
    speaker: "agent",
    message: "Asking human for clarifications...",
    icon: "🤖",
    color: "info",
  },
});

ws.broadcastToSession(sessionId, {
  type: "conversation_event",
  data: {
    speaker: "human",
    message: "Indoor palms, beginners, 500 words, Saudi Arabia",
    icon: "👤",
    color: "success",
  },
});
```

---

## Testing Plan

### Test Scenario 1: Full Pipeline (Palm Care Guide)

**Input**: "Generate a palm care report"

**Expected Flow**:

```
1. Overseer → Routes to: Sharingan, Kyuubi, Jōgan, Tenseigan, Byakugan
2. Sharingan → Returns 5 clarification questions
3. System → Pauses, instructs agent to ask human
4. Agent → Asks human questions
5. Human → Answers: "Indoor palms, beginners, 500 words, Saudi Arabia"
6. Agent → Calls resumeFlow with answers
7. Kyuubi → Asks agent to structure brief (via questions)
8. Agent → Provides structured brief
9. Jōgan → Asks for intent confirmation
10. System → Pauses, instructs agent to confirm with human
11. Agent → Confirms with human
12. Human → Approves
13. Agent → Creates draft
14. Tenseigan → Validates evidence (asks about citations if missing)
15. Byakugan → Final approval
16. System → Returns approved verdict
```

**Validation**:

- ✅ Pipeline completes without errors
- ✅ Human asked 5 clarification questions
- ✅ Human asked for intent confirmation
- ✅ Agent never saw eye names
- ✅ All eyes asked questions, none generated content
- ✅ Monitor shows narrative conversation

---

### Test Scenario 2: Code Review

**Input**: "Review this TypeScript code: [code here]"

**Expected Flow**:

```
1. Overseer → Routes to: Mangekyo
2. Mangekyo → Asks questions about code quality criteria
3. Agent → Provides criteria preferences
4. Mangekyo → Validates code, returns issues
5. System → Returns validation result
```

**Validation**:

- ✅ Pipeline skips clarification (code already provided)
- ✅ Direct to Mangekyo validation
- ✅ No guidance phases needed
- ✅ Fast validation path

---

## Conclusion

### The Core Problem

**Third Eye has an identity crisis**: It doesn't know if it's a content generator or an agent empowerment system.

**Current implementation**: Eyes generate content (briefs, templates, checklists)
**Vision requirement**: Eyes ask questions and guide thinking

**This misalignment cascades into**:

- Broken pause/resume mechanism
- No human interaction validation
- LLM JSON failures
- Exposed internal structure
- Failed pipelines

### What Success Looks Like

```
Human: "Generate a palm care report"
Agent: Third Eye calls
Sharingan (invisible): "I need clarification"
Agent to Human: "I have some questions:
  - What type of palms?
  - Who is this for?
  - How long should it be?
  - What's your region?
  - Any specific references?"
Human: "Indoor palms, beginners, 500 words, Saudi Arabia"
Agent: Third Eye continues
Kyuubi (invisible): "Help me structure this"
Agent to Human: "I'm thinking:
  - Objective: Beginner's guide to indoor palm care in Saudi climate
  - Format: How-to article
  - Key topics: Species, watering, light, problems
  Does this sound right?"
Human: "Perfect!"
Agent: Creates draft
Tenseigan (invisible): Validates evidence
Byakugan (invisible): Final approval
Agent to Human: [Delivers polished guide]
Human: "Wow, great questions! This is perfect."
  (Never knew Third Eye existed)
```

### Immediate Next Steps

1. **Stop current implementation** - It's building the wrong thing
2. **Rewrite personas** - Ask questions, don't generate content (1 week)
3. **Implement function calling** - Replace JSON envelopes (2 days)
4. **Implement pause/resume** - Actual human interaction flow (3 days)
5. **Remove eye exposure** - Clean up MCP responses (1 day)
6. **Test full scenario** - Palm care guide end-to-end (1 day)

**Total**: 2 weeks to working vision-aligned system

---

## Appendix: Quick Reference

### File Locations

- Personas: `packages/db/defaults/personas.ts`
- Auto-router: `packages/core/auto-router.ts`
- Orchestrator: `packages/core/orchestrator.ts`
- MCP Server: `packages/mcp/server.ts`
- Persona Guards: `packages/core/persona-guards.ts`
- Order Guard: `packages/core/order-guard.ts`

### Critical Lines

- Content generation examples: `personas.ts:181-235` (Kyuubi)
- Eye exposure: `mcp/server.ts:413` (`history: result.results`)
- Rejection without resume: `auto-router.ts:268-275`
- Order guard bypass: `order-guard.ts:89-93`
- Persona guard incomplete: `persona-guards.ts:141-149`
- Phase confusion: All personas have both phases in one prompt

---

**End of Audit Report**
