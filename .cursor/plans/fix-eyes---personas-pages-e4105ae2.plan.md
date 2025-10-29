<!-- e4105ae2-220b-4fd9-a9d6-5a5bc830b96e 8281680a-14b7-4a45-bbe2-c66f8e9eeb55 -->
# Third Eye MCP - Complete Restoration Plan

## Overview

Restore the platform to its original state with the beautiful n8n-style pipeline editor, dynamic monitor, retry logic, and all missing features. Priority: Pipeline Builder (crown jewel) → Monitor data wiring → Core functionality → Polish.

---

## Phase 1: Pipeline Builder - n8n Style (HIGH PRIORITY)

### Missing Features vs Current State

**Current:** Basic ReactFlow with emoji icons, simple nodes

**Required:** Professional n8n-style editor with all advanced features

### Files to Modify:

- `apps/ui/src/components/PipelineFlowBuilder.tsx` (major rewrite)
- Create `apps/ui/src/components/pipeline/CustomNode.tsx` (new)
- Create `apps/ui/src/components/pipeline/MiniMap.tsx` (new)
- Update `apps/ui/public/eyes/*.svg` usage

### Implementation Details:

**1. Custom Node Cards (n8n Style)**

```typescript
// CustomNode.tsx - Replace emoji icons with SVG icons
- Eye icon from `/eyes/${eyeId}.svg` (not emojis)
- Card design: gradient backgrounds, shadows, hover effects
- Node structure:
 * Header: Eye icon + name + stage badge
 * Body: Capability pills (human-readable)
 * Footer: Connection handles (top/bottom)
- Color coding by stage:
 * Guidance: blue gradient
 * Validation: green gradient
 * Condition: yellow gradient
```

**2. MiniMap Component**

```typescript
// Add to ReactFlow:
import { MiniMap } from 'reactflow';
<MiniMap 
  nodeColor={(node) => getNodeColorByStage(node)}
  position="bottom-right"
  style={{ background: 'var(--brand-paper)' }}
/>
```

**3. Keyboard Shortcuts**

```typescript
// Add useEffect for keyboard handling:
- Cmd/Ctrl + Plus: Zoom in
- Cmd/Ctrl + Minus: Zoom out  
- Cmd/Ctrl + 0: Reset view
- Delete/Backspace: Delete selected nodes
- Cmd/Ctrl + D: Duplicate selected
- Cmd/Ctrl + C/V: Copy/paste nodes
- Esc: Deselect all
```

**4. Right-Click Context Menu**

```typescript
// Add onNodeContextMenu handler:
- Edit node
- Duplicate node
- Delete node
- Copy node ID
- View eye details
- Add node after this
```

**5. Snap-to-Grid**

```typescript
<ReactFlow
  snapToGrid={true}
  snapGrid={[15, 15]}
  // ... other props
/>
```

**6. Auto-Layout**

```typescript
// Add Dagre layout algorithm:
import dagre from 'dagre';

const getLayoutedElements = (nodes, edges) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100 });
  
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 250, height: 80 });
  });
  
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  dagre.layout(dagreGraph);
  
  // Return positioned nodes
};
```

**7. Validation Overlays**

```typescript
// Add validation on save:
- Check no orphan nodes
- Ensure guidance precedes validation
- Final eye must be Byakugan or have final_approval capability
- Show red border + error tooltip on invalid nodes
```

---

## Phase 2: Monitor Dynamic Data Wiring (HIGH PRIORITY)

### Current State

- 5 tabs exist with placeholder data
- WebSocket connected but not wiring data to tabs

### Files to Modify:

- `apps/ui/src/app/monitor/page.tsx`
- Create server API routes (if missing):
    - `apps/server/src/routes/session.ts` - clarifications endpoint
    - `apps/server/src/routes/session.ts` - intent confirmations endpoint

### Implementation:

**1. Clarifications Tab - Dynamic Data**

```typescript
// Add state in monitor page:
const [clarifications, setClarifications] = useState<{
  outstanding: Clarification[];
  resolved: Clarification[];
}>({ outstanding: [], resolved: [] });

// Fetch on mount:
useEffect(() => {
  if (!sessionId) return;
  fetch(`${API_URL}/api/session/${sessionId}/clarifications`)
    .then(res => res.json())
    .then(data => {
      const outstanding = data.filter(c => c.status === 'pending');
      const resolved = data.filter(c => c.status === 'answered');
      setClarifications({ outstanding, resolved });
    });
}, [sessionId]);

// Update on WebSocket event:
if (message.type === 'clarification_update') {
  fetchClarifications();
}

// Render in tab:
{activeTab === 'clarifications' && (
  <div className="grid md:grid-cols-2 gap-6">
    <div>
      <h3>Outstanding</h3>
      {clarifications.outstanding.map(c => (
        <ClarificationCard 
          field={c.field}
          question={c.question}
          ambiguityScore={c.ambiguityScore}
        />
      ))}
    </div>
    <div>
      <h3>Resolved</h3>
      {clarifications.resolved.map(c => (
        <ClarificationCard
          field={c.field}
          question={c.question}
          answer={c.answer}
          answeredAt={c.answeredAt}
        />
      ))}
    </div>
  </div>
)}
```

**2. Intent Confirmation Tab**

```typescript
// Fetch intent confirmations:
const [intentData, setIntentData] = useState<IntentConfirmation | null>(null);

useEffect(() => {
  if (!sessionId) return;
  fetch(`${API_URL}/api/session/${sessionId}/intent-confirmations`)
    .then(res => res.json())
    .then(data => setIntentData(data));
}, [sessionId]);

// Render:
{activeTab === 'intent' && intentData && (
  <>
    <div className="intent-analysis">
      <p>Primary: {intentData.intentAnalysis.primary}</p>
      <p>Scope: {intentData.intentAnalysis.scope}</p>
      <p>Deliverables: {intentData.intentAnalysis.deliverables.join(', ')}</p>
    </div>
    <StatusBadge status={intentData.response || 'pending'} />
    {intentData.response === 'approved' && (
      <div className="approved-badge">✅ Approved by {intentData.userIdentity}</div>
    )}
  </>
)}
```

**3. Evidence Tab - Parse from Pipeline Events**

```typescript
// Extract evidence from validation eyes:
const [evidenceData, setEvidenceData] = useState({
  mangekyo: null, // code review
  tenseigan: null, // factual validation
  byakugan: null,  // final approval
});

useEffect(() => {
  // Parse from entries (pipeline events):
  const mangekyoEvent = entries.find(e => e.speaker === 'mangekyo');
  const tenseiganEvent = entries.find(e => e.speaker === 'tenseigan');
  const byakuganEvent = entries.find(e => e.speaker === 'byakugan');
  
  setEvidenceData({
    mangekyo: mangekyoEvent?.metadata?.dataJson,
    tenseigan: tenseiganEvent?.metadata?.dataJson,
    byakugan: byakuganEvent?.metadata?.dataJson,
  });
}, [entries]);

// Render:
{activeTab === 'evidence' && (
  <>
    {evidenceData.mangekyo && (
      <div className="code-review-section">
        <h3>Code Review (Mangekyō)</h3>
        <QualityScore score={evidenceData.mangekyo.qualityScore} />
        <IssuesList issues={evidenceData.mangekyo.issues} />
      </div>
    )}
    {evidenceData.tenseigan && (
      <div className="evidence-section">
        <h3>Evidence Validation (Tenseigan)</h3>
        <CitationsList citations={evidenceData.tenseigan.citations} />
      </div>
    )}
    {evidenceData.byakugan && (
      <div className="final-approval">
        <h3>Final Approval (Byakugan)</h3>
        <ApprovalCard data={evidenceData.byakugan} />
      </div>
    )}
  </>
)}
```

**4. Add Server API Routes (if missing)**

```typescript
// apps/server/src/routes/session.ts

// GET /api/session/:sessionId/clarifications
app.get('/:sessionId/clarifications', async (c) => {
  const { sessionId } = c.req.param();
  const { db } = getDb();
  
  const results = await db
    .select()
    .from(clarifications)
    .where(eq(clarifications.sessionId, sessionId));
  
  return c.json({ success: true, data: results });
});

// GET /api/session/:sessionId/intent-confirmations
app.get('/:sessionId/intent-confirmations', async (c) => {
  const { sessionId } = c.req.param();
  const { db } = getDb();
  
  const result = await db
    .select()
    .from(intentConfirmations)
    .where(eq(intentConfirmations.sessionId, sessionId))
    .limit(1)
    .get();
  
  return c.json({ success: true, data: result || null });
});
```

---

## Phase 3: Orchestrator Retry Logic (CRITICAL)

### Current State

Guard called but fails immediately without retries

### Files to Modify:

- `packages/core/orchestrator.ts` (lines 332-357)
- `packages/eyes/src/guards/persona-guards.ts` (add buildReminderMessage)

### Implementation:

```typescript
// In orchestrator.ts runEye method:
const MAX_PERSONA_RETRIES = 3;
let attempt = 0;
let lastGuardError: string | null = null;
let enrichedInput = input;

while (attempt < MAX_PERSONA_RETRIES) {
  attempt++;
  
  // Call LLM (moved from line 277-290):
  const personaPrompt = renderPersonaPrompt(blueprint, stage, enrichedInput);
  const completion = await provider.complete({
    systemPrompt: personaPrompt.systemPrompt,
    userMessage: personaPrompt.userMessage,
    model: targetModel,
    temperature: options.temperature ?? 0,
    maxTokens: options.maxTokens,
  });
  
  // Parse envelope:
  const envelope = this.parseEnvelope(completion.text);
  
  // Validate with guard:
  try {
    ensureEyeBehavior(eyeName, envelope);
    // Success! Break out of retry loop
    lastGuardError = null;
    break;
  } catch (guardError) {
    if (guardError instanceof EyeBehaviorError) {
      lastGuardError = guardError.reason;
      console.warn(`⚠️  ${eyeName} attempt ${attempt}/${MAX_PERSONA_RETRIES} failed: ${guardError.reason}`);
      
      if (attempt < MAX_PERSONA_RETRIES) {
        // Build targeted reminder:
        const reminder = buildReminderMessage(eyeName, guardError);
        enrichedInput = `${input}\n\n🔴 IMPORTANT REMINDER (Attempt ${attempt + 1}):\n${reminder}`;
        
        // Continue to next iteration (retry)
        continue;
      } else {
        // Exhausted retries
        console.error(`❌ ${eyeName} failed after ${MAX_PERSONA_RETRIES} attempts: ${guardError.reason}`);
        return this.createErrorEnvelope(
          eyeName,
          `Persona contract violated after ${MAX_PERSONA_RETRIES} attempts: ${guardError.reason}. Consider adjusting provider or persona blueprint.`,
          runId,
          actualSessionId,
          startTime
        );
      }
    }
    throw guardError;
  }
}

// Continue with rest of runEye logic (record completion, persist run, etc.)
```



```typescript
// In packages/eyes/src/guards/persona-guards.ts:

export function buildReminderMessage(eyeId: EyeId, error: EyeBehaviorError): string {
  const reminders: string[] = [];
  
  // Generic reminders:
  reminders.push(`Your response violated: ${error.reason}`);
  reminders.push('You MUST return valid JSON matching the envelope schema.');
  
  // Eye-specific reminders:
  if (eyeId === EyeId.OVERSEER) {
    reminders.push('You MUST include a valid pipelineRoute array.');
    reminders.push('You MUST include a capabilityPlan with assignments.');
    reminders.push('Each canonical question MUST use exact field names: audience, deliverable, scope, success_criteria, references.');
  } else if (eyeId === EyeId.SHARINGAN) {
    reminders.push('Use ONLY the five canonical clarification fields.');
    reminders.push('Return OK_NO_CLARIFICATION_NEEDED if all fields answered.');
  } else if (eyeId === EyeId.KYUUBI) {
    reminders.push('You MUST include a brief field with structured guidance.');
    reminders.push('You MUST include qualityScore and alignment metrics.');
  }
  // ... add for other eyes
  
  reminders.push('Review the "Self-Check" section in your prompt and verify compliance.');
  
  return reminders.join('\n');
}
```

---

## Phase 4: Missing UI Features

### 1. Eyes Page - Capability Pills Not Showing

**Issue:** Enrichment logic exists but Next.js API proxy may be failing

**Fix:**

- Verify `/api/personas/blueprints/[eyeId]` is proxying correctly to server
- Add error handling and logging
- Ensure `eye.capabilities` is populated after fetch
- Test in browser at http://localhost:3300/eyes

### 2. Dashboard - Wow Factors

**File:** `apps/ui/src/app/page.tsx`

**Verify which features actually work:**

- Evidence Lens → links to Monitor evidence tab
- Duel Mode → check if `/duel` page is functional
- Replay Theater → verified working
- Kill Switch → implement as button to re-validate session
- Visual Plan → implement or remove
- Leaderboards → check if `/metrics` page works
- Export Engine → implement PDF/MD export
- Adaptive Clarifications → link to Monitor clarifications tab
- Session Memory → link to Sessions page

**Action:** Test each feature link, implement missing ones or update to link to existing functionality

### 3. Markdown Rendering

**Requirement:** Magazine-quality articles, not raw markdown

**Files to check:**

- `apps/ui/src/components/MarkdownArticle.tsx` (does it exist?)
- All pages that render markdown (Monitor, Personas, Replay)

**Implementation:**

```typescript
// Create custom markdown components:
import ReactMarkdown from 'react-markdown';

const MarkdownComponents = {
  h1: (props) => <h1 className="text-3xl font-bold text-white mb-4" {...props} />,
  h2: (props) => <h2 className="text-2xl font-semibold text-white mb-3" {...props} />,
  p: (props) => <p className="text-slate-300 mb-2 leading-relaxed" {...props} />,
  ul: (props) => <ul className="list-disc list-inside space-y-1 text-slate-300 mb-3" {...props} />,
  code: (props) => <code className="bg-brand-ink px-2 py-1 rounded text-brand-accent font-mono text-sm" {...props} />,
  // ... more components
};

<ReactMarkdown components={MarkdownComponents}>
  {markdownContent}
</ReactMarkdown>
```

### 4. Theme Switcher

**Requirement:** 6 themes × light/dark, globally accessible

**Check:**

- Is theme switcher in header/nav?
- Does it actually switch themes?
- Are all 6 themes (Aurora, Midnight, Sakura, Horizon, Emerald, Obsidian) implemented?

**File:** `apps/ui/src/components/ThemeSwitcher.tsx`

### 5. Session Dropdown (Global)

**Requirement:** Every page reacts to selected session

**Implementation:**

- Add session dropdown to global header/nav
- Use React Context to share selected session
- Update Monitor, Personas, Pipelines, etc. to respect selected session
- Auto-populate when webhook opens monitor

---

## Phase 5: Testing & Quality Assurance

### 1. Playwright Tests

**Run:** `bun run playwright test`

- Test all pages load
- Test pipeline builder drag/drop
- Test monitor tab switching
- Test persona CRUD operations

### 2. Manual QA Checklist

- [ ] `npx third-eye-mcp up` starts without errors
- [ ] Dashboard loads with metrics
- [ ] Eyes page shows capability pills
- [ ] Personas page dropdown works
- [ ] Monitor shows real-time data in all 5 tabs
- [ ] Pipeline builder has MiniMap, keyboard shortcuts, context menu
- [ ] Sessions page filters work
- [ ] Replay theater plays events
- [ ] Theme switcher changes all pages
- [ ] Session dropdown updates pages

### 3. Scenario Runner

**File:** `scripts/run-mcp-scenarios.ts`

- Run Flutter Web scenario
- Run Amethyst troubleshooting scenario
- Verify transcripts match expected flow

---

## Phase 6: Final Polish

### 1. Accessibility

- Run axe-core audits
- Ensure WCAG AA compliance
- Add ARIA labels
- Test keyboard navigation

### 2. Performance

- Optimize bundle size
- Add loading skeletons
- Implement virtualization for long lists
- Profile React renders

### 3. Documentation

- Update README with features
- Create USER_GUIDE.md
- Update go_live_checklist.md
- Document keyboard shortcuts

---

## Todos (Ordered by Priority)

1. **Pipeline Builder - n8n Style** (4-6 hours)

      - Custom node cards with SVG icons and gradients
      - MiniMap component
      - Keyboard shortcuts
      - Right-click context menu
      - Snap-to-grid
      - Auto-layout with Dagre
      - Validation overlays

2. **Monitor Dynamic Data** (2-3 hours)

      - Wire Clarifications tab to API
      - Wire Intent tab to API
      - Parse Evidence from pipeline events
      - Add missing server API routes
      - Update WebSocket handlers

3. **Orchestrator Retry Logic** (2-3 hours)

      - Implement retry loop in runEye
      - Create buildReminderMessage function
      - Test with intentionally failing guards

4. **Eyes Capabilities Pills** (30 min)

      - Debug API proxy
      - Add error logging
      - Test enrichment

5. **Dashboard Wow Factors** (1-2 hours)

      - Test all feature links
      - Implement missing features or update links

6. **Markdown Rendering** (1 hour)

      - Create custom components
      - Apply to all pages

7. **Theme Switcher** (1 hour)

      - Add to global header
      - Verify all 6 themes work

8. **Session Dropdown** (1-2 hours)

      - Add to global nav
      - Wire to React Context
      - Update pages to respect selection

9. **Testing** (2-3 hours)

      - Run Playwright tests
      - Execute manual QA checklist
      - Run scenario runner

10. **Final Polish** (2-3 hours)

        - Accessibility audit
        - Performance optimization
        - Documentation updates

---

## Estimated Total Time: 18-24 hours of focused work

## Success Criteria

- Pipeline builder looks and feels exactly like n8n
- Monitor shows real-time data in all tabs
- Orchestrator retries 3x with reminders
- All pages fully functional
- Tests pass
- Ready for release demo

### To-dos

- [ ] Implement n8n-style pipeline builder with MiniMap, keyboard shortcuts, context menu, snap-to-grid, auto-layout, validation overlays, and SVG icons
- [ ] Wire Monitor tabs (Clarifications, Intent, Evidence) to dynamic API data and WebSocket events
- [ ] Implement orchestrator 3x retry loop with buildReminderMessage function
- [ ] Debug and fix eyes capabilities pills display
- [ ] Verify and implement Dashboard wow factors features
- [ ] Create custom markdown rendering components for magazine-quality articles
- [ ] Add global theme switcher to header with 6 themes × light/dark
- [ ] Implement global session dropdown that updates all pages
- [ ] Run Playwright tests, manual QA checklist, and scenario runner
- [ ] Accessibility audit, performance optimization, documentation updates