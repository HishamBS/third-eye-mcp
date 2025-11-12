# Phase 3 UI Specification - Routing Modes Components

**Status**: Specification Ready for Implementation
**Backend**: Complete ✅
**API**: Complete ✅
**UI**: Pending ⏳

---

## Overview

Phase 3 UI enables users to configure and use three routing modes (Fully Dynamic, Constrained Dynamic, Fixed Template) through a web interface. All backend infrastructure and REST APIs are ready.

---

## Component Architecture

### Directory Structure
```
apps/ui/src/components/routing-modes/
├── PolicyBuilder.tsx          # Create/edit routing policies
├── PolicyList.tsx             # List and manage policies
├── PolicyTester.tsx           # Test policies against eye sequences
├── TemplateDesigner.tsx       # Create/edit pipeline templates
├── TemplateList.tsx           # List and manage templates
├── TemplateImportExport.tsx   # Import/export templates
├── ModeSelector.tsx           # Select routing mode for session
├── RoutingModeCard.tsx        # Display mode info
└── index.ts                   # Re-exports
```

---

## 1. PolicyBuilder Component

### Purpose
Create and edit routing policies for Constrained Dynamic mode.

### Props
```typescript
interface PolicyBuilderProps {
  policyId?: string;           // For editing existing policy
  onSave?: (policy: RoutingPolicy) => void;
  onCancel?: () => void;
}
```

### Features

**Required Fields**:
- Name (text input)
- Description (textarea, optional)
- Mandatory Eyes (multi-select dropdown with all active eyes)

**Optional Constraints**:
- Forbidden Eyes (multi-select dropdown)
- Minimum Validation Eyes (number input, 0-10)
- Security Required (checkbox) - Must include security eye
- Always Confirm Intent (checkbox) - Must include Jōgan

**Custom Constraints Section**:
- Add/remove custom constraints
- Constraint types: must_include, must_exclude, max_eyes, sequence_order
- Each constraint has: type, value, reason

### API Integration
```typescript
// Create policy
POST /api/policies
{
  name: string;
  description?: string;
  mandatoryEyes: string[];
  forbiddenEyes?: string[];
  minValidationEyes?: number;
  securityRequired?: boolean;
  alwaysConfirmIntent?: boolean;
  customConstraints?: Constraint[];
}

// Update policy
PUT /api/policies/:id
{...same fields...}
```

### Validation
- Name required (non-empty)
- Mandatory eyes required (at least one)
- No overlap between mandatory and forbidden
- Security required → must allow at least one security eye
- Always confirm intent → must allow Jōgan

### UI/UX
- Form with sections for each constraint type
- Real-time validation feedback
- "Test Policy" button (opens PolicyTester modal)
- Save/Cancel buttons
- Loading states during API calls
- Error toast on save failure
- Success toast on save success

---

## 2. PolicyList Component

### Purpose
Display list of routing policies with management actions.

### Props
```typescript
interface PolicyListProps {
  onEdit?: (policyId: string) => void;
  onTest?: (policyId: string) => void;
}
```

### Features

**Policy Card Display**:
- Name + description
- Active/Inactive badge
- Mandatory eyes (chip list)
- Forbidden eyes (chip list)
- Constraints summary
- Created date

**Actions per Policy**:
- Edit button → Opens PolicyBuilder
- Test button → Opens PolicyTester
- Activate/Deactivate toggle
- Delete button (with confirmation)

**Filters**:
- Show All / Active Only / Inactive Only
- Search by name

### API Integration
```typescript
// List policies
GET /api/policies?active=true

// Activate/deactivate
POST /api/policies/:id/activate
POST /api/policies/:id/deactivate

// Delete
DELETE /api/policies/:id
```

### UI/UX
- Grid or list view toggle
- Empty state: "No policies yet. Create your first policy!"
- Loading skeleton during fetch
- WebSocket updates for real-time changes
- Confirm dialog before delete

---

## 3. PolicyTester Component

### Purpose
Test a policy against a proposed eye sequence to validate compliance.

### Props
```typescript
interface PolicyTesterProps {
  policyId: string;
  onClose?: () => void;
}
```

### Features

**Input**:
- Eye sequence builder (drag-and-drop or multi-select)
- Predefined sequences (templates) for quick testing

**Test Results**:
- Valid/Invalid status (green/red badge)
- Errors list (if invalid)
- Warnings list (if any)
- Explanation of why policy passed/failed

**Example Sequences**:
- Minimal sequence (fewest eyes possible)
- Typical sequence (common use case)
- Maximum sequence (most comprehensive)

### API Integration
```typescript
// Test policy
POST /api/policies/:id/test
{
  eyeSequence: string[];
}

Response:
{
  result: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  }
}
```

### UI/UX
- Modal or slide-over panel
- Visual feedback (green checkmark / red X)
- Clear error messages
- "Try Another Sequence" button
- Close button

---

## 4. TemplateDesigner Component

### Purpose
Create and edit fixed pipeline templates.

### Props
```typescript
interface TemplateDesignerProps {
  templateId?: string;         // For editing
  onSave?: (template: PipelineTemplate) => void;
  onCancel?: () => void;
}
```

### Features

**Required Fields**:
- Name (text input)
- Eye Sequence (ordered list with drag-and-drop)

**Optional Fields**:
- Description (textarea)
- Strict mode (checkbox) - Enforce exact sequence
- Auto-trigger pattern (regex input)
- Public/Private toggle
- Created by (auto-filled from session)

**Eye Sequence Builder**:
- Available eyes list (left panel)
- Selected sequence (right panel, ordered)
- Drag-and-drop to reorder
- Add/remove eyes
- Validation: at least 1 eye required

**Auto-Trigger Pattern**:
- Regex input with validation
- Test input (test regex against sample text)
- Examples: `review.*code`, `deploy.*production`, `analyze.*security`

### API Integration
```typescript
// Create template
POST /api/templates
{
  name: string;
  description?: string;
  eyes: string[];
  strict?: boolean;
  autoTriggerPattern?: string;
  isPublic?: boolean;
}

// Test auto-trigger
POST /api/templates/match
{
  request: string;
}
```

### Validation
- Name required
- Eyes array required (at least 1)
- Auto-trigger pattern must be valid regex
- Duplicate eye names allowed (for loops)

### UI/UX
- Split view: available eyes | selected sequence
- Visual sequence flow (arrow between eyes)
- Regex tester modal
- Save/Cancel buttons
- Import/Export buttons
- Loading states

---

## 5. TemplateList Component

### Purpose
Display and manage pipeline templates.

### Props
```typescript
interface TemplateListProps {
  onEdit?: (templateId: string) => void;
  onUse?: (templateId: string) => void;
}
```

### Features

**Template Card Display**:
- Name + description
- Eye sequence preview (visual flow)
- Public/Private badge
- Usage count
- Auto-trigger pattern (if set)
- Created by + date

**Actions per Template**:
- Edit button → Opens TemplateDesigner
- Use button → Applies template to session
- Delete button (with confirmation)
- Duplicate button (create copy)
- Export button (download JSON)

**Filters**:
- Show All / Public Only / My Templates
- Sort by: Name, Usage Count, Created Date
- Search by name

**Usage Statistics**:
- Total usage count
- Most popular templates
- Recently used

### API Integration
```typescript
// List templates
GET /api/templates?public=true&createdBy=username

// Delete
DELETE /api/templates/:id

// Get stats
GET /api/templates/:id/stats
```

### UI/UX
- Grid view with template cards
- Empty state: "No templates yet. Create your first template!"
- Loading skeleton
- WebSocket updates
- Confirm dialog before delete
- Success toast on actions

---

## 6. TemplateImportExport Component

### Purpose
Import and export templates as JSON files.

### Props
```typescript
interface TemplateImportExportProps {
  templateId?: string;         // For export
  onImportSuccess?: (template: PipelineTemplate) => void;
}
```

### Features

**Export**:
- Export single template as JSON
- Export all user templates as bundle
- Download file with template name

**Import**:
- Upload JSON file
- Validate template structure
- Preview before import
- Overwrite existing or create new

**Template JSON Format**:
```json
{
  "name": "Code Review Pipeline",
  "description": "Comprehensive code review with security checks",
  "eyes": ["Sharingan", "Byakugan", "Mangekyo"],
  "strict": true,
  "autoTriggerPattern": "review.*code",
  "isPublic": false
}
```

### Validation
- Valid JSON structure
- All eyes exist in database
- Auto-trigger pattern is valid regex
- Name doesn't conflict (or prompt overwrite)

### UI/UX
- Export button → Downloads JSON file
- Import button → File upload dialog
- Preview modal before importing
- Error messages for invalid JSON
- Success toast on import

---

## 7. ModeSelector Component

### Purpose
Select routing mode for current session.

### Props
```typescript
interface ModeSelectorProps {
  sessionId: string;
  currentMode?: 'fully_dynamic' | 'constrained' | 'fixed';
  currentPolicyId?: string;
  currentTemplateId?: string;
  onModeChange?: (mode: string, policyId?: string, templateId?: string) => void;
}
```

### Features

**Three Mode Cards**:

1. **Fully Dynamic** (default)
   - Icon: Brain/AI icon
   - Description: "Overseer analyzes your request and selects the optimal eye sequence dynamically."
   - No configuration needed
   - Badge: "Recommended for most tasks"

2. **Constrained Dynamic**
   - Icon: Shield/Rules icon
   - Description: "Overseer routes within your defined policy constraints."
   - Configuration: Policy selector dropdown
   - Shows active policy summary
   - "Create New Policy" button

3. **Fixed Template**
   - Icon: Template/Workflow icon
   - Description: "Use a predefined eye sequence for consistent results."
   - Configuration: Template selector dropdown
   - Shows template eye sequence preview
   - "Create New Template" button

**Mode Selection**:
- Radio button or card selection
- Shows currently active mode
- Disable if mode requires config (policy/template) and none selected
- Apply button to save changes

### API Integration
```typescript
// Update session mode
PUT /api/session/:sessionId
{
  routingMode: 'fully_dynamic' | 'constrained' | 'fixed';
  policyId?: string;
  templateId?: string;
}

// Get policies and templates for dropdowns
GET /api/policies?active=true
GET /api/templates?public=true
```

### Validation
- Constrained mode requires policy selection
- Fixed mode requires template selection
- Warn if changing mode mid-session

### UI/UX
- Card-based selection (visual)
- Expandable cards to show config
- Disabled state for unavailable modes
- Mode comparison tooltip
- Apply/Cancel buttons
- Confirmation if changing active session mode

---

## 8. RoutingModeCard Component

### Purpose
Display routing mode information and selection.

### Props
```typescript
interface RoutingModeCardProps {
  mode: 'fully_dynamic' | 'constrained' | 'fixed';
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  configuration?: React.ReactNode; // Policy/template selector
}
```

### Features
- Mode icon and name
- Description text
- Badge (recommended, advanced, etc.)
- Configuration section (conditional)
- Selection state (border highlight)
- Disabled state (greyed out)

### UI/UX
- Clickable card
- Hover effect
- Active state highlight
- Smooth transitions

---

## Integration with Existing UI

### /pipelines Page Integration

**Current**: Full-screen N8N-style pipeline editor

**Add**:
1. **Toolbar Button**: "Routing Mode" button in toolbar
2. **Slide-over Panel**: ModeSelector component
3. **Status Bar**: Current mode indicator
4. **Templates Integration**: "Load Template" button → TemplateList

**Modified Components**:
```typescript
// apps/ui/src/components/pipeline-builder/Toolbar.tsx
// Add button: <RoutingModeButton />

// apps/ui/src/components/pipeline-builder/PipelineCanvasEnhanced.tsx
// Add state for routing mode
// Add slide-over panel for mode selector
```

### /settings Page Integration

**Add New Section**: "Routing Configuration"
- Default routing mode preference
- Link to PolicyList
- Link to TemplateList

---

## API Consumption Patterns

### React Query Hooks

```typescript
// apps/ui/src/hooks/useRoutingModes.ts

export function usePolicies(filters?: { active?: boolean }) {
  return useQuery({
    queryKey: ['policies', filters],
    queryFn: () => fetch(`/api/policies?${new URLSearchParams(filters)}`).then(r => r.json()),
  });
}

export function useTemplates(filters?: { public?: boolean; createdBy?: string }) {
  return useQuery({
    queryKey: ['templates', filters],
    queryFn: () => fetch(`/api/templates?${new URLSearchParams(filters)}`).then(r => r.json()),
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (policy: CreatePolicyRequest) =>
      fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}

// Similar hooks for templates, testing, etc.
```

### WebSocket Integration

```typescript
// Listen for real-time updates
useEffect(() => {
  const handlePolicyUpdate = (data: any) => {
    if (data.type === 'policy_created' || data.type === 'policy_updated') {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    }
  };

  wsManager.on('message', handlePolicyUpdate);
  return () => wsManager.off('message', handlePolicyUpdate);
}, []);
```

---

## Styling Guidelines

### Design System
- Use existing Tailwind classes from codebase
- Match color scheme from other pages
- Consistent spacing (4px grid)
- Card shadows and borders match existing components

### Component Patterns
- Follow existing modal patterns (see NodeEditModal.tsx)
- Use existing form components
- Match button styles from Toolbar.tsx
- Consistent loading states (skeleton loaders)

### Accessibility
- All inputs labeled
- Keyboard navigation support
- ARIA labels for screen readers
- Focus management in modals
- Error announcements

---

## Testing Strategy

### Unit Tests
- Component rendering
- Form validation
- API integration (mocked)
- State management

### Integration Tests
- Policy creation flow
- Template creation flow
- Mode selection flow
- Import/export flow

### E2E Tests
- Complete policy creation and application
- Template creation and usage
- Mode switching in active session

---

## Implementation Priority

### Phase 3A (Days 15-17) - Policies
1. PolicyBuilder component ✅
2. PolicyList component ✅
3. PolicyTester component ✅
4. Policy API hooks ✅
5. Integration with /settings page ✅

### Phase 3B (Days 18-19) - Templates
1. TemplateDesigner component ✅
2. TemplateList component ✅
3. TemplateImportExport component ✅
4. Template API hooks ✅
5. Integration with /pipelines page ✅

### Phase 3C (Days 20-21) - Mode Selection
1. ModeSelector component ✅
2. RoutingModeCard component ✅
3. Toolbar integration ✅
4. Session mode persistence ✅
5. Mode analytics dashboard ✅

---

## Success Criteria

✅ Users can create and manage routing policies
✅ Users can create and manage pipeline templates
✅ Users can select routing mode per session
✅ Policies validate correctly
✅ Templates execute correctly
✅ Real-time updates via WebSocket
✅ Import/export works for templates
✅ UI matches existing design patterns
✅ Accessibility requirements met
✅ Documentation complete

---

## Next Steps

1. **Implement Phase 3A** (Policies UI)
   - Create components/routing-modes/ directory
   - Implement PolicyBuilder.tsx
   - Implement PolicyList.tsx
   - Implement PolicyTester.tsx
   - Create useRoutingModes.ts hooks
   - Add to /settings page

2. **Implement Phase 3B** (Templates UI)
   - Implement TemplateDesigner.tsx
   - Implement TemplateList.tsx
   - Implement TemplateImportExport.tsx
   - Add to /pipelines page

3. **Implement Phase 3C** (Mode Selection)
   - Implement ModeSelector.tsx
   - Implement RoutingModeCard.tsx
   - Update Toolbar.tsx
   - Add mode analytics

**Estimated Time**: 6-8 hours for complete implementation

---

**Backend Ready**: ✅ All APIs functional
**Specification**: ✅ Complete
**Implementation**: ⏳ Ready to start

All backend infrastructure is ready. API endpoints are tested and functional. Components can be implemented incrementally with immediate backend support.
