'use client';

import { useCallback, useState, useEffect, Fragment } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Trash2, Plus, Layout, AlertCircle, Copy, Maximize, Play } from 'lucide-react';
import CustomNode from './pipeline/CustomNode';
import { PropertyPanel } from './pipeline/PropertyPanel';
import { ExecutionPanel } from './pipeline/ExecutionPanel';
import { EyeStageToken } from '@third-eye/constants';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

// SSOT: Node type constants
const NODE_TYPE_CUSTOM = 'custom';
const NODE_TYPE_TERMINAL = 'terminal';
const NODE_TYPE_START = 'start';
const NODE_TYPE_END = 'end';
const NODE_TYPE_CONDITION = 'condition';

// SSOT: Pipeline validation messages
const VALIDATION_ERROR_NO_START = 'Pipeline must have a start node';
const VALIDATION_ERROR_NO_END = 'Pipeline must have a terminal node';
const VALIDATION_ERROR_NODE_DISCONNECTED = 'is disconnected';
const VALIDATION_ERROR_CYCLES = 'Pipeline contains cycles';
const VALIDATION_ERROR_VALIDATION_BEFORE_GUIDANCE = 'Validation node cannot come before guidance node';

// SSOT: Edge styles
const EDGE_TYPE_SMOOTHSTEP = 'smoothstep';
const EDGE_LABEL_TRUE = 'true';
const EDGE_LABEL_FALSE = 'false';
const EDGE_COLOR_SUCCESS = '#10b981';
const EDGE_COLOR_ERROR = '#ef4444';
const EDGE_STROKE_WIDTH = 2;

// SSOT: Grid settings
const SNAP_GRID_SIZE = 15;

// SSOT: Minimap colors
const MINIMAP_COLOR_GUIDANCE = '#3b82f6';
const MINIMAP_COLOR_VALIDATION = '#10b981';
const MINIMAP_COLOR_CONDITION = '#eab308';
const MINIMAP_COLOR_DEFAULT = '#64748b';

interface PipelineFlowBuilderProps {
  workflowJson: {
    steps: Array<{
      id: string;
      eye?: string;
      type?: string;
      stage?: 'guidance' | 'validation';
      next?: string;
      condition?: string;
      true?: string;
      false?: string;
      prompt?: string;
      capabilities?: string[];
    }>;
  };
  onChange?: (workflow: Record<string, unknown>) => void;
  readOnly?: boolean;
}

// Professional auto-layout with topological sort (n8n-style)
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  // Build adjacency map to determine levels
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach(node => {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  edges.forEach(edge => {
    const sources = adjacency.get(edge.source) || [];
    sources.push(edge.target);
    adjacency.set(edge.source, sources);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Topological sort to determine levels
  const levels = new Map<string, number>();
  const queue: string[] = [];

  nodes.forEach(node => {
    if ((inDegree.get(node.id) || 0) === 0) {
      queue.push(node.id);
      levels.set(node.id, 0);
    }
  });

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const currentLevel = levels.get(nodeId) || 0;
    const neighbors = adjacency.get(nodeId) || [];

    neighbors.forEach(neighbor => {
      const degree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, degree);

      if (degree === 0) {
        queue.push(neighbor);
        levels.set(neighbor, currentLevel + 1);
      }
    });
  }

  // Nodes that weren't reached (disconnected) get level 0
  nodes.forEach(node => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  });

  // Group nodes by level and separate guidance/validation into lanes
  const nodesByLevel = new Map<number, { guidance: Node[], validation: Node[], other: Node[] }>();
  
  nodes.forEach(node => {
    const level = levels.get(node.id) || 0;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, { guidance: [], validation: [], other: [] });
    }
    
    const stage = node.data?.stage;
    if (stage === EyeStageToken.GUIDANCE) {
      nodesByLevel.get(level)!.guidance.push(node);
    } else if (stage === EyeStageToken.VALIDATION) {
      nodesByLevel.get(level)!.validation.push(node);
    } else {
      nodesByLevel.get(level)!.other.push(node);
    }
  });

  // Position nodes with two-lane layout (guidance left, validation right)
  const nodeHeight = 120;
  const horizontalSpacing = 100;
  const verticalSpacing = 120;
  const laneWidth = 400;

  const layoutedNodes = nodes.map(node => {
    const level = levels.get(node.id) || 0;
    const levelNodes = nodesByLevel.get(level)!;
    const stage = node.data?.stage;

    let x = 0;
    let indexInLane = 0;

    if (stage === EyeStageToken.GUIDANCE) {
      indexInLane = levelNodes.guidance.indexOf(node);
      x = laneWidth * 0 + (indexInLane * horizontalSpacing);
    } else if (stage === EyeStageToken.VALIDATION) {
      indexInLane = levelNodes.validation.indexOf(node);
      x = laneWidth * 2 + (indexInLane * horizontalSpacing);
    } else {
      indexInLane = levelNodes.other.indexOf(node);
      x = laneWidth * 1 + (indexInLane * horizontalSpacing);
    }

    const y = level * (nodeHeight + verticalSpacing) + 50;

    return {
      ...node,
      position: { x, y },
    };
  });

  return { nodes: layoutedNodes, edges };
};

function PipelineFlowBuilderInner({
  workflowJson,
  readOnly = false,
}: PipelineFlowBuilderProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [clipboard, setClipboard] = useState<Node[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);

  // Undo/Redo history
  const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const reactFlowInstance = useReactFlow();

  // Convert workflow JSON to React Flow nodes/edges
  useEffect(() => {
    if (!workflowJson?.steps) return;

    const newNodes: Node[] = workflowJson.steps.map((step, index) => ({
        id: step.id,
      type: NODE_TYPE_CUSTOM,
      position: { x: 100 + index * 300, y: 100 },
        data: {
        label: step.eye || step.type || step.id,
          eye: step.eye,
          type: step.type,
        stage: step.stage,
        capabilities: step.capabilities || [],
        },
    }));

    const newEdges: Edge[] = [];
    workflowJson.steps.forEach(step => {
      if (step.next) {
        newEdges.push({
          id: `${step.id}-${step.next}`,
          source: step.id,
          target: step.next,
          type: EDGE_TYPE_SMOOTHSTEP,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeWidth: EDGE_STROKE_WIDTH },
        });
      }
      if (step.condition && step.true && step.false) {
        newEdges.push(
          {
            id: `${step.id}-true-${step.true}`,
          source: step.id,
          target: step.true,
            label: EDGE_LABEL_TRUE,
            type: EDGE_TYPE_SMOOTHSTEP,
          animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: EDGE_COLOR_SUCCESS, strokeWidth: EDGE_STROKE_WIDTH },
          },
          {
            id: `${step.id}-false-${step.false}`,
          source: step.id,
          target: step.false,
            label: EDGE_LABEL_FALSE,
            type: EDGE_TYPE_SMOOTHSTEP,
          animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: EDGE_COLOR_ERROR, strokeWidth: EDGE_STROKE_WIDTH },
          }
        );
      }
    });

    // Apply auto-layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // Run validation
    validatePipeline(layoutedNodes, layoutedEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowJson]);

  // Validation logic
  const validatePipeline = useCallback((nodes: Node[], edges: Edge[]) => {
    const errors: string[] = [];

    // Check for start node
    const hasStart = nodes.some(n => n.data.type === NODE_TYPE_START || n.id === NODE_TYPE_START);
    if (!hasStart) {
      errors.push(VALIDATION_ERROR_NO_START);
    }

    // Check for end/terminal node
    const hasEnd = nodes.some(n => n.data.type === NODE_TYPE_TERMINAL || n.id === NODE_TYPE_END);
    if (!hasEnd) {
      errors.push(VALIDATION_ERROR_NO_END);
    }

    // Check for orphan nodes (no incoming or outgoing edges)
    nodes.forEach(node => {
      const hasIncoming = edges.some(e => e.target === node.id);
      const hasOutgoing = edges.some(e => e.source === node.id);
      
      if (!hasIncoming && !hasOutgoing && node.data.type !== NODE_TYPE_TERMINAL && node.id !== NODE_TYPE_START) {
        errors.push(`Node "${node.data.label}" ${VALIDATION_ERROR_NODE_DISCONNECTED}`);
      }
    });

    // Check for cycles
    const visited = new Set<string>();
    const recStack = new Set<string>();
    
    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const outgoingEdges = edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          if (hasCycle(edge.target)) return true;
        } else if (recStack.has(edge.target)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    if (nodes.some(n => !visited.has(n.id) && hasCycle(n.id))) {
      errors.push(VALIDATION_ERROR_CYCLES);
    }

    // Check guidance before validation rule
    const guidanceNodes = nodes.filter(n => n.data.stage === EyeStageToken.GUIDANCE);
    const validationNodes = nodes.filter(n => n.data.stage === EyeStageToken.VALIDATION);
    
    guidanceNodes.forEach(gNode => {
      validationNodes.forEach(vNode => {
        // Check if validation comes before guidance
        const pathExists = edges.some(e => e.source === vNode.id && e.target === gNode.id);
        if (pathExists) {
          errors.push(`${VALIDATION_ERROR_VALIDATION_BEFORE_GUIDANCE.replace('Validation node', `Validation node "${vNode.data.label}"`).replace('guidance node', `guidance node "${gNode.data.label}"`)}`);
        }
      });
    });

    setValidationErrors(errors);
  }, []);

  // Undo/Redo system
  const saveHistory = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ nodes: JSON.parse(JSON.stringify(currentNodes)), edges: JSON.parse(JSON.stringify(currentEdges)) });

      // Limit history to 50 items
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(JSON.parse(JSON.stringify(prevState.nodes)));
      setEdges(JSON.parse(JSON.stringify(prevState.edges)));
      setHistoryIndex(prev => prev - 1);
      validatePipeline(prevState.nodes, prevState.edges);
    }
  }, [history, historyIndex, validatePipeline]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(JSON.parse(JSON.stringify(nextState.nodes)));
      setEdges(JSON.parse(JSON.stringify(nextState.edges)));
      setHistoryIndex(prev => prev + 1);
      validatePipeline(nextState.nodes, nextState.edges);
    }
  }, [history, historyIndex, validatePipeline]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        validatePipeline(updated, edges);

        // Save history for significant changes (not just selection)
        const hasSignificantChange = changes.some(c =>
          c.type === 'remove' || c.type === 'add' || (c.type === 'position' && c.dragging === false)
        );
        if (hasSignificantChange) {
          saveHistory(updated, edges);
        }

        return updated;
      });
    },
    [edges, validatePipeline, saveHistory]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const updated = applyEdgeChanges(changes, eds);
        validatePipeline(nodes, updated);

        // Save history for significant changes
        const hasSignificantChange = changes.some(c => c.type === 'remove' || c.type === 'add');
        if (hasSignificantChange) {
          saveHistory(nodes, updated);
        }

        return updated;
      });
    },
    [nodes, validatePipeline, saveHistory]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const newEdge = {
            ...connection,
          type: EDGE_TYPE_SMOOTHSTEP,
            animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeWidth: EDGE_STROKE_WIDTH },
        };
        const updated = addEdge(newEdge, eds);
        validatePipeline(nodes, updated);
        saveHistory(nodes, updated);
        return updated;
      });
    },
    [nodes, validatePipeline, saveHistory]
  );

  // Node selection handler
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Update node data from PropertyPanel
  const handleUpdateNode = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );

    // Update selected node to reflect changes
    setSelectedNode((prevSelected) =>
      prevSelected && prevSelected.id === nodeId
        ? { ...prevSelected, data: { ...prevSelected.data, ...data } }
        : prevSelected
    );
  }, []);

  // Context menu handlers
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    if (readOnly) return;
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
  }, [readOnly]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Keyboard shortcuts
  const deleteSelectedNodes = useCallback(() => {
    if (readOnly) return;
    setNodes((nds) => {
      const selected = nds.filter(n => n.selected);
      const selectedIds = new Set(selected.map(n => n.id));
      return nds.filter(n => !selectedIds.has(n.id));
    });
    setEdges((eds) => {
      const selected = nodes.filter(n => n.selected);
      const selectedIds = new Set(selected.map(n => n.id));
      return eds.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target));
    });
  }, [nodes, readOnly]);

  const duplicateSelectedNodes = useCallback(() => {
    if (readOnly) return;
    setNodes((nds) => {
      const selected = nds.filter(n => n.selected);
      const duplicated = selected.map(node => ({
        ...node,
        id: `${node.id}-copy-${Date.now()}`,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        selected: false,
      }));
      return [...nds.map(n => ({ ...n, selected: false })), ...duplicated];
    });
  }, [readOnly]);

  const copyNodes = useCallback(() => {
    const selected = nodes.filter(n => n.selected);
    setClipboard(selected);
  }, [nodes]);

  const pasteNodes = useCallback(() => {
    if (readOnly || clipboard.length === 0) return;
    setNodes((nds) => {
      const pasted = clipboard.map(node => ({
        ...node,
        id: `${node.id}-paste-${Date.now()}`,
        position: {
          x: node.position.x + 100,
          y: node.position.y + 100,
        },
        selected: true,
      }));
      return [...nds.map(n => ({ ...n, selected: false })), ...pasted];
    });
  }, [clipboard, readOnly]);

  const deselectAll = useCallback(() => {
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    setEdges((eds) => eds.map(e => ({ ...e, selected: false })));
  }, []);

  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map(n => ({ ...n, selected: true })));
  }, []);

  const autoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 0);
  }, [nodes, edges, reactFlowInstance]);

  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '=') {
        e.preventDefault();
        reactFlowInstance.zoomIn();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        reactFlowInstance.zoomOut();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        reactFlowInstance.fitView({ padding: 0.2 });
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedNodes();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelectedNodes();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        copyNodes();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        pasteNodes();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        deselectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, nodes, edges, clipboard, undo, redo, selectAll]);

  // Click outside to close context menu
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => closeContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, closeContextMenu]);

  return (
    <>
    <div className="flex h-[600px] w-full rounded-xl border border-brand-outline/50 bg-brand-ink overflow-hidden">
      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
          nodeTypes={nodeTypes}
        snapToGrid={true}
        snapGrid={[SNAP_GRID_SIZE, SNAP_GRID_SIZE]}
          fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        selectionOnDrag={true}
        panOnDrag={[1, 2]}
        selectionMode="partial"
        multiSelectionKeyCode="Shift"
        deleteKeyCode="Delete"
        defaultEdgeOptions={{
          type: EDGE_TYPE_SMOOTHSTEP,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
      >
        <Background color="#475569" gap={15} />
        <Controls className="!border-brand-outline/50 !bg-brand-paper" />
        <MiniMap
          nodeColor={(node) => {
            if (node.data.stage === EyeStageToken.GUIDANCE) return MINIMAP_COLOR_GUIDANCE;
            if (node.data.stage === EyeStageToken.VALIDATION) return MINIMAP_COLOR_VALIDATION;
            if (node.data.type === NODE_TYPE_CONDITION) return MINIMAP_COLOR_CONDITION;
            return MINIMAP_COLOR_DEFAULT;
          }}
          className="!border-brand-outline/50 !bg-brand-paper"
          position="bottom-right"
        />

        {/* Keyboard Shortcuts Panel */}
        {!readOnly && (
          <Panel position="top-left" className="bg-brand-paper/90 backdrop-blur-sm border border-brand-outline/50 rounded-lg p-3 text-xs">
            <div className="text-white font-semibold mb-2">Keyboard Shortcuts</div>
            <div className="space-y-1 text-slate-400">
              <div><kbd className="text-brand-accent">⌘/Ctrl + Z</kbd> Undo</div>
              <div><kbd className="text-brand-accent">⌘/Ctrl + Shift + Z</kbd> Redo</div>
              <div><kbd className="text-brand-accent">Drag</kbd> Select multiple</div>
              <div><kbd className="text-brand-accent">Shift + Click</kbd> Add to selection</div>
              <div><kbd className="text-brand-accent">⌘/Ctrl + A</kbd> Select all</div>
              <div><kbd className="text-brand-accent">⌘/Ctrl + Plus</kbd> Zoom in</div>
              <div><kbd className="text-brand-accent">⌘/Ctrl + Minus</kbd> Zoom out</div>
              <div><kbd className="text-brand-accent">⌘/Ctrl + 0</kbd> Reset view</div>
              <div><kbd className="text-brand-accent">Delete</kbd> Remove node</div>
              <div><kbd className="text-brand-accent">⌘/Ctrl + D</kbd> Duplicate</div>
              <div><kbd className="text-brand-accent">⌘/Ctrl + C/V</kbd> Copy/Paste</div>
              <div><kbd className="text-brand-accent">Esc</kbd> Deselect</div>
              <div><kbd className="text-brand-accent">Right Click</kbd> Context menu</div>
            </div>
          </Panel>
        )}

        {/* Validation Errors Panel */}
        {validationErrors.length > 0 && (
          <Panel position="top-right" className="bg-red-500/10 backdrop-blur-sm border border-red-500/50 rounded-lg p-3 max-w-xs">
            <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
              <AlertCircle className="h-4 w-4" />
              <span>Validation Errors</span>
            </div>
            <ul className="space-y-1 text-xs text-red-300">
              {validationErrors.map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          </Panel>
        )}

        {/* Action Buttons */}
          {!readOnly && (
          <Panel position="bottom-left" className="flex gap-2">
            <button
              onClick={() => setShowExecutionPanel(!showExecutionPanel)}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-green-700"
            >
              <Play className="h-4 w-4" />
              {showExecutionPanel ? 'Hide Execution' : 'Run Pipeline'}
            </button>
            <button
              onClick={autoLayout}
              className="flex items-center gap-2 rounded-lg bg-brand-accent px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-primary"
            >
              <Layout className="h-4 w-4" />
              Auto Layout
            </button>
            <button
              onClick={() => reactFlowInstance.fitView({ padding: 0.2 })}
              className="flex items-center gap-2 rounded-lg bg-brand-paper px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-paperElev"
            >
              <Maximize className="h-4 w-4" />
              Fit View
            </button>
          </Panel>
        )}
      </ReactFlow>
      </div>

      {/* PropertyPanel */}
      {!readOnly && selectedNode && (
        <PropertyPanel
          selectedNode={selectedNode}
          onUpdateNode={handleUpdateNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* ExecutionPanel */}
      {!readOnly && showExecutionPanel && (
        <ExecutionPanel
          pipelineId={workflowJson?.id || 'test-pipeline'}
          onClose={() => setShowExecutionPanel(false)}
        />
      )}
    </div>

    {/* Context Menu */}
    {contextMenu && !readOnly && (
      <div
        className="fixed z-50 rounded-lg border border-brand-outline/50 bg-brand-paper shadow-xl"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            const node = nodes.find(n => n.id === contextMenu.nodeId);
            if (node) {
              console.log('Edit node:', node);
            }
            closeContextMenu();
          }}
          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-white hover:bg-brand-accent rounded-t-lg"
        >
          <Plus className="h-4 w-4" />
          Edit Node
        </button>
        <button
          onClick={() => {
            setNodes((nds) => nds.map(n =>
              n.id === contextMenu.nodeId ? { ...n, selected: true } : n
            ));
            duplicateSelectedNodes();
            closeContextMenu();
          }}
          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-white hover:bg-brand-accent"
        >
          <Copy className="h-4 w-4" />
          Duplicate
        </button>
        <button
          onClick={() => {
            setNodes((nds) => nds.filter(n => n.id !== contextMenu.nodeId));
            setEdges((eds) => eds.filter(e =>
              e.source !== contextMenu.nodeId && e.target !== contextMenu.nodeId
            ));
            closeContextMenu();
          }}
          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-b-lg"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    )}
    </>
  );
}

export function PipelineFlowBuilder(props: PipelineFlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <PipelineFlowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}
