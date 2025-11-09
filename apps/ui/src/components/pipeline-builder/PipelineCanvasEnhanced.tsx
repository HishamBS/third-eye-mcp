'use client';

import { useCallback, useState, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  applyNodeChanges,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getEyeColor } from '@/components/EyeIcon';
import { EyeNode } from './EyeNode';
import { SwitchNode } from './SwitchNode';
import { IFNode } from './IFNode';
import { LoopNode } from './LoopNode';
import { TerminalNode } from './TerminalNode';
import { UserInputNode } from './UserInputNode';
import { NodePalette } from './NodePalette';
import { NodeEditModal } from './NodeEditModal';
import { EdgeConfigModal } from './EdgeConfigModal';
import { Toolbar } from './Toolbar';
import { PersonaWizardModal } from '@/components/persona-form/PersonaWizardModal';
import { PipelineTemplateSelector } from './PipelineTemplateSelector';
import { CANVAS_SETTINGS, LAYOUT } from './constants';
import { API_BASE_URL } from '@/consts/api';
import type { PipelineNode, PipelineEdge, EyeNodeData, EdgeConditionData } from '@/types/pipeline';

/**
 * Validate nodes structure - throws error if malformed
 * Per R07: Strict typing, no any
 * Per R12: No fallbacks - throw error if data is invalid
 */
const validateNodes = (nodes: PipelineNode[]): void => {
  for (const node of nodes) {
    if (!node.id) {
      throw new Error(`Node missing required property: id`);
    }
    if (!node.type || node.type !== 'eyeNode') {
      throw new Error(`Node ${node.id} has invalid type: ${node.type}. Expected 'eyeNode'`);
    }
    if (!node.position) {
      throw new Error(`Node ${node.id} missing required property: position`);
    }
    if (typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      throw new Error(`Node ${node.id} has invalid position: position must have numeric x and y properties`);
    }
    if (!node.data) {
      throw new Error(`Node ${node.id} missing required property: data`);
    }
    if (!node.data.eyeId) {
      throw new Error(`Node ${node.id} missing required property: data.eyeId`);
    }
  }
};

/**
 * Enhanced Pipeline Canvas - Phase 10
 *
 * Features:
 * - Full-screen N8N-style layout
 * - Eye palette with drag-and-drop
 * - Single-click zoom interactions
 * - Right-click context menus
 * - Collapsible toolbar
 * - Toggleable minimap/grid
 * - System default pipeline loaded
 *
 * Per R04: Memoized callbacks
 * Per R07: Strict typing
 * Per R13: All constants from SSOT
 */
export function PipelineCanvasEnhanced() {
  console.log('[DEBUG] PipelineCanvasEnhanced component mounting');

  // Memoize nodeTypes to prevent ReactFlow warning
  const nodeTypes = useMemo(() => ({
    eyeNode: EyeNode,
    switch: SwitchNode,
    if: IFNode,
    loop_over_items: LoopNode,
    terminal: TerminalNode,
    user_input: UserInputNode,
  }), []);

  // Start with empty pipeline - load from database if needed
  const [nodes, setNodes, onNodesChange] = useNodesState<EyeNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeConditionData>([]);
  
  // Wrap setNodes to validate nodes before setting
  // This ensures ReactFlow never receives invalid nodes
  // Per R12: No fallbacks - throw error if data is invalid
  const setNodesValidated = useCallback(
    (nodesOrUpdater: Node<EyeNodeData>[] | ((nodes: Node<EyeNodeData>[]) => Node<EyeNodeData>[])) => {
      setNodes((currentNodes) => {
        // Use currentNodes from React state, not stale closure
        const nodesToSet = typeof nodesOrUpdater === 'function'
          ? nodesOrUpdater(currentNodes)
          : nodesOrUpdater;

        // DEBUG: Log nodes being set
        console.log('[DEBUG] setNodesValidated called with:', {
          isFunction: typeof nodesOrUpdater === 'function',
          nodesCount: nodesToSet.length,
          nodes: nodesToSet.map(n => ({
            id: n.id,
            type: n.type,
            hasPosition: !!n.position,
            position: n.position,
            positionType: typeof n.position,
          })),
        });

        // Validate nodes before setting - throws error if invalid (per R12)
        if (nodesToSet.length > 0) {
          validateNodes(nodesToSet as PipelineNode[]);
        }

        // DEBUG: Log after validation
        console.log('[DEBUG] Validation passed, setting nodes');

        // Return validated nodes to React
        return nodesToSet;
      });
    },
    [setNodes]
  );
  
  // START WITH BLANK CANVAS for N8N-style pipeline builder
  // Per vision: Dynamic routing via Overseer (not static templates)
  // Templates/sessions can be loaded via toolbar "Load" button
  // This allows professional pipeline creation from scratch
  const [selectedNode, setSelectedNode] = useState<Node<EyeNodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge<EdgeConditionData> | null>(null);
  const [paletteCollapsed, setPaletteCollapsed] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const reactFlowInstance = useReactFlow();

  // Phase 16: Persona configuration modal state
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [selectedPersonaEye, setSelectedPersonaEye] = useState<{ id: string; name: string } | null>(null);

  // Phase 19.4: Template selector modal state
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);

  // Placeholder pipeline data (will be replaced by service hooks in S8)
  const activePipeline = useMemo(() => null, []);
  const pipelines = useMemo(() => [], []);

  // Single click node → zoom to node
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node<EyeNodeData>) => {
      event.stopPropagation();

      if (!node.position) {
        console.warn('[PipelineCanvas] Node has no position:', node.id);
        return;
      }

      reactFlowInstance.setCenter(
        node.position.x + (node.width || CANVAS_SETTINGS.NODE_SPACING) / 2,
        node.position.y + (node.height || CANVAS_SETTINGS.NODE_SPACING) / 2,
        { zoom: LAYOUT.ZOOM_TO_NODE_SCALE, duration: LAYOUT.ZOOM_DURATION }
      );
    },
    [reactFlowInstance]
  );

  // Click outside → fit view
  const handlePaneClick = useCallback(() => {
    reactFlowInstance.fitView({
      padding: LAYOUT.FIT_VIEW_PADDING,
      duration: LAYOUT.ZOOM_DURATION,
    });
  }, [reactFlowInstance]);

  // Right-click node → edit modal
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<EyeNodeData>) => {
      event.preventDefault();
      setSelectedNode(node);
    },
    []
  );

  // Right-click edge → config modal
  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge<EdgeConditionData>) => {
      event.preventDefault();
      setSelectedEdge(edge);
    },
    []
  );

  // Update node
  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<EyeNodeData>) => {
      setNodesValidated((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n)) as Node<EyeNodeData>[]
      );
    },
    [setNodesValidated]
  );

  // Delete node
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodesValidated((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodesValidated, setEdges]
  );

  // Update edge
  const handleEdgeUpdate = useCallback(
    (edgeId: string, updates: EdgeConditionData) => {
      setEdges((eds) =>
        eds.map((e) => (e.id === edgeId ? { ...e, data: updates } : e))
      );
    },
    [setEdges]
  );

  // Delete edge
  const handleEdgeDelete = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    },
    [setEdges]
  );

  // Phase 16: Persona configuration handlers
  const handleConfigurePersona = useCallback((eyeId: string, eyeName: string) => {
    setSelectedPersonaEye({ id: eyeId, name: eyeName });
    setIsPersonaModalOpen(true);
    setSelectedNode(null); // Close node edit modal
  }, []);

  const handleClosePersonaModal = useCallback(() => {
    setIsPersonaModalOpen(false);
    setSelectedPersonaEye(null);
  }, []);

  const handlePersonaSaved = useCallback(() => {
    // Could refresh node data here if needed
    console.log('Persona saved for pipeline node');
  }, []);

  // Phase 19.4: Template loading handler
  const handleLoadTemplate = useCallback(
    (template: { nodes: readonly PipelineNode[]; edges: readonly PipelineEdge[]; workflowJson?: unknown }) => {
      // Parse workflowJson if provided and is a string
      let workflow = template;
      if (template.workflowJson) {
        workflow = typeof template.workflowJson === 'string'
          ? JSON.parse(template.workflowJson)
          : template.workflowJson;
      }
      
      const templateNodes = [...(workflow.nodes || template.nodes)] as PipelineNode[];
      validateNodes(templateNodes);
      setNodesValidated(templateNodes as Node<EyeNodeData>[]);
      setEdges([...(workflow.edges || template.edges)] as Edge<EdgeConditionData>[]);
      // Fit view after loading template
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: LAYOUT.FIT_VIEW_PADDING, duration: LAYOUT.ZOOM_DURATION });
      }, 100);
    },
    [setNodesValidated, setEdges, reactFlowInstance]
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Drag and drop from palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;

      const { type, data: nodeData } = JSON.parse(data);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node<EyeNodeData> = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: nodeData,
      };

      setNodesValidated((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodesValidated]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Get node color for minimap
  const getNodeColor = useCallback((node: Node<EyeNodeData>): string => {
    return getEyeColor(node.data.eyeId);
  }, []);

  // Wrap onNodesChange to validate nodes after changes are applied
  // This ensures ReactFlow cannot set invalid nodes that bypass validation
  // Per R12: No fallbacks - throw error if data is invalid
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Apply changes to get resulting nodes
      const newNodes = applyNodeChanges(changes, nodes);
      // Validate resulting nodes - throws error if any are malformed (no fallback)
      if (newNodes.length > 0) {
        validateNodes(newNodes as PipelineNode[]);
      }
      // If validation passes, apply the changes
      onNodesChange(changes);
    },
    [nodes, onNodesChange]
  );

  // Validate nodes before ReactFlow renders them - prevents crashes from invalid position
  // Per R12: No fallbacks - throw error if data is invalid
  const validatedNodes = useMemo(() => {
    if (nodes.length === 0) {
      return nodes;
    }
    
    // DEBUG: Log nodes in state before validation
    console.log('[DEBUG] validatedNodes useMemo - nodes in state:', nodes.map(n => ({
      id: n.id,
      type: n.type,
      hasPosition: !!n.position,
      position: n.position,
      positionType: typeof n.position,
      positionKeys: n.position ? Object.keys(n.position) : [],
    })));
    
    // Validate all nodes - throws error if any are malformed (no fallback)
    validateNodes(nodes as PipelineNode[]);
    return nodes;
  }, [nodes]);

  // Toolbar handlers (placeholders for S8)
  const handleSave = useCallback(() => console.log('Save pipeline'), []);
  const handleActivate = useCallback(() => console.log('Activate pipeline'), []);
  const handleNew = useCallback(() => console.log('New pipeline'), []);
  const handleExport = useCallback(() => console.log('Export pipeline'), []);
  const handleImport = useCallback(() => console.log('Import pipeline'), []);
  const handleValidate = useCallback(() => console.log('Validate pipeline'), []);
  const handleAutoLayout = useCallback(() => console.log('Auto layout'), []);
  const handleZoomFit = useCallback(() => {
    reactFlowInstance.fitView({ padding: LAYOUT.FIT_VIEW_PADDING, duration: LAYOUT.ZOOM_DURATION });
  }, [reactFlowInstance]);

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Toolbar */}
      <Toolbar
        activePipeline={activePipeline}
        pipelines={pipelines}
        onSave={handleSave}
        onActivate={handleActivate}
        onNew={handleNew}
        onExport={handleExport}
        onImport={handleImport}
        onValidate={handleValidate}
        onAutoLayout={handleAutoLayout}
        onZoomFit={handleZoomFit}
        onToggleMinimap={() => setShowMinimap(!showMinimap)}
        onToggleGrid={() => setShowGrid(!showGrid)}
        onLoadTemplate={() => setIsTemplateSelectorOpen(true)}
        showMinimap={showMinimap}
        showGrid={showGrid}
      />

      {/* Main Canvas */}
      <div className="flex-1 w-full relative">
        <ReactFlow
          nodes={validatedNodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          minZoom={CANVAS_SETTINGS.MIN_ZOOM}
          maxZoom={CANVAS_SETTINGS.MAX_ZOOM}
          defaultViewport={{ x: 0, y: 0, zoom: CANVAS_SETTINGS.DEFAULT_ZOOM }}
          className="bg-brand-paper"
        >
          {showGrid && (
            <Background
              variant={BackgroundVariant.Dots}
              gap={CANVAS_SETTINGS.GRID_SIZE}
              size={1}
              className="opacity-30"
            />
          )}
          <Controls className="bg-brand-paperElev border-brand-outline" />
          {showMinimap && (
            <MiniMap
              nodeColor={getNodeColor}
              nodeBorderRadius={8}
              className="bg-brand-paperElev border border-brand-outline"
            />
          )}
        </ReactFlow>

        {/* Node Palette (Eyes + Control Nodes) */}
        <NodePalette
          collapsed={paletteCollapsed}
          onToggleCollapse={() => setPaletteCollapsed(!paletteCollapsed)}
        />

        {/* Node Edit Modal */}
        <NodeEditModal
          node={selectedNode as PipelineNode | null}
          onClose={() => setSelectedNode(null)}
          onSave={handleNodeUpdate}
          onDelete={handleNodeDelete}
          onConfigurePersona={handleConfigurePersona}
        />

        {/* Edge Config Modal */}
        <EdgeConfigModal
          edge={selectedEdge}
          onClose={() => setSelectedEdge(null)}
          onSave={handleEdgeUpdate}
          onDelete={handleEdgeDelete}
        />

        {/* Phase 16: Persona Configuration Modal */}
        {selectedPersonaEye && (
          <PersonaWizardModal
            isOpen={isPersonaModalOpen}
            eyeId={selectedPersonaEye.id}
            eyeName={selectedPersonaEye.name}
            onClose={handleClosePersonaModal}
            onSave={handlePersonaSaved}
          />
        )}

        {/* Phase 19.4: Pipeline Template Selector Modal */}
        <PipelineTemplateSelector
          isOpen={isTemplateSelectorOpen}
          onClose={() => setIsTemplateSelectorOpen(false)}
          onSelect={handleLoadTemplate}
        />
      </div>
    </div>
  );
}
