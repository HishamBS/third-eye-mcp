# UI/UX Remaining Tasks - Pipeline Builder

## ✅ COMPLETED
1. ✅ Control node configuration modals wired up (Switch, IF, Loop)
2. ✅ Comprehensive UI/UX audit completed
3. ✅ PROMPT_HELPER renamed to Kyuubi across entire codebase
4. ✅ Pipeline builder crash fixes (validation, types, loading)

## 🔧 QUICK WINS (HIGH-IMPACT, LOW-EFFORT)

### Priority 1: Critical UX Improvements

#### 1. Display Empty State Message (5 lines)
**File:** `apps/ui/src/components/pipeline-builder/PipelineCanvasEnhanced.tsx` (around line 493)
**Implementation:**
```tsx
{/* Empty State - Show helpful message when no nodes */}
{nodes.length === 0 && !pipelineLoading && (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="text-center text-semantic-muted">
      <p className="text-lg font-medium mb-2">Start Building Your Pipeline</p>
      <p className="text-sm">{PIPELINE_UI_TEXT.EMPTY_STATE_NO_NODES}</p>
    </div>
  </div>
)}
<ReactFlow ...>
```

#### 2. Show Pipeline Loading Spinner (10 lines)
**File:** Same as above
**Implementation:**
```tsx
{/* Loading Overlay */}
{pipelineLoading && (
  <div className="absolute inset-0 flex items-center justify-center bg-brand-paper/80 backdrop-blur-sm z-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
      <p className="text-sm text-semantic-muted">Loading pipeline...</p>
    </div>
  </div>
)}
```

#### 3. Add Double-Click to Edit (5 lines)
**File:** Same as above (after line 240)
**Implementation:**
```tsx
// Double-click node → edit modal (Quick Win)
const handleNodeDoubleClick = useCallback(
  (event: React.MouseEvent, node: Node<EyeNodeData>) => {
    handleNodeContextMenu(event, node);
  },
  [handleNodeContextMenu]
);
```
**Then add to ReactFlow:**
```tsx
<ReactFlow
  ...
  onNodeDoubleClick={handleNodeDoubleClick}
  ...
>
```

#### 4. Fix Undefined `pipelines` Variable (CRITICAL BUG)
**File:** Same as above (line 171)
**Problem:** Toolbar expects `pipelines` prop but component never loads it
**Implementation:**
```tsx
// Add after line 41:
import { usePipelines } from '@/hooks/usePipelines';

// Add after line 171:
const { pipelines } = usePipelines();
```

### Priority 2: Save/Load Functionality

#### 5. Implement Save Pipeline Handler
**File:** `apps/ui/src/components/pipeline-builder/PipelineCanvasEnhanced.tsx` (line 459)
**Replace stub with:**
```tsx
const { save, loading: saving } = useSavePipeline();

const handleSave = useCallback(async () => {
  if (!activePipeline?.id) {
    // New pipeline - prompt for name
    const name = prompt('Enter pipeline name:');
    if (!name) return;

    const result = await save(null, name, '', nodes, edges);
    if (result) {
      console.log('Pipeline saved:', result);
      // Show success toast
    }
  } else {
    // Update existing
    const result = await save(
      activePipeline.id,
      activePipeline.name,
      activePipeline.description || '',
      nodes,
      edges
    );
    if (result) {
      console.log('Pipeline updated:', result);
      // Show success toast
    }
  }
}, [nodes, edges, activePipeline, save]);
```

#### 6. Implement Activate Pipeline Handler
**File:** Same as above (line 460)
**Replace stub with:**
```tsx
const { activate } = useActivatePipeline();

const handleActivate = useCallback(async () => {
  if (!activePipeline?.id) {
    alert('Please save the pipeline first');
    return;
  }

  const success = await activate(activePipeline.id);
  if (success) {
    console.log('Pipeline activated');
    // Show success toast
  }
}, [activePipeline, activate]);
```

#### 7. Implement Export/Import Handlers
**File:** Same as above (lines 462-463)
```tsx
const handleExport = useCallback(() => {
  const data = {
    nodes,
    edges,
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0',
    },
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pipeline-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}, [nodes, edges]);

const handleImport = useCallback(async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const text = await file.text();
    const data = JSON.parse(text);

    if (data.nodes && data.edges) {
      setNodesValidated(data.nodes);
      setEdges(data.edges);
    }
  };

  input.click();
}, [setNodesValidated, setEdges]);
```

### Priority 3: Keyboard Shortcuts

#### 8. Implement Escape Key to Deselect
**File:** Same as above (after line 189)
```tsx
// Global keyboard handler
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedNode(null);
      setSelectedSwitchNode(null);
      setSelectedIFNode(null);
      setSelectedLoopNode(null);
      setSelectedEdge(null);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

#### 9. Implement Delete Key
**Implementation in same keyboard handler:**
```tsx
if (e.key === 'Delete' || e.key === 'Backspace') {
  if (selectedNode) {
    handleNodeDelete(selectedNode.id);
    setSelectedNode(null);
  } else if (selectedEdge) {
    handleEdgeDelete(selectedEdge.id);
    setSelectedEdge(null);
  }
}
```

### Priority 4: Undo/Redo (Complex, requires state history)

**Recommended approach:**
1. Use `@third-eye/hooks` or create `useHistory` hook
2. Track node/edge state changes
3. Implement command pattern for undo/redo

**Sketch:**
```tsx
const [history, setHistory] = useState<{ nodes: Node[], edges: Edge[] }[]>([]);
const [historyIndex, setHistoryIndex] = useState(0);

const addToHistory = useCallback((nodes: Node[], edges: Edge[]) => {
  setHistory(h => [...h.slice(0, historyIndex + 1), { nodes, edges }]);
  setHistoryIndex(i => i + 1);
}, [historyIndex]);

const undo = useCallback(() => {
  if (historyIndex > 0) {
    const prevState = history[historyIndex - 1];
    setNodesValidated(prevState.nodes);
    setEdges(prevState.edges);
    setHistoryIndex(i => i - 1);
  }
}, [history, historyIndex]);

const redo = useCallback(() => {
  if (historyIndex < history.length - 1) {
    const nextState = history[historyIndex + 1];
    setNodesValidated(nextState.nodes);
    setEdges(nextState.edges);
    setHistoryIndex(i => i + 1);
  }
}, [history, historyIndex]);
```

## 📊 AUDIT SUMMARY

| Feature | Status | Completeness | Impact |
|---------|--------|--------------|--------|
| Double-click | ⚠️ Ready to implement | 0% | High |
| Keyboard Shortcuts | ⚠️ Partial (2/13) | 15% | High |
| Undo/Redo | ❌ Missing | 0% | Critical |
| Save/Load | ⚠️ Hooks ready, handlers stub | 50% | High |
| Validation Feedback | ⚠️ Node-level only | 40% | Medium |
| Loading States | ⚠️ Ready to display | 60% | Low |
| Empty States | ⚠️ Ready to display | 0% | Medium |
| Tooltips | ⚠️ Minimal | 20% | Low |
| Canvas Context Menu | ⚠️ Node/edge only | 30% | Medium |
| Node/Edge Search | ⚠️ Palette only | 40% | Medium |
| Zoom/Pan Controls | ✅ Complete | 100% | Excellent |
| Export/Import | ❌ Stub only | 0% | High |

## 🎯 NEXT STEPS

1. **Immediate** (< 1 hour):
   - Fix undefined `pipelines` variable (CRITICAL BUG)
   - Add empty state message
   - Add loading spinner
   - Add double-click handlers

2. **Short-term** (1-2 hours):
   - Implement save/activate/new handlers
   - Implement export/import
   - Add Escape/Delete keyboard shortcuts

3. **Medium-term** (2-4 hours):
   - Implement undo/redo system
   - Add canvas context menu
   - Add more keyboard shortcuts

4. **Long-term** (4+ hours):
   - Pipeline-level validation with visual feedback
   - Advanced search/filter
   - Auto-layout algorithm
   - Collaborative editing

## 🐛 CRITICAL BUGS TO FIX

1. **Undefined `pipelines` variable** - Toolbar crashes
2. **No loading state displayed** - Users don't know pipeline is loading
3. **No empty state** - Blank canvas confuses users
4. **All save/export handlers are stubs** - No persistence

## 📝 NOTES

- All constants are properly defined in SSOT (`constants.ts`)
- React Flow provides excellent foundation
- Modal UIs are enterprise-grade (ExpressionBuilder, JSONLogic editor)
- Backend API endpoints exist and are functional
- Only frontend wiring needs completion

---

**Total Estimated Time to Complete All Quick Wins:** ~4-6 hours
**Total Estimated Time for Full Feature Parity:** ~15-20 hours
