# Phase 4 UI Specification - Best-in-Class Pipeline Builder

**Status**: Implementation Ready
**Backend**: Phase 1-3 Complete ✅
**Database**: Capability tags ready ✅
**Target**: Transform /pipelines page from fixed pipeline to capability-based dynamic routing

---

## Executive Summary

Phase 4 transforms the Third Eye pipeline builder from a traditional "fixed pipeline diagram" into a **capability-based dynamic routing system**. This aligns with the core vision: Overseer dynamically selects eyes based on request analysis, not a predefined sequence.

### Key Changes

1. **FROM**: Linear pipeline diagram showing all eyes in sequence
2. **TO**: Capability matrix showing what each eye CAN do
3. **NEW**: Live routing decision visualizer per session
4. **NEW**: Three viewing modes (Dynamic, Constrained, Fixed)

---

## Core Architectural Principles

### 1. No Default Pipeline

**Current Problem**: `/pipelines` page shows a fixed linear diagram with all eyes
**Solution**: Replace with capability matrix that shows eye capabilities, not sequences

### 2. Dynamic Routing First

**Current Problem**: Users think they need to configure a pipeline
**Solution**: Show that Overseer decides routing dynamically based on capabilities

### 3. Live Decision Transparency

**Current Problem**: Users don't see HOW Overseer chose eyes
**Solution**: Real-time routing decision visualizer per session

---

## Component Architecture

### Primary Page Structure

```
/pipelines page
├── Header (mode selector + actions)
├── Main Content (based on selected mode)
│   ├── Dynamic Mode → CapabilityMatrix + LiveRoutingPanel
│   ├── Constrained Mode → CapabilityMatrix + PolicyBuilder + LiveRoutingPanel
│   └── Fixed Mode → TemplateDesigner + TemplateLibrary
└── Side Panel (routing decisions history)
```

---

## Component Specifications

### 1. CapabilityMatrix Component

**Purpose**: Show what each eye can do (NOT a pipeline diagram)

**Location**: `apps/ui/src/components/pipeline-builder/CapabilityMatrix.tsx`

**Props**:

```typescript
interface CapabilityMatrixProps {
  mode: "dynamic" | "constrained" | "fixed";
  highlightedEyes?: string[]; // For showing active routing decision
}
```

**Features**:

#### Eye Capability Cards

Each eye shown as a card with:

- Eye icon and name
- Description (one-liner)
- Capability tags (visual chips)
- Status indicator (active/inactive)

#### Capability Tags

Visual representation of what each eye does:

- **overseer**: `routing`, `analysis`, `decision-making`
- **sharingan**: `ambiguity-detection`, `clarification`, `questions`
- **kyuubi**: `structuring`, `guidance`, `framework`
- **jogan**: `intent-confirmation`, `approval`, `scope`
- **rinnegan**: `feasibility`, `validation`, `planning`
- **mangekyo**: `code-review`, `security`, `best-practices`
- **tenseigan**: `quality-check`, `completeness`, `refinement`
- **byakugan**: `final-review`, `delivery`, `output`

#### Layout

```
┌─────────────────────────────────────────────────────┐
│  Capability Matrix - What Each Eye Can Do          │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │Overseer │  │Sharingan│  │ Kyuubi  │             │
│  │🧿       │  │🔍       │  │🦊       │             │
│  │Routing  │  │Clarity  │  │Structure│             │
│  │Analysis │  │Questions│  │Guidance │             │
│  └─────────┘  └─────────┘  └─────────┘             │
│                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ Jōgan   │  │Rinnegan │  │Mangekyo │             │
│  │👁️       │  │⚫       │  │🔥       │             │
│  │Intent   │  │Planning │  │Code Rev │             │
│  │Confirm  │  │Validate │  │Security │             │
│  └─────────┘  └─────────┘  └─────────┘             │
│                                                      │
│  ┌─────────┐  ┌─────────┐                          │
│  │Tenseigan│  │Byakugan │                          │
│  │🌙       │  │👀       │                          │
│  │Quality  │  │Final    │                          │
│  │Check    │  │Review   │                          │
│  └─────────┘  └─────────┘                          │
└─────────────────────────────────────────────────────┘
```

#### Interactivity

- **Hover**: Show full description + example scenarios
- **Click**: Show eye details modal (persona, examples, model recommendations)
- **Highlight**: When routing decision is shown, highlight selected eyes

**Data Source**: `GET /api/eyes` (with capability_tags)

---

### 2. DynamicRouteVisualizer Component

**Purpose**: Show Overseer's routing decision for a specific request

**Location**: `apps/ui/src/components/pipeline-builder/DynamicRouteVisualizer.tsx`

**Props**:

```typescript
interface DynamicRouteVisualizerProps {
  sessionId: string;
  routingDecision: RoutingDecision;
}

interface RoutingDecision {
  id: string;
  sessionId: string;
  requestAnalysis: {
    requestType: string;
    contentDomain: string;
    complexity: string;
    capabilitiesNeeded: string[];
  };
  selectedEyes: string[];
  reasoning: string;
  executionMode: "sequential" | "parallel";
  createdAt: number;
}
```

**Features**:

#### Visual Flow

```
Request → Analysis → Capability Matching → Selected Eyes
```

#### Sections:

1. **Request Analysis**
   - Request type badge
   - Content domain badge
   - Complexity indicator
   - Required capabilities (chips)

2. **Reasoning Panel**
   - Overseer's explanation in natural language
   - Why each eye was selected
   - Why others were skipped

3. **Selected Eyes Flow**
   - Visual arrow diagram showing selected eyes
   - Execution mode indicator (sequential/parallel)
   - Estimated steps count

**Layout**:

```
┌─────────────────────────────────────────────────────┐
│  Request: "Create 500-word palm care guide"         │
├─────────────────────────────────────────────────────┤
│  📊 Analysis:                                        │
│  Type: new_task | Domain: text | Complexity: medium │
│  Capabilities: clarification, structuring, quality  │
├─────────────────────────────────────────────────────┤
│  🧠 Overseer Reasoning:                              │
│  "Request requires clarification (ambiguous scope), │
│  structured guidance (content framework), and final │
│  quality validation. Skipping code review (not      │
│  applicable) and feasibility (simple task)."        │
├─────────────────────────────────────────────────────┤
│  🔀 Selected Route (sequential):                     │
│  Sharingan → Kyuubi → Tenseigan → Byakugan          │
│  (4 steps)                                           │
└─────────────────────────────────────────────────────┘
```

**Data Source**: `GET /api/routing-decisions/:sessionId`

---

### 3. LiveRoutingPanel Component

**Purpose**: Show routing decisions for recent sessions in real-time

**Location**: `apps/ui/src/components/pipeline-builder/LiveRoutingPanel.tsx`

**Props**:

```typescript
interface LiveRoutingPanelProps {
  maxSessions?: number; // Default 10
  autoRefresh?: boolean; // Default true
}
```

**Features**:

#### Session List

- Most recent sessions first
- Session ID + timestamp
- Request summary (first 50 chars)
- Selected eyes (visual chips)
- Routing mode indicator

#### Real-time Updates

- WebSocket integration
- New sessions appear at top
- Highlight new sessions (fade animation)

#### Filtering

- Filter by routing mode (dynamic/constrained/fixed)
- Filter by date range
- Search by request text

**Layout**:

```
┌─────────────────────────────────────────────────────┐
│  Live Routing Decisions                      [≡]    │
├─────────────────────────────────────────────────────┤
│  🟢 Session abc123 (2 min ago) [Dynamic]            │
│  "Create palm care guide..."                         │
│  Sharingan → Kyuubi → Tenseigan → Byakugan          │
├─────────────────────────────────────────────────────┤
│  🟢 Session def456 (5 min ago) [Constrained]        │
│  "Review authentication code..."                     │
│  Jōgan → Mangekyo → Tenseigan → Byakugan            │
├─────────────────────────────────────────────────────┤
│  🟢 Session ghi789 (12 min ago) [Fixed]             │
│  "Fast code review..."                               │
│  Template: Code Review Standard                      │
├─────────────────────────────────────────────────────┤
│  [View All Sessions]                                 │
└─────────────────────────────────────────────────────┘
```

**Data Source**:

- `GET /api/routing-decisions?limit=10&sort=desc`
- `WebSocket: routing_decision_created`

---

### 4. PipelineModeSelector Component

**Purpose**: Toggle between three routing modes

**Location**: `apps/ui/src/components/pipeline-builder/PipelineModeSelector.tsx`

**Props**:

```typescript
interface PipelineModeSelectorProps {
  currentMode: "dynamic" | "constrained" | "fixed";
  onModeChange: (mode: "dynamic" | "constrained" | "fixed") => void;
}
```

**Features**:

#### Three Mode Cards

1. **Fully Dynamic** (default)
   - Icon: 🧠
   - Label: "Fully Dynamic"
   - Description: "Overseer analyzes and routes automatically"
   - Badge: "Recommended"

2. **Constrained Dynamic**
   - Icon: 🛡️
   - Label: "Constrained"
   - Description: "Overseer routes within policy constraints"
   - Badge: "With Policies"

3. **Fixed Template**
   - Icon: 📋
   - Label: "Fixed Template"
   - Description: "Use predefined eye sequence"
   - Badge: "Consistent"

**Layout**:

```
┌─────────────────────────────────────────────────────┐
│  Select Routing Mode:                                │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │    🧠    │  │    🛡️    │  │    📋    │           │
│  │  Dynamic │  │Constrain │  │  Fixed   │           │
│  │          │  │   ed     │  │ Template │           │
│  │Recommend │  │  Policy  │  │Consistent│           │
│  │   ✓      │  │          │  │          │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────┘
```

**State Management**: Update URL query param `?mode=dynamic|constrained|fixed`

---

## Page Integration

### /pipelines Page Layout

```typescript
export default function PipelinesPage() {
  const [mode, setMode] = useState<'dynamic' | 'constrained' | 'fixed'>('dynamic');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  return (
    <div className="flex h-screen">
      {/* Header */}
      <div className="h-16 border-b px-4 flex items-center justify-between">
        <h1>Pipeline Builder</h1>
        <PipelineModeSelector currentMode={mode} onModeChange={setMode} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left: Primary view (changes based on mode) */}
        <div className="flex-1 p-6">
          {mode === 'dynamic' && (
            <>
              <CapabilityMatrix mode="dynamic" />
              {selectedSession && (
                <DynamicRouteVisualizer sessionId={selectedSession} />
              )}
            </>
          )}

          {mode === 'constrained' && (
            <>
              <CapabilityMatrix mode="constrained" />
              <PolicyBuilderInline />
            </>
          )}

          {mode === 'fixed' && (
            <>
              <TemplateDesignerEnhanced />
              <TemplateLibraryInline />
            </>
          )}
        </div>

        {/* Right: Live routing panel */}
        <div className="w-96 border-l p-4">
          <LiveRoutingPanel
            maxSessions={10}
            autoRefresh={true}
            onSessionClick={setSelectedSession}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## API Requirements

### New Endpoints

#### 1. Get Eye Capabilities

```
GET /api/eyes
Response: {
  data: {
    eyes: [
      {
        id: string;
        name: string;
        description: string;
        capabilityTags: string[];
        active: boolean;
      }
    ]
  }
}
```

#### 2. Get Routing Decisions

```
GET /api/routing-decisions?limit=10&sort=desc
Response: {
  data: {
    decisions: RoutingDecision[];
  }
}
```

#### 3. Get Routing Decision by Session

```
GET /api/routing-decisions/:sessionId
Response: {
  data: {
    decision: RoutingDecision;
  }
}
```

### WebSocket Events

#### routing_decision_created

```json
{
  "type": "routing_decision_created",
  "data": {
    "sessionId": "abc123",
    "decision": {
      /* RoutingDecision */
    }
  }
}
```

---

## Eye Capability Definitions

### Default Capability Tags (SSOT)

```typescript
// packages/config/eye-capabilities.ts

export const EYE_CAPABILITIES = {
  overseer: {
    tags: ["routing", "analysis", "decision-making", "orchestration"],
    description: "Analyzes requests and dynamically routes to appropriate eyes",
    scenarios: ["All requests - determines optimal eye sequence"],
  },
  sharingan: {
    tags: [
      "ambiguity-detection",
      "clarification",
      "questions",
      "disambiguation",
    ],
    description: "Detects ambiguities and asks clarifying questions",
    scenarios: ["Vague requests", "Missing context", "Unclear requirements"],
  },
  kyuubi: {
    tags: ["structuring", "guidance", "framework", "content-planning"],
    description: "Provides structural guidance and content frameworks",
    scenarios: ["Content creation", "Document structuring", "Planning"],
  },
  jogan: {
    tags: [
      "intent-confirmation",
      "approval",
      "scope-validation",
      "human-in-loop",
    ],
    description: "Confirms user intent before proceeding with tasks",
    scenarios: [
      "High-impact actions",
      "Scope confirmation",
      "User approval needed",
    ],
  },
  rinnegan: {
    tags: ["feasibility", "validation", "planning", "resource-estimation"],
    description: "Validates feasibility and provides planning guidance",
    scenarios: ["Complex tasks", "Multi-step planning", "Resource validation"],
  },
  mangekyo: {
    tags: ["code-review", "security", "best-practices", "quality-assurance"],
    description: "Reviews code for quality, security, and best practices",
    scenarios: ["Code review", "Security audit", "Technical validation"],
  },
  tenseigan: {
    tags: ["quality-check", "completeness", "refinement", "polish"],
    description: "Validates quality and completeness of outputs",
    scenarios: ["Output validation", "Completeness check", "Quality assurance"],
  },
  byakugan: {
    tags: ["final-review", "delivery", "output-formatting", "presentation"],
    description: "Final review and output preparation for delivery",
    scenarios: [
      "Final validation",
      "Output formatting",
      "Delivery preparation",
    ],
  },
} as const;
```

---

## Implementation Phases

### Phase 4A: Core Components (Days 22-24)

**Tasks**:

1. Create `CapabilityMatrix.tsx` component
2. Create `DynamicRouteVisualizer.tsx` component
3. Create `LiveRoutingPanel.tsx` component
4. Create `PipelineModeSelector.tsx` component
5. Update `/pipelines` page to use new components
6. Add eye capabilities constants to config
7. Create routing decisions API endpoints

**Deliverables**:

- Functional capability matrix view
- Live routing decision panel
- Mode switching works
- No more "default pipeline" diagram

**Acceptance Criteria**:

- `/pipelines` page shows capability matrix (not pipeline)
- Users can see live routing decisions
- Mode selector toggles between views
- No fixed pipeline assumptions visible

---

### Phase 4B: Enhanced Features (Days 25-26)

**Tasks**:

1. Add PolicyBuilder inline component
2. Add policy preview feature ("With these constraints, Overseer might...")
3. Enhance capability matrix with filtering
4. Add routing decision search/filter
5. Add session comparison feature

**Deliverables**:

- Policy builder integrated in constrained mode
- Policy preview shows expected routing
- Enhanced filtering and search

**Acceptance Criteria**:

- Policy creation works from /pipelines page
- Policy preview accurately predicts routing
- Filtering works across all panels

---

### Phase 4C: Template Enhancement (Days 27-28)

**Tasks**:

1. Enhance TemplateDesigner with visual editor
2. Create TemplateLibrary inline component
3. Add predefined templates (Fast Code Review, Research Article, Security Audit)
4. Add template import/export UI
5. Add usage analytics display

**Deliverables**:

- Visual template editor with drag-and-drop
- Template library with predefined templates
- Import/export functionality
- Usage analytics per template

**Acceptance Criteria**:

- Users can create templates visually
- Predefined templates available
- Import/export works
- Usage stats displayed per template

---

## Testing Strategy

### Unit Tests

1. **CapabilityMatrix**: Renders all eyes with capabilities
2. **DynamicRouteVisualizer**: Displays routing decision correctly
3. **LiveRoutingPanel**: Updates with WebSocket events
4. **PipelineModeSelector**: Toggles modes correctly

### Integration Tests

1. **Mode Switching**: Switching modes updates main content
2. **Session Selection**: Clicking session shows routing decision
3. **Real-time Updates**: WebSocket events update live panel
4. **API Integration**: All endpoints return correct data

### E2E Tests

1. **Dynamic Mode Flow**: View capability matrix → select session → view routing decision
2. **Constrained Mode Flow**: Create policy → preview routing → apply
3. **Fixed Mode Flow**: Create template → save → use in session

---

## Success Metrics

### User Experience

- ✅ Users understand that routing is dynamic (not fixed)
- ✅ Users see Overseer's decision-making process
- ✅ Users can track routing decisions per session
- ✅ No confusion about "default pipeline"

### Technical

- ✅ No fixed pipeline assumptions in UI
- ✅ All routing decisions logged and displayed
- ✅ Real-time updates work correctly
- ✅ Mode switching is seamless

### Performance

- ✅ Capability matrix loads < 100ms
- ✅ Live panel updates < 50ms (WebSocket)
- ✅ Session history loads < 200ms

---

## Migration Guide

### For Existing Users

**Old Behavior**: Fixed pipeline diagram on /pipelines page

**New Behavior**: Capability matrix with routing mode selector

**Migration Steps**:

1. Show migration banner on first visit: "Pipeline Builder has been upgraded to Dynamic Routing"
2. Explain three modes: Dynamic (new default), Constrained, Fixed
3. Offer tour of new features
4. Old custom pipelines migrated to Fixed Templates

**Communication**:

```
🎉 Pipeline Builder Upgraded!

Third Eye now uses DYNAMIC ROUTING - Overseer analyzes each request and
selects the optimal eye sequence automatically.

• Dynamic Mode: Overseer decides (recommended)
• Constrained Mode: Route within your policies
• Fixed Templates: Use predefined sequences

[Take Tour] [Skip]
```

---

## File Structure

```
apps/ui/src/
├── components/pipeline-builder/
│   ├── CapabilityMatrix.tsx                    (NEW)
│   ├── DynamicRouteVisualizer.tsx             (NEW)
│   ├── LiveRoutingPanel.tsx                    (NEW)
│   ├── PipelineModeSelector.tsx                (NEW)
│   ├── PolicyBuilderInline.tsx                 (NEW)
│   ├── TemplateDesignerEnhanced.tsx            (UPDATE)
│   ├── TemplateLibraryInline.tsx               (NEW)
│   └── PipelineCanvasEnhanced.tsx              (UPDATE - only for Fixed mode)
├── hooks/
│   ├── useRoutingDecisions.ts                  (NEW)
│   └── useEyeCapabilities.ts                   (NEW)
└── app/pipelines/
    └── page.tsx                                 (UPDATE)

apps/server/src/
├── routes/
│   ├── routing-decisions.ts                    (NEW)
│   └── eyes.ts                                  (UPDATE - add capabilities)

packages/config/
└── eye-capabilities.ts                          (NEW - SSOT for capabilities)
```

---

## Summary

Phase 4 transforms Third Eye from a traditional pipeline builder to a **capability-based dynamic routing system**. Users will:

1. **Understand** that routing is dynamic (Overseer decides)
2. **See** what each eye can do (capability matrix)
3. **Track** routing decisions in real-time (live panel)
4. **Choose** routing mode (dynamic/constrained/fixed)

**No more fixed pipeline assumptions. Dynamic routing is the new default.**

---

**Status**: Ready for implementation
**Next Step**: Begin Phase 4A implementation (CapabilityMatrix + API endpoints)
