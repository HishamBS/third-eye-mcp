# Epic 02: Persona Engine - Next Steps

## Current Issue
**Problem**: Blueprints contain string literals violating AGENTS.md rules (no string literals, no magic numbers)

**Example violations in blueprints**:
- `'tag'`, `'ok'`, `'code'` - should use `EnvelopeField.TAG`, etc.
- `'success'`, `'warning'` - should use `SemanticColor.SUCCESS`, etc.
- `'🔍'`, `'✅'` - should use `EmojiIcon.SEARCH`, etc.
- `'warning'`, `'success'` - should use color constants

## Solution

### Step 1: Export Helper Functions
✅ **DONE**: Exported `freezeTokens`, `TokenLiteral`, `tokenValues` from `packages/constants/taxonomy.ts`

### Step 2: Create Envelope Constants Module
✅ **DONE**: Created `packages/constants/envelope-constants.ts` with:
- `EnvelopeField` - field names
- `SemanticColor` - UI colors
- `EmojiIcon` - emoji icons
- `EyeTag` - eye tags

### Step 3: Export New Constants
**TODO**: Add to `packages/constants/index.ts`:
```typescript
export * from './envelope-constants';
```

### Step 4: Refactor Blueprints
**TODO**: Update all blueprint files to:
1. Import constants instead of using strings
2. Use `EnvelopeField.TAG` instead of `'tag'`
3. Use `SemanticColor.SUCCESS` instead of `'success'`
4. Use `EmojiIcon.SEARCH` instead of `'🔍'`
5. Use `NextAction.AWAIT_INPUT` instead of `'AWAIT_INPUT'`

### Step 5: Build & Test
- Ensure all packages compile
- Add tests for blueprint JSON parsing
- Verify no string literals remain

## Files to Update

1. `packages/constants/index.ts` - Export envelope constants
2. `packages/eyes/src/blueprints/overseer.blueprint.ts` - Refactor
3. `packages/eyes/src/blueprints/sharingan.blueprint.ts` - Refactor
4. All remaining 6 blueprints - Create and refactor

## Example Refactor

**Before** (violates rules):
```typescript
{
  tag: 'sharingan',
  ui: {
    icon: '🔍',
    color: 'warning',
  },
  next: 'AWAIT_INPUT',
}
```

**After** (follows rules):
```typescript
import { EnvelopeField, EmojiIcon, SemanticColor, NextAction } from '@third-eye/constants';

{
  [EnvelopeField.TAG]: EyeTag.SHARINGAN,
  ui: {
    [EnvelopeField.ICON]: EmojiIcon.SEARCH,
    [EnvelopeField.COLOR]: SemanticColor.WARNING,
  },
  [EnvelopeField.NEXT]: NextAction.AWAIT_INPUT,
}
```

## Sequential Order for Epic 2

1. ✅ Story 2.1.1: Create PersonaBlueprint interface
2. ✅ Story 2.1.2: Add envelope constants (no string literals)
3. 🔄 Story 2.1.3: Refactor existing 2 blueprints (remove string literals)
4. ⏭️ Story 2.1.4: Create remaining 6 blueprints (use constants only)
5. ⏭️ Story 2.1.5: Add tests
6. ⏭️ Story 2.2: Runtime Renderer
7. ⏭️ Story 2.3: Persona Guards
8. ⏭️ Story 2.4: Clarification Storage
9. ⏭️ Story 2.5: Intent Confirmation

## Current Status

- **Epic 01**: ✅ COMPLETE (101 tests passing)
- **Epic 02**: 🚧 25% Story 2.1 done, needs refactoring
- **Constants**: ✅ Envelope constants added
- **Blueprints**: ⚠️ Need refactoring (violate AGENTS.md rules)
