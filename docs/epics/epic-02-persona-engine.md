# Epic 02 · Persona Engine & Clarification Pipeline

**Goal:** Restore all persona blueprints, runtime rendering, guard enforcement, and clarification/intent workflows so each eye behaves deterministically with canonical envelopes.

## Outcomes
- Persona blueprints reconstructed with mission, phases, envelope rules, reminders, canonical examples.
- Runtime renderer builds concise prompts using stage templates and capability context.
- Persona guards reject any deviation; retry logic delivers compliant envelopes without heuristics.
- Clarification storage, resolution, and resume flow behave exactly as envisioned.

## Stories

### Story 2.1 · Reauthor Overseer & Eye Blueprints
- **Objective:** Recreate TypeScript blueprints for Overseer, Sharingan, Kyuubi, Jōgan, Mangekyō, Rinnegan, Tenseigan, Byakugan (plus prompt helper/custom eyes support).
- **Acceptance Criteria**
  1. Each blueprint exports metadata, overview, phases (guidance/validation), envelope contract, reminders, examples aligned with SSOT skeletons.
  2. Examples include canonical JSON for guidance (with `ok: false`) and validation (with `ok: true`).
  3. Capabilities arrays reference `CapabilityTag` enums; version tracking consistent.
  4. Seeds regenerate Markdown docs for personas.
- **Dev Notes**
  - Use historical vision docs + restoration plan for content.
  - Keep prompts concise to satisfy OSS model context limits.
- **Testing**
  - Blueprint snapshot tests verifying shape, example JSON parse, and stage alignment.

### Story 2.2 · Runtime Renderer & Persona Runner
- **Objective:** Implement lean `renderPersonaPrompt` using stage templates and capability assignments.
- **Acceptance Criteria**
  1. Prompt includes: stage summary, skeleton JSON, behaviour checklist, example for current stage.
  2. Response-format JSON requested for LM Studio / OpenAI compatibility.
  3. Deterministic decoding defaults (temperature 0, top_p 1) applied; provider overrides allowed but must honour JSON.
  4. Debug logging toggled via `THIRD_EYE_DEBUG_PERSONAS` writing raw responses upon failure.
- **Dev Notes**
  - Append self-check instructions emphasising canonical fields, codes, UI tokens, next action semantics.
- **Testing**
  - Unit tests verifying prompt structure; integration tests mocking LLM output to ensure parsing.

### Story 2.3 · Persona Guards & Behaviour Reminders
- **Objective:** Reinstate guard functions ensuring envelopes meet SSOT, integrate with orchestrator retry loop.
- **Acceptance Criteria**
  1. `ensureEyeBehavior` dispatches to eye-specific guard; each guard validates schema, codes, canonical questions, metrics.
  2. On failure, orchestrator sends targeted reminder referencing violation (no heuristics, no auto-fix).
  3. After max retries, error bubbled to auto-router with actionable message.
- **Dev Notes**
  - Use SSOT constants for messages; avoid inline strings.
  - Provide mapping between guard failure codes and reminder text.
- **Testing**
  - Vitest covering each guard with pass/fail fixtures.

### Story 2.4 · Clarification Storage & Resolution
- **Objective:** Rebuild clarification pipeline inside session manager and UI consumers.
- **Acceptance Criteria**
  1. `addClarificationRequest` stores canonical questions, ambiguity/confidence, guidance markdown.
  2. `resolveClarification` maps answers to canonical tokens, trims whitespace, marks status `answered`, updates resolved facts.
  3. Auto-router resume flow appends resolved facts to guidance input; Sharingan no longer repeats answered questions.
  4. Monitor Clarifications tab renders outstanding vs resolved with icons, metrics.
- **Dev Notes**
  - Provide DB schema with JSON columns and indexes on sessionId/status.
- **Testing**
  - Unit tests for session manager; integration scenario verifying clarifications answered once.

### Story 2.5 · Intent Confirmation & Resume Flow
- **Objective:** Ensure Jōgan + auto-router coordination completes validation once human approval logged.
- **Acceptance Criteria**
  1. Jōgan emits `AWAIT_CONFIRMATION` payload with `intentAnalysis`, `confirmationPrompt`, `next: AWAIT_INPUT`.
  2. Session manager stores intent confirmation responses with timestamps, user identity.
  3. Auto-router `resumeFlow` starts at first pending validation assignment, skipping completed guidance eyes.
  4. Monitor Intent tab shows confirmation status; replay timeline records event.
- **Dev Notes**
  - Provide capability progress serialization to prevent double-running eyes.
- **Testing**
  - Scenario harness runs with manual confirmation step and finishes through validation eyes.

## Dependencies
- Epic 01 (constants, templates) must be completed first.

## Risks & Mitigations
- **Risk:** OSS model fails to output strict JSON.
  - *Mitigation:* Enforce response format, add self-check instructions, consider fallback provider for repeated failures.
- **Risk:** Clarification loop repeats due to mismatch field tokens.
  - *Mitigation:* Comprehensive unit tests and scenario harness verifying resolution.

## Acceptance Checklist
- [ ] All persona blueprints regenerated with canonical examples.
- [ ] Runtime renderer builds compact prompts referencing stage templates.
- [ ] Guard tests passing; orchestrator retries operate without heuristics.
- [ ] Clarification + intent flows verified via scenario harness.
