# Third Eye MCP Restoration Product Requirements Document (PRD)

> **Objective:** Rebuild the Third Eye MCP platform exactly as it existed prior to the accidental `git clean -fd`, ensuring every capability, UX expectation, and systems contract described in the historical vision documents is reinstated and future-proofed.

---

## 1. Vision & Guiding Principles
- Third Eye is the invisible inner perception system for external AI agents. We never generate content; we guide and validate agents so humans only see improved results.
- Overseer is the single MCP entry point; every flow (clarification, routing, validation, approvals) must operate through it without exposing internal eyes.
- Strict Single Source of Truth (SSOT) controls every string, token, enum, color, prompt. No literals, no heuristics, no fallbacks.
- Local-first, offline-friendly stack with deterministic behaviour across OSS and hosted LLM providers.
- UI/UX must delight non-technical operators: accessible, human-readable markdown, six selectable themes, intuitive pipeline editing, transparent monitor.
- Customisation is core: personas, eyes, pipelines, providers, and capabilities are dynamically configurable.

## 2. Target Users & Personas
- **Non-technical operators** (product managers, founders, experts) who supervise AI agents via the live monitor and dashboards.
- **AI agents** (external LLM-powered assistants) that call the MCP tool to gain clarifications, plans, and validation checks.
- **System integrators / OSS contributors** who extend Third Eye with new eyes, personas, and themes; they require clean SSOT modules and readable docs.

## 3. Product Goals
1. Restore every lost feature, data model, and UX experience documented across historic visions.
2. Guarantee that all sample flows (Flutter web build, macOS Amethyst troubleshooting, code review, factual validation, plan drafting) complete end-to-end through Byakugan using LM Studio or hosted providers.
3. Provide rich telemetry (timeline, clarifications, validation evidence) that non-technical users can understand instantly.
4. Ensure absolute configurability for custom eyes/personas/pipelines without code changes.
5. Publish a single consolidated vision document that supersedes previous drafts.

## 4. Success Metrics
- 100% of scenarios in `scripts/run-mcp-scenarios.ts` reach final approval without manual patching or fallbacks.
- `npx third-eye-mcp up` runs cleanly on fresh checkout; monitor auto-opens with active session.
- Persona CRUD, Eye CRUD, Pipeline editor, Session management, Monitor, Replay, Wow factors all operate from shared session context and theme system.
- Documentation (Vision, PRD, Architecture, Go-live checklist) fully reflects restored implementation and passes manual QA review.
- LM Studio (GPT-OSS-20B or MLX equivalent) produces valid JSON envelopes for every persona using deterministic prompts.

## 5. Scope Overview
### Included
- Reinstating SSOT constants, capability matrices, stage templates, theme tokens.
- Rewriting persona blueprints, runtime renderer, guard tests, and seeds.
- Restoring capability-driven router, order guard, orchestrator, session manager, MCP bridge.
- Recreating UI modules: Dashboard, Personas, Eyes, Pipelines editor, Sessions, Monitor, Replay, Settings.
- Regenerating live monitor telemetry, clarification handling, intent confirmation, validation evidence panels.
- Reauthoring docs (vision, go-live checklist, restoration plan, contributors guide) to match final implementation.

### Excluded
- New experimental features beyond the documented vision.
- Hosted multi-tenant deployment (still local-first).
- Lint debt unrelated to restoration.

## 6. Functional Requirements
1. **MCP Interface**
   - Expose only `third_eye_overseer` with JSON schema input (`task`, `sessionId?`, `context?`, `strictness?`).
   - When new session starts, emit webhook opening monitor with `sessionId` preselected.
   - Return payload containing status, code, summary, metadata, history, capability plan, clarifications, evidence.
2. **Dynamic Capability Routing**
   - Overseer analyses request type + content domain → builds capability plan using SSOT stage templates.
   - Auto-router respects stored progress, resumes at next validation assignment after agent delivers draft.
   - Order guard prevents out-of-order execution and provides progress serialization for UI.
3. **Persona System**
   - Blueprints stored in TypeScript with metadata, phases, envelope skeletons, canonical examples, reminders.
   - Runtime renderer selects stage-specific template, injects capability context, appends self-check block.
   - Guards validate envelopes strictly; violations trigger retry with behaviour reminder (never heuristics).
4. **Clarification & Intent Flow**
   - Sharingan issues exactly the canonical questions (audience, deliverable, scope, success criteria, references).
   - Session Manager stores questions, answers, resolved facts, ambiguity/confidence, answer summaries.
   - Jōgan captures human confirmation, session resumes automatically when approval logged.
5. **Validation & Evidence**
   - Kyuubi, Mangekyō, Tenseigan, Byakugan produce validation codes (`OK_WITH_NOTES`, `OK_INTENT_CONFIRMED`, etc.) with structured rationale.
   - Evidence includes citations, code diffs, risk tables as per stage template.
6. **UI Modules**
   - Global session dropdown drives context across Dashboard, Personas, Eyes, Pipelines, Sessions, Monitor, Replay, Wow factors.
   - Markdown renderer outputs polished articles with callouts, tables, responsive design.
   - Pipeline builder offers zoom, pan, drag, validation, templates, import/export.
   - Monitor shows capability timeline, clarifications, intent confirmation, evidence, raw JSON.
   - Personas/Eyes CRUD provide form-based editing + human-readable detail view.
7. **Theme System**
   - Six named themes (Aurora, Midnight, Sakura, Horizon, Emerald, Obsidian) each with light/dark variants.
   - CSS variable tokens for colors, typography, spacing, radii, shadows; accessible contrast.
8. **Documentation**
   - `THIRD_EYE_VISION.md` (new consolidated vision) becomes single source of philosophy and examples.
   - `RESTORATION_PLAN.md` references BMAD artifacts and links to implementation status.
   - `go_live_checklist.md` updated to reflect restored features and QA steps.

## 7. Non-Functional Requirements
- Deterministic persona prompts; zero heuristics or random fallbacks.
- Offline-first builds (no network dependency during runtime besides configured providers).
- Accessible UI (WCAG AA) with keyboard navigation and screen reader hints for major components.
- Strict TypeScript configuration: `strict`, `noImplicitAny`, `exactOptionalPropertyTypes`.
- Automated tests covering core flows; manual QA checklist executed before release.
- Robust logging for runs, clarifications, telemetry (configurable log level).

## 8. User Workflows
1. **Agent Run**: External agent calls MCP → Overseer clarifies → Agent answers via user → Auto-router resumes guidance/validation → Final approval → Monitor timeline shows full journey → Replay accessible.
2. **Persona Customisation**: Admin edits persona via UI form → Changes propagate to seeds → `bun run build:eyes` updates runtime prompts.
3. **Pipeline Editing**: Operator drags eyes on canvas → Validates sequence (guidance before validation) → Saves to DB → Auto-router uses pipeline when matching capability.
4. **Monitoring & Clarifications**: Operator views outstanding clarifications, resolves them, sees resolved facts and ambiguity metrics update instantly.
5. **Theme Switch**: User selects different theme → All pages update CSS variables, preference persisted.

## 9. Dependencies & Constraints
- Bun runtime >=1.0, Node >=20 for tooling.
- SQLite database stored in `~/.third-eye-mcp/mcp.db` with drizzle migrations.
- LM Studio + GPT-OSS-20B (or MLX variant) configured on `http://127.0.0.1:1234/v1`; ability to override provider per eye from UI.
- Groq/OpenAI optional but must obey same prompt contracts.
- Webhooks rely on local OS to open default browser; handle 429 gracefully.

## 10. Acceptance Criteria Summary
- [ ] All BMAD artifacts (PRD, Architecture, Epics, Stories) published and kept in sync with implementation.
- [ ] `RESTORATION_PLAN.md` references these artifacts and tracks restoration status.
- [ ] `THIRD_EYE_VISION.md` replaces previous vision files; old vision docs removed.
- [ ] Scenario harness runs for all provided examples (Flutter, Amethyst, code review, factual validation, planning) succeed end-to-end without manual intervention.
- [ ] Monitor UI displays capability timeline, clarifications, intent confirmation, evidence, raw JSON for each session.
- [ ] Pipeline editor, personas, eyes, sessions, dashboard, wow factors all restored with original UX polish.
- [ ] Theme system offers six selectable themes with dark/light variants.
- [ ] Documentation (README, USER_GUIDE, go_live_checklist) updated to reflect final platform.

---

**This PRD is the authoritative contract for the restoration project. Every epic, story, and implementation decision must map back to these requirements.**
