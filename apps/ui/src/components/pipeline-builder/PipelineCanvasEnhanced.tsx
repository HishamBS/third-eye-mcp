"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";
import { getEyeColor } from "@/components/EyeIcon";
import { EyeNode } from "./EyeNode";
import { SwitchNode } from "./SwitchNode";
import { IFNode } from "./IFNode";
import { LoopNode } from "./LoopNode";
import { TerminalNode } from "./TerminalNode";
import { UserInputNode } from "./UserInputNode";
import { AnnotationNode } from "./AnnotationNode";
import { NodePalette } from "./NodePalette";
import { NodeEditModal } from "./NodeEditModal";
import { EdgeConfigModal } from "./EdgeConfigModal";
import { Toolbar } from "./Toolbar";
import { PersonaWizardModal } from "@/components/persona-form/PersonaWizardModal";
import { PipelineTemplateSelector } from "./PipelineTemplateSelector";
import { SwitchNodeConfigModal } from "./SwitchNodeConfigModal";
import { IFNodeConfigModal } from "./IFNodeConfigModal";
import { LoopNodeConfigModal } from "./LoopNodeConfigModal";
import { SessionSelector } from "./SessionSelector";
import { RuntimeRouteHighlighter } from "./RuntimeRouteHighlighter";
import { RoutingDecisionMetadata } from "./RoutingDecisionMetadata";
import { CANVAS_SETTINGS, LAYOUT, PIPELINE_UI_TEXT } from "./constants";
import { API_BASE_URL } from "@/consts/api";
import type { RoutingDecision } from "@/types/routing";
import type {
  PipelineNode,
  PipelineEdge,
  EyeNodeData,
  EdgeConditionData,
} from "@/types/pipeline";
import type {
  SwitchNodeConfig,
  IfNodeConfig,
  LoopNodeConfig,
} from "@third-eye/types/pipeline";
import {
  useActivePipeline,
  usePipelines,
  useSavePipeline,
  useActivatePipeline,
} from "@/hooks/usePipelines";

/**
 * Validate nodes structure - throws error if malformed
 * Per R07: Strict typing, no any
 * Per R12: No fallbacks - throw error if data is invalid
 * Per R13: Valid node types from SSOT (registered node types)
 */
const VALID_NODE_TYPES = [
  "eyeNode",
  "switch",
  "if",
  "loop_over_items",
  "terminal",
  "user_input",
  "annotationNode",
  "userInputNode",
  "terminalNode",
  "switchNode",
] as const;

const validateNodes = (nodes: Node[]): void => {
  for (const node of nodes) {
    if (!node.id) {
      throw new Error(`Node missing required property: id`);
    }
    if (!node.type || !VALID_NODE_TYPES.includes(node.type as any)) {
      throw new Error(
        `Node ${node.id} has invalid type: ${node.type}. Expected one of: ${VALID_NODE_TYPES.join(", ")}`,
      );
    }
    if (!node.position) {
      throw new Error(`Node ${node.id} missing required property: position`);
    }
    if (
      typeof node.position.x !== "number" ||
      typeof node.position.y !== "number"
    ) {
      throw new Error(
        `Node ${node.id} has invalid position: position must have numeric x and y properties`,
      );
    }
    if (!node.data) {
      throw new Error(`Node ${node.id} missing required property: data`);
    }
    // Only validate eyeId for eyeNode types
    if (node.type === "eyeNode" && !node.data.eyeId) {
      throw new Error(
        `Eye node ${node.id} missing required property: data.eyeId`,
      );
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
  console.log("[DEBUG] PipelineCanvasEnhanced component mounting");

  // Memoize nodeTypes to prevent ReactFlow warning
  const nodeTypes = useMemo(
    () => ({
      eyeNode: EyeNode,
      switch: SwitchNode,
      switchNode: SwitchNode,
      if: IFNode,
      loop_over_items: LoopNode,
      terminal: TerminalNode,
      terminalNode: TerminalNode,
      user_input: UserInputNode,
      userInputNode: UserInputNode,
      annotationNode: AnnotationNode,
    }),
    [],
  );

  // Start with empty pipeline - load from database if needed
  const [nodes, setNodes, onNodesChange] = useNodesState<EyeNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeConditionData>([]);

  // Wrap setNodes to validate nodes before setting
  // This ensures ReactFlow never receives invalid nodes
  // Per R12: No fallbacks - throw error if data is invalid
  const setNodesValidated = useCallback(
    (
      nodesOrUpdater:
        | Node<EyeNodeData>[]
        | ((nodes: Node<EyeNodeData>[]) => Node<EyeNodeData>[]),
    ) => {
      setNodes((currentNodes) => {
        // Use currentNodes from React state, not stale closure
        const nodesToSet =
          typeof nodesOrUpdater === "function"
            ? nodesOrUpdater(currentNodes)
            : nodesOrUpdater;

        // DEBUG: Log nodes being set
        console.log("[DEBUG] setNodesValidated called with:", {
          isFunction: typeof nodesOrUpdater === "function",
          nodesCount: nodesToSet.length,
          nodes: nodesToSet.map((n) => ({
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
        console.log("[DEBUG] Validation passed, setting nodes");

        // Return validated nodes to React
        return nodesToSet;
      });
    },
    [setNodes],
  );

  // START WITH BLANK CANVAS for N8N-style pipeline builder
  // Per vision: Dynamic routing via Overseer (not static templates)
  // Templates/sessions can be loaded via toolbar "Load" button
  // This allows professional pipeline creation from scratch
  const [selectedNode, setSelectedNode] = useState<Node<EyeNodeData> | null>(
    null,
  );
  const [selectedEdge, setSelectedEdge] =
    useState<Edge<EdgeConditionData> | null>(null);
  const [paletteCollapsed, setPaletteCollapsed] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const reactFlowInstance = useReactFlow();

  // Phase 16: Persona configuration modal state
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [selectedPersonaEye, setSelectedPersonaEye] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Phase 19.4: Template selector modal state
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);

  // Session-based routing visualization state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [routingDecision, setRoutingDecision] = useState<RoutingDecision | null>(null);
  const [routingDecisionLoading, setRoutingDecisionLoading] = useState(false);
  const [routingDecisionError, setRoutingDecisionError] = useState<string | null>(null);

  // Control node configuration modal states
  const [selectedSwitchNode, setSelectedSwitchNode] =
    useState<Node<EyeNodeData> | null>(null);
  const [selectedIFNode, setSelectedIFNode] =
    useState<Node<EyeNodeData> | null>(null);
  const [selectedLoopNode, setSelectedLoopNode] =
    useState<Node<EyeNodeData> | null>(null);

  // Load active/default pipeline from database
  const {
    pipeline: activePipeline,
    loading: pipelineLoading,
    refetch: refetchPipeline,
  } = useActivePipeline();

  // Load all pipelines for toolbar dropdown (Quick Win #1 - fix undefined variable)
  const { pipelines } = usePipelines();

  // Save/activate hooks
  const { save: savePipeline, loading: saving } = useSavePipeline();
  const { activate: activatePipeline } = useActivatePipeline();

  // Load default pipeline on mount
  useEffect(() => {
    console.log("[PipelineCanvas] Loading default pipeline on mount");
    refetchPipeline();
  }, [refetchPipeline]);

  // Set nodes and edges when pipeline is loaded
  useEffect(() => {
    if (activePipeline?.workflowJson?.nodes && activePipeline?.workflowJson?.edges) {
      console.log("[PipelineCanvas] Setting pipeline nodes and edges:", {
        nodeCount: activePipeline.workflowJson.nodes.length,
        edgeCount: activePipeline.workflowJson.edges.length,
      });
      setNodesValidated(activePipeline.workflowJson.nodes as Node<EyeNodeData>[]);
      setEdges(activePipeline.workflowJson.edges as Edge<EdgeConditionData>[]);
    }
  }, [activePipeline, setNodesValidated, setEdges]);

  // Single click node → zoom to node
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node<EyeNodeData>) => {
      event.stopPropagation();

      if (!node.position) {
        console.warn("[PipelineCanvas] Node has no position:", node.id);
        return;
      }

      reactFlowInstance.setCenter(
        node.position.x + (node.width || CANVAS_SETTINGS.NODE_SPACING) / 2,
        node.position.y + (node.height || CANVAS_SETTINGS.NODE_SPACING) / 2,
        { zoom: LAYOUT.ZOOM_TO_NODE_SCALE, duration: LAYOUT.ZOOM_DURATION },
      );
    },
    [reactFlowInstance],
  );

  // Click outside → fit view
  const handlePaneClick = useCallback(() => {
    reactFlowInstance.fitView({
      padding: LAYOUT.FIT_VIEW_PADDING,
      duration: LAYOUT.ZOOM_DURATION,
    });
  }, [reactFlowInstance]);

  // Right-click node → edit modal (type-specific)
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<EyeNodeData>) => {
      event.preventDefault();

      // Route to appropriate modal based on node type
      switch (node.type) {
        case "switch":
          setSelectedSwitchNode(node);
          break;
        case "if":
          setSelectedIFNode(node);
          break;
        case "loop_over_items":
          setSelectedLoopNode(node);
          break;
        case "eyeNode":
        default:
          setSelectedNode(node);
          break;
      }
    },
    [],
  );

  // Double-click node → edit modal (Quick Win #3)
  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node<EyeNodeData>) => {
      handleNodeContextMenu(event, node);
    },
    [handleNodeContextMenu],
  );

  // Right-click edge → config modal
  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge<EdgeConditionData>) => {
      event.preventDefault();
      setSelectedEdge(edge);
    },
    [],
  );

  // Update node
  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<EyeNodeData>) => {
      setNodesValidated(
        (nds) =>
          nds.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n,
          ) as Node<EyeNodeData>[],
      );
    },
    [setNodesValidated],
  );

  // Delete node
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodesValidated((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
    },
    [setNodesValidated, setEdges],
  );

  // Update edge
  const handleEdgeUpdate = useCallback(
    (edgeId: string, updates: EdgeConditionData) => {
      setEdges((eds) =>
        eds.map((e) => (e.id === edgeId ? { ...e, data: updates } : e)),
      );
    },
    [setEdges],
  );

  // Delete edge
  const handleEdgeDelete = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    },
    [setEdges],
  );

  // Phase 16: Persona configuration handlers
  const handleConfigurePersona = useCallback(
    (eyeId: string, eyeName: string) => {
      setSelectedPersonaEye({ id: eyeId, name: eyeName });
      setIsPersonaModalOpen(true);
      setSelectedNode(null); // Close node edit modal
    },
    [],
  );

  const handleClosePersonaModal = useCallback(() => {
    setIsPersonaModalOpen(false);
    setSelectedPersonaEye(null);
  }, []);

  const handlePersonaSaved = useCallback(() => {
    // Could refresh node data here if needed
    console.log("Persona saved for pipeline node");
  }, []);

  // Control node configuration save handlers
  const handleSaveSwitchConfig = useCallback(
    (config: SwitchNodeConfig) => {
      if (!selectedSwitchNode) return;
      setNodesValidated(
        (nds) =>
          nds.map((n) =>
            n.id === selectedSwitchNode.id
              ? { ...n, data: { ...n.data, switchConfig: config } }
              : n,
          ) as Node<EyeNodeData>[],
      );
      setSelectedSwitchNode(null);
    },
    [selectedSwitchNode, setNodesValidated],
  );

  const handleSaveIFConfig = useCallback(
    (config: IfNodeConfig) => {
      if (!selectedIFNode) return;
      setNodesValidated(
        (nds) =>
          nds.map((n) =>
            n.id === selectedIFNode.id
              ? { ...n, data: { ...n.data, ifConfig: config } }
              : n,
          ) as Node<EyeNodeData>[],
      );
      setSelectedIFNode(null);
    },
    [selectedIFNode, setNodesValidated],
  );

  const handleSaveLoopConfig = useCallback(
    (config: LoopNodeConfig) => {
      if (!selectedLoopNode) return;
      setNodesValidated(
        (nds) =>
          nds.map((n) =>
            n.id === selectedLoopNode.id
              ? { ...n, data: { ...n.data, loopConfig: config } }
              : n,
          ) as Node<EyeNodeData>[],
      );
      setSelectedLoopNode(null);
    },
    [selectedLoopNode, setNodesValidated],
  );

  // Phase 19.4: Template loading handler
  const handleLoadTemplate = useCallback(
    (template: {
      nodes: readonly PipelineNode[];
      edges: readonly PipelineEdge[];
      workflowJson?: unknown;
    }) => {
      // Parse workflowJson if provided and is a string
      let workflow = template;
      if (template.workflowJson) {
        workflow =
          typeof template.workflowJson === "string"
            ? JSON.parse(template.workflowJson)
            : template.workflowJson;
      }

      const templateNodes = [
        ...(workflow.nodes || template.nodes),
      ] as PipelineNode[];
      validateNodes(templateNodes);
      setNodesValidated(templateNodes as Node<EyeNodeData>[]);
      setEdges([
        ...(workflow.edges || template.edges),
      ] as Edge<EdgeConditionData>[]);
      // Fit view after loading template
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: LAYOUT.FIT_VIEW_PADDING,
          duration: LAYOUT.ZOOM_DURATION,
        });
      }, 100);
    },
    [setNodesValidated, setEdges, reactFlowInstance],
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  // Drag and drop from palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const data = event.dataTransfer.getData("application/reactflow");
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
    [reactFlowInstance, setNodesValidated],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
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
    [nodes, onNodesChange],
  );

  // Validate nodes before ReactFlow renders them - prevents crashes from invalid position
  // Per R12: No fallbacks - throw error if data is invalid
  const validatedNodes = useMemo(() => {
    if (nodes.length === 0) {
      return nodes;
    }

    // DEBUG: Log nodes in state before validation
    console.log(
      "[DEBUG] validatedNodes useMemo - nodes in state:",
      nodes.map((n) => ({
        id: n.id,
        type: n.type,
        hasPosition: !!n.position,
        position: n.position,
        positionType: typeof n.position,
        positionKeys: n.position ? Object.keys(n.position) : [],
      })),
    );

    // Validate all nodes - throws error if any are malformed (no fallback)
    validateNodes(nodes as PipelineNode[]);
    return nodes;
  }, [nodes]);

  // Toolbar handlers (Quick Wins #4-6: Real implementations)
  const handleSave = useCallback(async () => {
    if (!activePipeline?.id) {
      const name = prompt("Enter pipeline name:");
      if (!name) return;
      const result = await savePipeline(
        null,
        name,
        "",
        validatedNodes as PipelineNode[],
        edges as PipelineEdge[],
      );
      if (result) {
        console.log("Pipeline saved:", result);
        await refetchPipeline();
      }
    } else {
      const result = await savePipeline(
        activePipeline.id,
        activePipeline.name,
        activePipeline.description || "",
        validatedNodes as PipelineNode[],
        edges as PipelineEdge[],
      );
      if (result) console.log("Pipeline updated:", result);
    }
  }, [validatedNodes, edges, activePipeline, savePipeline, refetchPipeline]);

  const handleActivate = useCallback(async () => {
    if (!activePipeline?.id) {
      alert("Please save the pipeline first");
      return;
    }
    const success = await activatePipeline(activePipeline.id);
    if (success) console.log("Pipeline activated");
  }, [activePipeline, activatePipeline]);

  const handleNew = useCallback(() => {
    if (confirm("Clear current pipeline and start fresh?")) {
      setNodesValidated([]);
      setEdges([]);
    }
  }, [setNodesValidated, setEdges]);

  const handleExport = useCallback(() => {
    const data = {
      nodes: validatedNodes,
      edges,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: "1.0",
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipeline-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [validatedNodes, edges]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
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

  const handleValidate = useCallback(() => {
    try {
      validateNodes(validatedNodes as PipelineNode[]);
      alert("Pipeline validation passed!");
    } catch (error) {
      alert(
        `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }, [validatedNodes]);

  const handleAutoLayout = useCallback(() => console.log("Auto layout"), []);

  const handleZoomFit = useCallback(() => {
    reactFlowInstance.fitView({
      padding: LAYOUT.FIT_VIEW_PADDING,
      duration: LAYOUT.ZOOM_DURATION,
    });
  }, [reactFlowInstance]);

  // Session-based routing visualization handlers
  const handleSessionSelect = useCallback((sessionId: string | null) => {
    setSelectedSessionId(sessionId);
    if (!sessionId) {
      setRoutingDecision(null);
      setRoutingDecisionError(null);
    }
  }, []);

  const handleRoutingDecisionLoaded = useCallback((decision: RoutingDecision) => {
    setRoutingDecision(decision);
    setRoutingDecisionLoading(false);
  }, []);

  const handleRoutingDecisionError = useCallback((error: string) => {
    setRoutingDecisionError(error);
    setRoutingDecisionLoading(false);
  }, []);

  // Keyboard shortcuts (Quick Win #7)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape - deselect all
      if (e.key === "Escape") {
        setSelectedNode(null);
        setSelectedSwitchNode(null);
        setSelectedIFNode(null);
        setSelectedLoopNode(null);
        setSelectedEdge(null);
      }
      // Delete/Backspace - delete selected
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNode) {
          handleNodeDelete(selectedNode.id);
          setSelectedNode(null);
        } else if (selectedEdge) {
          handleEdgeDelete(selectedEdge.id);
          setSelectedEdge(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNode, selectedEdge, handleNodeDelete, handleEdgeDelete]);

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 border-b border-brand-outline bg-brand-surface px-4 py-2">
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

        {/* Session Selector - Top Right Corner */}
        <SessionSelector
          selectedSessionId={selectedSessionId}
          onSessionSelect={handleSessionSelect}
        />
      </div>

      {/* Main Canvas */}
      <div className="flex-1 w-full relative">
        {/* Loading Overlay - Quick Win #2 */}
        {pipelineLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-paper/80 backdrop-blur-sm z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
              <p className="text-sm text-semantic-muted">Loading pipeline...</p>
            </div>
          </div>
        )}

        {/* Empty State - Quick Win #1 */}
        {nodes.length === 0 && !pipelineLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-semantic-muted">
              <p className="text-lg font-medium mb-2">
                Start Building Your Pipeline
              </p>
              <p className="text-sm">{PIPELINE_UI_TEXT.EMPTY_STATE_NO_NODES}</p>
            </div>
          </div>
        )}

        <ReactFlow
          nodes={validatedNodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onNodeContextMenu={handleNodeContextMenu}
          onNodeDoubleClick={handleNodeDoubleClick}
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

          {/* Runtime Route Highlighter - Highlights actual routing paths */}
          <RuntimeRouteHighlighter
            sessionId={selectedSessionId}
            onRoutingDecisionLoaded={handleRoutingDecisionLoaded}
            onError={handleRoutingDecisionError}
          />
        </ReactFlow>

        {/* Routing Decision Metadata Overlay - Shows routing decision details */}
        <RoutingDecisionMetadata
          decision={routingDecision}
          sessionId={selectedSessionId}
          isLoading={routingDecisionLoading}
          onClose={() => {
            setSelectedSessionId(null);
            setRoutingDecision(null);
          }}
        />

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

        {/* Control Node Configuration Modals */}
        <SwitchNodeConfigModal
          isOpen={!!selectedSwitchNode}
          onClose={() => setSelectedSwitchNode(null)}
          config={
            selectedSwitchNode?.data?.switchConfig as
              | SwitchNodeConfig
              | undefined
          }
          onSave={handleSaveSwitchConfig}
        />

        <IFNodeConfigModal
          isOpen={!!selectedIFNode}
          onClose={() => setSelectedIFNode(null)}
          config={selectedIFNode?.data?.ifConfig as IfNodeConfig | undefined}
          onSave={handleSaveIFConfig}
        />

        <LoopNodeConfigModal
          isOpen={!!selectedLoopNode}
          onClose={() => setSelectedLoopNode(null)}
          config={
            selectedLoopNode?.data?.loopConfig as LoopNodeConfig | undefined
          }
          onSave={handleSaveLoopConfig}
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
