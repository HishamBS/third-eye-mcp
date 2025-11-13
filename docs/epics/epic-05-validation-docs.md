# Epic 05 · Testing, Scenarios, Documentation & Safeguards

**Goal:** Guarantee quality through automated + manual testing, scenario harnesses, comprehensive documentation, and backup safeguards so the restored platform remains stable and maintainable.

## Outcomes

- Scenario scripts execute all exemplar flows end-to-end with LM Studio and alternate providers.
- Automated test suites cover persona contracts, router logic, session persistence, and key UI behaviours.
- Documentation (vision, go-live checklist, user guide) reflects restored implementation; outdated docs removed.
- Backup and operational safeguards prevent future catastrophic loss.

## Stories

### Story 5.1 · Scenario Harness Restoration & Expansion

- **Objective:** Rebuild `scripts/run-mcp-scenarios.ts` with deterministic logging and success criteria for all flows.
- **Acceptance Criteria**
  1. Includes scenarios: Flutter build, macOS Amethyst troubleshooting, code review, factual validation, plan drafting, custom eye.
  2. Captures session IDs, capability plans, envelopes, clarifications, final approvals; logs to `docs/remediation/evidence/`.
  3. Fails fast when persona returns invalid JSON or incorrect status codes; surfaces actionable messages.
  4. CLI flags for debug logging and provider overrides.
- **Testing**
  - Manual runs via LM Studio + Groq; review logs for compliance.

### Story 5.2 · Automated Test Coverage

- **Objective:** Reinstate vitest suites for constants, personas, router, session manager; add Playwright smoke tests.
- **Acceptance Criteria**
  1. Vitest suites run green on CI: persona guards, stage templates, capability resolver, session manager, orchestrator error handling.
  2. Playwright tests cover pipeline editor interactions, monitor tabs, persona form submission, theme switching.
  3. Coverage thresholds meet previous benchmarks; results documented.
- **Testing**
  - `bun run test:unit`, `bun run test:e2e` (or equivalent). Document known skips.

### Story 5.3 · Documentation Overhaul & Vision Consolidation

- **Objective:** Produce single `THIRD_EYE_VISION.md`, update PRD, architecture, go-live checklist, README, USER_GUIDE, CONTRIBUTING.
- **Acceptance Criteria**
  1. Legacy vision docs deleted; new vision doc merges requirements, examples, philosophy.
  2. Go-live checklist enumerates manual QA steps, scenario runs, documentation verification.
  3. README + USER_GUIDE instruct low-code operators how to run, monitor, customise.
  4. RESTORATION_PLAN references BMAD artifacts and tracks progress.
- **Testing**
  - Peer review; ensure docs cross-link correctly.

### Story 5.4 · Operational Safeguards

- **Objective:** Implement backup scripts and warnings to prevent future data loss.
- **Acceptance Criteria**
  1. Provide `scripts/create-backup-bundle.ts` (or shell script) to generate daily git bundles.
  2. Document enabling OS-level backups (Time Machine, snapshots) and storing bundles securely.
  3. Add guidance in CONTRIBUTING about frequent commits, branch strategy, and avoiding `git clean` on untracked work.
  4. Optional pre-commit hook or CLI warning when repository has large unstaged changes.
- **Testing**
  - Manual run verifying backup script output.

## Dependencies

- Epics 01–04 deliver core functionality.

## Risks & Mitigations

- **Risk:** Scenario harness flakes due to provider variability.
  - _Mitigation:_ Provide deterministic prompts, allow optional provider override, include tolerance for retry.
- **Risk:** Documentation drifts from implementation.
  - _Mitigation:_ Establish doc review checkpoint in go-live checklist.

## Acceptance Checklist

- [ ] Scenario harness logs successful runs for all exemplar flows.
- [ ] Automated tests pass and cover critical modules.
- [ ] Documentation consolidated with new vision doc; legacy docs removed.
- [ ] Backup safeguards documented and implemented.
