# 🔍 Third Eye MCP - Comprehensive Gap Analysis
**Generated:** 2025-10-29  
**Status:** Current implementation vs BMAD Documentation (All 5 Epics + PRD + Vision)

---

## Executive Summary

Based on systematic review of ALL BMAD documentation (THIRD_EYE_VISION.md, prd.md, RESTORATION_PLAN.md, and all 5 Epics), the current implementation has completed **Epic 01 (SSOT Foundations)** and **partial Epic 02 (Persona Engine)**, but is **far from the complete vision**. Major gaps exist in **Epic 03 (Orchestration), Epic 04 (UI/Monitor), and Epic 05 (Testing/Docs)**.

**Critical Immediate Issues (User-Reported):**
1. ❌ Eyes page missing capability pills (human-readable)
2. ❌ Persona capabilities form is checkbox list, NOT dropdown multi-select
3. ❌ Platform far from THIRD_EYE_VISION.md requirements

---

## 📊 Epic-by-Epic Status

### ✅ Epic 01: SSOT Foundations & Tooling (80% Complete)

#### Completed:
- ✅ Story 1.1: Taxonomy & Clarification Constants
  - ✅ All enums defined (`EyeId`, `EyeStatusCode`, `EyeStageToken`, etc.)
  - ✅ Clarification constants with canonical questions
  - ✅ Helper functions (`isClarificationFieldToken`, etc.)
  - ✅ Unit tests passing

- ✅ Story 1.2: Stage Templates & Capability Planner (Partial)
  - ✅ `capability-plan.ts` implemented
  - ✅ `resolveCapabilityPlan` function working
  - ⚠️  Stage templates partially implemented

- ✅ Story 1.3: Theme Registry & Design Tokens
  - ✅ Six themes with light/dark variants
  - ✅ CSS variables and tokens
  - ✅ Accessibility documentation
  - ⚠️  `useTheme()` hook needs UI package integration

- ✅ Story 1.4: Build & Tooling Pipeline
  - ✅ All build scripts operational
  - ✅ TypeScript strict mode enforced
  - ✅ Package compilation working

#### Missing:
- ❌ **Stage envelope templates incomplete** - Need full template map for all eyes×stages
- ❌ **`buildStageEnvelopeJsonSchema` function** - Not implemented
- ❌ **Theme consumption in UI** - CSS variables not applied globally

---

### ⚠️ Epic 02: Persona Engine & Clarification Pipeline (60% Complete)

#### Completed:
- ✅ Story 2.1: Persona Blueprints
  - ✅ All 8 eye blueprints created (Overseer, Sharingan, Kyuubi, Jōgan, Rinnegan, Mangekyō, Tenseigan, Byakugan)
  - ✅ Database schema with `personaBlueprints` table
  - ✅ Blueprint seeding working
  - ✅ SSOT constants used throughout

- ⚠️ Story 2.2: Runtime Renderer (Partial)
  - ✅ `renderPersonaPrompt` function created
  - ✅ `parsePersonaResponse` function created
  - ⚠️ Debug logging (`THIRD_EYE_DEBUG_PERSONAS`) not implemented
  - ⚠️ `<think>` block stripping not implemented

- ⚠️ Story 2.3: Persona Guards (Partial)
  - ✅ `ensureEyeBehavior` implemented
  - ✅ `validateStatusCode` implemented
  - ⚠️ Eye-specific guards incomplete
  - ⚠️ Retry logic with reminders not fully integrated

- ❌ Story 2.4: Clarification Storage
  - ❌ Database schema exists but functions incomplete
  - ❌ `addClarificationRequest` not implemented
  - ❌ `resolveClarification` not implemented
  - ❌ `getPendingClarifications` not implemented
  - ❌ Monitor Clarifications tab not implemented

- ❌ Story 2.5: Intent Confirmation
  - ❌ `requestIntentConfirmation` not implemented
  - ❌ `processConfirmationResponse` not implemented
  - ❌ Resume flow after confirmation not implemented
  - ❌ Monitor Intent tab not implemented

#### Missing:
- ❌ **Clarification storage functions** - Critical gap
- ❌ **Intent confirmation workflow** - Critical gap
- ❌ **Auto-resume after clarification** - Critical gap
- ❌ **Monitor UI for clarifications** - Critical gap

---

### ❌ Epic 03: Capability Router, Orchestrator & MCP Bridge (40% Complete)

#### Completed:
- ⚠️ Story 3.1: Order Guard (Partial)
  - ✅ Basic data structures exist
  - ⚠️ `setDynamicPlan` incomplete
  - ⚠️ `validateOrder` incomplete
  - ⚠️ `recordEyeCompletion` incomplete
  - ⚠️ `getCapabilityProgress` incomplete

- ⚠️ Story 3.2: Orchestrator (Partial)
  - ✅ Basic orchestrator exists
  - ⚠️ Guard validation integration incomplete
  - ⚠️ Retry with reminders not implemented
  - ⚠️ Telemetry events incomplete

- ❌ Story 3.3: Auto Router
  - ❌ `executeFlow` not implemented
  - ❌ `resumeFlow` not implemented
  - ❌ Pause handling not implemented
  - ❌ Session persistence incomplete

- ❌ Story 3.4: MCP Server & Webhook
  - ❌ Single tool exposure incomplete
  - ❌ Webhook auto-opening monitor not implemented
  - ❌ Session context not passed to webhook

- ❌ Story 3.5: Provider Management
  - ❌ Encryption for API keys not implemented
  - ❌ Per-eye provider overrides not implemented
  - ❌ Config UI for providers incomplete

#### Missing:
- ❌ **Complete auto-router with execute/resume** - Critical gap
- ❌ **MCP webhook to auto-open monitor** - Critical gap
- ❌ **Encrypted provider secrets** - Security gap
- ❌ **Provider configuration UI** - UX gap

---

### ❌ Epic 04: UI, Pipeline Builder & Live Monitor (30% Complete)

#### Completed:
- ⚠️ Story 4.1: Global Layout (Partial)
  - ✅ Basic Next.js layout exists
  - ✅ Navigation sidebar present
  - ❌ Session dropdown not implemented
  - ❌ Theme switcher UI not implemented
  - ❌ Quick search not implemented

- ⚠️ Story 4.2: Personas & Eyes Management (Partial)
  - ✅ Basic list views exist
  - ⚠️ **Eyes page missing capability pills** ← USER ISSUE #1
  - ⚠️ **Personas form using checkbox list instead of dropdown multi-select** ← USER ISSUE #2
  - ❌ Multi-step forms not implemented
  - ❌ Markdown article-style detail views incomplete
  - ❌ Version history not implemented

- ❌ Story 4.3: Pipeline Builder
  - ❌ Canvas with zoom/pan not implemented
  - ❌ Drag-drop nodes not implemented
  - ❌ Visual validation not implemented
  - ❌ Templates not implemented
  - ❌ Import/export not implemented

- ❌ Story 4.4: Monitor Timeline & Tabs
  - ❌ Timeline tab not implemented
  - ❌ Clarifications tab not implemented
  - ❌ Intent tab not implemented
  - ❌ Evidence tab not implemented
  - ❌ Raw JSON tab not implemented
  - ❌ WebSocket integration not implemented

- ❌ Story 4.5: Sessions, Replay & Wow Factors
  - ❌ Sessions list page incomplete
  - ❌ Session detail not implemented
  - ❌ Replay playback not implemented
  - ❌ Markdown/PDF export not implemented
  - ❌ Dashboard wow factors not implemented

- ❌ Story 4.6: Settings & Theme Showcase
  - ❌ Provider key management UI not implemented
  - ❌ Theme preview gallery not implemented
  - ❌ Global settings toggles not implemented

#### Missing:
- ❌ **Complete Monitor with all tabs** - Critical gap
- ❌ **Pipeline Builder** - Major feature missing
- ❌ **Sessions management** - Critical gap
- ❌ **Replay functionality** - Major feature missing
- ❌ **Settings UI** - Configuration gap

---

### ❌ Epic 05: Testing, Scenarios, Documentation & Safeguards (20% Complete)

#### Completed:
- ⚠️ Story 5.1: Scenario Harness (Partial)
  - ⚠️ Some scenario scripts exist
  - ❌ Comprehensive harness not implemented
  - ❌ Deterministic logging incomplete

- ⚠️ Story 5.2: Automated Tests (Partial)
  - ✅ Some Vitest tests exist
  - ⚠️ Playwright tests incomplete
  - ❌ Coverage thresholds not met

- ⚠️ Story 5.3: Documentation (Partial)
  - ✅ THIRD_EYE_VISION.md created
  - ✅ PRD exists
  - ⚠️ Go-live checklist incomplete
  - ❌ USER_GUIDE incomplete
  - ❌ Legacy docs not removed

- ❌ Story 5.4: Operational Safeguards
  - ❌ Backup scripts not implemented
  - ❌ Pre-commit hooks not implemented
  - ❌ Daily bundle generation not implemented

#### Missing:
- ❌ **Complete scenario harness** - Testing gap
- ❌ **End-to-end test coverage** - Quality gap
- ❌ **Complete documentation set** - Knowledge gap
- ❌ **Backup safeguards** - Operational risk

---

## 🚨 Critical Gaps (Blocking Full Platform Functionality)

### 1. **Auto-Router & Orchestration** (Epic 03)
**Impact:** Cannot execute complete pipelines end-to-end
- Missing `executeFlow` and `resumeFlow` functions
- No pause/resume handling
- Incomplete session persistence
- No capability progress tracking

### 2. **Live Monitor** (Epic 04, Story 4.4)
**Impact:** No visibility into what Third Eye is doing
- Timeline tab missing
- Clarifications tab missing
- Intent confirmation tab missing
- Evidence tab missing
- Raw JSON viewer missing
- WebSocket real-time updates missing

### 3. **Pipeline Builder** (Epic 04, Story 4.3)
**Impact:** Cannot create or edit custom pipelines visually
- Entire feature missing
- No drag-drop canvas
- No validation
- No templates

### 4. **Clarification & Intent Workflows** (Epic 02, Stories 2.4, 2.5)
**Impact:** Cannot pause for human input or confirmation
- Storage functions incomplete
- Resolution logic missing
- Auto-resume not implemented
- UI components missing

### 5. **MCP Integration** (Epic 03, Story 3.4)
**Impact:** External agents cannot use Third Eye effectively
- Single tool exposure incomplete
- Webhook not auto-opening monitor
- Session context not propagated

---

## 🎯 Immediate Action Items (User-Reported Issues)

### Issue #1: Eyes Page Missing Capability Pills
**Location:** `apps/ui/src/app/eyes/page.tsx`

**Problem:** Enrichment fetching capabilities from blueprints but not displaying them

**Root Cause:** 
- Fetch logic exists (lines 129-147)
- Display logic exists (lines 754-766)
- BUT capability pills are inside conditional that may not render

**Fix Required:**
1. Debug why `eye.capabilities` is undefined after enrichment
2. Verify API response structure from `/api/personas/blueprints/${eye.id}`
3. Ensure `toHumanReadable` function converts snake_case correctly
4. Add error handling for failed blueprint fetches

**Code Location:**
```typescript
// Line 129-147: Enrichment logic
// Line 754-766: Display logic
```

### Issue #2: Persona Capabilities Form - Not Dropdown Multi-Select
**Location:** `apps/ui/src/app/personas/page.tsx` (lines 728-762)

**Problem:** Using checkbox list instead of dropdown multi-select

**Current Implementation:**
```typescript
// Vertical checkbox list (always visible)
<div className="space-y-2">
  {capabilities.map(cap => (
    <label className="flex items-center...">
      <input type="checkbox" />
      ...
    </label>
  ))}
</div>
```

**Required Implementation:**
```typescript
// Dropdown multi-select (collapses, opens on click)
<div className="relative">
  <button onClick={() => setOpen(!open)}>
    {selected.length} selected
  </button>
  {open && (
    <div className="absolute dropdown-menu">
      {capabilities.map(cap => (
        <label>
          <input type="checkbox" />
          ...
        </label>
      ))}
    </div>
  )}
</div>
```

**Fix Required:**
1. Create dropdown multi-select component
2. Implement open/close state
3. Show selected count when collapsed
4. Render checkbox list inside dropdown menu
5. Close dropdown when clicking outside

---

## 📈 Overall Completion Status

| Epic | Stories | Completion | Status |
|------|---------|------------|--------|
| **Epic 01: SSOT Foundations** | 4 | 80% | ⚠️ Mostly Complete |
| **Epic 02: Persona Engine** | 5 | 60% | ⚠️ Partially Complete |
| **Epic 03: Orchestration** | 5 | 40% | ❌ Major Gaps |
| **Epic 04: UI & Monitor** | 6 | 30% | ❌ Major Gaps |
| **Epic 05: Testing & Docs** | 4 | 20% | ❌ Major Gaps |
| **Overall Platform** | **24 stories** | **45%** | ❌ **Far from vision** |

---

## 🛣️ Recommended Priority Order

### Phase 1: Fix Immediate User Issues (1-2 days)
1. ✅ Fix eyes page capability pills display
2. ✅ Implement dropdown multi-select for personas form
3. Verify all SSOT SVG icons display correctly
4. Test database-driven capability loading

### Phase 2: Complete Epic 02 (Persona Engine) (3-4 days)
1. Implement clarification storage functions
2. Implement intent confirmation workflow
3. Build auto-resume logic
4. Create Monitor UI stubs for clarifications/intent tabs

### Phase 3: Complete Epic 03 (Orchestration) (5-7 days)
1. Implement complete auto-router (`executeFlow`, `resumeFlow`)
2. Integrate guard retry logic with reminders
3. Implement MCP webhook to auto-open monitor
4. Build provider configuration UI
5. Implement encrypted API key storage

### Phase 4: Complete Epic 04 (UI & Monitor) (7-10 days)
1. Build complete Monitor with all 5 tabs
2. Implement WebSocket real-time updates
3. Build Pipeline Builder (canvas, drag-drop, validation)
4. Complete Sessions management
5. Implement Replay functionality
6. Build Dashboard wow factors
7. Create Settings UI with theme showcase

### Phase 5: Complete Epic 05 (Testing & Docs) (3-5 days)
1. Build comprehensive scenario harness
2. Expand test coverage (Vitest + Playwright)
3. Complete all documentation
4. Implement backup safeguards
5. Run go-live checklist

**Estimated Total:** 19-28 days of focused development

---

## 📝 Notes

- Current implementation has strong foundation (Epic 01) but lacks critical workflows
- User is correct: platform is "very far from THIRD_EYE_VISION.md"
- Major features (Monitor, Pipeline Builder, Auto-Router) are missing or incomplete
- Immediate fixes needed for eyes page and personas form before continuing with epics
- Database schema is solid, but application logic gaps are significant

---

**End of Gap Analysis**

