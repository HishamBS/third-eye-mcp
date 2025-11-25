# 🧿 Third Eye MCP - Unified Vision (Complete)

**Version**: 1.0 (Consolidated from THIRD_EYE_VISION.md + FINAL_OVERSEER_VISION.md)
**Last Updated**: 2025-01-18
**Status**: Core Shipped, Enhancements Pending (85% Complete)

---

## Mission

Empower every AI agent with an invisible inner perception that clarifies intent, guides creation, validates outputs, and reassures humans through a transparent yet delightful experience. Third Eye never replaces the agent; it amplifies the agent's judgement.

---

## Core Philosophy

### 1. Invisible Empowerment
Humans talk to their preferred agent (Claude, GPT, Cursor, Warp) while Third Eye operates silently through MCP. The human sees only sharper questions and better answers.

### 2. Two-Phase Intelligence
Every capability operates in GUIDANCE (pre-creation) and VALIDATION (post-creation) stages. Guidance removes ambiguity; validation confirms alignment and evidence. No shortcuts.

### 3. Dynamic Routing
Overseer LLM analyses each request and assembles the optimal pipeline using capability tags. No static routes, no heuristics. If required eye capability absent, we fail fast with actionable telemetry.

### 4. Strict Single Source of Truth
Enums, tokens, prompts, themes, pipeline templates, status codes—everything flows from shared TypeScript constants. Literal strings and magic numbers are banned.

### 5. Local-First Reliability
Entire platform runs offline with Bun + SQLite + LM Studio (or any OpenAI-compatible endpoint). Deterministic prompts guarantee OSS model compliance.

### 6. Human-Friendly UX
Non-technical operators must immediately understand what is happening. Markdown renders as magazine-quality articles. Pipeline editor feels like n8n. Monitor is a cinematic timeline of the agent's inner thoughts.

### 7. No Fallbacks, No Heuristics
When an eye misbehaves, we re-prompt with crystal-clear reminders. We do not auto-patch envelopes or guess. Either the persona complies or we surface a precise error.

---

## What Third Eye Really Is

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

---

## Experience Overview

### 2.1 Agent Experience

1. Agent calls single MCP tool `third_eye_overseer` with natural language task and optional draft.
2. Overseer clarifies canonical fields (Audience, Deliverable, Scope, Success Criteria, References) with `NEED_CLARIFICATION` envelope.
3. Agent collects answers from human, resumes session; Overseer generates dynamic capability plan (e.g., Sharingan → Kyuubi → Jōgan → Mangekyō → Tenseigan → Byakugan).
4. Guidance eyes supply structured instructions, briefs, and checkpoints. Agent uses them to craft draft.
5. Validation eyes inspect draft, confirm intent, verify evidence, and approve with explicit codes.
6. Agent receives final readiness verdict, never exposed to internal personas.

### 2.2 Operator Experience

- Launches Third Eye via `bunx third-eye-mcp start` → CLI banner shows server/UI URLs.
- Session dropdown (global) selects active session; every page (Dashboard, Personas, Eyes, Pipelines, Monitor, Replay) reacts instantly.
- Monitor auto-opens when new session created, showing timeline, clarifications, intent confirmation, evidence, raw JSON.
- Pipeline editor allows drag/drop custom pipelines with validations, templates, import/export.
- Personas/Eyes CRUD forms allow editing mission, phases, envelope rules, examples with human-readable preview.
- Replay exports Markdown/PDF transcripts for audits.
- Theme switcher with six themes × light/dark ensures accessible, on-brand experience.

### 2.3 System Maintainer Experience

- SSOT modules under `packages/constants` define everything (taxonomies, clarifications, stage templates, capability plans, themes).
- Persona blueprints (TypeScript) generated into DB seeds; runtime renderer builds lean prompts referencing stage templates.
- Tests (Vitest + Playwright) ensure persona envelopes, router, session manager, and UI interactions remain stable.
- Scenario runner executes canonical flows (Flutter build, Amethyst troubleshooting, code review, factual validation, planning) logging transcripts for go-live evidence.
- Backup scripts + docs prevent data loss; commit discipline enforced.

---

## Playground & Eye Testing

The updated playground delivers a full local-first diagnostic surface for Overseer flows and individual Eye runs.

### Dual Modes
- **Overseer Pipeline**: the primary form submits a task to `POST /api/mcp/run`, passes the active strictness profile, and streams the full dynamic pipeline.
- **Eye Test Panel**: a second form targets `POST /api/eyes/:eyeId/test`, allowing direct execution of a single Eye with ad-hoc input. Responses surface the raw envelope, alongside a prettified summary card.

### Session Cohesion
- Every playground session reuses the global session selector. Selecting a session updates the URL query string (`/monitor?sessionId=…`) so the monitor view opens in sync.
- Sessions created on demand use the slug pattern `<tool>-<agent>-NN` (for example `third_eye_overseer-claude-desktop-04`), matching the naming logic in `SessionManager`.

### Local-First UX
- Endpoints intentionally remain unauthenticated—mirroring the desktop, single-user environment the product targets.
- Results cache in the existing session timeline, giving immediate parity with the monitor view and keeping all Eye outputs in one place.

### Strictness Awareness
- The strictness slider writes 0–100 values consistently (UI, docs, DB seed, auto-router), so every test run honors the same thresholds.

---

## Model Duel Mode

Duel mode now offers a model-agnostic comparison harness fully driven by backend data.

### Dynamic Provider Catalogue
- The UI fetches `/api/models` to populate supported providers/models (Groq, Ollama, LM Studio). No more hardcoded competitors.
- Model refreshes surface provider authentication errors with explicit 401 responses, helping diagnose key issues quickly.

### Flexible Competitors
- Users can stage 2–4 configurations, each with provider + model selection. The POST body to `/api/duel` (and `/api/duel/v2`) passes these configs, which the backend feeds into `EyeOrchestrator.runEye` via provider overrides.

### Rich Telemetry
- Duel results include provider labels, model names, latency, token usage, verdicts, and a composite score, making side-by-side evaluation actionable.
- Pipeline events and duel result cards mirror the provider metadata so the monitor, duel dashboard, and stored history stay in sync.

### Graceful Defaults
- Legacy identifiers (e.g., `groq:llama-3.3-70b-versatile`) continue to work through parsing helpers that map providers/models sensibly.
- Errors remain local-friendly—no external tooling or auth layers block experimentation.

---

## Quality Signals

- Automated suites run through `bun test` / `bun run test:coverage` (Vitest) and `bun run test:e2e` (Playwright). Coverage spans MCP tool discovery, strictness/context propagation, envelope validation, duel scoring, and UI smoke paths.
- Manual validation through the playground, monitor (including kill switch + reruns), and duel UI confirms session synchronisation, preset alignment, provider/model overrides, and clear error surfacing for provider authentication misconfiguration.

---

## Capability & Persona Matrix

| Eye | Stage | Capability Tags | Primary Output | Key Notes |
|-----|-------|-----------------|----------------|-----------|
| **Overseer** | Guidance only | `capability:analysis`, `capability:routing` | `capabilityPlan`, canonical questions, routing reasoning | Single MCP entry point; never skipped |
| **Sharingan** | Guidance | `capability:clarification` | Canonical questions, ambiguity score, resolved facts summary | Re-asks only unanswered questions; emits `OK_NO_CLARIFICATION_NEEDED` when complete |
| **Prompt Helper (Kyuubi)** | Guidance & Validation | `capability:briefing`, `capability:quality_gate` | Detailed brief, success metrics, alignment score | Validation returns `OK_WITH_NOTES` or `REJECT_INCOMPLETE` only |
| **Jōgan** | Guidance & Validation | `capability:intent_confirmation` | Intent analysis, confirmation prompt, suggested response | Validation emits `AWAIT_CONFIRMATION` then `OK_INTENT_CONFIRMED` |
| **Rinnegan** | Guidance | `capability:pipeline_planning` | Stepwise action plan, risk notes | Optional based on request type |
| **Mangekyō** | Validation | `capability:code_review` | Code issues, diffs, severity metrics | Works with agent-supplied draft |
| **Tenseigan** | Validation | `capability:factual_validation` | Evidence table with citations, status, risk summary | Requires confirmed citations |
| **Byakugan** | Validation | `capability:final_approval` | Final readiness verdict, residual risks, go/no-go | Always last validation step |
| **Custom Eyes** | Dynamic | Capability tags defined by user | Stage templates derived from SSOT | Must register capabilities to participate in routing |

---

## Key Realizations

### Realization 1: DYNAMIC PIPELINE - Not Linear!

**❌ WRONG (Initial Understanding):**

```
Every request → Overseer → Sharingan → Prompt Helper → Jogan → Rinnegan → Mangekyo → Tenseigan → Byakugan
```

**✅ CORRECT (The Vision):**

Overseer is the **INTELLIGENT ROUTER** that decides the pipeline based on request analysis:

| Request Example | Pipeline Route | Reasoning |
|----------------|----------------|-----------|
| "Generate a report" | Sharingan → Prompt Helper → Jogan → Tenseigan → Byakugan | Text content needs ambiguity check, refinement, intent confirmation, fact validation, and final approval |
| "Review this code" | Mangekyo only | Already have content, skip guidance Eyes, go straight to code review |
| "Is this claim accurate?" | Tenseigan only | Single validation task - just fact-checking needed |
| "Plan this feature" | Sharingan → Prompt Helper → Jogan → Rinnegan | Planning task - needs clarity, refinement, intent, then plan review (not code) |
| "Here's my draft code + tests" | Mangekyo → Tenseigan | Code validation + any factual claims check |

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

## System Behaviours & Contracts

1. **Canonical Questions:** Always exactly five (Audience, Deliverable, Scope, Success Criteria, References) with canonical IDs. Stored in DB, displayed in UI.
2. **Capability Plans:** Sequence of `{order, eyeId, stage, capabilities, capabilityLabels}`. Generated dynamically per request; serialized for resume.
3. **Statuses:** Use `EyeStatusCode` enum only. Guidance statuses include `NEED_CLARIFICATION`, `OK_NO_CLARIFICATION_NEEDED`; validation statuses include `OK_WITH_NOTES`, `OK_INTENT_CONFIRMED`, `OK_ALL_APPROVED`, `REJECT_INCOMPLETE`, `REJECT_NEEDS_REVISION`.
4. **Next Actions:** Always one of `PROCEED`, `AWAIT_INPUT`, `AWAIT_DRAFT`, `AWAIT_CONFIRMATION`, `COMPLETE`. UI tokens come from `UiTextToken` SSOT.
5. **Clarification Lifecycle:** `pending` ➜ `answered`. Resolved facts contain canonical keys with trimmed values and optional summary field; answers tracked with timestamps.
6. **Intent Confirmation:** Jōgan emits `await_confirmation`. Session manager logs human response; auto-router resumes at next assignment on approval.
7. **Resume Rules:** After agent provides draft, router skips completed guidance eyes, resumes first validation assignment. No repeated guidance after answers recorded.
8. **Telemetry:** Each eye run produces `EYE_STARTED`, `EYE_COMPLETED`, `EYE_PAUSED` events with payload (eyeId, stage, status code, latency, provider, summary). Monitor consumes via WebSocket.
9. **Error Handling:** On guard failure, orchestrator retries with targeted reminder referencing violation. After max retries, pipeline aborts with clear error and suggestion to adjust provider or persona.
10. **Provider Flexibility:** Default LM Studio (GPT-OSS-20B) at temperature 0 with JSON schema. Users can set provider/model per eye; prompts must succeed with any compliant model.

---

## UI & UX Golden Rules

- **Markdown Rendering:** Use custom components for headings, tables, lists, callouts. Everything should read like a crafted report, not raw Markdown.
- **Pipeline Builder:** Fluid zoom/pan, snap-to-grid, arrowed edges, mini-map, context menus, keyboard shortcuts. Looks and feels like premium automation tool.
- **Monitor:** Human-readable timeline with icons, stage badges, short summaries, and ability to deep dive into clarifications, intent confirmations, evidence, raw JSON.
- **Themes:** Aurora, Midnight, Sakura, Horizon, Emerald, Obsidian. Each offers light and dark palette with accessible contrast. Theme switcher accessible globally.
- **Wow Factors:** Dashboard hero text, metrics cards, real-time session stats, "Third Eye in Action" highlight showing pipeline timeline snippet.
- **Accessibility:** WCAG AA, semantic HTML, ARIA labels, focus outlines, keyboard shortcuts.

---

## Example End-to-End Flows

### 7.1 Flutter Web Feature Build

1. Agent submits feature request.
2. Overseer clarifies canonical fields; Sharingan resolves answers.
3. Kyuubi produces implementation brief with acceptance checklist.
4. Jōgan confirms intent with human; agent submits draft architecture + code plan.
5. Mangekyō reviews code, Tenseigan verifies factual statements, Byakugan approves release.
6. Monitor timeline captures entire narrative; Replay export matches `go_live_checklist` expectations.

### 7.2 macOS Amethyst Troubleshooting

1. Agent reports "Amethyst not working on macOS Tahoe 26" via MCP.
2. Clarifications gather OS version, symptoms, target outcome, prior attempts.
3. Kyuubi delivers troubleshooting plan; Rinnegan optional for dependency mapping.
4. Agent provides diagnostic findings; Mangekyō inspects config, Tenseigan confirms factual references, Byakugan approves resolution plan.
5. Monitor shows clarifications answered once; scenario harness logs final approval.

### 7.3 Code Review + Evidence Validation

1. Agent submits code diff for review.
2. Overseer routes directly to Mangekyō (code review) + Tenseigan (fact checking) + Byakugan (final approval), skipping guidance eyes if clarifications unnecessary.
3. Validation statuses return with severity metrics, citations, final readiness.

---

## Documentation & Operational Discipline

- **This document** (`docs/VISION.md`) is the consolidated vision source. Previous vision files are archived.
- **IMPLEMENTATION_STATUS.md** maps current implementation status to phases.
- **REMAINING_TASKS.md** enumerates outstanding work items by priority.
- **ARCHITECTURE.md** captures requirements and system design.
- **PERSONA_SPECIFICATIONS.md** documents all 8 Eye personas.
- **DATABASE_SCHEMA.md** details database schema SQL.
- **Go-Live Checklist** enumerates scenario runs, manual QA steps, doc reviews.
- **Backups** (daily git bundles, OS snapshots) mandatory to prevent data loss recurrence.
- **CLAUDE.md** remains rulebook: SSOT, no heuristics, no content generation, dynamic capabilities.

---

## Release Definition of Done

- All epics and stories from BMAD artifacts implemented and tested.
- Scenario harness runs for every example complete without manual intervention.
- UI polished across all pages, dark/light themes, responsive layout, accessible components.
- Documentation updated (vision, PRD, architecture, go-live checklist, README, USER_GUIDE, CONTRIBUTING). Old vision files removed.
- Backups configured and documented; commit discipline enforced.
- `bunx third-eye-mcp start` prints READY banner; UI + server accessible; database seeded.

**Third Eye MCP v1 ships only when agents, humans, and maintainers each experience the product exactly as described above. No compromises, no regressions, no shortcuts.**

---

## System Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         HUMAN USER                              │
│                  (Completely Unaware of Third Eye)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Natural conversation
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI AGENT (Claude)                          │
│                 With MCP Client Integration                     │
└───┬─────────────────────────────────────────────────────────┬───┘
    │                                                         │
    │ Silent MCP stdio call                                   │ Returns guidance/
    │ third_eye_overseer(task)                               │ validation
    ▼                                                         │
┌───────────────────────────────────────────────────────────────┐ │
│               THIRD EYE MCP SERVER (stdio)                    │ │
│                  packages/mcp/server.ts                       │ │
│                                                               │ │
│              Tool: third_eye_overseer                         │ │
│                  ├─ No rejection logic                        │ │
│                  ├─ Forwards ALL requests to AutoRouter       │ │
│                  └─ Returns results to agent                  │ │
└───┬──────────────────────────────────────────────────────────┬┘
    │                                                          │
    │ HTTP call to backend                                     │
    ▼                                                          │
┌───────────────────────────────────────────────────────────────┐ │
│              BACKEND SERVER (Hono + Bun)                      │ │
│                apps/server/src/start.ts                       │ │
│                                                               │ │
│   ┌─────────────────────────────────────────────────────┐   │ │
│   │                AUTO ROUTER                           │   │ │
│   │         packages/core/auto-router.ts                │   │ │
│   │                                                      │   │ │
│   │   1. Call Overseer → Get pipelineRoute              │   │ │
│   │   2. Execute dynamic route                          │   │ │
│   │   3. Emit WebSocket events for each Eye             │   │ │
│   │   4. Handle AWAIT_INPUT/AWAIT_REVISION              │   │ │
│   │   5. Return final results                           │   │ │
│   └─────────────────────────────────────────────────────┘   │ │
│                                                               │ │
│   ┌─────────────────────────────────────────────────────┐   │ │
│   │              EYE ORCHESTRATOR                        │   │ │
│   │        packages/core/orchestrator.ts                │   │ │
│   │                                                      │   │ │
│   │    • Loads Eye personas from database               │   │ │
│   │    • Calls LLM provider (Groq/Ollama/etc)           │   │ │
│   │    • Parses Eye responses                           │   │ │
│   │    • Validates response structure                   │   │ │
│   └─────────────────────────────────────────────────────┘   │ │
│                                                               │ │
│   ┌─────────────────────────────────────────────────────┐   │ │
│   │              WEBSOCKET MANAGER                       │   │ │
│   │          apps/server/src/websocket.ts               │   │ │
│   │                                                      │   │ │
│   │  Methods:                                            │   │ │
│   │    • emitEyeStarted(sessionId, eye, ui)             │   │ │
│   │    • emitEyeAnalyzing(sessionId, eye, progress)     │   │ │
│   │    • emitEyeComplete(sessionId, eye, result)        │   │ │
│   │    • emitAgentMessage(sessionId, direction, message)│   │ │
│   │    • emitSessionStatus(sessionId, status)           │   │ │
│   │    • broadcastToSession(sessionId, event)           │   │ │
│   └─────────────────────────────────────────────────────┘   │ │
│                                                               │ │
│   ┌─────────────────────────────────────────────────────┐   │ │
│   │        DATABASE (SQLite + Drizzle)                   │   │ │
│   │            packages/db/index.ts                      │   │ │
│   │                                                      │   │ │
│   │  Tables:                                             │   │ │
│   │    • personas - Eye persona definitions             │   │ │
│   │    • sessions - User sessions                       │   │ │
│   │    • runs - Eye execution metrics                   │   │ │
│   │    • pipeline_events - WebSocket event log          │   │ │
│   │    • eye_routing - Routing configuration            │   │ │
│   │    • provider_keys - Encrypted API keys + metadata  │   │ │
│   │    • mcp_integrations - MCP server configs          │   │ │
│   └─────────────────────────────────────────────────────┘   │ │
└────────────────────────────┬──────────────────────────────────┘ │
                             │                                    │
                             │ WebSocket                          │
                             │ Real-time events                   │
                             ▼                                    │
┌─────────────────────────────────────────────────────────────────┐ │
│          FRONTEND WEB PORTAL (Next.js 15)                       │ │
│                 apps/ui/src/app                                 │ │
│                                                                 │ │
│  Pages:                                                         │ │
│    • /monitor - Real-time conversation log                     │ │
│    • /sessions - Session history                               │ │
│    • /eyes - Eye status and configuration                      │ │
│    • /personas - Persona management                            │ │
│    • /pipelines - Pipeline visualization                       │ │
│    • /playground/[sessionId] - Run Overseer flows or single    │ │
│       Eye test passes in isolation                             │ │
│    • /duel - Launch side-by-side model comparisons             │ │
│                                                                 │ │
│  Components:                                                    │ │
│    • ConversationLog - Chat-like event display                 │ │
│    • PipelineFlow - Visual pipeline diagram                    │ │
│    • EyeCard - Individual Eye status                           │ │
│    • SessionMemory - Context tracking                          │ │
│    • DuelMode - Provider/model selector with live verdicts     │ │
│    • PlaygroundTaskForm / EyeTestPanel - Overseer pipeline +   │ │
│       single-Eye testers                                       │ │
└───────────────────────────────────────────────────────────────────┘
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

---

## Implementation Status Summary

### ✅ Fully Implemented (100%)

**Phase 1: Foundation & Dynamic Routing** - Complete (2025-10)
- Dynamic routing via Overseer LLM
- Routing decisions storage & retrieval (`routing_decisions` table)
- MCP server integration (`packages/mcp/server.ts`)
- Database schema with Drizzle ORM (8 specialized Eyes, Personas, Sessions, Routing decisions)
- CLI tool (`bunx third-eye-mcp start`)
- Environment validation
- Process management (start/stop/status)

**Phase 2: Pause/Resume & Human-in-the-Loop** - Complete (2025-10)
- State persistence across restarts
- Intent confirmation flow (Jōgan Eye)
- Session resume capability
- Conversation transcript storage
- Human-in-the-loop integration
- Clarification request flow

**Phase 3: Routing Modes (Policies & Templates)** - Complete (2025-11)
- **Policy System**: Define routing constraints (mandatory/forbidden eyes, validation thresholds, boolean constraints, policy activation/deactivation)
- **Template System**: Fixed eye sequences (predefined pipelines, auto-trigger patterns, template import/export, usage tracking)
- **Three Routing Modes**: Fully Dynamic, Constrained, Fixed Template
- **Management UI**: `/routing-modes` page (658 lines) with mode selector, policy builder (visual interface), template manager, policy preview

**Phase 4A: Pipeline Builder Core** - Complete (2025-11)
- Capability Matrix with 8 Eyes (capability tags, descriptions, scenarios)
- Interactive eye cards with model recommendation integration
- Eye detail modals
- Dynamic Route Visualizer (shows selected eye sequence for a session, real-time routing decision display, eye chip visualization)
- Live Routing Panel (recent routing decisions, default 10 sessions, session cards with eye sequences, auto-refresh capability)
- Mode Selector (switch between three routing modes, visual mode indicators, mode-specific UI rendering)
- Eye Icon System ✅ (Fixed 2025-01-18) - Database SVG icons (no hardcoded emojis), `EyeIcon` component with database integration, SSOT enforcement

### ⚠️ Partially Implemented (~70%)

**Phase 4B: Policy/Template Enhancements**
- ✅ PolicyBuilderEnhanced component (286 lines) - Full visual builder
- ✅ PolicyPreview component - Shows expected routing behavior
- ✅ Template import/export functionality
- ✅ Policy CRUD operations (Create, Read, Update, Delete)
- ✅ Policy activation/deactivation
- ✅ Template usage tracking
- ❌ Capability matrix filtering - Search/filter eyes by capability tags
- ❌ Routing decision search/filter - Filter decisions by criteria
- ❌ Session comparison - Compare routing decisions across sessions

**Backend Integration** (~80%)
- ✅ Verified Endpoints: `/api/mcp/run`, `/api/eyes`, `/api/personas`, `/api/sessions`, `/api/routing-decisions`, `/api/app-settings`
- ⚠️ Needs Verification: `/api/pipelines` endpoints (list, active, create, activate, delete)
- ⚠️ WebSocket integration (partial) - `packages/core/pipeline-execution-engine.ts:591`

### ❌ Not Implemented

**Automation Enhancements (Tier 2+)** - Planning complete, implementation pending (0%)
- First-time setup wizard
- Health monitoring & auto-restart
- Network retry logic (exponential backoff)
- Lock file validation
- VS Code auto-config
- Cross-platform CI (GitHub Actions)

**Technical Debt (Priority P2)**
- UUID-based eye identifiers migration (currently using eye names)
- PipelineDagSchema recreation in `@third-eye/types`
- Session state update logic (stub implementation)
- Strictness override mapping (not yet wired through)

---

## Related Documentation

For detailed implementation status and task tracking:
- **[IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md)** - Complete phase-by-phase status
- **[REMAINING_TASKS.md](../REMAINING_TASKS.md)** - All outstanding tasks by priority (P0-P3)

For technical specifications:
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and component interactions (to be extracted)
- **[PERSONA_SPECIFICATIONS.md](./PERSONA_SPECIFICATIONS.md)** - All 8 Eye persona specifications (to be extracted)
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Complete database schema with SQL (to be extracted)

For operational guides:
- **[README.md](../README.md)** - Getting started and project overview
- **[USER_GUIDE.md](../USER_GUIDE.md)** - End-user documentation
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines
- **[PROVIDER_API_FORMATS.md](../PROVIDER_API_FORMATS.md)** - Technical reference
- **[MODEL_RECOMMENDATIONS.md](../MODEL_RECOMMENDATIONS.md)** - Model selection guidance
- **[AUTOMATION_GAPS.md](../AUTOMATION_GAPS.md)** - Technical analysis of automation opportunities

For development:
- **[CLAUDE.md](../CLAUDE.md)** - Agent instructions and rules

---

## Archived Documentation

The following files have been archived to `docs/archive/` as they have been superseded by this consolidated vision:
- `THIRD_EYE_VISION.md` (v1) - Original concise vision (142 lines)
- `FINAL_OVERSEER_VISION.md` (v1) - Comprehensive implementation blueprint (1,983 lines)

---

**END OF VISION DOCUMENT**

This document represents the complete, authoritative vision for Third Eye MCP, consolidating all strategic direction, architectural decisions, implementation status, and operational guidelines. All team members should refer to this document for understanding the product vision and current state.
