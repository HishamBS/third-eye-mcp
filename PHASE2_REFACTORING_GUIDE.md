# Phase 2 Refactoring Guide

## Status: In Progress (2/19 pages complete)

**Completed:** Monitor page, Home page (Dashboard)
**Remaining:** 17 pages

---

## Refactoring Patterns

### Pattern 1: Replace Emojis with Icons
**Before:**
```tsx
const demo = '95% confidence ✓';
```

**After:**
```tsx
import { CheckCircle } from 'lucide-react';
const demo = (
  <>95% confidence <CheckCircle className="h-3 w-3 inline" /></>
);
```

### Pattern 2: Use SSOT Constants Instead of Hardcoded Arrays
**Before:**
```tsx
const providers = ['groq', 'openrouter', 'ollama', 'lmstudio'];
```

**After:**
```tsx
import { PROVIDERS } from '@third-eye/types/enums';
const providers = [...PROVIDERS];
```

### Pattern 3: Replace `any` Types with Proper Types
**Before:**
```tsx
const payload: any = { name: formData.name };
```

**After:**
```tsx
interface CreateEyePayload {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly outputSchema: Record<string, unknown>;
  readonly personaId?: string;
}
const payload: CreateEyePayload = { name: formData.name, ... };
```

### Pattern 4: Remove Hardcoded Colors (Use Theme Tokens)
**Before:**
```tsx
const eyeColor = 'border-white/40 bg-white/10';
```

**After:**
```tsx
// Use existing brand-* tokens from tailwind.config.js
const eyeColor = 'border-brand-outline/40 bg-brand-paper/10';
```

---

## Page-by-Page Audit

### ✅ Monitor Page (`apps/ui/src/app/monitor/page.tsx`)
**Status:** Complete
**Changes:**
- Replaced all emojis with lucide-react icons
- Uses SSOT constants (MONITOR_TABS, SpeakerType, ApprovalStatus)
- No `any` types - uses `Record<string, unknown>`
- Extracted components (ConversationEntry, TabButton, StatusBadge, SpeakerBadge)

### ✅ Home Page (`apps/ui/src/app/page.tsx`)
**Status:** Complete
**Changes:**
- Removed emoji from demo string
- Replaced hardcoded provider array with PROVIDERS constant

### ❌ Eyes Page (`apps/ui/src/app/eyes/page.tsx`)
**Issues Found:**
- **Line 243, 307:** `any` type for payload → needs proper interface
- **Line 406:** Hardcoded color string `'border-white/40 bg-white/10'` → use brand tokens
- **Line 42:** `any` type for testResult state
- **Multiple:** Repetitive API_URL patterns → could centralize

**Estimated Effort:** Medium (1-2 hours) - Large file (~1000 lines)

### ❌ Eyes Detail Page (`apps/ui/src/app/eyes/[id]/page.tsx`)
**Issues Found:** Not yet audited

### ❌ Personas Page (`apps/ui/src/app/personas/page.tsx`)
**Issues Found:** Not yet audited
**Priority:** High (core page mentioned in requirements)

### ❌ Sessions Page (`apps/ui/src/app/sessions/page.tsx`)
**Issues Found:** Not yet audited
**Priority:** High (core page mentioned in requirements)

### ❌ Replay Page (`apps/ui/src/app/replay/page.tsx`)
**Status:** Partial - has dynamic export but not fully refactored
**Issues Found:** Likely has `any` types and hardcoded values

### ❌ Pipelines Page (`apps/ui/src/app/pipelines/page.tsx`)
**Issues Found:** Not yet audited
**Priority:** High (Pipeline Builder is Phase 7)

### ❌ Settings Page (`apps/ui/src/app/settings/page.tsx`)
**Issues Found:** Not yet audited

### ❌ Models Page (`apps/ui/src/app/models/page.tsx`)
**Issues Found:** Not yet audited

### ❌ Prompts Page (`apps/ui/src/app/prompts/page.tsx`)
**Issues Found:** Not yet audited

### ❌ Connections Page (`apps/ui/src/app/connections/page.tsx`)
**Issues Found:** Not yet audited

### ❌ Metrics Page (`apps/ui/src/app/metrics/page.tsx`)
**Issues Found:** Not yet audited

### ❌ Audit Page (`apps/ui/src/app/audit/page.tsx`)
**Issues Found:** Not yet audited

### ❌ Duel Page (`apps/ui/src/app/duel/page.tsx`)
**Issues Found:** Not yet audited

### ❌ Database Page (`apps/ui/src/app/database/page.tsx`)
**Issues Found:** Not yet audited

### ❌ Strictness Page (`apps/ui/src/app/strictness/page.tsx`)
**Issues Found:** Not yet audited

### ❌ Playground Page (`apps/ui/src/app/playground/page.tsx`)
**Issues Found:** Not yet audited

### ❌ Playground Detail Page (`apps/ui/src/app/playground/[id]/page.tsx`)
**Issues Found:** Not yet audited

---

## SSOT Resources Available

### Constants Package (`packages/constants/`)
- `speaker.ts` - Speaker types, icons, colors
- `monitor-tabs.ts` - Monitor tab configurations
- `status-badges.ts` - Approval/validation status badges
- `eye-icons.ts` - Eye icon mappings
- `taxonomy.ts` - UI tokens and action types
- `clarifications.ts` - Clarification field types

### Types Package (`packages/types/`)
- `enums.ts` - PROVIDERS, EYE_NAMES, ProviderId, EyeName
- Core type definitions

### Config Package (`packages/config/`)
- `constants.ts` - EYE_DISPLAY_NAMES, EYE_COLORS, EYE_DESCRIPTIONS

### UI Components (`apps/ui/src/components/`)
- `ui/DynamicIcon.tsx` - Replaces all emojis with lucide-react icons
- `monitor/SpeakerBadge.tsx` - Speaker avatars
- `monitor/StatusBadge.tsx` - Status indicators
- `monitor/TabButton.tsx` - Tab navigation
- `monitor/ConversationEntry.tsx` - Timeline entries

---

## Common Issues to Fix

### 1. Magic Number/String Violations (R13)
- Hardcoded color hex codes or Tailwind classes
- Literal string arrays that should be enums/constants
- Hardcoded URLs without environment variables
- Magic numbers (timeouts, limits, etc.)

### 2. Type Safety Violations (R07)
- `any` types anywhere in code
- Missing `readonly` modifiers on interfaces
- Blind type assertions with `!` or `as`
- Missing generic constraints

### 3. Emoji/Visual Noise Violations (R09)
- Emojis in strings (✅, ❌, 📊, ❓, 🔍, etc.)
- ASCII art in comments
- Unnecessary decorative comments

### 4. DRY/SSOT Violations (R01)
- Duplicated logic across components
- Repeated API patterns
- Duplicated constant definitions

---

## Testing Checklist (for each page)

- [ ] Build succeeds without errors: `bun run build`
- [ ] Type check passes: `bun run type-check` (if available)
- [ ] No console errors in browser
- [ ] Visual regression test: page looks identical after refactor
- [ ] Functionality unchanged: all buttons/forms work

---

## Next Steps

### Immediate Priority (Phase 2 continuation):
1. **Eyes Page** - Fix `any` types and hardcoded colors
2. **Personas Page** - Full refactor (high priority)
3. **Sessions Page** - Full refactor (high priority)
4. **Pipelines Page** - Prepare for Phase 7 (Pipeline Builder)

### Medium Priority:
5. Settings Page
6. Models Page
7. Prompts Page
8. Connections Page

### Lower Priority:
9-17. Audit, Duel, Database, Strictness, Playground, Metrics, Replay (finalize)

---

## Estimated Completion Time

- **High Priority Pages (4):** 6-8 hours
- **Medium Priority Pages (4):** 4-6 hours
- **Lower Priority Pages (9):** 6-9 hours

**Total Phase 2 Estimate:** 16-23 hours

---

## Success Criteria

Phase 2 is complete when ALL pages have:
- ✅ Zero `any` types
- ✅ Zero emojis in code
- ✅ Zero hardcoded magic numbers/strings
- ✅ All constants from SSOT modules
- ✅ Proper readonly modifiers
- ✅ Clean build with no warnings
- ✅ Visual parity with original design
