# RESTORATION_PLAN.md

> **Mission:** Recreate the Third Eye MCP platform exactly as it existed before the `git clean -fd` accident. This document is the exhaustive source of truth describing every subsystem, feature, UX guideline, and engineering practice we implemented. Follow it meticulously. Commit frequently. Do not skip any subsection.

---

## Table of Contents
0. [BMAD Artefact Index](#0-bmad-artefact-index)
1. [Context & Philosophy](#1-context--philosophy)
2. [Global Requirements Checklist](#2-global-requirements-checklist)
3. [Repository & Tooling](#3-repository--tooling)
4. [Constants & SSOT Modules](#4-constants--ssot-modules)
5. [Persona Engine](#5-persona-engine)
6. [Capability Router & Orchestration](#6-capability-router--orchestration)
7. [Clarification Pipeline & Session Storage](#7-clarification-pipeline--session-storage)
8. [MCP Server & Bridges](#8-mcp-server--bridges)
9. [Themes & Design System](#9-themes--design-system)
10. [Frontend Modules](#10-frontend-modules)
11. [Pipeline Builder Experience](#11-pipeline-builder-experience)
12. [Live Monitor & Telemetry](#12-live-monitor--telemetry)
13. [Documentation & Vision Alignment](#13-documentation--vision-alignment)
14. [Testing, Scenarios, and QA](#14-testing-scenarios-and-qa)
15. [Recovery Timeline & Milestones](#15-recovery-timeline--milestones)
16. [Post-Restore Safeguards](#16-post-restore-safeguards)
17. [Appendices](#17-appendices)

---

## 0. BMAD Artefact Index
- **Vision**: `THIRD_EYE_VISION.md`
- **Product Requirements Document**: `docs/prd.md`
- **Architecture Specification**: `docs/architecture.md`
- **Epics**: `docs/epics/epic-01-ssot-foundations.md` through `epic-05-validation-docs.md`
- **Stories**: Embedded within each epic; use BMAD agents to translate stories into actionable tasks.

> When using Cursor/Cline/VS Code BMAD agents, load the PRD and relevant epic/story files first, then consult this restoration plan for deeper implementation detail.

---

## 1. Context & Philosophy
- **Third Eye = Inner Thought**: Agents (Claude, GPT, etc.) rely on us to clarify ambiguity, validate evidence, and gate output. We are their internal monologue.
- **Target Audience**: Non-technical operators (PMs, founders, domain experts) who need to monitor and correct AI agents without understanding code.
- **SSOT Everywhere**: No literal strings for statuses, colors, prompts, or tokens. Everything flows from shared constants and TypeScript enums.
- **Local-First & Open Source**: Entire stack runs offline. No mocks, no placeholders. Community contributors should understand structure instantly.
- **Overseer is the single entry point**: Agents use MCP to call `third_eye_overseer`. Eyes/personas remain internal.
- **No Heuristics**: If the LLM misbehaves, we re-prompt with strict instructions. We never accept partial or best-effort outputs.
- **UI Excellence**: Markdown renders as polished articles. Pipeline editing rivals n8n. Monitor screen communicates decisions visually.
- **Themes & Aesthetics**: Six named themes with light/dark variants anchored in a design system. Consistency builds trust.

---

## 2. Global Requirements Checklist
> Use this list to verify that every critical cross-cutting rule is respected.

- [ ] All strings/numbers come from `packages/constants` or `packages/theme`.
- [ ] Every persona obeys the canonical clarification questions and envelope skeleton.
- [ ] LM Studio GPT-OSS-20B (temperature 0) configured as default provider for all eyes.
- [ ] Markdown renderer produces accessible, human-readable output (headings, tables, callouts).
- [ ] Pipeline builder has zoom, drag, auto-layout, and card-based nodes.
- [ ] Monitor page includes Timeline, Clarifications, Intent Confirmation, Evidence, Raw JSON tabs.
- [ ] Sessions dropdown drives every page state (Monitor, Personas, Pipelines, Wow Factors).
- [ ] Webhook auto-opens Monitor with selected session context.
- [ ] MCP tool list exposes exactly one tool: `third_eye_overseer`.
- [ ] No legacy code, mocks, or fallback logic present.
- [ ] Go-live checklist executed with scenario transcripts captured.

---

## 3. Repository & Tooling
### 3.1 Directory Structure
```
root/
  apps/
    server/
    ui/
  packages/
    constants/
    types/
    config/
    db/
    eyes/
    core/
    providers/
    mcp/
    theme/
  scripts/
  docs/
  examples/
  .github/
  .codex/
```

### 3.2 Toolchain
- **Runtime**: Bun (>=1.0) for builds, scripts, dev server.
- **Language**: TypeScript strict mode (`strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true`).
- **Database**: SQLite with drizzle ORM.
- **UI**: Next.js (app router), React 18, Tailwind-like utility via CSS variables from theme.
- **Testing**: Vitest + Playwright (optional for UI interactions).
- **Formatting**: Prettier, ESLint (custom rules, no implicit any, import sorting).

### 3.3 Scripts (root `package.json`)
- `bun run build:constants`, `build:types`, `build:config`, `build:db`, `build:eyes`, `build:core`, `build:providers`, `build:mcp`.
- `bun run build:server` runs Next.js build via `apps/server` script.
- `bun run build:ui` builds Next.js app under `apps/ui`.
- `bun run build:cli` compiles CLI entry points (`dist/cli.js`, `dist/mcp-server.js`).
- `bun run typecheck`, `bun run lint`, `bunx vitest`, `bunx playwright test`.

### 3.4 Git Discipline
- Commit after each subsystem reconstruction.
- Use branches for major modules (e.g., `restore/personas`, `restore/orchestrator`).
- Push to remote frequently; configure private repository if needed.

---

## 4. Constants & SSOT Modules

### 4.1 `packages/constants/taxonomy.ts`
- Enums: `EyeId`, `EyeStatusCode`, `EyeStageToken`, `RequestType`, `ContentDomain`, `CapabilityTag`, `UiTextTokens`, `UiIconTokens`, `UiColorTokens`.
- Ensure `EyeId` covers built-ins plus slot for custom eyes.

### 4.2 `packages/constants/clarifications.ts`
- `ClarificationFieldTokens` (AUDIENCE, DELIVERABLE, SCOPE, SUCCESS_CRITERIA, REFERENCES).
- `CLARIFICATION_FIELD_PROMPTS`: canonical question text (no extra words).
- `CLARIFICATION_FIELD_SET`, `REQUIRED_CLARIFICATION_FIELDS`.
- Fallback/resolved strings for logging.

### 4.3 `packages/constants/stage-envelopes.ts`
- Stage template map `stageTemplates[EyeId][EyeStageToken]` with fields:
  - `allowedCodes`: array of `EyeStatusCode`.
  - `skeleton`: JSON string (strict property order).
  - `checklist`: bullet points summarizing stage-specific requirements.
- `buildStageEnvelopeJsonSchema(eyeId, stage)` returns schema for response format.
- `getStageTemplate` helper.

### 4.4 `packages/constants/capability-plan.ts`
- Define `CAPABILITY_ASSIGNMENTS` per eye.
- Provide `resolveCapabilityPlan(requestType, contentDomain)` to build sequence dynamic.
- Include fallback for custom eyes (SSOT must be extendable).

### 4.5 `packages/constants/theme.ts`
- Six themes (e.g., Aurora, Midnight, Sakura, Horizon, Emerald, Obsidian), each with `light` and `dark` tokens.
- Tokens: colors, fonts, radii, spacing, shadows.
- Export Theme registry for UI consumption.

### 4.6 Exports
- `packages/constants/index.ts` exports all modules for easy import.
- Integrate with `packages/types` for TypeScript type definitions (interfaces, zod schemas).

---

## 5. Persona Engine

### 5.1 Blueprint Files
- `packages/eyes/src/personas/{overseer,sharingan,kyuubi,jogan,rinnegan,mangekyo,tenseigan,byakugan}.ts`.
- Each blueprint includes:
  - `metadata`: `eyeId`, `displayName`, `tagline`, `description`, `version`, `capabilities` (array of `CapabilityTag`).
  - `mission`: single string summarizing purpose.
  - `overview`: array of sections `{ title, bulletPoints }` covering guardrails.
  - `phases`:
    - `title`: e.g., "Guidance (Pre-Creation)".
    - `summary`: plain text.
    - `sections`: each with `title`, `bulletPoints`. Example bullet: "`data.capabilityPlan.assignments` lists {order, stage, eyeId, capabilities, capabilityLabels}."
  - `envelope`: `title`, `body` (list of rules about tag, allowed codes, ui tokens, questions, next).
  - `reminders`: array of short imperative strings.
  - `examples`: array of `{ title, description, payload }` with canonical JSON sample.

### 5.2 Definitions & Seeds
- `packages/eyes/src/definitions.ts`: imports all blueprints, constructs `DEFAULT_PERSONAS` array and `DEFAULT_PERSONA_MAP` keyed by `eye`.
- `packages/db/seed-data/personas/*.md`: Markdown representation for docs.
- `packages/db/seed.ts`: uses drizzle to insert or upsert persona records; ensures version stored to detect updates.

### 5.3 Runtime Renderer
- `packages/eyes/src/runtime/render-persona.ts` compose persona prompt.
- Must support:
  - Guidance vs validation stage detection based on `options.capabilityContext.currentAssignment.stage`.
  - Example selection: prefer stage-specific example (false `ok` for guidance, true `ok` for validation).
  - Self-check bullet appended at end.

### 5.4 Persona Guards
- `ensureOverseerBehavior(envelope)` checks pipeline route, capability plan, canonical questions, `next` semantics.
- `ensureSharinganBehavior(envelope)` enforces canonical questions, metrics, resolved summary length.
- `ensureKyuubiBehavior(envelope)` ensures `brief`, `qualityScore`, `alignment` structure.
- `ensureJoganBehavior`, `ensureMangekyoBehavior`, `ensureTenseiganBehavior`, `ensureByakuganBehavior` similar.
- Provide `ensureEyeBehavior(eyeId, envelope)` dispatcher.

### 5.5 Tests
- `packages/eyes/__tests__/envelope-schema-enhanced.test.ts` verifying examples match stage skeleton.
- `packages/core/__tests__/persona-guards.test.ts` to ensure guard rejects deviations (including canonical question text).

---

## 6. Capability Router & Orchestration

### 6.1 Order Guard (`packages/core/order-guard.ts`)
- Data structures: `CapabilityPlan`, `CapabilityAssignment`, `CapabilityProgress` with sets for completed assignments.
- Methods:
  - `setDynamicPlan(sessionId, plan)`.
  - `validateOrder(sessionId, eyeName)` footgun guard.
  - `recordEyeCompletion(sessionId, runRecord)` storing metadata.
  - `getCapabilityProgress(sessionId)` returning progress state.
  - `serializeCapabilityProgress` for persistence.
- Must handle custom eyes/capabilities gracefully.

### 6.2 Eye Orchestrator (`packages/core/orchestrator.ts`)
- Methods:
  - `createSession(config)`: insert session, return portal URL.
  - `runEye(eyeName, input, sessionId, options)`: core execution.
  - `buildPersonaPrompt` uses renderer.
  - `resolveRouting` obtains provider preference (default + override table).
  - `buildProviderConfig` decrypts stored keys (AES).
  - `parseEnvelope` handles JSON parsing, fallback for fenced code.
  - `validateEnvelopeForEye` ensures requestType/contentDomain/pipeline route align.
  - `validateOverseerEnvelope` (shared logic for pipeline plan alignment).
  - `finalizeSession` marks session completed.
- Behavior: after completion, call `ensureEyeBehavior`. On violation, set `lastError`, increment `attempt`, adjust reminder, retry until `MAX_PERSONA_RETRIES` (3).
- Record run in `runs` table, broadcast WebSocket event, update pipeline event log.

### 6.3 Auto Router (`packages/core/auto-router.ts`)
- `executeFlow(input, options?)`:
  1. Create/resume session, call `resolveCapabilityPlan` (if no stored plan).
  2. Call Overseer to produce plan/clarifications.
  3. Iterate assignments: send `EYE_STARTED` event, call orchestrator, store `EYE_COMPLETE` event.
  4. If envelope needs input, pause: update `SessionManager` with clarifications/resolved facts, return `paused` result.
  5. If no pauses, finalize session and return `completed`.
- `resumeFlow(sessionId, options)`:
  - Accept optional `agentDraft`, `strictness`, `context` overrides.
  - Append clarifications summary/draft/resolved facts to input.
  - Skip completed guidance assignments; start at first validation assignment.
  - Continue until paused or completed.
- `buildClarificationDirective` function to summarise unresolved fields, instruct next steps.
- Logging via `log.debug` when `DEBUG_MCP_SCENARIOS` enabled.

### 6.4 Capability Payloads
- `buildCapabilityPayload(plan, progress, assignment, status)` create object for UI (includes stage token, capability labels, human summary).
- `annotateCapabilityPlan(reqPlan, completedAssignments, nextAssignment, upcomingAssignment)` fix timeline data.
- `serializeCapabilityProgress` stores completed orders and next assignment index.

### 6.5 Data Flow
- On each run, orchestrator writes to `runs` table; auto-router stores clarifications/resolved facts via `SessionManager`.
- Monitor UI subscribes to WebSocket events keyed by session ID.

---

## 7. Clarification Pipeline & Session Storage

### 7.1 Session Manager (`packages/core/session-manager.ts`)
- Manage `sessions`, `runs`, `clarifications`, `intent_confirmations` entries via drizzle.
- Functions:
  - `createSessionRecord`, `updateSession`, `getSession`.
  - `addClarificationRequest`: store question list, ambiguity score, guidance markdown.
  - `resolveClarification`: map answers to canonical fields, update `resolvedFacts`, mark status `answered`.
  - `saveRoutingContext`: persist capabilityPlan, progress, strictness, resolved facts.
  - `getRoutingContext`: fetch stored context for resume.
  - `logIntentConfirmation`: store Jōgan confirmations.
  - `storeAgentDelivery`: persist agent draft markdown.
- `normalizeResolvedFacts` ensures trimmed strings, canonical keys only.

### 7.2 Database Schema (drizzle)
- Tables include columns with correct types and constraints. Example `Clarifications` table:
  - `id TEXT PRIMARY KEY`
  - `sessionId TEXT`
  - `questions JSON` (array of {id, text})
  - `answers JSON`
  - `ambiguityScore INTEGER`
  - `confidence INTEGER`
  - `guidanceMd TEXT`
  - `status ENUM('pending','answered')`
  - Timestamps.

### 7.3 Clarification Enforcements
- Sharingan/Overseer must request canonical questions; guard rejects otherwise.
- `missingClarificationFields` computed from `REQUIRED_CLARIFICATION_FIELDS` minus resolved facts.
- Monitor UI shows outstanding vs answered questions with tags (audience/deliverable/etc.).

### 7.4 Intent Confirmation Loop
- Jōgan emits `AWAIT_CONFIRMATION` with `intentAnalysis` and `confirmationPrompt`.
- Session manager log human response (Yes/Adjust). Auto-router resume uses the stored decision to continue.

---

## 8. MCP Server & Bridges

### 8.1 `packages/mcp/server.ts`
- Implements Model Context Protocol server with single tool `third_eye_overseer`.
- On `tools/list`, return only this tool with JSON schema input.
- On `tools/call`:
  1. Parse input (`task`, optional `sessionId`, optional `context`, `strictness`).
  2. If `sessionId` provided, call `autoRouter.resumeFlow`, else `executeFlow`.
  3. Stream results (status, summary, metadata, capability plan, clarifications, history).
- On new session creation, fire webhook to open monitor page.
- Provide CLI entry command `bunx third-eye-mcp up` (starts server + UI + DB) logging status banner.

### 8.2 Bridge Telemetry
- `MCP_LOG_LEVEL` env var controls logging.
- When session created/resumed, output telemetry JSON for debugging (session ID, capability plan, steps executed).
- Portal URL includes `?sessionId=<id>` to auto-select session in UI.

### 8.3 Security
- Authenticate MCP clients with API key if set.
- Use TLS if exposing outside local environment (future improvement).

---

## 9. Themes & Design System

### 9.1 Theme Architecture
- `packages/theme/themes.ts`: define 6 theme objects (`ThemeName`, `light` + `dark`).
- `ThemeContext` (React) reads tokens and exposes CSS variables.
- Provide storybook-style documentation in `docs/theme-accessibility-report.md`.

### 9.2 Token Categories
- Color palette: background, surface, primary, accent, success, warning, danger, muted.
- Typography: font families, weights, heading sizes, body sizes, letter spacing.
- Spacing scale (4px multiples: 4, 8, 12, 16, 24, 32, etc.).
- Border radii (e.g., `--radius-sm`, `--radius-lg`).
- Shadows (`--shadow-sm`, `--shadow-md`, `--shadow-lg`).

### 9.3 Theme Switcher
- Implement React hook `useTheme()` to toggle theme + mode (light/dark + system).
- Theme selection stored in localStorage, fallback to system preference.
- Provide preview dropdown with theme name & color swatch.

### 9.4 Markdown Styling
- Custom components: `<MarkdownArticle>`, `<MarkdownHeading>`, `<MarkdownTable>`, `<MarkdownList>`, `<Callout type="info"|"warning"|"success">`.
- Ensure tables responsive via horizontal scroll if necessary.
- Inline code and code blocks styled using theme accent color.
- Provide option to export Markdown as PDF (Render to print stylesheet).

---

## 10. Frontend Modules

### 10.1 Global Layout
- `/apps/ui/src/app/layout.tsx` sets up theme provider, session provider, navigation.
- Header: session dropdown, theme switcher, quick search, "Agents rely on your Third Eye" messaging.
- Sidebar: sections (Dashboard, Personas, Eyes, Pipelines, Sessions, Monitor, Replay, Settings).

### 10.2 Personas Module (`apps/ui/src/app/personas`)
- **List**: Table with columns (Eye Icon, Name, Version, Capabilities, Last Updated, Actions).
- **Create/Edit Form**: Multi-step form with sections for mission, overview bullet points, phases (Guidance/Validation). Provide rich text editors for bullet lists, allow drag ordering.
- **Detail View**: Render blueprint as human-readable article with anchor Links (Overview, Phases, Examples).
- **Version History**: Optional view (table listing versions, author, timestamp).

### 10.3 Eyes Module (`apps/ui/src/app/eyes`)
- Similar to personas but focusing on capability tags, default providers, persona association.
- Custom eyes creation form (name, description, capability tags, default prompts).

### 10.4 Pipelines Module (`apps/ui/src/app/pipelines`)
- See Section 11 for pipeline editor specifics.
- Additional views: pipeline list (name, description, steps count, last run), pipeline detail (graph preview + metadata).

### 10.5 Sessions Module (`apps/ui/src/app/sessions`)
- List of sessions with status chips, agent name, model, created/updated times.
- Detail page: show timeline of runs, clarifications, decision logs, ability to resume or terminate session.
- Provide filter/search for sessions by agent, status, date.

### 10.6 Monitor (`apps/ui/src/app/monitor`)
- See Section 12 for detailed implementation.

### 10.7 Replay (`apps/ui/src/app/replay`)
- List past sessions with export options (Markdown/PDF).
- Playback controls to step through timeline events, highlight clarifications/resolved facts.

### 10.8 Settings (`apps/ui/src/app/settings`)
- Manage provider keys, theme preferences, admin credentials, pipeline defaults.
- Provide warnings when keys missing or encryption key not set.

### 10.9 Dashboard / Wow Factors (`apps/ui/src/app/page.tsx`)
- Show metrics (total sessions, average clarification time, resolved fact count, approvals rate).
- Highlight third eye concept with hero illustration, tagline.
- Display quick actions ("Start new session", "View monitor", "Customize personas").

---

## 11. Pipeline Builder Experience

### 11.1 Canvas Basics
- Use canvas or SVG-based editor (React Flow or custom) with smooth pan/zoom.
- Controls: scroll to zoom, drag to pan, double-click to add node.
- Node cards display: Eye icon, name, stage (Guidance/Validation), capability list.
- Connectors: curved edges with arrowheads. Snap to ports.

### 11.2 Interactions
- Click node to expand details (markdown summary, persona link).
- Right-click context menu: edit node, duplicate, delete.
- Drag connector from output to input to create edge; show tooltip when valid connection.
- Keyboard shortcuts: `Cmd/Ctrl + +/-` zoom, `Cmd/Ctrl + 0` reset, `Esc` deselect.

### 11.3 Validation Rules
- Guidance eyes must precede validation eyes (order guard).
- Pipeline must contain at least one validation eye and final approval (Byakugan or equivalent capability).
- No orphan nodes or disconnected components.
- On save, serialize graph to JSON (nodes with positions, edges). Store in `pipelines` table.

### 11.4 Templates & Import/Export
- Provide pre-built pipeline templates (default Third Eye pipeline, troubleshooting pipeline).
- Support import/export of pipeline JSON.

### 11.5 UI polish
- Provide mini-map in corner for navigation.
- Show capability badges (clarification, validation) on nodes.
- Provide error overlays when validation fails (e.g., red border around node missing connection).

---

## 12. Live Monitor & Telemetry

### 12.1 Layout
- Top header: session info (agent name, model, request type, status, theme toggle).
- Tabs:
  1. **Timeline**: vertical list of events with time, eye icon, stage badge, summary markdown.
  2. **Clarifications**: two columns (Outstanding vs Resolved). Resolved show quote with field label.
  3. **Intent Confirmation**: Jōgan approval status, human answer, timestamp.
  4. **Evidence & Validation**: metrics from Mangekyō/Tenseigan/Byakugan (evidence score, citation list, final notes).
  5. **Raw JSON**: collapsible JSON viewer with copy button.
- Provide "Follow events" toggle to auto-scroll.

### 12.2 Real-time Updates
- WebSocket events map to UI updates.
- When new session created (via webhook), Monitor auto-opens with correct session selected.
- Provide toast notifications for key events (Session paused awaiting clarifications, Session approved).

### 12.3 Clarification Detail
- Each question card: field icon, question text, answer (if available), ambiguity/confidence progress bar.
- Show time to resolution metrics.

### 12.4 Intent Confirmation
- Display human responder (from `intentConfirmations` table), message, approval boolean.
- Provide "Resume session" button if awaiting response.

### 12.5 Evidence Panel
- For Tenseigan: list citations with status (Verified, Requires Evidence).
- For Mangekyō: show code review issues, suggestions.
- For Byakugan: show final readiness checklist, risk assessment rows (title, severity, mitigation).

---

## 13. Documentation & Vision Alignment

### 13.1 Vision Files
- **GO_LIVE_OVERSEER_VISION.md**: step-by-step example of ideal session (markdown with timeline, clarifications, final approval).
- **FINAL_OVERSEER_VISION.md**: conceptual description of how third eye empowers agents.
- **THIRD_EYE_NEW_VISION.md**: updated UX vision, WOW factors, pipeline editor expectations.

### 13.2 AGENTS.md
- Contains non-negotiable rules (SSOT, no heuristics, no content drafting, capability adherence). Reference in code comments where relevant.

### 13.3 README & Contributor Docs
- README: quickstart (install bun, run `bunx third-eye-mcp up`, open portal).
- CONTRIBUTING: how to run builds, test, submit PR.
- USER_GUIDE: non-technical walkthrough (create session, monitor, adjust personas).
- go_live_checklist.md: bullet list of pre-release checks (scenarios, UI validation, docs updated, keys configured).

---

## 14. Testing, Scenarios, and QA

### 14.1 Automated Tests
- Persona guard tests validate canonical question enforcement.
- Capability router tests ensure dynamic routes for various `RequestType`/`ContentDomain` combinations.
- Session manager tests for clarification resolution.
- Pipeline editor tests (if possible) to ensure validation logic.

### 14.2 Scenario Runner (`scripts/run-mcp-scenarios.ts`)
- Flutter Web scenario (detailed clarifications → plan → validation → Byakugan approval). Logs to `docs/remediation/persona-debug/`.
- MacOS Amethyst troubleshooting scenario (issue diagnosis → Kyuubi plan → custom eyes → final approval).
- CLI options: `THIRD_EYE_DEBUG_PERSONAS=true DEBUG_MCP_SCENARIOS=true bun run scripts/run-mcp-scenarios.ts`.
- Log files include status, code, summary, metadata, history, capabilityPlan.

### 14.3 Manual QA Checklist
- [ ] Launch `npx third-eye-mcp up` (server + UI + DB) without errors.
- [ ] Trigger MCP session; confirm portal auto-open selects session.
- [ ] Monitor timeline updates live with clarifications panel.
- [ ] Persona CRUD: create, edit, delete, view with Markdown rendering.
- [ ] Pipeline editor: create new pipeline, validate, save, reload.
- [ ] Theme switcher toggles between 6 themes + dark/light.
- [ ] Session dropdown filters all modules (wow factors, monitor, replay).
- [ ] Replay exports Markdown/PDF.
- [ ] go_live_checklist executed.

---

## 15. Recovery Timeline & Milestones

| Day | Focus | Deliverables |
|-----|-------|--------------|
| 1 | Repo scaffold & constants | Directory tree, theme tokens, taxonomy enums, README restored |
| 2 | Personas & renderer | All persona blueprints, definitions, seeds, guard tests passing |
| 3 | Capability router & session manager | resolveCapabilityPlan, order guard, session storage |
| 4 | Orchestrator & auto-router | runEye, executeFlow, resumeFlow, provider config |
| 5 | API routes & MCP server | REST endpoints, WebSocket bridge, MCP tool |
| 6 | UI modules | Personas, Eyes, Pipelines editor, Sessions |
| 7 | Monitor & replay | Timeline tabs, clarifications panel, theme switcher |
| 8 | Scenario runner & QA | MCP scenarios green, manual checklist complete |
| 9 | Documentation & go-live | Vision docs aligned, go-live checklist signed |

Adjust timeline based on team size, but do not overlap critical steps without commit checkpoints.

---

## 16. Post-Restore Safeguards
- Request IT-managed backups (Time Machine, APFS snapshots, corporate MDM) for the device.
- Set up nightly `git bundle create backups/third-eye-$(date +%Y%m%d).bundle HEAD`.
- Configure automated remote backup (private repo or secure storage).
- Ensure editors (Zed) have autosave history retained; consider additional plugin to export history.
- Add pre-commit hook disallowing `git clean -fd` without branch push (optional).

---

## 17. Appendices

### Appendix A – Glossary
- **Eye**: LLM persona responsible for a capability stage.
- **Capability Plan**: Ordered sequence of eyes and assignments generated by Overseer.
- **Clarification Fields**: Canonical questions (audience, deliverable, scope, success criteria, references).
- **Intent Confirmation**: Human approval step orchestrated by Jōgan.
- **Telemetry**: Real-time events broadcast to monitor UI.

### Appendix B – Example Flow (Flutter Web Scenario)
1. Agent calls `third_eye_overseer` with task description.
2. Overseer issues `NEED_CLARIFICATION` with five canonical questions.
3. Sharingan reiterates clarifications if answers missing.
4. After answers, Sharingan emits `OK_NO_CLARIFICATION_NEEDED` with resolved facts.
5. Kyuubi generates blueprint, Jōgan seeks intent confirmation.
6. Mangekyō/Tenseigan validate evidence, Byakugan approves.
7. Pipeline completes; monitor timeline shows all steps; replay logs available.

### Appendix C – File Restoration Tracker
Create a spreadsheet or checklist referencing each file path (constants, personas, UI components) and mark as restored. Example columns: `Path`, `Status`, `Notes`, `Commit Hash`.

### Appendix D – Helpful Commands
- `bunx third-eye-mcp up` – start server, UI, DB, logs banner.
- `bun run scripts/run-mcp-scenarios.ts` – execute scenarios.
- `bun run build:packages` – compile all packages.
- `bun run seed -- --force` – reseed personas/eyes.
- `sqlite3 ~/.third-eye-mcp/mcp.db '.tables'` – inspect DB tables.

### Appendix E – Emergency Recovery Steps
1. If `git clean` occurs again, immediately duplicate repo folder (`cp -R project project_backup`).
2. Run file recovery tool (Disk Drill/TestDisk) before writing to disk.
3. Restore from git bundle or remote repo.
4. Update RESTORATION_PLAN.md with any new lessons.

---

**Remember:** We make agents 10x more powerful by being their conscience, not their mouth. This plan rebuilds that conscience. Stay calm, follow each step, and commit early.
