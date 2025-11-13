# Live Monitor Implementation Plan - The Crown Jewel

**Purpose**: Transform the Live Monitor from an event log into a **real-time theater** that beautifully showcases Third Eye MCP's power

**Dependencies**: Requires Phase 1 (Function Calling) and Phase 2 (Vision Alignment) to be complete

**Position in Overall Plan**: Phase 3 (between Vision Alignment and Testing)

---

## Overview

The Live Monitor is THE showcase that demonstrates Third Eye MCP's value to users. It must beautifully visualize:

1. **Human-in-the-Loop** - Pause/resume flows, agent relay, human responses
2. **Intelligent Routing** - Overseer's decision-making
3. **Iterative Refinement** - Loop-backs, revisions, multi-pass execution
4. **Quality Assurance** - Validation, critique, approval flows
5. **Real-Time Progress** - Live updates, status, timers

---

## Current State Analysis

### What EXISTS ✅

**Files**:

- `apps/ui/src/app/monitor/page.tsx` - Main monitor page (920 lines)
- `apps/ui/src/components/monitor/PipelineVisualization.tsx` - Pipeline viz (314 lines)
- `apps/ui/src/components/monitor/tabs/EyesTab.tsx` - Eyes tab component

**Features**:

- 5 tabs: Timeline, Routing, Clarifications, Intent, Evidence
- Real-time WebSocket updates
- Export (MD, PDF, JSON)
- Pipeline visualization with eye status
- Session selector
- Auto-scroll

**Technology Stack**:

- Next.js App Router
- React + TypeScript
- Framer Motion (animations)
- WebSocket (real-time)
- Tailwind CSS (styling)

---

### What is MISSING ❌

Based on analysis of 5 concrete examples, identified 10 critical gaps (see VISION_EXAMPLES_AND_LIVE_MONITOR_ANALYSIS.md).

**Tier 1 (CRITICAL)**:

1. Pause state visualization
2. Loop-back arrow indication
3. Human interaction flow (Eye → Agent → Human → Agent)
4. Multi-pass differentiation (Pass 1 vs Pass 2)
5. Beautiful output rendering (briefs, scores, constraints)

**Tier 2 (HIGH)**: 6. Wait timers & timeout warnings 7. Agent relay event representation 8. Conversation thread view 9. Reasoning panels (WHY eye acted) 10. Revision diffs (before/after comparison)

**Tier 3 (NICE TO HAVE)**: 11. Pattern insights 12. Narrative export 13. Replay with pause points 14. Real-time collaboration 15. Performance dashboards

---

## Phase 3: Live Monitor Enhancement

**Goal**: Implement Tier 1 (Critical) features to make Live Monitor the crown jewel

**Estimated tasks**: 52 checkable items

---

### 3.1: Pause State Visualization

**Goal**: Show when pipeline is paused waiting for human input

**Tasks**:

- [ ] Create PauseStateIndicator component
- [ ] Add "⏸️ PAUSED" status badge to timeline
- [ ] Create ActiveQuestionPanel component (floating panel)
- [ ] Style with prominent yellow/orange theme
- [ ] Add pulsing animation to pause indicator
- [ ] Show which eye is waiting for response
- [ ] Display questions being asked
- [ ] Add "Resume Status" indicator when agent submits response
- [ ] Test pause state updates via WebSocket
- [ ] Add Storybook stories for pause states
- [ ] Ensure accessibility (screen reader support)

**Component structure**:

```typescript
// components/monitor/PauseStateIndicator.tsx
interface PauseStateIndicatorProps {
  pauseReason:
    | "HUMAN_INPUT_REQUIRED"
    | "INTENT_CONFIRMATION"
    | "CONSTRAINT_DECISION";
  eyeName: string;
  questions: string[];
  elapsedTime: number; // ms
  expectedResumeTime?: number; // ms until timeout
}

// Display:
// ⏸️ PAUSED - Waiting for Human
// Sharingan is asking 4 clarification questions
// Elapsed: 2m 34s | Auto-timeout in 27m 26s
```

**Acceptance criteria**:

- ✅ Pause state visible within 100ms of event
- ✅ Prominent enough users can't miss it
- ✅ Shows which eye is waiting
- ✅ Shows elapsed time (updates every second)
- ✅ Shows timeout countdown
- ✅ Clears when pipeline resumes
- ✅ Works with all pause types (clarification, intent, constraint)

**Files modified**: 3 new components + 1 modified (page.tsx)

---

### 3.2: Loop-Back Arrow Visualization

**Goal**: Show when pipeline loops back from one eye to another after rejection/revision

**Tasks**:

- [ ] Update PipelineVisualization component to support loop arrows
- [ ] Add curved arrow SVG from target eye back to source eye
- [ ] Style loop arrows differently (dashed, different color)
- [ ] Add "🔄 LOOP BACK" label on arrow
- [ ] Animate arrow drawing (path animation)
- [ ] Add loop count badge ("Iteration 2 of 3")
- [ ] Update timeline to show loop events
- [ ] Add loop reason tooltip ("Jōgan rejected - revising brief")
- [ ] Test loop detection from event stream
- [ ] Handle multiple loops in same pipeline
- [ ] Add Storybook stories for loop flows

**SVG loop arrow example**:

```tsx
<svg className="absolute inset-0 h-full w-full" style={{ zIndex: 2 }}>
  <defs>
    <marker
      id="arrowhead-loop"
      markerWidth="10"
      markerHeight="10"
      refX="9"
      refY="3"
      orient="auto"
    >
      <polygon points="0 0, 10 3, 0 6" fill="#F59E0B" />
    </marker>
  </defs>
  <motion.path
    d={`M ${fromX},${fromY} Q ${controlX},${controlY} ${toX},${toY}`} // Curved path
    stroke="#F59E0B"
    strokeWidth="3"
    strokeDasharray="8,4"
    fill="none"
    markerEnd="url(#arrowhead-loop)"
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{ duration: 1, ease: "easeInOut" }}
  />
</svg>
```

**Acceptance criteria**:

- ✅ Loop arrows clearly visible
- ✅ Different visual style from forward arrows
- ✅ Animated (draws over 1 second)
- ✅ Shows reason for loop ("rejected", "constraint", "gap")
- ✅ Works with multiple loops
- ✅ Doesn't clutter visualization
- ✅ Mobile-responsive

**Files modified**: 1 file (PipelineVisualization.tsx)

---

### 3.3: Human Interaction Flow Diagram

**Goal**: Visualize Eye → Agent → Human → Agent → Eye flow for each pause

**Tasks**:

- [ ] Create HumanInteractionFlow component
- [ ] Design chat-like interface for interaction display
- [ ] Add eye bubble (left side) with question
- [ ] Add agent relay indicator (center)
- [ ] Add human bubble (right side) with response
- [ ] Add agent relay back indicator
- [ ] Add eye receipt confirmation
- [ ] Style with appropriate colors (eye color, human color, agent neutral)
- [ ] Add timestamps to each step
- [ ] Add duration between steps
- [ ] Animate flow (left to right progression)
- [ ] Expand/collapse for each interaction
- [ ] Test with multiple interactions in same session
- [ ] Add Storybook stories

**Component structure**:

```tsx
// components/monitor/HumanInteractionFlow.tsx
interface InteractionStep {
  type:
    | "eye_question"
    | "agent_relay_out"
    | "human_response"
    | "agent_relay_in"
    | "eye_receipt";
  timestamp: Date;
  actor: string; // Eye name, 'agent', 'human'
  content: string;
}

interface HumanInteractionFlowProps {
  interactionId: string;
  eyeName: string;
  steps: InteractionStep[];
  status: "in_progress" | "completed";
}
```

**Visual layout**:

```
[Sharingan] → [Agent] → [Human] → [Agent] → [Sharingan]
"Asking 4     Relaying    "Indoor,   Submitting   Received
 questions"   to human    500 words"  response    response
10:30:00      10:30:01    10:30:45   10:30:46    10:30:47
```

**Acceptance criteria**:

- ✅ Clear left-to-right flow
- ✅ All 5 steps shown
- ✅ Timestamps accurate
- ✅ Duration between steps calculated
- ✅ Expandable for full content
- ✅ Works for all interaction types (clarification, intent, constraint)
- ✅ Mobile-responsive (stacks vertically)

**Files modified**: 1 new component + 1 modified (page.tsx)

---

### 3.4: Multi-Pass Differentiation

**Goal**: Clearly show when same eye executes multiple times (Pass 1 vs Pass 2)

**Tasks**:

- [ ] Add pass number detection logic
- [ ] Update eye status to include pass number
- [ ] Add "Pass 1", "Pass 2" badges to eye nodes
- [ ] Group multiple passes of same eye visually
- [ ] Add comparison view (Pass 1 output vs Pass 2 output)
- [ ] Style first pass vs revision pass differently
- [ ] Add "revision" icon/badge
- [ ] Update timeline to show pass numbers
- [ ] Add hover tooltip explaining multi-pass
- [ ] Test with 3+ passes of same eye
- [ ] Add Storybook stories

**Visual representation**:

```
┌─────────────────────────────┐
│ Kyuubi                      │
│ ┌──────────┐  ┌──────────┐ │
│ │ Pass 1   │  │ Pass 2   │ │
│ │ REJECTED │→ │ APPROVED │ │
│ └──────────┘  └──────────┘ │
│ Click to compare outputs    │
└─────────────────────────────┘
```

**Pass badge styles**:

- Pass 1 (initial): Blue border
- Pass 2+ (revision): Orange border with 🔄 icon

**Comparison modal**:

```
┌─────────────────────────────────────────────┐
│ Kyuubi - Pass Comparison                    │
├───────────────────┬─────────────────────────┤
│ Pass 1 (Rejected) │ Pass 2 (Approved)       │
├───────────────────┼─────────────────────────┤
│ Objective:        │ Objective:              │
│ "Article about    │ "500-word beginner's    │
│  palm care"       │  guide for indoor palms │
│                   │  in Saudi Arabia"       │
│                   │                         │
│ Missing:          │ Added:                  │
│ - Target length   │ ✓ 500 words            │
│ - Indoor/outdoor  │ ✓ Indoor palms         │
│ - Climate         │ ✓ Saudi Arabia climate │
│ - Audience level  │ ✓ Complete beginners   │
└───────────────────┴─────────────────────────┘
```

**Acceptance criteria**:

- ✅ Pass numbers clearly visible
- ✅ Visual grouping of multiple passes
- ✅ Comparison view functional
- ✅ Diff highlighting (added/removed/changed)
- ✅ Works with 3+ passes
- ✅ Timeline shows pass progression
- ✅ Mobile-responsive

**Files modified**: 2 files (PipelineVisualization.tsx, new ComparisonModal.tsx)

---

### 3.5: Beautiful Output Rendering

**Goal**: Render eye outputs in beautiful, human-readable cards (not just raw JSON)

**Tasks**:

- [ ] Create EyeOutputCard component library
- [ ] Create StructuredBriefCard component (Kyuubi output)
- [ ] Create AmbiguityAnalysisCard component (Sharingan output)
- [ ] Create ConstraintMatrixCard component (Rinnegan output)
- [ ] Create ValidationChecklistCard component (Mangekyō output)
- [ ] Create QualityScoreCard component (Tenseigan, Byakugan output)
- [ ] Add expandable sections
- [ ] Add syntax highlighting for code blocks
- [ ] Add charts/graphs for numerical data (confidence scores, quality metrics)
- [ ] Add diff highlighting for revision comparisons
- [ ] Style with brand colors + eye-specific colors
- [ ] Test with real eye output data
- [ ] Add Storybook stories for all card types
- [ ] Ensure accessibility (keyboard navigation, screen readers)

**StructuredBriefCard example**:

```tsx
// components/monitor/cards/StructuredBriefCard.tsx
interface StructuredBriefCardProps {
  brief: {
    objective: string;
    audience: string;
    format: string;
    keyElements: string[];
    constraints?: string[];
  };
  qualityScore?: number;
  pass?: number;
}

// Renders as:
┌─────────────────────────────────────┐
│ 📝 Structured Brief (Quality: 95%) │
├─────────────────────────────────────┤
│ Objective                           │
│ Create a 500-word beginner's guide │
│ for indoor palm care in Saudi      │
│ Arabia                              │
├─────────────────────────────────────┤
│ Audience                            │
│ Complete beginners with no prior   │
│ plant care experience              │
├─────────────────────────────────────┤
│ Format                              │
│ How-to article with practical      │
│ steps                               │
├─────────────────────────────────────┤
│ Key Elements                        │
│ • Saudi climate considerations     │
│ • Beginner-friendly watering guide │
│ • Light requirements                │
│ • Common mistakes to avoid          │
└─────────────────────────────────────┘
```

**QualityScoreCard with visualization**:

```tsx
┌───────────────────────────────┐
│ Quality Assessment            │
├───────────────────────────────┤
│ Overall Score: 95/100         │
│ [████████████████████░] 95%   │
├───────────────────────────────┤
│ Breakdown:                    │
│ Clarity      98/100 ████████░ │
│ Completeness 95/100 ████████░ │
│ Feasibility  92/100 ████████  │
│ Creativity   94/100 ████████░ │
└───────────────────────────────┘
```

**ConstraintMatrixCard for Rinnegan**:

```tsx
┌─────────────────────────────────────────────────┐
│ ⚠️ Feasibility Constraint Analysis              │
├─────────────────┬──────────────┬────────────────┤
│ Factor          │ 10ms Latency │ 100ms Latency  │
├─────────────────┼──────────────┼────────────────┤
│ Infrastructure  │ $50k-100k/mo │ $5k-10k/mo ✓  │
│ Complexity      │ Very High    │ Medium ✓       │
│ Timeline        │ 6-8 weeks    │ 2-3 weeks ✓    │
│ Edge Regions    │ 20+          │ 5 ✓            │
│ Feasibility     │ ⚠️ Difficult  │ ✅ Recommended  │
└─────────────────┴──────────────┴────────────────┘
```

**Acceptance criteria**:

- ✅ All eye output types have beautiful cards
- ✅ Cards use brand + eye-specific colors
- ✅ Expandable sections work
- ✅ Charts/graphs render correctly
- ✅ Diffs highlighted clearly
- ✅ Syntax highlighting for code
- ✅ Mobile-responsive
- ✅ Accessible (WCAG 2.1 AA)
- ✅ Load time < 100ms per card
- ✅ Storybook documentation complete

**Files modified**: 6 new components (one per card type)

---

### 3.6: Wait Timers & Timeout Warnings

**Goal**: Show real-time countdown while waiting for human, warn before timeout

**Tasks**:

- [ ] Create WaitTimerComponent
- [ ] Add elapsed time counter (updates every second)
- [ ] Add timeout countdown (e.g., "Auto-timeout in 27m 14s")
- [ ] Add visual warning when < 5 minutes to timeout
- [ ] Add pulsing red indicator when < 1 minute
- [ ] Calculate time between pause and resume
- [ ] Display average response time for this user
- [ ] Add "Cancel" button to terminate pipeline
- [ ] Add "Extend timeout" button (if supported)
- [ ] Test timeout edge cases (exactly 0s, network issues)
- [ ] Add sound/notification option (opt-in)
- [ ] Add Storybook stories

**Component structure**:

```tsx
// components/monitor/WaitTimer.tsx
interface WaitTimerProps {
  startTime: Date;
  timeoutDuration: number; // ms (e.g., 30 * 60 * 1000 for 30 min)
  onTimeout?: () => void;
  onCancel?: () => void;
  averageResponseTime?: number; // ms for this user
}

// Display states:
// Normal (>5 min remaining): Blue
// Warning (1-5 min): Orange
// Critical (<1 min): Red + pulse
```

**Visual representation**:

```
┌────────────────────────────────────┐
│ ⏸️ Waiting for Human               │
├────────────────────────────────────┤
│ Elapsed: 3m 47s                    │
│ Timeout in: 26m 13s                │
│                                    │
│ Avg response time: 2m 30s          │
│ [████░░░░░░░░░░░░░░] 15%          │
│                                    │
│ [Cancel Pipeline] [Extend Timeout] │
└────────────────────────────────────┘

// Warning state (<5 min):
┌────────────────────────────────────┐
│ ⏸️ Waiting for Human               │
├────────────────────────────────────┤
│ Elapsed: 25m 03s                   │
│ ⚠️ Timeout in: 4m 57s              │
│ [████████████████░░] 83%           │
└────────────────────────────────────┘

// Critical state (<1 min):
┌────────────────────────────────────┐
│ ⏸️ Waiting for Human               │
├────────────────────────────────────┤
│ Elapsed: 29m 15s                   │
│ 🚨 Timeout in: 45s                 │
│ [████████████████████] 98% URGENT │
└────────────────────────────────────┘
```

**Acceptance criteria**:

- ✅ Timer updates every second
- ✅ Timeout countdown accurate
- ✅ Warning at 5 minutes
- ✅ Critical alert at 1 minute
- ✅ Visual indicators clear
- ✅ Cancel button works
- ✅ Extend timeout works (if supported)
- ✅ Handles timezone differences
- ✅ Persists across page reload (if using localStorage)
- ✅ Mobile-responsive

**Files modified**: 1 new component + 1 modified (page.tsx)

---

### 3.7: Revision Diff Viewer

**Goal**: Show before/after comparison when eye output is revised

**Tasks**:

- [ ] Create RevisionDiffViewer component
- [ ] Implement side-by-side comparison view
- [ ] Add inline diff highlighting (green for added, red for removed, yellow for changed)
- [ ] Support object diff (nested structures)
- [ ] Support array diff (list changes)
- [ ] Support string diff (text changes)
- [ ] Add expand/collapse for unchanged sections
- [ ] Add "Show only changes" toggle
- [ ] Add "Unified diff" vs "Split view" toggle
- [ ] Calculate diff statistics (X added, Y removed, Z changed)
- [ ] Test with complex nested objects
- [ ] Add Storybook stories

**Library options**:

- Use `diff` npm package for diffing logic
- Use `react-diff-viewer` or custom implementation for rendering

**Visual representation**:

```
┌─────────────────────────────────────────────────────────┐
│ Kyuubi - Brief Revision                                 │
│ [Split View] [Unified] [Show Only Changes ✓]           │
├──────────────────────────┬──────────────────────────────┤
│ Pass 1 (Before)          │ Pass 2 (After)               │
├──────────────────────────┼──────────────────────────────┤
│ objective:               │ objective:                   │
│ "Article about palm care"│ "500-word beginner's guide   │
│                          │  for indoor palm care in     │
│                          │  Saudi Arabia"               │
│                          │                              │
│ audience:                │ audience:                    │
│ [not specified]          │ + "Complete beginners with   │
│                          │    no prior plant care       │
│                          │    experience"               │
│                          │                              │
│ format:                  │ format:                      │
│ [not specified]          │ + "How-to article with       │
│                          │    practical steps"          │
│                          │                              │
│ keyElements:             │ keyElements:                 │
│ []                       │ + [4 elements added]         │
├──────────────────────────┴──────────────────────────────┤
│ Summary: 4 additions, 0 removals, 1 modification        │
└─────────────────────────────────────────────────────────┘
```

**Acceptance criteria**:

- ✅ Side-by-side comparison clear
- ✅ Diff highlighting accurate
- ✅ Nested object diffs work
- ✅ Array diffs work
- ✅ String diffs work (word-level)
- ✅ Expand/collapse works
- ✅ Toggle views work
- ✅ Diff stats accurate
- ✅ Performance good for large objects
- ✅ Mobile-responsive (switches to unified view)

**Files modified**: 1 new component

---

### 3.8: Reasoning Panels

**Goal**: Explain WHY each eye took the action it did

**Tasks**:

- [ ] Create ReasoningPanel component
- [ ] Add reasoning extraction from eye output
- [ ] Display trigger events ("Ambiguity score 75/100")
- [ ] Display decision rationale ("Asking 4 questions because...")
- [ ] Display routing logic ("Overseer chose Sharingan because...")
- [ ] Add expandable "Show reasoning" section for each eye event
- [ ] Style with subtle background color
- [ ] Add icons for different reasoning types (🧠 Analysis, 🎯 Decision, ⚠️ Warning)
- [ ] Test with all eye types
- [ ] Add Storybook stories

**Component structure**:

```tsx
// components/monitor/ReasoningPanel.tsx
interface ReasoningPanelProps {
  eyeName: string;
  reasoning: {
    trigger: string; // What caused this eye to act
    analysis: string; // What the eye analyzed
    decision: string; // What the eye decided to do
    confidence: number; // How confident (0-100)
  };
}
```

**Visual representation**:

```
┌──────────────────────────────────────────────┐
│ 🔍 Sharingan - Reasoning                     │
├──────────────────────────────────────────────┤
│ 🎯 Trigger                                   │
│ Detected ambiguity score: 75/100             │
│ Missing: context, scope, audience, length    │
│                                              │
│ 🧠 Analysis                                  │
│ Analyzed request for type, context, scope,   │
│ constraints. Found 4 critical ambiguities    │
│ requiring human clarification.               │
│                                              │
│ 🎯 Decision                                  │
│ Generated 4 clarifying questions and paused  │
│ pipeline to await human response.            │
│                                              │
│ Confidence: 95% (high certainty that         │
│ clarification is needed)                     │
└──────────────────────────────────────────────┘
```

**Acceptance criteria**:

- ✅ Reasoning panels for all eyes
- ✅ Trigger/analysis/decision structure clear
- ✅ Confidence scores displayed
- ✅ Expandable (collapsed by default)
- ✅ Icons appropriate
- ✅ Readable prose (not technical jargon)
- ✅ Mobile-responsive

**Files modified**: 1 new component + eye output parsing logic

---

### 3.9: Enhanced Timeline Tab

**Goal**: Upgrade timeline to show pause states, loop-backs, and human interactions visually

**Tasks**:

- [ ] Update ConversationEntry component to support pause states
- [ ] Add pause state badge to timeline entries
- [ ] Add loop-back indicator in timeline
- [ ] Add human interaction grouping (question → response in one group)
- [ ] Add revision indicator for multi-pass eyes
- [ ] Update speaker badges to differentiate agent relay vs eye/human
- [ ] Add visual separator for pipeline stages (guidance vs validation)
- [ ] Add "Resume" events when pipeline restarts
- [ ] Add duration between events
- [ ] Add collapsible groups for related events
- [ ] Test timeline with complex flows (multiple pauses, multiple loops)
- [ ] Ensure timeline updates in real-time via WebSocket

**Enhanced timeline entry types**:

```typescript
// Original ConversationEntry supports:
type ConversationEntryData = {
  speaker: "agent" | "human" | EyeName;
  message: string;
  stage?: "guidance" | "validation";
  metadata: {
    code?: string;
    dataJson?: Record<string, unknown>;
  };
};

// NEW: Enhanced with pause/loop/revision support
type EnhancedConversationEntryData = ConversationEntryData & {
  pauseState?: {
    status: "paused" | "resuming" | "resumed";
    reason: string;
    elapsedTime?: number;
  };
  loopBack?: {
    from: EyeName;
    to: EyeName;
    reason: string;
  };
  passNumber?: number; // For multi-pass execution
  interactionGroup?: string; // Group ID for related events
};
```

**Visual enhancements**:

```
10:30:00 🧿 Overseer       Routing to Sharingan
10:30:01 🔍 Sharingan      Detected ambiguity (75/100)
         ⏸️ PAUSED         Waiting for human clarification
10:30:45 👤 Human         Responded to 4 questions
         ▶️ RESUMING      Processing response...
10:30:47 ✨ Kyuubi (Pass 1) Created structured brief
10:30:48 👁️ Jōgan         Confirming intent...
         ⏸️ PAUSED         Waiting for approval
10:31:20 👤 Human         REJECTED - missing details
         🔄 LOOP BACK     Jōgan → Kyuubi
10:31:21 ✨ Kyuubi (Pass 2) Revised brief with added details
10:31:22 👁️ Jōgan         Confirming revised intent...
         ⏸️ PAUSED         Waiting for approval
10:31:50 👤 Human         APPROVED
         ▶️ RESUMING      Continuing pipeline...
10:31:51 🔮 Tenseigan     Quality check passed
10:31:52 👁️ Byakugan      Final approval - APPROVED
```

**Acceptance criteria**:

- ✅ Pause states clearly visible
- ✅ Loop-backs indicated with arrows
- ✅ Pass numbers shown for multi-pass
- ✅ Human interactions grouped
- ✅ Agent relay differentiated
- ✅ Stage separators clear
- ✅ Duration between events shown
- ✅ Real-time updates work
- ✅ Performance good with 100+ events
- ✅ Mobile-responsive

**Files modified**: 2 files (ConversationEntry.tsx, page.tsx)

---

### 3.10: Updated Pipeline Visualization

**Goal**: Enhance pipeline visualization to show pause states, loops, active flow

**Tasks**:

- [ ] Update eye node styling for pause state (pulsing yellow border)
- [ ] Add "WAITING" badge to paused eye nodes
- [ ] Add loop-back arrows (curved, dashed, orange)
- [ ] Add active flow animation (flowing dots along arrows)
- [ ] Add pass number badges to multi-pass eyes
- [ ] Update connection lines to show flow direction more clearly
- [ ] Add mini-timeline below visualization
- [ ] Add zoom/pan controls
- [ ] Add "Reset view" button
- [ ] Test with complex pipelines (8+ eyes, multiple loops)
- [ ] Optimize performance (Canvas vs SVG for large graphs)
- [ ] Add Storybook stories

**Eye node states**:

```typescript
type EyeNodeState = {
  status: "idle" | "running" | "completed" | "paused" | "failed";
  verdict?: "APPROVED" | "REJECTED" | "NEEDS_INPUT";
  passNumber?: number;
  isPaused?: boolean;
  isRevision?: boolean;
};

// Visual styles:
// idle: Gray, no border
// running: Blue, pulsing border
// paused: Yellow, pulsing yellow border, "⏸️" badge
// completed (approved): Green
// completed (rejected): Red with loop arrow
// completed (needs input): Orange
// revision: Orange border, "🔄" badge
```

**Loop arrow styling**:

```tsx
<motion.path
  d={`M ${fromX},${fromY} Q ${controlX},${controlY} ${toX},${toY}`}
  stroke="#F59E0B" // Orange
  strokeWidth="3"
  strokeDasharray="8,4" // Dashed
  fill="none"
  markerEnd="url(#arrowhead-loop)"
  initial={{ pathLength: 0, opacity: 0 }}
  animate={{ pathLength: 1, opacity: 0.8 }}
  transition={{ duration: 1.2, ease: "easeInOut" }}
/>
```

**Active flow animation** (flowing dots):

```tsx
<motion.circle
  r="4"
  fill="#3B82F6"
  initial={{ offsetDistance: "0%" }}
  animate={{ offsetDistance: "100%" }}
  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
  style={{ offsetPath: `path('${pathData}')` }}
/>
```

**Acceptance criteria**:

- ✅ Pause state clearly visible
- ✅ Loop arrows animated and clear
- ✅ Active flow animation smooth
- ✅ Pass numbers visible
- ✅ Zoom/pan works smoothly
- ✅ Performance good with 8+ eyes
- ✅ Mobile-responsive (simplified view)
- ✅ Accessible (keyboard navigation, descriptions)

**Files modified**: 1 file (PipelineVisualization.tsx)

---

## Summary: Live Monitor Transformation

### Before (Current State):

- Event log with timeline
- Basic eye status visualization
- Separate tabs for different data
- Static display

### After (Vision):

- **Real-time theater** showing the drama of pipeline execution
- **Pause states** prominently displayed with timers
- **Loop-backs** visually clear with curved arrows and reasoning
- **Human interactions** shown as full flow (Eye → Agent → Human → Agent → Eye)
- **Beautiful output cards** instead of raw JSON
- **Revision diffs** showing before/after changes
- **Reasoning panels** explaining WHY each eye acted
- **Enhanced timeline** with grouping, badges, duration
- **Animated pipeline visualization** with active flow, pause states, loops

### User Experience Transformation:

**Before**: "What happened?"
**After**: "I can SEE it happening!"

**Before**: "Why did it pause?"
**After**: "Sharingan is asking the human 4 questions because ambiguity score is 75/100"

**Before**: "Did it work?"
**After**: "Yes! Jōgan approved after 2 iterations, here's the before/after diff"

---

## Integration with Main Plan

### Updated Phase Structure:

1. **Phase 1**: Foundation (Function Calling) - 42 tasks
2. **Phase 2**: Vision Alignment (Personas, Pause/Resume) - 48 tasks
3. **Phase 3**: Live Monitor (Visualization) - 52 tasks ← **NEW**
4. **Phase 4**: Testing & Validation - 28 tasks
5. **Phase 5**: Documentation & Release - 18 tasks

**Total**: 188 checkable tasks (was 136)

---

## Success Criteria

**Phase 3 Complete when**:

- ✅ All Tier 1 features implemented (pause, loops, interaction, multi-pass, cards)
- ✅ Live Monitor shows 5 examples from VISION_EXAMPLES_AND_LIVE_MONITOR_ANALYSIS.md beautifully
- ✅ Users say "WOW, I can actually SEE what Third Eye is doing!"
- ✅ Export includes visual representations (not just text logs)
- ✅ Performance: < 100ms to update on new event
- ✅ Accessibility: WCAG 2.1 AA compliance
- ✅ Mobile: Responsive design works on tablets/phones
- ✅ Real-time: WebSocket updates within 200ms

---

## Post-Phase 3: Tier 2 & 3 Features (Future)

**Tier 2 (High Priority - Post-Release)**:

- Conversation thread view for multi-turn interactions
- Agent relay event representation
- Pattern insights across sessions
- Enhanced export (narrative style, visual diagrams)

**Tier 3 (Nice to Have - Long-term)**:

- Real-time collaboration (multiple users viewing same session)
- Replay with interactive pause points
- Performance dashboards and analytics
- Custom theme support for visualizations

---

**Document version**: 1.0
**Created**: 2025-11-10
**Dependencies**: Phase 1 (Function Calling) + Phase 2 (Vision Alignment)
**Status**: AWAITING APPROVAL
