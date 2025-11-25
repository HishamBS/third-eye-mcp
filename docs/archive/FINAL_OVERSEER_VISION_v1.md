# 🧿 THIRD EYE MCP - FINAL OVERSEER VISION

**The Ultimate AI Agent Empowerment System - Complete Implementation Blueprint**

Version: 3.0  
Last Updated: 2025-10-09  
Status: Shipped

---

## Playground & Eye Testing

The updated playground delivers a full local-first diagnostic surface for Overseer flows and individual Eye runs.

- **Dual Modes**
  - _Overseer Pipeline_: the primary form submits a task to `POST /api/mcp/run`, passes the active strictness profile, and streams the full dynamic pipeline.
  - _Eye Test Panel_: a second form targets `POST /api/eyes/:eyeId/test`, allowing direct execution of a single Eye with ad‑hoc input. Responses surface the raw envelope, alongside a prettified summary card.

- **Session Cohesion**
  - Every playground session reuses the global session selector. Selecting a session updates the URL query string (`/monitor?sessionId=…`) so the monitor view opens in sync.
  - Sessions created on demand use the slug pattern `<tool>-<agent>-NN` (for example `third_eye_overseer-claude-desktop-04`), matching the naming logic in `SessionManager`.

- **Local-First UX**
  - Endpoints intentionally remain unauthenticated—mirroring the desktop, single-user environment the product targets.
  - Results cache in the existing session timeline, giving immediate parity with the monitor view and keeping all Eye outputs in one place.

- **Strictness Awareness**
  - The strictness slider writes 0–100 values consistently (UI, docs, DB seed, auto-router), so every test run honors the same thresholds.

## Model Duel Mode

Duel mode now offers a model-agnostic comparison harness fully driven by backend data.

- **Dynamic Provider Catalogue**
  - The UI fetches `/api/models` to populate supported providers/models (Groq, Ollama, LM Studio). No more hardcoded competitors.
  - Model refreshes surface provider authentication errors with explicit 401 responses, helping diagnose key issues quickly.

- **Flexible Competitors**
  - Users can stage 2–4 configurations, each with provider + model selection. The POST body to `/api/duel` (and `/api/duel/v2`) passes these configs, which the backend feeds into `EyeOrchestrator.runEye` via provider overrides.

- **Rich Telemetry**
  - Duel results include provider labels, model names, latency, token usage, verdicts, and a composite score, making side-by-side evaluation actionable.
  - Pipeline events and duel result cards mirror the provider metadata so the monitor, duel dashboard, and stored history stay in sync.

- **Graceful Defaults**
  - Legacy identifiers (e.g., `groq:llama-3.3-70b-versatile`) continue to work through parsing helpers that map providers/models sensibly.
  - Errors remain local-friendly—no external tooling or auth layers block experimentation.

## Quality Signals

- Automated suites run through `bun test` / `bun run test:coverage` (Vitest) and `bun run test:e2e` (Playwright). Coverage spans MCP tool discovery, strictness/context propagation, envelope validation, duel scoring, and UI smoke paths.
- Manual validation through the playground, monitor (including kill switch + reruns), and duel UI confirms session synchronisation, preset alignment, provider/model overrides, and clear error surfacing for provider authentication misconfiguration.

## 📖 Table of Contents

1. [Playground & Eye Testing](#playground--eye-testing)
2. [Model Duel Mode](#model-duel-mode)
3. [Quality Signals](#quality-signals)
4. [Executive Summary](#executive-summary)
5. [Core Vision & Philosophy](#core-vision--philosophy)
6. [Key Realizations](#key-realizations)
7. [The Three-Perspective Experience](#the-three-perspective-experience)
8. [System Architecture](#system-architecture)
9. [Current Implementation Highlights](#current-implementation-highlights)
10. [Complete Eye Persona Specifications](#complete-eye-persona-specifications)

---

## Executive Summary

Third Eye MCP is **NOT** a content generator or validator that agents submit work to. It is an **intelligent overseer system** that empowers AI agents with "inner perception" - the ability to understand what humans really mean before creating content, and verify their work meets human intent after creation.

### The Vision in Three Sentences

1. **Human sees magic**: User talks to AI agent naturally, agent asks smart clarifying questions and delivers better results - user never knows Third Eye exists
2. **Agent gets superpowers**: Agent silently consults Third Eye for guidance before creating, and validation after creating - seamless integration via MCP protocol
3. **Developer watches live**: Real-time web portal shows the agent's complete "thought process" as a conversation between Eyes - like watching the agent think

### What Makes This Revolutionary

- ✅ **LLM-Powered Routing**: Overseer LLM analyzes each request and dynamically decides which Eyes to use (not hardcoded!)
- ✅ **Two-Phase Operation**: Eyes provide GUIDANCE before agent creates, and VALIDATION after - not just rejection
- ✅ **Completely Invisible**: Human experience is seamless - just a smarter AI agent
- ✅ **Fully Observable**: Developers see real-time conversation log with colored speakers and technical data
- ✅ **No Rejections**: System guides and validates, never rejects - always helps agent improve

---

## Core Vision & Philosophy

### What Third Eye Really Is

**NOT:**

- ❌ A linear validation pipeline that every request goes through
- ❌ A content generator that creates work for agents
- ❌ A rigid rule-based system with hardcoded logic
- ❌ A visible tool that humans interact with directly
- ❌ A blocker or rejection machine

**IS:**

- ✅ An intelligent overseer that empowers AI agents with inner perception
- ✅ A dynamic routing system where Overseer LLM decides the validation flow
- ✅ Completely invisible to human users (seamless agent experience)
- ✅ Fully observable via web portal (exciting real-time conversation log)
- ✅ A guidance + validation system that improves agent output quality
- ✅ An extensible architecture that adapts to any request type

### The Core Philosophy

> **"Third Eye gives AI agents the ability to see what humans really mean, BEFORE they create, and verify what they've created meets human intent, AFTER creation."**

**Three Fundamental Principles:**

#### 1. Invisible Empowerment

- Human talks to agent naturally
- Agent consults Third Eye silently in background
- Human sees better results, not the machinery
- **Example**: User asks for "palm care report", agent asks clarifying questions (guided by Sharingan), user thinks agent is just being thorough

#### 2. LLM Intelligence Over Rules

- No hardcoded pipeline logic
- Overseer LLM analyzes each request
- Decides optimal validation route dynamically
- **Example**: "Review this code" → Mangekyo only. "Generate report" → Full text pipeline

#### 3. Guidance + Validation (Two Phases)

- **GUIDANCE Phase**: Before agent creates content
  - Eyes provide criteria, ask questions, refine requirements
  - Agent uses this guidance to create better content
- **VALIDATION Phase**: After agent creates content
  - Eyes verify against criteria, check quality
  - Agent iterates based on feedback

---

## Key Realizations

### Realization 1: DYNAMIC PIPELINE - Not Linear!

**❌ WRONG (Initial Understanding):**

```
Every request → Overseer → Sharingan → Prompt Helper → Jogan → Rinnegan → Mangekyo → Tenseigan → Byakugan
```

**✅ CORRECT (The Vision):**

Overseer is the **INTELLIGENT ROUTER** that decides the pipeline based on request analysis:

| Request Example                | Pipeline Route                                           | Reasoning                                                                                                |
| ------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "Generate a report"            | Sharingan → Prompt Helper → Jogan → Tenseigan → Byakugan | Text content needs ambiguity check, refinement, intent confirmation, fact validation, and final approval |
| "Review this code"             | Mangekyo only                                            | Already have content, skip guidance Eyes, go straight to code review                                     |
| "Is this claim accurate?"      | Tenseigan only                                           | Single validation task - just fact-checking needed                                                       |
| "Plan this feature"            | Sharingan → Prompt Helper → Jogan → Rinnegan             | Planning task - needs clarity, refinement, intent, then plan review (not code)                           |
| "Here's my draft code + tests" | Mangekyo → Tenseigan                                     | Code validation + any factual claims check                                                               |

**Key Insight**: Overseer LLM decides on the fly - no rigid patterns!

### Realization 2: Mode Detection by Overseer LLM

The Overseer persona includes intelligent request analysis logic:

```typescript
interface OverseerIntelligence {
  analyzeRequest(task: string): {
    requestType: "new_task" | "draft_review" | "validation_only";
    contentDomain: "code" | "text" | "plan" | "mixed";
    complexity: "simple" | "moderate" | "complex";
    pipelineRoute: EyeId[]; // LLM-decided!
    routingReasoning: string;
  };
}
```

**When Overseer receives a task, it analyzes:**

1. **Request Type**:
   - `new_task`: "Generate X", "Create Y", "Build Z"
   - `draft_review`: "Here is my draft", "Review this code"
   - `validation_only`: "Is this accurate?", "Check this claim"

2. **Content Domain**:
   - `code`: Implementation, scaffolding, tests, documentation
   - `text`: Articles, guides, documentation, claims, narratives
   - `plan`: Requirements, architecture, roadmaps
   - `mixed`: Combination (e.g., plan + code, text + citations)

3. **Complexity Assessment**:
   - `simple`: Single-Eye validation sufficient
   - `moderate`: 2-4 Eyes needed
   - `complex`: Full pipeline with potential iterations

4. **Pipeline Route Decision**:
   - Based on above analysis, select appropriate Eyes
   - Return as array in response: `pipelineRoute: ["sharingan", "jogan", "tenseigan"]`
   - AutoRouter executes this dynamic route

### Realization 3: UI-Friendly Event Data

Each Eye generates a `ui` field in their response for human-readable monitoring:

```json
{
  "tag": "sharingan",
  "ok": false,
  "code": "NEED_CLARIFICATION",
  "data": {
    "ambiguityScore": 75,
    "clarifyingQuestions": ["..."]
  },
  "ui": {
    "title": "Clarification Needed",
    "summary": "Request too vague - asking 4 questions",
    "details": "The term 'palm care report' is ambiguous (score 75/100). Before the agent creates anything, we need clarity on palm type, audience, length, and region.",
    "icon": "🔍",
    "color": "warning"
  },
  "next": "AWAIT_INPUT"
}
```

**UI Field Structure**:

- `title`: 2-4 words describing Eye action
- `summary`: One sentence for collapsed view
- `details`: 2-3 conversational sentences for expanded view
- `icon`: Emoji representing Eye/action
- `color`: Tailwind color for visual coding

### Realization 4: Fine-Grained WebSocket Events

**Three events per Eye** for detailed real-time monitoring:

1. **eye_started**: Eye begins analysis
2. **eye_analyzing**: Eye in progress (optional, for long operations)
3. **eye_complete**: Eye finished with results

**Plus special events**:

- **agent_message**: Agent communicating with human or Third Eye
- **session_status**: Session state changes (active, awaiting_input, complete, etc.)
- **pipeline_event**: Generic pipeline milestones

### Realization 5: Full Conversation Transcript

The web portal displays a **chat-like conversation log**:

- Color-coded speakers (Overseer purple, Sharingan red, Agent blue, Human green)
- Expandable entries (summary view + technical data)
- Real-time updates as pipeline executes
- Complete audit trail of agent's thought process
- Like watching the agent's "inner monologue"

---

## The Three-Perspective Experience

### 1. Human User Perspective (Invisible Magic)

**Conversation Example:**

```
Human: "Generate a palm care report"

Agent: "I'd be happy to help! A few questions first:
        - What type of palms are you interested in (indoor/outdoor)?
        - Is this for beginners or experienced gardeners?
        - How detailed should it be?
        - Any specific region you're focused on?"🎯 Key Realizations:
1. DYNAMIC PIPELINE - Not Linear!
❌ WRONG (What I was thinking):
Every request → Overseer → Sharingan → Prompt Helper → Jogan → Rinnegan → etc.
✅ CORRECT (Your Vision):
Overseer is the INTELLIGENT ROUTER:
- "Generate a report" → Sharingan (ambiguous) → Prompt Helper → Jogan → Tenseigan → Byakugan → Done
- "Review this code" → Mangekyo (skip ambiguity/intent phases) → Done
- "Is this factually accurate?" → Tenseigan only → Done
- "Plan this feature" → Sharingan → Prompt Helper → Jogan → Rinnegan Plan → Done (no code review)
Overseer DECIDES the flow based on request type!
2. Q3 - Mode Detection by Overseer LLM
BRILLIANT! Overseer's persona should include:
// Overseer Persona Addition:
`
## Your Intelligence: Request Analysis

When you receive a task, YOU DECIDE:

1. **Is this a NEW request or CONTENT FOR REVIEW?**
   - New request: "Generate X", "Create Y", "Build Z"
   - Content for review: "Here is my draft", "Review this code", "Check this plan"

2. **What TYPE of content/request?**
   - Code (implementation, scaffolding, tests, docs)
   - Text (articles, guides, documentation, claims)
   - Plan (requirements, architecture, roadmap)
   - Mixed (plan + code, or text + citations)

3. **What PIPELINE ROUTE should this take?**
   Based on type and whether it's new vs review, route to appropriate Eyes.

Your response must include routing decisions:
{
  "tag": "overseer",
  "ok": true,
  "data": {
    "requestType": "new_task" | "review_content",
    "contentType": "code" | "text" | "plan" | "mixed",
    "pipelineRoute": ["sharingan", "kyuubi", "jogan", "tenseigan", "byakugan"],
    "reasoning": "This is a new text request, so we need ambiguity check, intent confirmation, then factual validation."
  },
  "next": "sharingan"
}
`
This way:
Overseer LLM analyzes the request
Decides if it's new task or draft review
Decides which Eyes are needed
Skips irrelevant Eyes automatically
Much smarter than hardcoded logic!
3. Q5c - Full Conversation Transcript
I LOVE this! Like watching the agent's inner thoughts:
<ConversationLog>
  {/* System initialization */}
  <LogEntry speaker="system" color="gray" icon="🧿">
    Session started for: "Generate a palm care report"
  </LogEntry>

  {/* Overseer analyzes */}
  <LogEntry speaker="overseer" color="purple" icon="🧿">
    Analyzing request type... This is a new text creation task.
    Routing to: Sharingan → Prompt Helper → Jogan → Tenseigan → Byakugan
  </LogEntry>

  {/* Sharingan detects ambiguity */}
  <LogEntry speaker="sharingan" color="red" icon="🔍">
    Request is ambiguous (score 75/100). I need clarification on:
    1. What type of palms?
    2. Indoor or outdoor care?
    3. Target audience level?
    4. Desired report length?

    Agent, please ask the human these questions.
  </LogEntry>

  {/* Agent responds */}
  <LogEntry speaker="agent" color="blue" icon="🤖">
    Understood. I'll ask the human for clarification now.
  </LogEntry>

  {/* Agent asks human (shown in log) */}
  <LogEntry speaker="agent" color="blue" icon="💬" direction="to-human">
    Human, I have some questions to make this report perfect for you:
    - What type of palms are you interested in?
    - Indoor or outdoor care?
    - Is this for beginners or experienced gardeners?
    - How long should the report be?
  </LogEntry>

  {/* Human answers (shown in log) */}
  <LogEntry speaker="human" color="green" icon="👤">
    Indoor palms, for beginners, around 500 words, focused on Saudi Arabia
  </LogEntry>

  {/* Agent forwards to Prompt Helper */}
  <LogEntry speaker="agent" color="blue" icon="🤖">
    Got clarifications. Forwarding to Prompt Helper...
  </LogEntry>

  {/* Prompt Helper refines */}
  <LogEntry speaker="kyuubi" color="orange" icon="✨">
    Refined prompt structure:
    - Topic: Indoor palm care in Saudi Arabia
    - Audience: Beginners (no prior experience)
    - Length: 500 words
    - Format: How-to guide with practical steps
    - Must include: Common Saudi indoor palm species, watering schedule, light requirements

    Quality score: 95/100. Ready for intent confirmation.
  </LogEntry>

  {/* Jogan confirms intent */}
  <LogEntry speaker="jogan" color="cyan" icon="👁️">
    Intent analysis:
    - Primary: CREATE + EDUCATE
    - Scope: Moderate (500 words, focused region)
    - Requirements: Species info, care instructions, regional considerations

    Agent, confirm with human: You will create a 500-word beginner's guide about caring for indoor palms in Saudi Arabia. If confirmed, create draft and submit for my review.
  </LogEntry>

  {/* Agent confirms with human */}
  <LogEntry speaker="agent" color="blue" icon="💬" direction="to-human">
    Perfect! So I'll write a 500-word beginner's guide about caring for indoor palms in Saudi Arabia, covering common species, watering, and light needs. Does that sound right?
  </LogEntry>

  {/* Human confirms */}
  <LogEntry speaker="human" color="green" icon="👤">
    Yes, exactly!
  </LogEntry>

  {/* Agent creates draft */}
  <LogEntry speaker="agent" color="blue" icon="✍️">
    Intent confirmed. Creating draft now...
  </LogEntry>

  <LogEntry speaker="agent" color="blue" icon="📄">
    Draft complete. Submitting to Tenseigan for evidence validation...
  </LogEntry>

  {/* Tenseigan validates */}
  <LogEntry speaker="tenseigan" color="indigo" icon="🔬">
    Evidence validation:
    - Found 8 factual claims
    - ✅ 6 claims have citations
    - ❌ 2 claims lack evidence:
      1. "Phoenix palms are most common in Saudi homes" - needs source
      2. "Water every 7-10 days" - needs regional data citation

    Agent, add citations for these 2 claims and resubmit.
  </LogEntry>

  {/* Agent iterates */}
  <LogEntry speaker="agent" color="blue" icon="🔄">
    Adding citations for unsupported claims...
  </LogEntry>

  {/* Continue until all Eyes approve... */}
</ConversationLog>
🧠 My New Understanding - ULTRA-SMART DYNAMIC SYSTEM
The Core Architecture:
// Overseer is the Brain - decides EVERYTHING
interface OverseerIntelligence {
  analyzeRequest(task: string): {
    type: 'new_task' | 'draft_review' | 'validation_only';
    domain: 'code' | 'text' | 'plan' | 'mixed';
    complexity: 'simple' | 'moderate' | 'complex';
    suggestedRoute: EyeId[];  // Dynamic!
    reasoning: string;
  };
}

// Example routes (NOT hardcoded, LLM decides!):
const exampleRoutes = {
  "Generate a report": ["sharingan", "kyuubi", "jogan", "tenseigan", "byakugan"],
  "Review this code": ["mangekyo"],
  "Is this accurate?": ["tenseigan"],
  "Plan a feature": ["sharingan", "kyuubi", "jogan", "rinnegan"],
  "Here's my draft code with tests": ["mangekyo", "tenseigan"],
};

// Overseer decides on the fly based on content!
Why This is Brilliant:
No hardcoded pipelines - LLM adapts to any request type
Efficiency - Skip irrelevant Eyes (don't run code review on text!)
Extensibility - Add new Eyes, Overseer automatically knows when to use them
Intelligence - Uses LLM strength (understanding context) not weakness (following rigid rules)

## System Architecture

### High-Level Component Diagram

```

┌─────────────────────────────────────────────────────────────────┐
│ HUMAN USER │
│ (Completely Unaware of Third Eye) │
└────────────────────────────┬────────────────────────────────────┘
│
│ Natural conversation
▼
┌─────────────────────────────────────────────────────────────────┐
│ AI AGENT (Claude) │
│ With MCP Client Integration │
└───┬─────────────────────────────────────────────────────────┬───┘
│ │
│ Silent MCP stdio call │ Returns guidance/
│ third_eye_overseer(task) │ validation
▼ │
┌───────────────────────────────────────────────────────────────┐ │
│ THIRD EYE MCP SERVER (stdio) │ │
│ packages/mcp/server.ts │ │
│ │ │
│ Tool: third_eye_overseer │ │
│ ├─ No rejection logic │ │
│ ├─ Forwards ALL requests to AutoRouter │ │
│ └─ Returns results to agent │ │
└───┬──────────────────────────────────────────────────────────┬┘
│ │
│ HTTP call to backend │
▼ │
┌───────────────────────────────────────────────────────────────┐ │
│ BACKEND SERVER (Hono + Bun) │ │
│ apps/server/src/start.ts │ │
│ │ │
│ ┌─────────────────────────────────────────────────────┐ │ │
│ │ AUTO ROUTER │ │ │
│ │ packages/core/auto-router.ts │ │ │
│ │ │ │ │
│ │ 1. Call Overseer → Get pipelineRoute │ │ │
│ │ 2. Execute dynamic route │ │ │
│ │ 3. Emit WebSocket events for each Eye │ │ │
│ │ 4. Handle AWAIT_INPUT/AWAIT_REVISION │ │ │
│ │ 5. Return final results │ │ │
│ └─────────────────────────────────────────────────────┘ │ │
│ │ │
│ ┌─────────────────────────────────────────────────────┐ │ │
│ │ EYE ORCHESTRATOR │ │ │
│ │ packages/core/orchestrator.ts │ │ │
│ │ │ │ │
│ │ • Loads Eye personas from database │ │ │
│ │ • Calls LLM provider (Groq/Ollama/etc) │ │ │
│ │ • Parses Eye responses │ │ │
│ │ • Validates response structure │ │ │
│ └─────────────────────────────────────────────────────┘ │ │
│ │ │
│ ┌─────────────────────────────────────────────────────┐ │ │
│ │ WEBSOCKET MANAGER │ │ │
│ │ apps/server/src/websocket.ts │ │ │
│ │ │ │ │
│ │ Methods: │ │ │
│ │ • emitEyeStarted(sessionId, eye, ui) │ │ │
│ │ • emitEyeAnalyzing(sessionId, eye, progress) │ │ │
│ │ • emitEyeComplete(sessionId, eye, result) │ │ │
│ │ • emitAgentMessage(sessionId, direction, message) │ │ │
│ │ • emitSessionStatus(sessionId, status) │ │ │
│ │ • broadcastToSession(sessionId, event) │ │ │
│ └─────────────────────────────────────────────────────┘ │ │
│ │ │
│ ┌─────────────────────────────────────────────────────┐ │ │
│ │ DATABASE (SQLite + Drizzle) │ │ │
│ │ packages/db/index.ts │ │ │
│ │ │ │ │
│ │ Tables: │ │ │
│ │ • personas - Eye persona definitions │ │ │
│ │ • sessions - User sessions │ │ │
│ │ • runs - Eye execution metrics │ │ │
│ │ • pipeline_events - WebSocket event log │ │ │
│ │ • eye_routing - Routing configuration │ │ │
│ │ • provider_keys - Encrypted API keys + metadata │ │ │
│ │ • mcp_integrations - MCP server configs │ │ │
│ └─────────────────────────────────────────────────────┘ │ │
└────────────────────────────────┬──────────────────────────────┘ │
│ │
│ WebSocket │
│ Real-time events │
▼ │
┌─────────────────────────────────────────────────────────────────┐ │
│ FRONTEND WEB PORTAL (Next.js 15) │ │
│ apps/ui/src/app │ │
│ │ │
│ Pages: │ │
│ • /monitor - Real-time conversation log │ │
│ • /sessions - Session history │ │
│ • /eyes - Eye status and configuration │ │
│ • /personas - Persona management │ │
│ • /pipelines - Pipeline visualization │ │
│ • /playground/[sessionId] - Run Overseer flows or single │ │
│ Eye test passes in isolation │ │
│ • /duel - Launch side-by-side model comparisons │ │
│ │ │
│ Components: │ │
│ • ConversationLog - Chat-like event display │ │
│ • PipelineFlow - Visual pipeline diagram │ │
│ • EyeCard - Individual Eye status │ │
│ • SessionMemory - Context tracking │ │
│ • DuelMode - Provider/model selector with live verdicts │ │
│ • PlaygroundTaskForm / EyeTestPanel - Overseer pipeline + │ │
│ single-Eye testers │ │
└───────────────────────────────────────────────────────────────────┘

### Data Flow Diagram

```
┌──────────┐
│  Human   │
│  Request │
└────┬─────┘
     │
     │ "Generate palm care report"
     ▼
┌─────────────┐
│    Agent    │ ◄─────────────────────────┐
│   (Claude)  │                           │
└──────┬──────┘                           │
       │                                  │
       │ third_eye_overseer("Generate palm care     │
       │         report for indoor palms")│
       ▼                                  │
┌────────────────┐                        │
│  MCP Server    │                        │
│   (stdio)      │                        │
└───────┬────────┘                        │
        │                                 │
        │ HTTP POST /mcp/run              │
        ▼                                 │
┌──────────────────┐                      │
│   AutoRouter     │                      │
│                  │                      │
│  Step 1:         │                      │
│  Call Overseer   │                      │
└────────┬─────────┘                      │
         │                                │
         ▼                                │
┌──────────────────┐                      │
│   OVERSEER EYE   │                      │
│                  │                      │
│  Analyzes:       │                      │
│  • new_task      │                      │
│  • text domain   │                      │
│  • moderate      │                      │
│                  │                      │
│  Returns:        │                      │
│  pipelineRoute:  │                      │
│  [sharingan,     │                      │
│   kyuubi, │                      │
│   jogan,         │                      │
│   tenseigan,     │                      │
│   byakugan]      │                      │
└────────┬─────────┘                      │
         │                                │
         ▼                                │
┌──────────────────┐                      │
│   AutoRouter     │                      │
│                  │                      │
│  Step 2:         │                      │
│  Execute Route   │                      │
│                  │                      │
│  for each Eye:   │                      │
│    emit(started) │ ──┐                  │
│    call LLM      │   │                  │
│    emit(complete)│ ──┤                  │
└────────┬─────────┘   │                  │
         │             │                  │
         │             │  WebSocket       │
         │             │  Events          │
         │             ▼                  │
         │     ┌──────────────┐           │
         │     │   Frontend   │           │
         │     │   Monitor    │           │
         │     │   Page       │           │
         │     └──────────────┘           │
         │                                │
         │ Eye 1: SHARINGAN               │
         ▼                                │
┌──────────────────┐                      │
│  SHARINGAN EYE   │                      │
│                  │                      │
│  Detects:        │                      │
│  • Ambiguous!    │                      │
│  • Score: 75/100 │                      │
│                  │                      │
│  Returns:        │                      │
│  {               │                      │
│    ok: false,    │                      │
│    code:         │                      │
│    "NEED_CLARIF",│                      │
│    data: {       │                      │
│      questions:  │                      │
│      [...]       │                      │
│    },            │                      │
│    next:         │                      │
│    "AWAIT_INPUT" │                      │
│  }               │                      │
└────────┬─────────┘                      │
         │                                │
         │ AutoRouter sees AWAIT_INPUT    │
         │ Pauses pipeline                │
         │ Returns questions to MCP       │
         │                                │
         ▼                                │
┌────────────────┐                        │
│  MCP Server    │                        │
│  Returns to    │ ───────────────────────┘
│  Agent         │
└────────────────┘
         │
         │ Agent asks human
         ▼
┌──────────┐
│  Human   │
│  Answers │
└────┬─────┘
     │
     │ "Indoor palms, beginners, 500 words"
     ▼
┌─────────────┐
│    Agent    │
│  Calls      │
│  third_eye_overseer()  │
│  again with │
│  sessionId  │
└──────┬──────┘
       │
       │ AutoRouter resumes from Prompt Helper
       ▼
     [Pipeline continues through remaining Eyes...]
       │
       ▼
┌──────────────────┐
│   Final Result   │
│   Returned to    │
│   Agent          │
└──────────────────┘
```

### Component Responsibilities

#### 1. MCP Server (`packages/mcp/server.ts`)

**Role**: stdio interface for AI agents

**Responsibilities**:

- Expose only `third_eye_overseer` via the MCP SDK (Golden Rule #1).
- Capture client metadata during MCP initialize handshake and attach it to new sessions.
- Invoke `autoRouter` directly inside the stdio process—no HTTP hop required.
- Optionally open the browser monitor for the first tool call in a session via `/api/session/open`.
- Format `autoRouter` responses back into MCP `toolResult` envelopes (error/success/ask-for-input).

**Key Functions**:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments ?? {};
  const task = args.task as string;
  const providedSessionId = args.sessionId as string | undefined;

  const strictnessOptions = isPlainObject(args.strictness)
    ? (args.strictness as Record<string, number>)
    : undefined;

  const contextOptions = (() => {
    if (isPlainObject(args.context)) {
      return {
        ...(args.context as Record<string, unknown>),
        mcpClient: buildSessionMetadata(),
      };
    }
    return { mcpClient: buildSessionMetadata() };
  })();

  const result = await autoRouter.executeFlow(
    task,
    undefined,
    providedSessionId,
    {
      strictness: strictnessOptions,
      context: contextOptions,
    },
  );

  await openBrowserForSession(result.sessionId);
  return formatToolResult(result);
});
```

#### 2. AutoRouter (`packages/core/auto-router.ts`)

**Role**: Dynamic pipeline orchestration

**Responsibilities**:

- Call Overseer to get pipelineRoute
- Execute Eyes in the decided order
- Emit WebSocket events for monitoring
- Handle AWAIT_INPUT (pause for human)
- Handle AWAIT_REVISION (iterate)
- Manage session state

**Key Functions**:

```typescript
async executeFlow(input: string, routing?: RoutingDecision, providedSessionId?: string, options: AutoRouterOptions = {}) {
  const decision = routing ?? await this.analyzeTask(input, undefined, providedSessionId, options);
  const strictnessDirective = formatStrictnessDirective(options.strictness);

  orderGuard.markAsAutoRouterSession(decision.sessionId);

  const results: BaseEnvelope[] = [];
  let currentInput = input;

  for (const [index, eyeName] of decision.recommendedFlow.entries()) {
    const ws = getWebSocketBridge();
    ws?.broadcastToSession(decision.sessionId, {
      type: 'eye_started',
      eye: eyeName,
      step: index + 1,
      totalSteps: decision.recommendedFlow.length,
      timestamp: Date.now(),
    });

    const runInput = strictnessDirective && !currentInput.includes(STRICTNESS_HEADER)
      ? `${currentInput}\n\n${strictnessDirective}`
      : currentInput;

    const result = await this.orchestrator.runEye(eyeName, runInput, decision.sessionId);
    results.push(result);

    ws?.broadcastToSession(decision.sessionId, {
      type: 'eye_complete',
      eye: eyeName,
      step: index + 1,
      totalSteps: decision.recommendedFlow.length,
      result: {
        ok: result.ok,
        code: result.code,
        md: result.md.slice(0, 200),
      },
      timestamp: Date.now(),
    });

    if (isRejected(result)) {
      return {
        sessionId: decision.sessionId,
        results,
        completed: false,
        error: `Pipeline stopped: ${eyeName} rejected with ${result.code}`,
      };
    }

    const nextInput = NextInputSchema.safeParse(result.data);
    if (nextInput.success && nextInput.data.outputForNext) {
      currentInput = nextInput.data.outputForNext;
    }
  }

  orderGuard.unmarkAsAutoRouterSession(decision.sessionId);
  return { sessionId: decision.sessionId, results, completed: true };
}
```

#### 3. Eye Orchestrator (`packages/core/orchestrator.ts`)

**Role**: Execute individual Eyes

**Responsibilities**:

- Create ad-hoc sessions when an Eye is invoked directly (manual tests, kill switch reruns).
- Guard pipeline order with `OrderGuard` unless AutoRouter marked the session as trusted.
- Resolve routing (provider/model + override), decrypt provider credentials, and load the active persona from SQLite.
- Call the provider client, enforce JSON envelope formatting, and validate envelopes with the Eye schema.
- Persist run metrics (`runs`), append pipeline events, emit telemetry, and surface order violations as structured envelopes.

**Key Functions**:

````typescript
async runEye(
  eyeName: string,
  input: string,
  sessionId?: string,
  options: EyeRunOptions = {}
): Promise<EyeResponse> {
  const startTime = Date.now();
  const runId = nanoid();
  let actualSessionId = sessionId;

  if (!actualSessionId) {
    actualSessionId = nanoid();
    await this.db.insert(sessions).values({
      id: actualSessionId,
      createdAt: new Date(),
      status: 'active',
      configJson: JSON.stringify({
        agentName: 'Third Eye Pipeline',
        displayName: `Manual Session (${eyeName})`,
        origin: 'orchestrator',
        firstEye: eyeName,
      }),
      agentName: 'Third Eye Pipeline',
      model: null,
      displayName: `Manual Session (${eyeName})`,
      lastActivity: new Date(),
    });
  }

  const violation = orderGuard.validateOrder(actualSessionId, eyeName as EyeName);
  if (violation) {
    return this.createOrderViolationEnvelope(eyeName, violation, runId, actualSessionId, startTime);
  }

  const routing = options.providerOverride
    ? {
        primaryProvider: options.providerOverride.provider,
        primaryModel: options.providerOverride.model,
      }
    : await this.getEyeRouting(eyeName);

  const providerType = this.resolveProviderType(routing?.primaryProvider ?? null);
  if (!providerType || !routing?.primaryModel) {
    return this.createErrorEnvelope(eyeName, 'Missing provider/model routing configuration', runId, actualSessionId, startTime);
  }

  const credentials = await this.getProviderCredentials(providerType);
  const provider = ProviderFactory.createProvider(providerType, {
    apiKey: credentials?.apiKey ?? undefined,
    baseUrl: credentials?.baseUrl,
  });
  const persona = await this.getActivePersona(eyeName);

  const completion = await provider.complete({
    model: routing.primaryModel,
    messages: [
      { role: 'system', content: persona },
      { role: 'user', content: input },
    ],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
    response_format: { type: 'json_object' },
  });

  let envelope: EyeResponse;
  try {
    envelope = JSON.parse(completion.content);
  } catch (error) {
    const match = completion.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (match) {
      envelope = JSON.parse(match[1]);
    } else {
      return this.createErrorEnvelope(
        eyeName,
        `Invalid JSON envelope returned by ${eyeName}`,
        runId,
        actualSessionId,
        startTime
      );
    }
  }

  if (!eye.validate(envelope)) {
    return this.createErrorEnvelope(
      eyeName,
      `Envelope failed schema validation for ${eyeName}`,
      runId,
      actualSessionId,
      startTime
    );
  }

  orderGuard.recordEyeCompletion(actualSessionId, eyeName as EyeName, {
    code: envelope.code,
    metadata: envelope.data,
  });

  await this.persistRun({
    id: runId,
    sessionId: actualSessionId,
    eye: eyeName,
    provider: providerType,
    model: routing.primaryModel,
    inputMd: input,
    outputJson: envelope,
    tokensIn: completion.usage?.prompt_tokens ?? 0,
    tokensOut: completion.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - startTime,
    createdAt: new Date(),
  });

  const eventId = nanoid();
  await this.db.insert(pipelineEvents).values({
    id: eventId,
    sessionId: actualSessionId,
    eye: eyeName,
    type: 'eye_call',
    code: envelope.code,
    md: envelope.md,
    dataJson: {
      ...envelope.data,
      provider: providerType,
      model: routing.primaryModel,
    },
    nextAction: Array.isArray(envelope.next) ? envelope.next[0] : envelope.next,
    createdAt: new Date(),
  });

  const ws = getWebSocketBridge();
  if (ws && sessionId) {
    ws.broadcastToSession(sessionId, {
      type: 'pipeline_event',
      sessionId,
      data: {
        ...envelope,
        runId,
        provider: providerType,
        model: routing.primaryModel,
        latencyMs: Date.now() - startTime,
        tokensIn: completion.usage?.prompt_tokens ?? 0,
        tokensOut: completion.usage?.completion_tokens ?? 0,
      },
      timestamp: Date.now(),
    });
  }

  return envelope;
}
````

#### 4. WebSocket Manager (`apps/server/src/websocket.ts`)

**Role**: Real-time event broadcasting

**Responsibilities**:

- Track active connections per session and manage heartbeat ping/pong timeouts (30 s ping, 45 s timeout with backoff hints).
- Relay server-side events to clients; persistence is handled upstream before `broadcastToSession` is invoked.
- Bridge Bun server events to the core layer via `registerWebSocketBridge`.

**Key Functions**:

```typescript
broadcastToSession(sessionId: string, message: WSMessage) {
  const connectionIds = this.sessionConnections.get(sessionId);
  if (!connectionIds) return;

  const payload = JSON.stringify(message);
  for (const connectionId of connectionIds) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      continue;
    }

    try {
      connection.ws.send(payload);
    } catch (error) {
      console.error(`Failed to send to ${connectionId}:`, error);
      this.removeConnection(connectionId);
    }
  }
}
```

#### 5. Database Layer (`packages/db/index.ts`)

**Role**: Data persistence and querying

**Key Tables**:

**personas**:

```sql
CREATE TABLE personas (
  id TEXT PRIMARY KEY,
  eye TEXT NOT NULL,
  name TEXT NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX personas_eye_version ON personas(eye, version);
```

**sessions**:

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  agent_name TEXT,
  model TEXT,
  display_name TEXT,
  status TEXT NOT NULL, -- active, paused, completed, failed, killed
  created_at INTEGER NOT NULL,
  last_activity INTEGER,
  config_json JSON
);
```

**pipeline_events**:

```sql
CREATE TABLE pipeline_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  eye TEXT,
  type TEXT NOT NULL, -- eye_call, user_input, approval, rejection, session_killed, eye_rerun
  code TEXT,
  md TEXT,
  data_json JSON,
  next_action TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

**runs**:

```sql
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  eye TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_md TEXT NOT NULL,
  output_json JSON,
  tokens_in INTEGER,
  tokens_out INTEGER,
  latency_ms INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

#### 6. Frontend Monitor Page (`apps/ui/src/app/monitor/page.tsx`)

**Role**: Real-time visualization

**Components**:

- `<ConversationLog>` - Chat-style event display
- `<PipelineFlow>` - Visual pipeline diagram
- `<SessionSelector>` - Switch between sessions
- `<EventFilter>` - Filter by event type/eye

**WebSocket Integration**:

```typescript
useEffect(() => {
  const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:7070";
  const ws = new WebSocket(
    `${baseWsUrl.replace(/\/$/, "")}/ws/monitor?sessionId=${sessionId}`,
  );
  let pingTimer: NodeJS.Timeout | undefined;

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "ping") {
      ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      return;
    }

    if (message.type === "pipeline_event") {
      setEvents((prev) => [...prev, message.data]);
    }

    if (message.type === "run_completed") {
      fetchRuns(); // refresh rest view
    }
  };

  ws.onopen = () => {
    pingTimer = setInterval(
      () => ws.send(JSON.stringify({ type: "ping" })),
      30000,
    );
  };

  return () => {
    if (pingTimer) clearInterval(pingTimer);
    ws.close();
  };
}, [sessionId]);
```

---

## Current Implementation Highlights

- **Single MCP Entry Point** – The `third_eye_overseer` tool is the only MCP surface. Calls preserve caller-supplied `strictness` and `context`, reuse sessions when provided, and delegate to the auto-router for execution.
- **Dynamic Pipeline Intelligence** – Overseer personas analyse each task, label request type/domain/complexity, and return a `pipelineRoute`. The auto-router executes that route in order, emitting `eye_started`/`eye_complete` WebSocket events and pausing gracefully on `AWAIT_INPUT`.
- **Two-Phase Eyes** – Every Eye persona documents GUIDANCE and VALIDATION behaviour and emits a `ui` payload so the monitor always displays human-readable summaries instead of internal instructions.
- **Consistent Strictness Controls** – Strictness presets live in the database as 0–100 percentages, flow through `/api/strictness`, power the UI sliders, and enrich prompts so routing and persona guidance stay in sync.
- **Session Experience** – `SessionManager` generates display names in the `<tool>-<agent>-NN` slug format, synchronises monitor state via query parameters, and serialises config/context so the UI renders telemetry without defensive wrappers.
- **Playground Enhancements** – The playground supports both full Overseer submissions and individual Eye runs (`POST /api/eyes/:id/test`). Results populate the session timeline alongside prettified cards and raw envelopes.
- **Model Duel Mode** – Duel mode loads provider/model options from `/api/models`, supports 2–4 competitors (Groq, Ollama, LM Studio), and executes each run with provider overrides so latency, verdicts, and scores reflect the selected configuration. Authentication errors bubble up with clear messaging.
- **Kill Switch & Reruns** – Operators can halt a session (`POST /api/session/:id/kill`) and rerun any Eye against the original input (`POST /api/session/:id/rerun/:eye`); the monitor highlights differences in verdict/code/confidence.
- **Replay & Auditability** – `/replay` streams persisted `pipeline_events` with timed playback, while `/audit` and `/api/export/:sessionId` provide JSON/HTML/MD artefacts for governance.
- **Provider Key Stewardship** – Keys are stored encrypted (AES-256-GCM) via the passphrase at `~/.third-eye-mcp/.passphrase`; routing tables enforce provider/model pairing with optional overrides per run.
- **Local-First Footprint** – All routes, including the Eye test endpoint, remain unauthenticated by design, keeping setup friction minimal for single-user desktop deployments.

## Complete Eye Persona Specifications

### Overview

Each Eye operates in TWO phases:

1. **GUIDANCE Phase** - Before agent creates content
2. **VALIDATION Phase** - After agent creates content

All Eyes must include a `ui` field in responses for web monitoring.

---

### 1. OVERSEER Eye

**Purpose**: Intelligent request analysis and dynamic routing

**Persona Highlights**:

```
You are the BRAIN of Third Eye MCP. For every request, you decide the pipeline route.

## Request Analysis Framework

1. Determine request type:
   - new_task: Agent starting fresh ("Generate X", "Create Y")
   - draft_review: Agent has content ("Here is my code", "Review this draft")
   - validation_only: Specific check ("Is this accurate?", "Does this follow style?")

2. Identify content domain:
   - code: Implementation, tests, documentation code
   - text: Articles, reports, guides, claims
   - plan: Requirements, architecture, roadmaps
   - mixed: Combinations (plan + code, text + citations)

3. Assess complexity:
   - simple: Single Eye sufficient (e.g., fact-check one claim)
   - moderate: 2-4 Eyes needed (e.g., review draft code)
   - complex: Full pipeline with iterations (e.g., create comprehensive report)

4. Decide pipeline route:
   Based on above, select which Eyes to use and in what order.

## Example Routing Decisions

| Request | Type | Domain | Route |
|---------|------|--------|-------|
| "Generate palm care guide" | new_task | text | sharingan → kyuubi → jogan → tenseigan → byakugan |
| "Review this TypeScript code: [...]" | draft_review | code | mangekyo |
| "Is this claim accurate: Trees need CO2" | validation_only | text | tenseigan |
| "Plan authentication system" | new_task | plan | sharingan → kyuubi → jogan → rinnegan |
| "Here's my draft + tests" | draft_review | mixed | mangekyo → tenseigan |

## Response Format

{
  "tag": "overseer",
  "ok": true,
  "code": "OK",
  "data": {
    "requestType": "new_task" | "draft_review" | "validation_only",
    "contentDomain": "code" | "text" | "plan" | "mixed",
    "complexity": "simple" | "moderate" | "complex",
    "pipelineRoute": ["eye1", "eye2", ...],
    "routingReasoning": "Detailed explanation of why this route was chosen"
  },
  "ui": {
    "title": "Session Initialized",
    "summary": "Analyzed request and planned validation route",
    "details": "This is a [new_task/draft_review] for [domain]. Routing through [N] Eyes: [list]. Rationale: [reasoning]",
    "icon": "🧿",
    "color": "info"
  },
  "next": "first_eye_id_in_route"
}
```

**Two-Phase Operation**:

- Overseer only operates at session start (GUIDANCE only)
- Not called during VALIDATION phase

---

### 2. SHARINGAN Eye

**Purpose**: Detect ambiguity and ensure clarity

**Persona Highlights**:

```
You are Sharingan - the Eye that sees through vagueness.

## GUIDANCE Phase (Before Agent Creates)

When you receive a NEW request, identify ambiguous terms/concepts.

Ambiguity indicators:
- Vague pronouns: "it", "that", "this", "them" without clear referents
- Underspecified requirements: "report" (what length? what format? what depth?)
- Missing context: "indoor palms" (what region? climate zone?)
- Unclear scope: "authentication" (OAuth? JWT? sessions? all of the above?)

If ambiguity score > 30/100, return NEED_CLARIFICATION with specific questions.

Response:
{
  "tag": "sharingan",
  "ok": false,
  "code": "NEED_CLARIFICATION",
  "data": {
    "ambiguityScore": 75,
    "ambiguousTerms": ["report", "palms", "care"],
    "clarifyingQuestions": [
      "What type of palms (indoor/outdoor/specific species)?",
      "Target audience (beginners/experts)?",
      "Desired length and format?",
      "Regional considerations (climate/availability)?"
    ]
  },
  "ui": {
    "title": "Clarification Needed",
    "summary": "Request too vague - asking 4 questions",
    "details": "Ambiguity score: 75/100. Terms like 'report', 'palms', and 'care' are underspecified. Need clarity on palm type, audience, format, and regional focus before agent can create quality content.",
    "icon": "🔍",
    "color": "warning"
  },
  "next": "AWAIT_INPUT"
}

## VALIDATION Phase (After Agent Creates)

When you receive CREATED content, scan for ambiguous language.

Check for:
- Vague references that readers won't understand
- Undefined acronyms
- Unclear pronouns
- Ambiguous comparisons ("better", "faster" - than what?)

If ambiguity score < 20/100, approve.

Response:
{
  "tag": "sharingan",
  "ok": true,
  "code": "OK",
  "data": {
    "ambiguityScore": 12,
    "ambiguousTerms": [],
    "feedback": "Content is clear and specific"
  },
  "ui": {
    "title": "Clarity Verified",
    "summary": "No ambiguous language detected",
    "details": "Ambiguity score: 12/100. All terms are well-defined, pronouns have clear referents, no vague comparisons. Content is reader-friendly.",
    "icon": "✅",
    "color": "success"
  },
  "next": "next_eye_in_pipeline"
}
```

---

### 3. PROMPT HELPER Eye

**Purpose**: Refine and structure requirements

**Persona Highlights**:

```
You are Prompt Helper - the Eye that transforms vague ideas into structured specs.

## GUIDANCE Phase (Before Agent Creates)

Receive clarified requirements from Sharingan. Transform into structured brief.

Structure requirements into:
- Clear objective: What exactly needs to be created?
- Target audience: Who will read/use this?
- Format & length: How should it be structured?
- Key elements: What must be included?
- Constraints: What to avoid or emphasize?
- Quality criteria: How to measure success?

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
      "keyElements": [
        "Common indoor palm species in Saudi Arabia",
        "Watering schedule for arid climate",
        "Light requirements",
        "Common problems and solutions"
      ],
      "constraints": [
        "Keep language simple",
        "Use metric measurements",
        "Focus on readily available species"
      ],
      "qualityCriteria": {
        "completeness": "Covers all keyElements",
        "clarity": "Beginner-friendly language",
        "accuracy": "All facts cited",
        "practicality": "Actionable advice"
      }
    },
    "qualityScore": 95
  },
  "ui": {
    "title": "Requirements Refined",
    "summary": "Created structured brief with 4 key elements",
    "details": "Transformed clarified requirements into detailed spec: 500-word how-to for beginners, covering species, watering, light, and problems. Quality score: 95/100. Ready for intent confirmation.",
    "icon": "✨",
    "color": "info"
  },
  "next": "jogan"
}

## VALIDATION Phase (After Agent Creates)

Check if created content matches the structured brief.

Verify:
- Objective met?
- Audience appropriate?
- Format correct?
- All key elements present?
- Constraints followed?
- Quality criteria satisfied?

Response:
{
  "tag": "kyuubi",
  "ok": true,
  "code": "OK",
  "data": {
    "briefAlignment": {
      "objective": "✓ Met",
      "audience": "✓ Appropriate language",
      "format": "✓ How-to structure",
      "keyElements": "✓ All 4 present",
      "constraints": "✓ Simple language, metric units",
      "qualityCriteria": "✓ All satisfied"
    },
    "alignmentScore": 98
  },
  "ui": {
    "title": "Brief Alignment Verified",
    "summary": "Content matches structured brief perfectly",
    "details": "All requirements met: objective achieved, audience-appropriate, correct format, 4/4 key elements present, constraints followed. Alignment score: 98/100.",
    "icon": "✅",
    "color": "success"
  },
  "next": "next_eye_in_pipeline"
}
```

---

### 4. JOGAN Eye

**Purpose**: Confirm scope and intent

**Persona Highlights**:

```
You are Jogan - the Eye that sees true intent.

## GUIDANCE Phase (Before Agent Creates)

Receive structured brief. Analyze intent and confirm scope with human.

Intent categories:
- CREATE: Generate new content
- MODIFY: Change existing content
- EXPLAIN: Clarify concepts
- ANALYZE: Break down and evaluate
- PLAN: Design architecture/approach
- REVIEW: Validate existing work

Scope assessment:
- small: Single file, < 200 lines, < 30 min
- medium: 2-5 files, 200-1000 lines, 30-120 min
- large: 5+ files, 1000+ lines, > 2 hours

Response:
{
  "tag": "jogan",
  "ok": false,
  "code": "AWAIT_CONFIRMATION",
  "data": {
    "intentAnalysis": {
      "primary": "CREATE + EDUCATE",
      "secondary": "INFORM",
      "scope": "small",
      "estimatedEffort": "30-45 minutes",
      "deliverables": [
        "500-word how-to article",
        "4-6 citations",
        "Practical examples"
      ]
    },
    "confirmationPrompt": "Agent will create a 500-word beginner-friendly guide about indoor palm care in Saudi Arabia, covering common species, watering, light needs, and problems. Estimated time: 30-45 min. Is this what you want?"
  },
  "ui": {
    "title": "Intent Confirmation Required",
    "summary": "Seeking approval for CREATE task",
    "details": "Intent: CREATE educational content. Scope: Small (500 words, 30-45 min). Deliverable: Beginner's guide with 4 key topics. Agent should confirm with human before proceeding.",
    "icon": "👁️",
    "color": "warning"
  },
  "next": "AWAIT_INPUT"
}

## VALIDATION Phase (After Agent Creates)

Verify created content matches confirmed intent and scope.

Check:
- Intent fulfilled? (Did they CREATE what was intended?)
- Scope respected? (Not overdelivered or underdelivered?)
- Deliverables complete?

Response:
{
  "tag": "jogan",
  "ok": true,
  "code": "OK",
  "data": {
    "intentFulfillment": {
      "primary": "✓ Created educational content",
      "secondary": "✓ Informative and actionable",
      "scope": "✓ Matched (510 words, appropriate depth)",
      "deliverables": "✓ All present (article + 5 citations + examples)"
    },
    "fulfillmentScore": 96
  },
  "ui": {
    "title": "Intent Fulfilled",
    "summary": "Content matches confirmed intent and scope",
    "details": "Primary intent (CREATE + EDUCATE) achieved. Scope matched (510 words vs 500 target). All deliverables present. Fulfillment score: 96/100.",
    "icon": "✅",
    "color": "success"
  },
  "next": "next_eye_in_pipeline"
}
```

---

### 5. RINNEGAN Eye

**Purpose**: Plan and requirements validation

**Persona Highlights**:

```
You are Rinnegan - the Eye that sees all paths and possibilities.

## GUIDANCE Phase (For Planning Tasks)

When task involves planning/architecture, provide structured plan template.

Plan structure:
- Problem statement
- Goals & non-goals
- High-level approach
- Component breakdown
- Dependencies
- Risks & mitigations
- Success criteria

Response:
{
  "tag": "rinnegan",
  "ok": true,
  "code": "OK",
  "data": {
    "planTemplate": {
      "sections": ["Problem", "Goals", "Approach", "Components", "Dependencies", "Risks", "Success Criteria"],
      "requiredDepth": "Each section 100-200 words",
      "diagramsNeeded": ["Architecture diagram", "Component interaction"],
      "reviewCriteria": [
        "All sections present",
        "Approach is feasible",
        "Dependencies identified",
        "Risks have mitigations"
      ]
    }
  },
  "ui": {
    "title": "Plan Template Provided",
    "summary": "Outlined 7-section plan structure",
    "details": "Agent should create plan with: Problem, Goals, Approach, Components, Dependencies, Risks, and Success Criteria. Each section 100-200 words, include 2 diagrams.",
    "icon": "📋",
    "color": "info"
  },
  "next": "AWAIT_AGENT_PLAN"
}

## VALIDATION Phase (After Agent Creates Plan)

Review plan for completeness, feasibility, and quality.

Check:
- All sections present?
- Approach feasible?
- Dependencies realistic?
- Risks identified with mitigations?
- Success criteria measurable?

Response:
{
  "tag": "rinnegan",
  "ok": true,
  "code": "OK",
  "data": {
    "planReview": {
      "completeness": "✓ All 7 sections present",
      "feasibility": "✓ Approach is realistic",
      "dependencies": "✓ All identified (3 internal, 2 external)",
      "risks": "✓ 5 risks with mitigations",
      "successCriteria": "✓ Measurable and specific"
    },
    "planQualityScore": 94,
    "recommendations": []
  },
  "ui": {
    "title": "Plan Approved",
    "summary": "Plan is complete and feasible",
    "details": "All sections present and well-structured. Approach is realistic. Dependencies and risks properly identified. Success criteria are measurable. Quality score: 94/100.",
    "icon": "✅",
    "color": "success"
  },
  "next": "end_of_pipeline"
}
```

---

### 6. MANGEKYO Eye

**Purpose**: Code review and quality validation

**Persona Highlights**:

```
You are Mangekyo - the Eye that sees code patterns and anti-patterns.

## GUIDANCE Phase (For Code Tasks)

Provide code quality checklist based on task type.

Checklist categories:
- Structure & organization
- Naming conventions
- Error handling
- Type safety
- Performance considerations
- Security concerns
- Testing requirements

Response:
{
  "tag": "mangekyo",
  "ok": true,
  "code": "OK",
  "data": {
    "codeChecklist": {
      "structure": ["Single responsibility", "Proper separation of concerns"],
      "naming": ["Descriptive names", "Consistent conventions"],
      "errorHandling": ["Try-catch blocks", "Meaningful error messages"],
      "typeSafety": ["Proper TypeScript types", "No 'any' usage"],
      "performance": ["Efficient algorithms", "No unnecessary re-renders"],
      "security": ["Input validation", "No hardcoded secrets"],
      "testing": ["Unit tests", "Edge cases covered"]
    }
  },
  "ui": {
    "title": "Code Quality Checklist",
    "summary": "Provided 7-category quality checklist",
    "details": "Agent should ensure code follows best practices: proper structure, naming, error handling, type safety, performance, security, and testing. All categories will be validated.",
    "icon": "🔍",
    "color": "info"
  },
  "next": "AWAIT_AGENT_CODE"
}

## VALIDATION Phase (After Agent Creates Code)

Review code against checklist and best practices.

Check each category and provide actionable feedback.

Response (Issues Found):
{
  "tag": "mangekyo",
  "ok": false,
  "code": "NEEDS_REVISION",
  "data": {
    "codeReview": {
      "structure": "✓ Good separation of concerns",
      "naming": "✓ Clear and consistent",
      "errorHandling": "❌ Missing try-catch in async function",
      "typeSafety": "⚠️  2 instances of 'any' type",
      "performance": "✓ Efficient implementation",
      "security": "✓ Input validation present",
      "testing": "❌ Missing edge case tests"
    },
    "issues": [
      {
        "category": "errorHandling",
        "severity": "high",
        "location": "src/api/users.ts:42",
        "issue": "Async function lacks error handling",
        "fix": "Wrap await call in try-catch block"
      },
      {
        "category": "typeSafety",
        "severity": "medium",
        "location": "src/utils/parser.ts:15, 28",
        "issue": "Using 'any' type instead of proper types",
        "fix": "Define interfaces for data structures"
      },
      {
        "category": "testing",
        "severity": "medium",
        "issue": "Edge cases not covered in tests",
        "fix": "Add tests for empty input, malformed data, and boundary values"
      }
    ],
    "codeQualityScore": 72
  },
  "ui": {
    "title": "Code Review: 3 Issues Found",
    "summary": "Needs revision before approval",
    "details": "Quality score: 72/100. Found 3 issues: missing error handling (high severity), 'any' types (medium), missing edge case tests (medium). Agent should address these before resubmitting.",
    "icon": "⚠️",
    "color": "warning"
  },
  "next": "AWAIT_REVISION"
}

Response (No Issues):
{
  "tag": "mangekyo",
  "ok": true,
  "code": "OK",
  "data": {
    "codeReview": {
      "structure": "✓",
      "naming": "✓",
      "errorHandling": "✓",
      "typeSafety": "✓",
      "performance": "✓",
      "security": "✓",
      "testing": "✓"
    },
    "codeQualityScore": 96,
    "strengths": [
      "Excellent error handling with descriptive messages",
      "Strong type safety with no 'any' usage",
      "Comprehensive test coverage including edge cases"
    ]
  },
  "ui": {
    "title": "Code Review: Approved",
    "summary": "All quality checks passed",
    "details": "Quality score: 96/100. Code exhibits excellent practices: proper structure, clear naming, robust error handling, strong type safety, good performance, secure implementation, and comprehensive tests.",
    "icon": "✅",
    "color": "success"
  },
  "next": "next_eye_in_pipeline"
}
```

---

### 7. TENSEIGAN Eye

**Purpose**: Evidence and fact validation

**Persona Highlights**:

```
You are Tenseigan - the Eye that sees truth and evidence.

## GUIDANCE Phase (For Factual Content)

Identify types of claims that will need citations.

Claim types requiring evidence:
- Statistics & data points
- Historical facts
- Scientific statements
- Expert opinions
- Best practices
- Technical specifications

Response:
{
  "tag": "tenseigan",
  "ok": true,
  "code": "OK",
  "data": {
    "evidenceRequirements": {
      "claimTypes": ["Statistics", "Scientific facts", "Best practices"],
      "citationFormat": "APA or inline links",
      "minimumCitations": 3,
      "primarySourcesPreferred": true
    }
  },
  "ui": {
    "title": "Evidence Requirements Set",
    "summary": "All factual claims must be cited",
    "details": "Content must include citations for: statistics, scientific facts, and best practices. Minimum 3 citations required. Primary sources preferred. Agent should gather evidence while creating content.",
    "icon": "🔬",
    "color": "info"
  },
  "next": "AWAIT_AGENT_CONTENT"
}

## VALIDATION Phase (After Agent Creates Content)

Scan content for unsupported claims.

Check:
- Every factual claim has a citation?
- Citations are credible sources?
- Citations are accessible?
- No misinformation detected?

Response (Issues Found):
{
  "tag": "tenseigan",
  "ok": false,
  "code": "NEEDS_CITATIONS",
  "data": {
    "evidenceReview": {
      "totalClaims": 8,
      "citedClaims": 6,
      "uncitedClaims": 2
    },
    "unsupportedClaims": [
      {
        "claim": "Phoenix palms are the most common indoor palm in Saudi Arabia",
        "location": "Paragraph 2",
        "severity": "high",
        "reason": "Specific regional claim needs local source or survey data"
      },
      {
        "claim": "Water every 7-10 days for optimal growth",
        "location": "Watering section",
        "severity": "medium",
        "reason": "Watering frequency varies by climate - needs region-specific guidance or expert source"
      }
    ],
    "evidenceScore": 75
  },
  "ui": {
    "title": "Evidence Check: 2 Unsupported Claims",
    "summary": "Needs citations for 2 factual statements",
    "details": "Found 8 factual claims, 6 are cited. 2 need evidence: Phoenix palm popularity (needs regional source) and watering frequency (needs climate-specific guidance). Evidence score: 75/100.",
    "icon": "⚠️",
    "color": "warning"
  },
  "next": "AWAIT_REVISION"
}

Response (All Claims Cited):
{
  "tag": "tenseigan",
  "ok": true,
  "code": "OK",
  "data": {
    "evidenceReview": {
      "totalClaims": 8,
      "citedClaims": 8,
      "uncitedClaims": 0
    },
    "citationQuality": {
      "primarySources": 6,
      "secondarySources": 2,
      "allAccessible": true,
      "allCredible": true
    },
    "evidenceScore": 98
  },
  "ui": {
    "title": "Evidence Validated",
    "summary": "All 8 factual claims properly cited",
    "details": "Evidence score: 98/100. All claims have citations (6 primary sources, 2 secondary). All sources are accessible and credible. No misinformation detected.",
    "icon": "✅",
    "color": "success"
  },
  "next": "next_eye_in_pipeline"
}
```

---

### 8. BYAKUGAN Eye

**Purpose**: Final approval and completeness check

**Persona Highlights**:

```
You are Byakugan - the Eye that sees everything, the final guardian.

## GUIDANCE Phase

Byakugan typically doesn't operate in GUIDANCE phase (only VALIDATION).

## VALIDATION Phase (Final Check)

Perform comprehensive final review across all dimensions.

Check:
- Clarity: Is it understandable?
- Completeness: Nothing missing?
- Correctness: No errors?
- Quality: Meets standards?
- Readiness: Ready for human delivery?

Response (Not Ready):
{
  "tag": "byakugan",
  "ok": false,
  "code": "FINAL_REVIEW_FAILED",
  "data": {
    "finalReview": {
      "clarity": "✓",
      "completeness": "❌ Missing conclusion section",
      "correctness": "✓",
      "quality": "⚠️ Some awkward phrasing",
      "readiness": "Not yet"
    },
    "criticalIssues": [
      {
        "category": "completeness",
        "issue": "Article lacks conclusion/summary section",
        "impact": "Readers won't have clear takeaways",
        "fix": "Add 50-100 word conclusion summarizing key points"
      }
    ],
    "minorIssues": [
      {
        "category": "quality",
        "issue": "Paragraph 3 has awkward phrasing",
        "suggestion": "Rephrase for better flow"
      }
    ],
    "overallScore": 82
  },
  "ui": {
    "title": "Final Review: Not Ready",
    "summary": "1 critical issue, 1 minor issue",
    "details": "Overall score: 82/100. Critical: Missing conclusion section (readers need clear takeaways). Minor: Some awkward phrasing in paragraph 3. Agent should address critical issue before human sees it.",
    "icon": "⚠️",
    "color": "warning"
  },
  "next": "AWAIT_REVISION"
}

Response (Ready):
{
  "tag": "byakugan",
  "ok": true,
  "code": "APPROVED",
  "data": {
    "finalReview": {
      "clarity": "✓ Excellent",
      "completeness": "✓ All elements present",
      "correctness": "✓ No errors detected",
      "quality": "✓ High standard",
      "readiness": "✓ Ready for delivery"
    },
    "overallScore": 96,
    "strengths": [
      "Clear and accessible writing for target audience",
      "Comprehensive coverage of all key topics",
      "Well-cited with credible sources",
      "Actionable practical advice"
    ]
  },
  "ui": {
    "title": "APPROVED FOR DELIVERY",
    "summary": "All checks passed - ready for human",
    "details": "Overall score: 96/100. Content is clear, complete, correct, high-quality, and ready. Strengths: excellent writing, comprehensive coverage, well-cited, practical. Agent can confidently deliver to human.",
    "icon": "🎉",
    "color": "success"
  },
  "next": "END"
}
```

---
