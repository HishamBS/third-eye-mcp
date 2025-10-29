# Epic 02: Persona Engine - Complete Plan

## ✅ COMPLETED (This Session)

1. **Epic 01 Complete**: 101 tests passing, all packages build, Bun-only runtime
2. **Created Envelope Constants Module**: `packages/constants/envelope-constants.ts`
   - `EnvelopeField`, `SemanticColor`, `EmojiIcon`, `EyeTag`
3. **Refactored Overseer Blueprint**: Zero string literals, all constants
4. **Refactored Sharingan Blueprint**: Zero string literals, all constants
5. **Exported Helper Functions**: `freezeTokens`, `TokenLiteral`, `tokenValues`

## 🔄 CURRENT STATUS

**Story 2.1 Progress**: 2/8 blueprints complete (25%)

**Completed Blueprints**:
- ✅ Overseer - Fully refactored, zero string literals
- ✅ Sharingan - Fully refactored, zero string literals

**Remaining Blueprints**: 6
- [ ] Jogan
- [ ] Rinnegan
- [ ] Mangekyo
- [ ] Tenseigan
- [ ] Byakugan
- [ ] Prompt Helper (Kyuubi)

## 📋 COMPLETION PLAN - Epic 02 Full Implementation

### Phase 1: Create Remaining 6 Blueprints (Story 2.1)
**Estimated Time**: 3-4 hours

For each of the 6 remaining eyes:
1. Create blueprint file with PersonaBlueprint structure
2. Use constants (EnvelopeField, SemanticColor, EmojiIcon, EyeTag, NextAction)
3. Add guidance phase example (ok: false) and validation phase example (ok: true)
4. Define envelope contract with required keys
5. Add reminders aligned with SSOT

**Pattern Established**:
```typescript
import { EyeId, EyeStageToken, EyeStatusCode, EyeTag, EnvelopeField, SemanticColor, EmojiIcon, NextAction } from '@third-eye/constants';

export const [EYE]_BLUEPRINT: PersonaBlueprint = {
  metadata: {
    eyeId: EyeId.[EYE],
    name: '[Eye Name]',
    description: '[Description]',
    version: '1.0.0',
    capabilities: ['cap1', 'cap2'] as const,
  },
  mission: `[Mission statement]`,
  phases: {
    guidance: { /* example with constants */ },
    validation: { /* example with constants */ },
  },
  envelopeContract: { /* use EnvelopeField.* */ },
  reminders: [ /* reminders */ ],
};
```

### Phase 2: Add Unit Tests (Story 2.1.3)
**Estimated Time**: 1-2 hours

Create `packages/eyes/src/blueprints/__tests__/blueprints.test.ts`:
- Test blueprint shape
- Test JSON parsing of examples
- Test envelope contract keys
- Test no string literals in examples

### Phase 3: Runtime Renderer (Story 2.2)
**Estimated Time**: 2 hours

Implement `renderPersonaPrompt()` in `packages/eyes/src/renderer/`:
- Accept persona blueprint + stage
- Include stage summary, skeleton JSON, behavior checklist
- Append example for current stage
- Request response-format JSON
- Apply deterministic decoding (temperature 0, top_p 1)
- Add debug logging via `THIRD_EYE_DEBUG_PERSONAS`

### Phase 4: Persona Guards (Story 2.3)
**Estimated Time**: 2 hours

Implement guards in `packages/eyes/src/guards/`:
- `ensureEyeBehavior()` dispatches to eye-specific guard
- Validate schema, codes, canonical questions, metrics
- On failure, send targeted reminder referencing violation
- After max retries, error to auto-router

### Phase 5: Clarification Pipeline (Story 2.4)
**Estimated Time**: 2 hours

Implement in session manager:
- `addClarificationRequest()` stores canonical questions
- `resolveClarification()` maps answers to canonical tokens
- Update resolved facts
- Auto-router resume flow appends resolved facts

### Phase 6: Intent Confirmation (Story 2.5)
**Estimated Time**: 1-2 hours

Implement:
- Jogan emits `AWAIT_CONFIRMATION` with intentAnalysis
- Session manager stores confirmations with timestamps
- Auto-router `resumeFlow` starts at first pending validation
- Skip completed guidance eyes
- Monitor Intent tab shows status

## 🎯 SUCCESS CRITERIA

- [ ] All 8 blueprints created with zero string literals
- [ ] All blueprints have valid JSON examples (guidance + validation)
- [ ] Blueprint unit tests passing
- [ ] Runtime renderer builds compact prompts
- [ ] Guard functions validate envelopes
- [ ] Orchestrator retries without heuristics
- [ ] Clarification + intent flows verified via scenario harness

## 📊 TESTING REQUIREMENTS

**Unit Tests**:
- Blueprint shape validation
- Example JSON parsing
- Envelope contract validation
- Guard function pass/fail cases

**Integration Tests**:
- Scenario harness with manual confirmation
- Resume flow skips completed eyes
- Clarification loop completes once
- Intent confirmation updates status

## 🔑 KEY PATTERNS

**No String Literals**:
✅ `[EnvelopeField.TAG]: EyeTag.SHARINGAN`
✅ `[EnvelopeField.ICON]: EmojiIcon.SEARCH`
✅ `[EnvelopeField.COLOR]: SemanticColor.WARNING`
✅ `[EnvelopeField.NEXT]: NextAction.AWAIT_INPUT`

**SSOT Pattern**:
- All constants from `@third-eye/constants`
- Enum-based tokens with type safety
- Frozen objects prevent mutation

## ⏱️ ESTIMATED TOTAL TIME

**Remaining Epic 02 Work**: ~12-15 hours

- Blueprints (6 remaining): 3-4 hours
- Tests: 1-2 hours
- Runtime renderer: 2 hours
- Guards: 2 hours
- Clarification pipeline: 2 hours
- Intent confirmation: 1-2 hours

**Epic 02 Total**: ~20 hours from start to finish

## 📁 FILES TO CREATE

```
packages/eyes/src/blueprints/
├── jogan.blueprint.ts
├── rinnegan.blueprint.ts
├── mangekyo.blueprint.ts
├── tenseigan.blueprint.ts
├── byakugan.blueprint.ts
└── kyuubi.blueprint.ts

packages/eyes/src/blueprints/__tests__/
└── blueprints.test.ts

packages/eyes/src/renderer/
├── index.ts
└── persona-renderer.ts

packages/eyes/src/guards/
├── index.ts
└── persona-guards.ts
```

## 🚀 NEXT IMMEDIATE STEPS

1. Create Jogan blueprint (next in pipeline)
2. Continue with remaining 5 blueprints
3. Add tests
4. Implement renderer, guards, pipeline, confirmation
