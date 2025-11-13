# Epic 03 · Capability Router, Orchestrator & MCP Bridge

**Goal:** Reinstate the dynamic routing pipeline, orchestration engine, and MCP bridge so agents can execute end-to-end flows with precise telemetry and resume behaviour.

## Outcomes

- Auto-router generates, persists, and resumes capability plans without static pipeline lists.
- Orchestrator runs eyes with deterministic prompts, provider overrides, guard enforcement, and retry logic.
- Order guard tracks progress and prevents out-of-order execution.
- MCP server exposes single tool and opens monitor portal automatically.

## Stories

### Story 3.1 · Order Guard & Capability Progress

- **Objective:** Restore `packages/core/order-guard.ts` with session-scoped plan management and progress tracking.
- **Acceptance Criteria**
  1. `setDynamicPlan`, `validateOrder`, `recordEyeCompletion`, `getCapabilityProgress`, `serializeCapabilityProgress` implemented.
  2. Supports custom eyes/capabilities without crashing; informative errors when plan missing.
  3. Tests cover new session, resumed session, out-of-order execution, and completed timeline serialization.
- **Dev Notes**
  - Data structures should use Maps/Sets for order operations to avoid duplicates.
- **Testing**
  - Vitest covering positive and negative flows; integration verifying UI timeline uses progress state.

### Story 3.2 · Orchestrator Prompt & Retry Flow

- **Objective:** Rebuild `packages/core/orchestrator.ts` with clean run lifecycle.
- **Acceptance Criteria**
  1. `runEye` constructs prompt via renderer, resolves provider, executes call with deterministic settings.
  2. Enforces response-format JSON; strips `<think>` blocks if provider adds them; logs raw output when parsing fails.
  3. Applies guard validation; on failure, builds reminder message referencing specific violation (no auto-mutations).
  4. Persists run metadata to database, emits telemetry event, returns sanitized envelope.
- **Dev Notes**
  - Support provider override matrix defined in SSOT config.
  - Keep method signatures stable for auto-router and scenario scripts.
- **Testing**
  - Unit tests mocking provider responses (success, invalid JSON, guard failure).

### Story 3.3 · Auto Router Execute & Resume

- **Objective:** Implement `executeFlow` and `resumeFlow` with pause handling and session persistence.
- **Acceptance Criteria**
  1. `executeFlow` creates session, generates capability plan, runs pipeline until completion or pause; returns structured result (status, code, summary, metadata, capabilityPlan, clarifications, history).
  2. `resumeFlow` loads stored context, skips completed guidance, resumes at pending validation; supports agent draft + resolved facts.
  3. Clarification pause updates session manager; when resumed after answers, Sharingan does not repeat questions.
  4. Returns final approval payload from Byakugan when pipeline completes.
- **Dev Notes**
  - Provide debug logging gated by `DEBUG_MCP_SCENARIOS`.
- **Testing**
  - Integration tests using mocked providers to simulate pause/resume; scenario harness verifying real runs.

### Story 3.4 · MCP Server & Webhook

- **Objective:** Restore `packages/mcp/server.ts` to expose single tool and integrate with auto-router.
- **Acceptance Criteria**
  1. `resources/list` not implemented; `tools/list` returns only `third_eye_overseer` with JSON schema describing inputs.
  2. `tools/call` handles new vs resume sessions, streams output, surfaces errors clearly.
  3. On session creation, fire webhook to open `http://127.0.0.1:3300/monitor?sessionId=<id>`.
  4. Logging includes session ID, pipeline summary, step count.
- **Dev Notes**
  - Provide CLI command `bunx third-eye-mcp up` using built dist packages.
- **Testing**
  - Manual run + scenario harness; ensure Warp/Cursor integrate without manual configuration.

### Story 3.5 · Provider Management & Secrets

- **Objective:** Recreate provider registry and encryption for API keys.
- **Acceptance Criteria**
  1. Config UI + server endpoints read/write provider settings (provider, model, temperature, base URL, API key).
  2. Secrets stored encrypted (AES) using user-provided passphrase; decrypted at runtime.
  3. Default provider for all eyes set to LM Studio GPT-OSS-20B, but overrides allowed per eye.
  4. Error handling surfaces provider failures with actionable messages.
- **Dev Notes**
  - Document configuration in USER_GUIDE.
- **Testing**
  - Unit tests for encryption helpers; manual validation with LM Studio + Groq.

## Dependencies

- Epics 01 & 02 (constants, personas, clarifications) provide inputs.

## Risks & Mitigations

- **Risk:** Provider returns non-JSON even with response-format.
  - _Mitigation:_ Implement robust parsing, self-checks, optional fallback to stricter model.
- **Risk:** Resume logic accidentally replays guidance eyes.
  - _Mitigation:_ Persist progress with index pointer; add integration tests covering resume.

## Acceptance Checklist

- [ ] Auto-router executes + resumes full capability plan.
- [ ] Orchestrator retries produce compliant envelopes without heuristics.
- [ ] Order guard timeline aligns with UI.
- [ ] MCP tool executes flows end-to-end; webhook auto-opens monitor.
- [ ] Provider configuration UI operational with encrypted secrets.
