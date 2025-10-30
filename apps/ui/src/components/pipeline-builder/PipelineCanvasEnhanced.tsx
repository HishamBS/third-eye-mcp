'use client';

import { useCallback, useState, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getEyeColor } from '@/components/EyeIcon';
import { EyeNode } from './EyeNode';
import { EyePalette } from './EyePalette';
import { NodeEditModal } from './NodeEditModal';
import { EdgeConfigModal } from './EdgeConfigModal';
import { Toolbar } from './Toolbar';
import { PersonaWizardModal } from '@/components/persona-form/PersonaWizardModal';
import { CANVAS_SETTINGS, LAYOUT, SYSTEM_DEFAULT_PIPELINE } from './constants';
import type { PipelineNode, PipelineEdge, EyeNodeData, EdgeConditionData } from '@/types/pipeline';

// Register custom node types
const nodeTypes = { eyeNode: EyeNode };

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
  const [nodes, setNodes, onNodesChange] = useNodesState<PipelineNode>(
    SYSTEM_DEFAULT_PIPELINE.nodes as PipelineNode[]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<PipelineEdge>(
    SYSTEM_DEFAULT_PIPELINE.edges as PipelineEdge[]
  );
  const [selectedNode, setSelectedNode] = useState<PipelineNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<PipelineEdge | null>(null);
  const [paletteCollapsed, setPaletteCollapsed] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const reactFlowInstance = useReactFlow();

  // Phase 16: Persona configuration modal state
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [selectedPersonaEye, setSelectedPersonaEye] = useState<{ id: string; name: string } | null>(null);

  // Placeholder pipeline data (will be replaced by service hooks in S8)
  const activePipeline = useMemo(() => null, []);
  const pipelines = useMemo(() => [], []);

  // Single click node → zoom to node
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: PipelineNode) => {
      event.stopPropagation();
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
    (event: React.MouseEvent, node: PipelineNode) => {
      event.preventDefault();
      setSelectedNode(node);
    },
    []
  );

  // Right-click edge → config modal
  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: PipelineEdge) => {
      event.preventDefault();
      setSelectedEdge(edge);
    },
    []
  );

  // Update node
  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<EyeNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n))
      );
    },
    [setNodes]
  );

  // Delete node
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
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

      const newNode: PipelineNode = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: nodeData,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Get node color for minimap
  const getNodeColor = useCallback((node: PipelineNode): string => {
    return getEyeColor(node.data.eyeId);
  }, []);

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
    <div className="w-full h-[calc(100vh-112px)] relative">
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
        showMinimap={showMinimap}
        showGrid={showGrid}
      />

      {/* Main Canvas */}
      <div
        className="w-full h-full"
        style={{ paddingTop: LAYOUT.TOOLBAR_HEIGHT }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
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

        {/* Eye Palette */}
        <EyePalette
          collapsed={paletteCollapsed}
          onToggleCollapse={() => setPaletteCollapsed(!paletteCollapsed)}
        />

        {/* Node Edit Modal */}
        <NodeEditModal
          node={selectedNode}
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
      </div>
    </div>
  );
}
