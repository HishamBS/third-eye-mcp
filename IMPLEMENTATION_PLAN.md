# Third Eye MCP - Comprehensive Form-Based Configuration System

**Status:** In Progress | **Current Phase:** Phase 10 Bug Fixes
**Last Updated:** 2025-10-30
**Compliance:** Follows CLAUDE.md R10 (Whole-System Refactors, NO backward compatibility)

---

## Table of Contents
1. [Completed Phases](#completed-phases)
2. [Critical Bugs (Phase 10)](#critical-bugs-to-fix-first-phase-10-issues)
3. [Implementation Phases 11-22](#implementation-phases)
4. [Gap Analysis](#gap-analysis-vs-final_overseer_visionmd)
5. [SSOT Locations](#ssot-locations)
6. [Compliance Checklist](#compliance-checklist-per-claudemd)
7. [Next Session Handoff](#next-session-handoff)

---

## Completed Phases

### ✅ Phase 1: Foundation Validation & SSOT Audit
- [x] Validated project structure
- [x] Identified SSOT modules
- [x] Established coding standards

### ✅ Phase 8: Pipeline Builder - Delete Old Implementation
- [x] Removed legacy pipeline code
- [x] Cleared deprecated components

### ✅ Phase 9: React Flow Foundation with SVG Icons
- [x] Integrated React Flow library
- [x] Implemented SVG-based Eye icons
- [x] Created EyeIcon component system

### ✅ Phase 9.5: SVG Upload for Custom Eyes
- [x] Built SVG upload functionality
- [x] Added custom Eye registration

### ✅ Phase 10: Production Pipeline Builder (WITH BUGS)
- [x] Created SSOT constants (LAYOUT, TOOLBAR_TEXT, PALETTE_TEXT, NODE_EDIT_TEXT, EDGE_TEXT)
- [x] Defined strict TypeScript types (PipelineNode, PipelineEdge, Pipeline)
- [x] Built Eye Palette component
- [x] Created Node Edit Modal
- [x] Created Edge Config Modal
- [x] Built Collapsible Toolbar
- [x] Enhanced Pipeline Canvas
- [x] Created Pipeline Service Hooks
- [x] **Status:** Build compiles but has runtime errors

---

## Critical Bugs to Fix First (Phase 10 Issues)

### Bug 1: EyePalette API Response Handling
- [ ] **File:** `/apps/ui/src/components/pipeline-builder/EyePalette.tsx:61`
- [ ] **Error:** `response.map is not a function`
- [ ] **Fix:** Change `const response = await get<Array<...>>()` to `const { data } = await get<ApiEnvelope<Array<...>>>()`
- [ ] **Test:** Verify Eye Palette renders with built-in + custom eyes

### Bug 2: Empty Default Pipeline
- [ ] **File:** `/apps/ui/src/components/pipeline-builder/PipelineCanvasEnhanced.tsx:46-47`
- [ ] **Issue:** Canvas initializes with empty nodes/edges arrays
- [ ] **Fix:** Create `SYSTEM_DEFAULT_PIPELINE` constant with 8-Eye flow:
  - Overseer → Sharingan → Kyuubi → Jogan → Rinnegan → Mangekyo → Byakugan → Tenseigan
- [ ] **Implementation:** Auto-layout nodes on first load using React Flow's `fitView`
- [ ] **Test:** Verify default pipeline visible immediately on page load

### Bug 3: JSON-Based Node Configuration
- [ ] **File:** `/apps/ui/src/components/pipeline-builder/NodeEditModal.tsx:248-269`
- [ ] **Issue:** Uses JSON textarea for `customConfig` (not user-friendly for regular users)
- [ ] **Fix:** Replace with structured form fields:
  - Common fields: Name, Description, Enabled toggle
  - Eye-specific fields: Parameters from persona
  - Advanced section: Collapsible JSON editor (for power users only)
- [ ] **Test:** Verify forms work for all Eye types, JSON import/export works

---

## Implementation Phases

### Phase 11: Persona Form - Delete Old Implementation

**Goal:** Remove TEXT-based persona editing (R10: no mixed legacy states)

**Files to Modify:**
- [ ] `/apps/ui/src/app/personas/page.tsx`
  - Remove markdown/JSON editors
  - Remove `personaContent: string` state
  - Add "Under Construction" placeholder UI
  - Keep API hooks (`useFetchPersonas`, `useSavePersona`) but mark for refactor

**Acceptance Criteria:**
- [ ] Old persona page shows "Under Construction" message
- [ ] No markdown/JSON editors in codebase
- [ ] Build compiles with zero TypeScript errors
- [ ] No string-based persona state remains

---

### Phase 12: Database Schema - Complete Overhaul (R10 Compliant)

**Goal:** Replace TEXT blob with structured columns (NO backward compatibility per R10)

#### Schema Changes

**File:** `/packages/db/schema.ts`

- [ ] **Drop Old Column:** Remove `content TEXT NOT NULL`
- [ ] **Add Structured Columns:**
  ```typescript
  export const personas = sqliteTable('personas', {
    id: text('id').primaryKey(),
    eye: text('eye').notNull(),
    name: text('name').notNull(),
    version: integer('version').notNull(),

    // NEW: Structured fields (replacing TEXT blob)
    metadata_json: text('metadata_json').notNull(), // {eyeId, name, description, version, capabilities[]}
    mission: text('mission').notNull(),
    guidance_json: text('guidance_json'),           // {mission, check, reminders[], example}
    validation_json: text('validation_json'),       // {mission, check, reminders[], example}
    envelope_json: text('envelope_json').notNull(), // {requiredKeys[], requiredDataKeys[], requiredUiKeys[]}
    reminders_json: text('reminders_json').notNull(), // string[]
    notes: text('notes'),
    llm_config_json: text('llm_config_json').notNull(), // {temperature, top_p, response_format}

    active: integer('active', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  });
  ```

#### Data Migration

**File:** `/scripts/migrate-personas-oneshot.ts`

- [ ] Parse ALL existing `personas.content` TEXT blobs
- [ ] Transform to structured format per new schema
- [ ] Validate transformation (zero data loss)
- [ ] Insert into new columns
- [ ] **Drop old column** (R10: no mixed legacy states)
- [ ] Run migration once on startup, then mark as complete

**Migration Script Structure:**
```typescript
// Read all personas
// For each persona:
//   - Parse content as PersonaBlueprint
//   - Extract to structured columns
//   - Validate extracted data
//   - Update row
// After all migrated:
//   - Drop content column
//   - Mark migration complete
```

**Acceptance Criteria:**
- [ ] Migration runs successfully on existing data
- [ ] All PersonaBlueprint data preserved
- [ ] Old `content` column removed (R10)
- [ ] New columns indexed appropriately
- [ ] Build compiles, tests pass

---

### Phase 13: Persona Form - 8-Step Wizard Foundation

**Goal:** Multi-step wizard shell with navigation

#### Component Structure

**File:** `/apps/ui/src/components/persona-form/PersonaWizard.tsx`

- [ ] Create wizard container component
- [ ] Implement 8-step navigation:
  1. Metadata (Eye, Name, Description, Capabilities)
  2. Mission
  3. Guidance Phase (Mission, Check, Reminders, Example)
  4. Validation Phase (Mission, Check, Reminders, Example)
  5. Envelope Contract (Required Keys)
  6. Reminders (General)
  7. LLM Config (Temperature, Top P, Response Format)
  8. Notes
  9. Review & Export
- [ ] Progress indicator (step 1/9, 2/9, etc.)
- [ ] Navigation buttons (Previous, Next, Skip, Save Draft)
- [ ] Form state management with `useReducer`
- [ ] Step validation before advancing

**File:** `/apps/ui/src/components/persona-form/constants.ts` (SSOT)

- [ ] All wizard text (NO string literals):
  ```typescript
  export const WIZARD_TEXT = {
    STEP_TITLES: {
      METADATA: 'Eye & Metadata',
      MISSION: 'Core Mission',
      GUIDANCE: 'Guidance Phase',
      VALIDATION: 'Validation Phase',
      ENVELOPE: 'Envelope Contract',
      REMINDERS: 'General Reminders',
      LLM_CONFIG: 'LLM Configuration',
      NOTES: 'Internal Notes',
      REVIEW: 'Review & Save',
    },
    STEP_DESCRIPTIONS: { ... },
    BUTTON_LABELS: { ... },
    VALIDATION_MESSAGES: { ... },
  } as const;
  ```

**File:** `/apps/ui/src/types/persona-form.ts`

- [ ] Define strict types (zero `any`):
  ```typescript
  export interface PersonaFormState {
    readonly currentStep: number;
    readonly metadata: MetadataFormData;
    readonly mission: string;
    readonly guidancePhase: PhaseFormData | null;
    readonly validationPhase: PhaseFormData | null;
    readonly envelopeContract: EnvelopeFormData;
    readonly reminders: readonly string[];
    readonly llmConfig: LLMConfigFormData;
    readonly notes: string;
  }

  export interface WizardStep {
    readonly id: number;
    readonly title: string;
    readonly description: string;
    readonly isValid: boolean;
    readonly isOptional: boolean;
  }

  export interface ValidationResult {
    readonly isValid: boolean;
    readonly errors: ReadonlyMap<string, string>;
  }
  ```

**Acceptance Criteria:**
- [ ] Wizard renders with 9 steps
- [ ] Navigation works (next/prev/skip)
- [ ] Progress indicator updates correctly
- [ ] Zero `any` types in entire wizard
- [ ] All text from SSOT constants (R13)
- [ ] Build compiles successfully

---

### Phase 14: Persona Form - Rich Editors for All Steps

**Goal:** Implement form fields for every PersonaBlueprint section

#### Step 1: Metadata Form

**File:** `/apps/ui/src/components/persona-form/steps/MetadataStep.tsx`

- [ ] Eye ID dropdown (fetch from `/api/eyes`)
- [ ] Name text input (required, 3-100 chars)
- [ ] Description textarea (required, 10-500 chars)
- [ ] Version number input (default: 1)
- [ ] Capabilities tag input:
  - Add new capability (text input + button)
  - Remove capability (X button per tag)
  - No duplicates validation

#### Step 2: Mission Form

**File:** `/apps/ui/src/components/persona-form/steps/MissionStep.tsx`

- [ ] Rich textarea with character count (100-2000 chars)
- [ ] Example missions dropdown:
  - Pre-defined templates from SSOT
  - Click to pre-fill
- [ ] Validation hints (real-time)
- [ ] Preview section

#### Step 3: Guidance Phase Form

**File:** `/apps/ui/src/components/persona-form/steps/GuidanceStep.tsx`

- [ ] Mission statement textarea (required)
- [ ] Check logic textarea (validation criteria)
- [ ] Reminders array:
  - Add reminder input + button
  - Reorder reminders (drag handles)
  - Remove reminder (X button)
- [ ] Example JSON code editor:
  - Syntax highlighting
  - Validation (must be valid JSON)
  - Sample examples dropdown

#### Step 4: Validation Phase Form

**File:** `/apps/ui/src/components/persona-form/steps/ValidationStep.tsx`

- [ ] Enable/disable toggle
- [ ] Same structure as Guidance Phase:
  - Mission textarea
  - Check logic textarea
  - Reminders array
  - Example code editor
- [ ] When disabled, hide all fields except toggle

#### Step 5: Envelope Contract Form

**File:** `/apps/ui/src/components/persona-form/steps/EnvelopeStep.tsx`

- [ ] Three array inputs:
  - Required keys (top-level envelope keys)
  - Required data keys (keys in `data` object)
  - Required UI keys (keys in `ui` object)
- [ ] For each array:
  - Add key input + button
  - Remove key (X button)
  - No duplicates validation
  - Case-sensitive
- [ ] Preview of expected envelope structure

#### Step 6: Reminders Form

**File:** `/apps/ui/src/components/persona-form/steps/RemindersStep.tsx`

- [ ] General reminders array:
  - Add reminder input + button
  - Reorder reminders (drag handles)
  - Remove reminder (X button)
- [ ] Pre-defined templates dropdown:
  - Common reminder patterns from SSOT
  - Click to add to list

#### Step 7: LLM Config Form (NEW - was hardcoded)

**File:** `/apps/ui/src/components/persona-form/steps/LLMConfigStep.tsx`

- [ ] Temperature slider:
  - Range: 0-2
  - Step: 0.1
  - Default: 0
  - Description text from SSOT
- [ ] Top P slider:
  - Range: 0-1
  - Step: 0.05
  - Default: 1
  - Description text from SSOT
- [ ] Response format dropdown:
  - Options: JSON Object, Text
  - Default: JSON Object
- [ ] Max tokens input:
  - Range: 100-8000
  - Default: 2000

#### Step 8: Notes Form

**File:** `/apps/ui/src/components/persona-form/steps/NotesStep.tsx`

- [ ] Optional textarea (internal notes, not sent to LLM)
- [ ] Character count (0-5000 chars)
- [ ] Markdown preview toggle

#### Step 9: Review & Export

**File:** `/apps/ui/src/components/persona-form/steps/ReviewStep.tsx`

- [ ] Read-only preview of all sections:
  - Metadata (collapsible card)
  - Mission (collapsible card)
  - Guidance Phase (collapsible card)
  - Validation Phase (collapsible card)
  - Envelope Contract (collapsible card)
  - Reminders (collapsible card)
  - LLM Config (collapsible card)
  - Notes (collapsible card)
- [ ] JSON preview toggle:
  - Show complete PersonaBlueprint as JSON
  - Syntax highlighted
  - Copy to clipboard button
- [ ] Export JSON button (download .json file)
- [ ] Save button (primary action)

**Acceptance Criteria:**
- [ ] All PersonaBlueprint fields editable through forms
- [ ] Array inputs support add/remove/reorder
- [ ] Validation runs on each field (real-time)
- [ ] Character counts display accurately
- [ ] Examples/templates available and functional
- [ ] JSON preview shows complete structure
- [ ] Export downloads valid JSON
- [ ] Zero magic strings (all text from SSOT per R13)
- [ ] Zero `any` types (R07)

---

### Phase 15: Eyes Page - Unified Configuration

**Goal:** Same form-based configuration for Eyes and Personas

**File:** `/apps/ui/src/app/eyes/page.tsx`

- [ ] Add "Configure Persona" button per eye in eye list
- [ ] Click opens PersonaWizard in modal/drawer
- [ ] Pre-fill wizard with existing persona data for that eye
- [ ] When saved, update both eye and persona

**File:** `/apps/ui/src/hooks/useEyeConfig.ts`

- [ ] `useEyeConfig(eyeId: string)`
  - Fetch eye data
  - Fetch associated persona
  - Return unified config object
- [ ] `saveEyeConfig(eyeId: string, config: UnifiedConfig)`
  - Validate Eye ↔ Persona consistency
  - Save to both tables
  - Invalidate queries

**Acceptance Criteria:**
- [ ] Eyes page shows "Configure" button for each eye
- [ ] Clicking opens PersonaWizard pre-filled with data
- [ ] Saving updates both eye and persona
- [ ] Build compiles successfully

---

### Phase 16: Pipeline Builder - Form Integration

**Goal:** Integrate persona configuration into pipeline nodes

**File:** `/apps/ui/src/components/pipeline-builder/NodeEditModal.tsx`

- [ ] **Replace JSON textarea** with form-based editing:
  - Common fields:
    - Name input
    - Description textarea
    - Enabled toggle
  - Eye-specific fields (dynamic based on eye type):
    - Pull configurable parameters from persona
    - Render appropriate form controls
- [ ] Add "Advanced" section (collapsed by default):
  - JSON editor for power users
  - Import/export buttons
  - Raw config view
- [ ] Add "Configure Persona" button:
  - Opens PersonaWizard in nested modal
  - Scoped to this node's eye type

**File:** `/apps/ui/src/components/pipeline-builder/PipelineCanvasEnhanced.tsx`

- [ ] Right-click node → context menu → "Configure Persona"
- [ ] Opens PersonaWizard
- [ ] Updates node config when wizard saves

**Acceptance Criteria:**
- [ ] NodeEditModal uses forms (NO JSON by default per R10)
- [ ] JSON editor available in Advanced section (for power users)
- [ ] Persona configuration accessible from pipeline
- [ ] Build + runtime tests pass

---

### Phase 17: Dynamic Routing Implementation

**Goal:** Overseer LLM decides pipeline flow dynamically

**File:** `/packages/eyes/src/routing/dynamic-router.ts`

- [ ] Create `DynamicRouter` class:
  ```typescript
  export class DynamicRouter {
    async analyzeRequest(input: string, context: SessionContext): Promise<EyeSequence> {
      // Use Overseer persona to analyze request
      // Return ordered list of Eyes to invoke
      // Include reasoning/rationale
    }

    async validateRoute(route: EyeSequence): Promise<ValidationResult> {
      // Ensure no circular dependencies
      // Verify all Eyes exist and are active
    }
  }

  export interface EyeSequence {
    readonly eyes: readonly EyeRouteStep[];
    readonly rationale: string;
    readonly confidence: number;
  }

  export interface EyeRouteStep {
    readonly eyeId: string;
    readonly stage: 'guidance' | 'validation';
    readonly reason: string;
  }
  ```

**File:** `/apps/overseer/src/services/session.service.ts`

- [ ] Before executing pipeline:
  - Call `dynamicRouter.analyzeRequest()`
  - Store routing decision in session
  - Log rationale
- [ ] If routing fails:
  - Fall back to configured pipeline
  - Log warning
- [ ] Store routing decision for observability

**File:** `/apps/ui/src/app/monitor/page.tsx`

- [ ] Display routing decision:
  - "Suggested Route" section
  - List of Eyes in order
  - Rationale per Eye
  - Confidence score
- [ ] Show comparison:
  - Configured pipeline vs. Suggested route
  - Differences highlighted

**File:** `/apps/ui/src/components/pipeline-builder/PipelineCanvasEnhanced.tsx`

- [ ] Add "Suggested Route" overlay:
  - Highlight suggested path during execution
  - Different color from configured edges
  - Toggle on/off
- [ ] Allow manual override:
  - User can ignore suggestions
  - Logs override decision

**Acceptance Criteria:**
- [ ] Overseer analyzes requests and suggests routing
- [ ] Routing decision stored and observable in Monitor
- [ ] Monitor shows routing rationale
- [ ] Pipeline canvas visualizes suggested route
- [ ] Manual override works correctly
- [ ] System defaults to configured pipeline if routing fails

---

### Phase 18: Two-Phase Operation UI

**Goal:** Expose GUIDANCE + VALIDATION phases in UI

**File:** `/apps/ui/src/app/monitor/page.tsx`

- [ ] Show phase badges per Eye:
  - Blue badge: "GUIDANCE"
  - Green badge: "VALIDATION"
- [ ] Display phase-specific output:
  - Separate sections for each phase
  - Collapsible cards
- [ ] Color-code timeline entries by phase
- [ ] Show phase transitions

**File:** `/packages/eyes/src/renderer/persona-renderer.ts`

- [ ] Accept `phase: 'guidance' | 'validation'` parameter:
  ```typescript
  export function renderPersonaPrompt(
    blueprint: PersonaBlueprint,
    stage: EyeStageToken,
    phase: 'guidance' | 'validation',
    inputData?: string,
    options: PersonaPromptOptions = {},
  ): PersonaPrompt {
    // Select appropriate PhaseSpec from PersonaBlueprint
    const phaseSpec = phase === 'guidance'
      ? blueprint.phases.guidance
      : blueprint.phases.validation;

    // Include phase-specific mission/check/reminders
    // ...
  }
  ```

**File:** `/apps/ui/src/components/pipeline-builder/NodeEditModal.tsx`

- [ ] Add phase configuration section:
  - Toggle: Enable Guidance Phase
  - Toggle: Enable Validation Phase
  - Show phase-specific settings

**Acceptance Criteria:**
- [ ] Monitor displays phase badges correctly
- [ ] Phase-specific output visible and clear
- [ ] Personas can configure both phases independently
- [ ] Build compiles successfully

---

### Phase 19: Extensibility & Power User Features

**Goal:** Make system fully customizable

#### Import/Export Personas

**File:** `/apps/ui/src/components/persona-form/steps/ReviewStep.tsx`

- [ ] Export button:
  - Serializes current form state to PersonaBlueprint JSON
  - Downloads as `{eyeId}-{name}-v{version}.json`
  - Includes timestamp metadata

**File:** `/apps/ui/src/components/persona-form/PersonaWizard.tsx`

- [ ] Import button (in header):
  - File upload input
  - Validates JSON structure
  - Pre-fills wizard with imported data
  - Shows validation errors if invalid

#### Persona Templates Library

**File:** `/apps/ui/src/lib/persona-templates.ts` (SSOT)

- [ ] Define pre-built persona templates:
  ```typescript
  export const PERSONA_TEMPLATES: ReadonlyArray<PersonaTemplate> = [
    {
      id: 'code-reviewer',
      name: 'Code Reviewer',
      description: 'Reviews code for quality and best practices',
      blueprint: { ... },
    },
    {
      id: 'security-auditor',
      name: 'Security Auditor',
      description: 'Audits code for security vulnerabilities',
      blueprint: { ... },
    },
    // ... more templates
  ] as const;
  ```

**File:** `/apps/ui/src/components/persona-form/TemplateSelector.tsx`

- [ ] "Start from Template" button (wizard start screen)
- [ ] Grid of template cards
- [ ] Click to pre-fill wizard
- [ ] User can modify after selection

#### Custom Eye Registration

**File:** `/apps/ui/src/app/eyes/new/page.tsx`

- [ ] Form to register new Eye type:
  - Eye ID input
  - Name input
  - Description textarea
  - SVG icon upload
  - Capabilities array input
  - Create default persona option (checkbox)
- [ ] On submit:
  - Create eye record
  - Create default persona if checked
  - Redirect to eye configuration

#### Pipeline Templates

**File:** `/apps/ui/src/components/pipeline-builder/Toolbar.tsx`

- [ ] "Save as Template" button:
  - Opens dialog
  - Template name input
  - Template description textarea
  - Saves current pipeline as template

**File:** `/apps/ui/src/components/pipeline-builder/TemplateLibrary.tsx`

- [ ] "Load Template" button:
  - Opens template library modal
  - Grid of saved templates
  - Preview on hover
  - Click to load into canvas

**File:** `/apps/ui/src/lib/pipeline-templates.ts` (SSOT)

- [ ] Pre-defined pipeline templates:
  ```typescript
  export const PIPELINE_TEMPLATES: ReadonlyArray<PipelineTemplate> = [
    {
      id: 'simple-validation',
      name: 'Simple Validation Flow',
      description: 'Basic guidance + validation',
      nodes: [...],
      edges: [...],
    },
    // ... more templates
  ] as const;
  ```

**Acceptance Criteria:**
- [ ] Import/export works with valid JSON
- [ ] Templates library accessible and functional
- [ ] Custom Eyes registrable through UI
- [ ] Pipeline templates saveable/loadable
- [ ] No data loss during operations
- [ ] All features follow SSOT (R13)

---

### Phase 20: Theme System Polish & Accessibility

**Goal:** Professional UI with full accessibility (WCAG AA)

#### Accessibility Audit

- [ ] **Keyboard Navigation:**
  - All form fields accessible via Tab
  - Logical tab order
  - Skip links for long forms
  - Focus traps in modals

- [ ] **ARIA Labels:**
  - All inputs have labels (visible or aria-label)
  - Form sections have aria-labelledby
  - Buttons have aria-describedby for tooltips
  - Dynamic content has aria-live regions

- [ ] **Focus Indicators:**
  - Visible focus ring on all interactive elements
  - High contrast focus styles
  - Focus not obscured by overlays

- [ ] **Error Announcements:**
  - Validation errors announced to screen readers
  - aria-invalid on invalid fields
  - aria-describedby for error messages

#### Form Validation Feedback

**File:** `/apps/ui/src/components/persona-form/validation.ts`

- [ ] Inline error messages:
  - Show below field immediately on blur
  - Clear, actionable messages from SSOT
  - Icon + text
- [ ] Field-level validation:
  - Required field indicators
  - Character count with limit
  - Format validation (email, URL, etc.)
- [ ] Form-level validation:
  - Summary of errors at top
  - Jump to first error button
- [ ] Success confirmations:
  - Toast notification on save
  - Checkmarks on valid fields

#### Polish & Animations

- [ ] Smooth transitions:
  - Wizard step transitions (slide/fade)
  - Modal open/close
  - Dropdown expand/collapse
- [ ] Loading states:
  - Skeleton screens for data fetching
  - Progress indicators for saves
  - Spinners for async operations
- [ ] Empty states:
  - Helpful messages when no data
  - Call-to-action buttons
  - Illustrations from SSOT

#### Theming

- [ ] Verify all components use theme tokens:
  - Colors from `brand-*` classes
  - Spacing from Tailwind scale
  - Typography from theme config
- [ ] Light/dark mode toggle works everywhere
- [ ] High contrast mode support

**Acceptance Criteria:**
- [ ] WCAG AA compliance verified
- [ ] Keyboard-only navigation works fully
- [ ] Screen reader compatible (test with VoiceOver/NVDA)
- [ ] Error messages clear and actionable
- [ ] Professional polish throughout
- [ ] Animations smooth (60fps)

---

### Phase 21: End-to-End Integration Testing

**Goal:** Verify complete flow works correctly

#### Test Scenarios

**Scenario 1: Create Persona → Configure Eye → Build Pipeline → Run Session**

- [ ] Create new persona via wizard
- [ ] Fill all required fields
- [ ] Save persona
- [ ] Navigate to Eyes page
- [ ] Configure eye with new persona
- [ ] Navigate to Pipelines page
- [ ] Add eye to pipeline
- [ ] Connect to other eyes
- [ ] Save pipeline
- [ ] Activate pipeline
- [ ] Navigate to Playground
- [ ] Submit request
- [ ] Monitor execution
- [ ] Verify output correct

**Scenario 2: Edge Cases**

- [ ] **Invalid persona configurations:**
  - Missing required fields
  - Invalid JSON in examples
  - Duplicate capabilities
  - Empty arrays where required
- [ ] **Empty required fields:**
  - Try to advance wizard step without filling required fields
  - Verify validation prevents advancement
- [ ] **Circular pipeline dependencies:**
  - Create pipeline with cycles
  - Verify validation catches it
- [ ] **Routing failures:**
  - Submit request when Overseer is unavailable
  - Verify fallback to configured pipeline

**Scenario 3: Performance Testing**

- [ ] **Large persona forms:**
  - Persona with 50+ capabilities
  - Persona with 100+ reminders
  - Measure load time, responsiveness
- [ ] **Complex pipelines:**
  - Pipeline with 20+ nodes
  - Pipeline with 50+ edges
  - Measure render performance
- [ ] **Multiple concurrent sessions:**
  - Start 10 sessions simultaneously
  - Monitor memory usage, response times

**Acceptance Criteria:**
- [ ] Complete flow works end-to-end
- [ ] Edge cases handled gracefully (no crashes)
- [ ] Validation catches invalid states
- [ ] Performance acceptable (< 2s for form loads, < 5s for pipeline renders)
- [ ] Zero critical bugs

---

### Phase 22: Documentation & Go-Live Validation

**Goal:** Document new system and validate production readiness

#### Architecture Documentation

**File:** `/docs/architecture/persona-system.md`

- [ ] Update with new structured schema
- [ ] Document PersonaBlueprint structure
- [ ] Explain form wizard architecture
- [ ] Show data flow diagrams
- [ ] Include examples

#### User Guide

**File:** `/docs/user-guide/creating-personas.md`

- [ ] Step-by-step wizard walkthrough
- [ ] Screenshots of each step
- [ ] Best practices for writing missions
- [ ] Common patterns (with examples)
- [ ] Troubleshooting guide

**File:** `/docs/user-guide/configuring-eyes.md`

- [ ] How to configure eyes via Eyes page
- [ ] How to configure eyes via Pipeline Builder
- [ ] Unified configuration model explanation

#### Developer Guide

**File:** `/docs/developer-guide/extending-system.md`

- [ ] How to add new Eye types
- [ ] How to create persona templates
- [ ] How to customize routing logic
- [ ] API reference for configuration

#### Final Validation (CLAUDE.md Compliance)

- [ ] **R01 - SSOT & DRY:**
  - All constants in dedicated modules
  - Zero duplicated logic
  - Search for string literals (should find zero outside SSOT)

- [ ] **R02 - Separation of Concerns:**
  - UI components don't contain business logic
  - Data layer separate from presentation
  - Infrastructure separate from domain

- [ ] **R03 - Mirror Existing Architecture:**
  - Follows Next.js App Router patterns
  - Uses existing hooks/services
  - Matches file structure conventions

- [ ] **R04 - Performance First:**
  - All callbacks memoized with useCallback
  - Expensive computations use useMemo
  - No unnecessary re-renders

- [ ] **R05 - Security:**
  - All inputs validated
  - Outputs escaped
  - No secrets in code
  - Dependencies up-to-date

- [ ] **R07 - Strict Typing:**
  - Zero `any` types in codebase
  - Zero `!` non-null assertions
  - All types accurate and specific

- [ ] **R09 - Clean Code:**
  - No emojis in code
  - No ASCII art
  - No banner comments

- [ ] **R10 - Whole-System Refactors:**
  - Old TEXT blob column removed
  - No backward compatibility code
  - No mixed legacy states

- [ ] **R13 - No Magic Numbers/Strings:**
  - All text from SSOT constants
  - All numbers from configuration
  - Zero hardcoded literals

- [ ] **R14 - Build/Test Gate:**
  - `bun run build` succeeds
  - `bun run typecheck` passes
  - `bun run lint` passes
  - `bun run test` passes (when tests exist)

#### Production Readiness

- [ ] All features implemented
- [ ] All bugs fixed
- [ ] Documentation complete
- [ ] Performance acceptable
- [ ] Security validated
- [ ] Accessibility verified
- [ ] Ready for release

**Acceptance Criteria:**
- [ ] Documentation complete and accurate
- [ ] User guide clear for non-technical users
- [ ] Developer guide enables extensibility
- [ ] All CLAUDE.md rules verified (R01-R17)
- [ ] Build + tests pass
- [ ] No runtime errors
- [ ] Production-ready

---

## Gap Analysis vs FINAL_OVERSEER_VISION.md

### ❌ Current Gaps (Before This Plan)

1. **Personas stored as TEXT blob** (not structured, not queryable)
2. **No unified Eye/Persona/Pipeline configuration** (different models everywhere)
3. **No form-based persona editing** (markdown/JSON editors only)
4. **LLM config hardcoded** (temperature=0, top_p=1 not configurable)
5. **No dynamic routing UI** (Overseer decides flow but not visible)
6. **Two-phase operation not exposed in UI** (exists in code but not observable)
7. **JSON/markdown editors for regular users** (not user-friendly)
8. **Mixed legacy states** (old code alongside new code - violates R10)

### ✅ After This Plan (Expected State)

1. **Structured persona storage** (queryable fields, efficient queries)
2. **Unified configuration model** (Eye = Persona = Pipeline Node uses same forms)
3. **Professional wizard for persona creation** (9-step form, no JSON required)
4. **Per-persona LLM configuration** (temperature, top_p, format all configurable)
5. **Dynamic routing with Overseer** (visible in UI, observable, overrideable)
6. **Two-phase operation fully visible** (GUIDANCE + VALIDATION badges, separate outputs)
7. **Forms for all config** (JSON only for power users in Advanced sections)
8. **Clean codebase** (R10: no backward compatibility, no mixed legacy states)

---

## SSOT Locations

**All constants, enums, and text must live in these SSOT modules (R13):**

| Module | Purpose | Location |
|--------|---------|----------|
| Persona Form Text | All wizard text, labels, hints, errors | `/apps/ui/src/components/persona-form/constants.ts` |
| Pipeline Builder Text | All pipeline UI text | `/apps/ui/src/components/pipeline-builder/constants.ts` |
| Persona Templates | Pre-built persona blueprints | `/apps/ui/src/lib/persona-templates.ts` |
| Pipeline Templates | Pre-built pipeline configurations | `/apps/ui/src/lib/pipeline-templates.ts` |
| Validation Rules | All validation constants, regex | `/apps/ui/src/lib/validation-rules.ts` |
| Database Schema | All table definitions | `/packages/db/schema.ts` |
| Type Definitions | All TypeScript interfaces | `/apps/ui/src/types/**/*.ts` |

**NO string literals or magic numbers should exist outside these SSOT modules.**

---

## Compliance Checklist (Per CLAUDE.md)

**Before claiming completion, verify ALL rules:**

- [ ] **R01 - SSOT & DRY:** All constants centralized, zero duplication
- [ ] **R02 - SOC:** UI ≠ domain ≠ data ≠ infrastructure
- [ ] **R03 - Mirror Architecture:** Follows existing patterns, aliases, conventions
- [ ] **R04 - Performance:** Memoized callbacks, optimized renders, no hot loops
- [ ] **R05 - Security:** Inputs validated, outputs escaped, no secrets in code
- [ ] **R06 - Plan → Approve → Audit:** This plan approved, audit after each phase
- [ ] **R07 - Strict Typing:** Zero `any` types, zero `!` assertions, accurate types
- [ ] **R08 - Build/Test Gate:** Build + typecheck + lint pass after each phase
- [ ] **R09 - Clean Code:** No emojis, no ASCII art, no noise comments
- [ ] **R10 - Whole-System Refactors:** NO backward compatibility, NO mixed legacy states
- [ ] **R11 - Documentation:** READMEs/ADRs updated when API changes
- [ ] **R12 - Real Data:** No fake fallbacks (unless explicitly requested)
- [ ] **R13 - No Magic Numbers/Strings:** ALL text/numbers from SSOT
- [ ] **R14 - Compile/Lint/Test:** Everything passes cleanly
- [ ] **R15 - No Time Estimates:** No estimates in this document
- [ ] **R16 - Full Stack Verification:** (Not applicable - no new backend APIs in this plan)
- [ ] **R17 - JSON Logging:** Append compliance JSON after implementation complete

---

## Next Session Handoff

### Current State
- **Status:** Plan approved, ready to implement
- **Phase:** About to start Phase 10 bug fixes
- **Branch:** `release/go-live`
- **Build Status:** Compiles but has runtime errors

### Start Here (Priority Order)

1. **Fix Phase 10 Critical Bugs FIRST:**
   - Fix EyePalette `response.map` error
   - Pre-populate default pipeline
   - Convert NodeEditModal to forms

2. **Then Proceed with Phase 11:**
   - Delete old TEXT-based persona UI
   - Add "Under Construction" placeholder

3. **Follow Phases Sequentially:**
   - Complete each phase fully before moving to next
   - Check off items in this file as you complete them
   - Run build + typecheck after each phase

4. **Logging Requirements:**
   - After EACH phase, stage changes: `git add .`
   - Capture diff: `git diff --staged`
   - Log compliance JSON per CLAUDE.md R17
   - Validate: `~/.agent_tools/validate_json_logged.sh`

### Critical Reminders

- **R10:** NO backward compatibility, NO mixed legacy states
- **R13:** ALL text from SSOT (zero string literals)
- **R07:** Zero `any` types
- **Track Progress:** Update checkboxes in this file as you work

### Files to Reference

- **This Plan:** `/IMPLEMENTATION_PLAN.md` (this file)
- **CLAUDE.md:** `/.claude/CLAUDE.md` (compliance rules)
- **Vision Doc:** `/FINAL_OVERSEER_VISION.md` (target architecture)
- **Schema:** `/packages/db/schema.ts` (database structure)
- **Types:** `/apps/ui/src/types/pipeline.ts`, `/packages/eyes/src/interfaces/persona-blueprint.ts`

---

**Last Updated:** 2025-10-30
**Next Review:** After Phase 12 (Database Schema Overhaul)
