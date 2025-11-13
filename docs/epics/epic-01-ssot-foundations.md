# Epic 01 · SSOT Foundations & Tooling

**Goal:** Re-establish every shared constant, taxonomy, and theme definition that anchors the platform. Provide bulletproof tooling (build scripts, seeds, linting) so downstream modules inherit consistent data without literals or heuristics.

## Outcomes

- All enums, tokens, and helpers defined under `packages/constants` and `packages/types` with exhaustive TypeScript coverage.
- Stage templates, clarification prompts, and capability plans exposed via reusable helpers.
- Theme system (six themes × light/dark) implemented and consumable by UI.
- Build scripts compile packages cleanly; `bun run build:packages` succeeds.

## Stories

### Story 1.1 · Rebuild Taxonomy & Clarification Constants

- **Objective:** Restore `packages/constants/taxonomy.ts` and `packages/constants/clarifications.ts` with full enum coverage and helpers.
- **Acceptance Criteria**
  1. Enums cover `EyeId`, `EyeStageToken`, `EyeStatusCode`, `RequestType`, `ContentDomain`, `CapabilityTag`, `UiTextToken`, `UiIconToken`, `UiColorToken`.
  2. Clarification constants export canonical field IDs, question texts, sets for required fields, and helper functions.
  3. No literal strings remain in personas, session manager, or UI—everything imports from these modules.
  4. Unit tests verify enum exhaustiveness and clarification helper behaviour.
- **Dev Notes**
  - Mirror the structure captured in `RESTORATION_PLAN.md` Section 4.
  - Provide typed helper `isClarificationFieldToken(value)` for guards.
- **Testing**
  - Vitest: `packages/constants/__tests__/taxonomy.test.ts`, `clarifications.test.ts`.

### Story 1.2 · Recreate Stage Templates & Capability Planner

- **Objective:** Implement `packages/constants/stage-envelopes.ts` and `packages/constants/capability-plan.ts` exactly as described.
- **Acceptance Criteria**
  1. Each eye/stage pair has template with `allowedCodes`, JSON skeleton, checklist.
  2. Helper `getStageTemplate(eyeId, stage)` throws informative error when missing.
  3. Capability resolver dynamically maps request type + content domain to ordered assignments; supports custom eyes via capability tags.
  4. Order guard and auto-router compile using these helpers without temporary fallbacks.
- **Dev Notes**
  - Ensure JSON skeleton uses canonical key ordering for persona prompts.
  - Provide TypeScript types (e.g., `StageTemplate`, `CapabilityAssignment`).
- **Testing**
  - Vitest snapshot of template map; capability resolver route tests for all request types.

### Story 1.3 · Theme Registry & Design Tokens

- **Objective:** Rebuild theme tokens and consumption utilities.
- **Acceptance Criteria**
  1. Theme registry exports six named themes with light/dark palettes, typography, spacing, radii, shadows.
  2. React hook `useTheme()` toggles theme + mode, persists in localStorage.
  3. CSS variables applied globally; UI components consume tokens (buttons, tabs, cards, markdown renderer).
  4. Accessibility check ensures color contrast meets WCAG AA.
- **Dev Notes**
  - Provide storybook-esque documentation page under `docs/theme-accessibility-report.md`.
- **Testing**
  - Unit test ensuring theme definitions present; Playwright smoke test toggling themes.

### Story 1.4 · Build & Tooling Pipeline Restoration

- **Objective:** Reinstate Bun/TypeScript build scripts and ensure repo compiles cleanly.
- **Acceptance Criteria**
  1. `package.json` scripts (build:\* , typecheck, lint, vitest) run successfully.
  2. `tsconfig` settings enforce strict mode and path aliases for packages.
  3. CI/CLI outputs friendly logs; build caches regenerated as needed.
- **Dev Notes**
  - Mirror previous CLI output (status banner when running `npx third-eye-mcp up`).
- **Testing**
  - Run `bun run build:packages`, `bun run typecheck`, targeted `vitest` suites.

## Dependencies

- None (foundational).

## Risks & Mitigations

- **Risk:** Missing enum values from lost work.
  - _Mitigation:_ Cross-reference RESTORATION_PLAN + new vision doc; add tests to prevent regressions.
- **Risk:** Theme tokens diverge from UI expectations.
  - _Mitigation:_ Validate with UI designers/vision sections; include visual regression notes.

## Acceptance Checklist

- [ ] Constants compiled and exported.
- [ ] Stage templates verified against persona examples.
- [ ] Capability planner returns correct sequences for scenario matrix.
- [ ] Theme switcher operational in UI.
- [ ] Build scripts succeed on clean checkout.
