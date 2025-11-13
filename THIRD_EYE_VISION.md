# 🧿 Third Eye MCP · Unified Vision (Release v1)

> **Mission:** Empower every AI agent with an invisible inner perception that clarifies intent, guides creation, validates outputs, and reassures humans through a transparent yet delightful experience. Third Eye never replaces the agent; it amplifies the agent’s judgement.

---

## 1. Core Philosophy

- **Invisible Empowerment:** Humans talk to their preferred agent (Claude, GPT, Cursor, Warp) while Third Eye operates silently through MCP. The human sees only sharper questions and better answers.
- **Two-Phase Intelligence:** Every capability operates in GUIDANCE (pre-creation) and VALIDATION (post-creation) stages. Guidance removes ambiguity; validation confirms alignment and evidence. No shortcuts.
- **Dynamic Routing:** Overseer LLM analyses each request and assembles the optimal pipeline using capability tags. No static routes, no heuristics. If required eye capability absent, we fail fast with actionable telemetry.
- **Strict Single Source of Truth:** Enums, tokens, prompts, themes, pipeline templates, status codes—everything flows from shared TypeScript constants. Literal strings and magic numbers are banned.
- **Local-First Reliability:** Entire platform runs offline with Bun + SQLite + LM Studio (or any OpenAI-compatible endpoint). Deterministic prompts guarantee OSS model compliance.
- **Human-Friendly UX:** Non-technical operators must immediately understand what is happening. Markdown renders as magazine-quality articles. Pipeline editor feels like n8n. Monitor is a cinematic timeline of the agent’s inner thoughts.
- **No Fallbacks, No Heuristics:** When an eye misbehaves, we re-prompt with crystal-clear reminders. We do not auto-patch envelopes or guess. Either the persona complies or we surface a precise error.

---

## 2. Experience Overview

### 2.1 Agent Experience

1. Agent calls single MCP tool `third_eye_overseer` with natural language task and optional draft.
2. Overseer clarifies canonical fields (Audience, Deliverable, Scope, Success Criteria, References) with `NEED_CLARIFICATION` envelope.
3. Agent collects answers from human, resumes session; Overseer generates dynamic capability plan (e.g., Sharingan → Kyuubi → Jōgan → Mangekyō → Tenseigan → Byakugan).
4. Guidance eyes supply structured instructions, briefs, and checkpoints. Agent uses them to craft draft.
5. Validation eyes inspect draft, confirm intent, verify evidence, and approve with explicit codes.
6. Agent receives final readiness verdict, never exposed to internal personas.

### 2.2 Operator Experience

- Launches Third Eye via `npx third-eye-mcp up` → CLI banner shows server/UI URLs.
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

## 3. Capability & Persona Matrix

| Eye                        | Stage                 | Capability Tags                                  | Primary Output                                               | Key Notes                                                                           |
| -------------------------- | --------------------- | ------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| **Overseer**               | Guidance only         | `capability:analysis`, `capability:routing`      | `capabilityPlan`, canonical questions, routing reasoning     | Single MCP entry point; never skipped                                               |
| **Sharingan**              | Guidance              | `capability:clarification`                       | Canonical questions, ambiguity score, resolved facts summary | Re-asks only unanswered questions; emits `OK_NO_CLARIFICATION_NEEDED` when complete |
| **Prompt Helper (Kyuubi)** | Guidance & Validation | `capability:briefing`, `capability:quality_gate` | Detailed brief, success metrics, alignment score             | Validation returns `OK_WITH_NOTES` or `REJECT_INCOMPLETE` only                      |
| **Jōgan**                  | Guidance & Validation | `capability:intent_confirmation`                 | Intent analysis, confirmation prompt, suggested response     | Validation emits `AWAIT_CONFIRMATION` then `OK_INTENT_CONFIRMED`                    |
| **Rinnegan**               | Guidance              | `capability:pipeline_planning`                   | Stepwise action plan, risk notes                             | Optional based on request type                                                      |
| **Mangekyō**               | Validation            | `capability:code_review`                         | Code issues, diffs, severity metrics                         | Works with agent-supplied draft                                                     |
| **Tenseigan**              | Validation            | `capability:factual_validation`                  | Evidence table with citations, status, risk summary          | Requires confirmed citations                                                        |
| **Byakugan**               | Validation            | `capability:final_approval`                      | Final readiness verdict, residual risks, go/no-go            | Always last validation step                                                         |
| **Custom Eyes**            | Dynamic               | Capability tags defined by user                  | Stage templates derived from SSOT                            | Must register capabilities to participate in routing                                |

---

## 4. System Behaviours & Contracts

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

## 5. UI & UX Golden Rules

- **Markdown Rendering:** Use custom components for headings, tables, lists, callouts. Everything should read like a crafted report, not raw Markdown.
- **Pipeline Builder:** Fluid zoom/pan, snap-to-grid, arrowed edges, mini-map, context menus, keyboard shortcuts. Looks and feels like premium automation tool.
- **Monitor:** Human-readable timeline with icons, stage badges, short summaries, and ability to deep dive into clarifications, intent confirmations, evidence, raw JSON.
- **Themes:** Aurora, Midnight, Sakura, Horizon, Emerald, Obsidian. Each offers light and dark palette with accessible contrast. Theme switcher accessible globally.
- **Wow Factors:** Dashboard hero text, metrics cards, real-time session stats, "Third Eye in Action" highlight showing pipeline timeline snippet.
- **Accessibility:** WCAG AA, semantic HTML, ARIA labels, focus outlines, keyboard shortcuts.

---

## 6. Documentation & Operational Discipline

- **This document** (`THIRD_EYE_VISION.md`) is the sole vision source. Previous vision files are removed.
- **RESTORATION_PLAN.md** maps vision to actionable tasks and references BMAD artifacts.
- **PRD & Architecture** (BMAD format) capture requirements and system design.
- **Go-Live Checklist** enumerates scenario runs, manual QA steps, doc reviews.
- **Backups** (daily git bundles, OS snapshots) mandatory to prevent data loss recurrence.
- **AGENTS.md** remains rulebook: SSOT, no heuristics, no content generation, dynamic capabilities.

---

## 7. Example End-to-End Flows

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

## 8. Release Definition of Done

- All epics and stories from BMAD artifacts implemented and tested.
- Scenario harness runs for every example complete without manual intervention.
- UI polished across all pages, dark/light themes, responsive layout, accessible components.
- Documentation updated (vision, PRD, architecture, go-live checklist, README, USER_GUIDE, CONTRIBUTING). Old vision files removed.
- Backups configured and documented; commit discipline enforced.
- `npx third-eye-mcp up` prints READY banner; UI + server accessible; database seeded.

---

**Third Eye MCP v1 ships only when agents, humans, and maintainers each experience the product exactly as described above. No compromises, no regressions, no shortcuts.**
