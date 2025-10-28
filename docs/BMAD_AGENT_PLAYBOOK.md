# BMAD Agent Playbook — Third Eye MCP

## 1. Mission Context
- **Product**: Third Eye MCP (inner perception layer for AI agents).
- **Authoritative Vision**: `THIRD_EYE_VISION.md` (unified vision doc).
- **Product Requirements**: `docs/prd.md`.
- **Implementation Roadmap**: `docs/epics/epic-*.md` (start with Epic 01).
- **Engineering Rules**: `AGENTS.md` (non‑negotiable) + `RESTORATION_PLAN.md` for subsystem specs.

## 2. Preflight Checklist (run before touching code)
1. `cd /Users/hbinseddeq/Documents/tuwaiq-ml-bootcamp/week_09_10_capstone_project/third-eye-mcp`
2. Ensure `.bmad-core/` exists (already restored); if missing, rerun `npx bmad-method install`.
3. Verify env: `node -v`, `pnpm -v`, `bun -v` (document in chat if versions differ).
4. Load reference docs into Cursor (in order):
   - `THIRD_EYE_VISION.md`
   - `docs/prd.md`
   - Current epic (e.g., `docs/epics/epic-01-ssot-foundations.md`)
   - `AGENTS.md`
   - `RESTORATION_PLAN.md`
   - Recovered constants in `packages/constants/` if relevant to the task.

## 3. Cursor / BMAD Orchestration Sequence
1. Start BMAD Orchestrator chat:
   ```
   *help
   *chat-mode
   *status
   ```
2. Paste the following guardrails into the chat:
   ```
   Rules:
   - Modify TypeScript/TSX sources only; never edit compiled JS under dist/ or .next/.
   - All constants/enums/tokens come from packages/constants/*.ts.
   - No heuristic JSON patches; align with stage templates and capability plan.
   - Always run lint + build + targeted tests before declaring a task complete.
   - Follow docs/epics step order strictly; no skipping stories.
   ```
3. For each story/epic:
   ```
   *doc-out docs/epics/epic-0X-....md
   *agent sm      # Request plan/checkpoints
   *agent dev     # Execute code changes (reference plan + vision)
   *agent qa      # Execute tests, report results
   *agent doc     # Update documentation when required
   ```
4. When encountering ambiguity or multi-step logic, invoke sequential reasoning tool:
   ```
   /mcp run sequential-thinking {"task": "<describe next action>"}
   ```

## 4. File Hierarchy & Ownership
- **SSOT Core**: `packages/constants/{capability-plan.ts, stage-envelopes.ts, taxonomy.ts, routing-vision.ts, index.ts}`
- **Persona Logic**: `packages/eyes/src/eyes/*.ts`, `packages/core/persona-guards.ts`, `packages/db/schema.ts`
- **Monitor & UI**: `apps/ui/src/app/monitor/**/*.tsx`, `apps/ui/src/components/**/*.tsx`
- **Pipeline Builder**: `apps/ui/src/components/PipelineFlowBuilder.tsx`
- **Scripts & Seeds**: `scripts/*.ts`, `packages/db/defaults/*`
- **Documentation**: `docs/`, `THIRD_EYE_VISION.md`, `RESTORATION_PLAN.md`

## 5. Implementation Do/Don’t
- ✅ Use enums/consts from SSOT modules (no literal status strings, colors, etc.).
- ✅ Extend TypeScript types when modifying schema or constants.
- ✅ Update seeds/tests when persona envelopes or capability plans change.
- ✅ Record raw test output in chat (`pnpm test ...`, `npx playwright test`).
- ✅ Capture scenario verification via `bun run scripts/run-mcp-scenarios.ts` when relevant.
- ❌ Don’t edit generated artifacts (`packages/**/dist`, `.next/`).
- ❌ Don’t invent clarifications or capability codes; align with restored templates.
- ❌ Don’t bypass lint/build/test even for “docs-only” changes (still run `pnpm lint`).

## 6. Required Commands (per story)
```
pnpm lint
bun run build:packages
pnpm test --filter core
npx playwright test --project=ui --reporter=list
bun run scripts/run-mcp-scenarios.ts  # when story touches routing/persona flow
```
Capture outputs and attach failures (with plan to fix) before proceeding.

## 7. Merge Discipline
1. Stage only relevant files (`git add path/to/file.tsx` …).
2. `git status` must be clean except for intentional changes.
3. Provide commit summary referencing epic/story.
4. Push to protected branch only after review (if CI exists, ensure green).

## 8. Smoke Validation (before claiming completion)
- `npx third-eye-mcp up` → confirm UI + server launch without errors.
- Open http://127.0.0.1:3300/monitor?sessionId=<test> to validate UI changes.
- If persona/capability changes, run at least one MCP scenario and include portal screenshot/log.

## 9. Fallback Plan
If Cursor gets stuck or tries to modify compiled files:
- Abort patch (`Ctrl+C`), restate guardrails, invoke **Sequential Thinking** tool.
- Manually edit file via inline patch with explicit instructions referencing SSOT modules.
- For persistent misbehavior, temporarily switch to terminal editor, then reintroduce Cursor for code review/testing.

## 10. Reference Bundle Locations
- BMAD teams / commands: `.bmad-core/` (primary) and any `web-bundles/` saved from BMAD install.
- Additional recovered SSOT sources: `third-eye-mcp-history-restore/` (do **not** edit there; copy into repo as needed).

Keep this playbook open alongside the vision docs whenever new work starts. Following the sequence prevents regressions and keeps agents aligned with the true Third Eye MCP vision.
