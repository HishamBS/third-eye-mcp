'use client';

import { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getEyeColor } from '@/components/EyeIcon';
import { EyeNode, type EyeNodeData } from './EyeNode';
import {
  CANVAS_SETTINGS,
  PIPELINE_UI_TEXT,
} from './constants';

// Register custom node types
const nodeTypes: NodeTypes = {
  eyeNode: EyeNode,
};

/**
 * Initial sample nodes to demonstrate the pipeline
 */
const initialNodes: Node<EyeNodeData>[] = [
  {
    id: '1',
    type: 'eyeNode',
    position: { x: 50, y: 200 },
    data: {
      eyeId: 'overseer',
      capabilities: ['auto_routing', 'orchestration'],
    },
  },
  {
    id: '2',
    type: 'eyeNode',
    position: { x: 300, y: 100 },
    data: {
      eyeId: 'sharingan',
      capabilities: ['clarification', 'ambiguity_detection'],
    },
  },
  {
    id: '3',
    type: 'eyeNode',
    position: { x: 300, y: 300 },
    data: {
      eyeId: 'kyuubi',
      capabilities: ['briefing', 'guidance'],
    },
  },
];

/**
 * Initial edges (connections)
 */
const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e1-3',
    source: '1',
    target: '3',
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];

/**
 * Pipeline Canvas Component
 *
 * Features (Phase 9):
 * - React Flow integration
 * - Custom Eye nodes
 * - Pan, zoom, minimap, grid
 * - Initial sample pipeline
 *
 * Coming in Phase 10:
 * - Drag-and-drop from palette
 * - Connection validation
 * - Context menus
 * - Auto-layout
 * - Save/load
 */
export function PipelineCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Get node color for minimap
  const getNodeColor = useCallback(
    (node: Node<EyeNodeData>): string => {
      return getEyeColor(node.data.eyeId);
    },
    []
  );

  return (
    <div className="w-full h-[calc(100vh-120px)] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        minZoom={CANVAS_SETTINGS.MIN_ZOOM}
        maxZoom={CANVAS_SETTINGS.MAX_ZOOM}
        defaultViewport={{
          x: 0,
          y: 0,
          zoom: CANVAS_SETTINGS.DEFAULT_ZOOM,
        }}
        className="bg-brand-paper"
      >
        {/* Grid Background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={CANVAS_SETTINGS.GRID_SIZE}
          size={1}
          className="opacity-30"
        />

        {/* Zoom/Pan Controls */}
        <Controls className="bg-brand-paperElev border-brand-outline" />

        {/* Minimap */}
        <MiniMap
          nodeColor={getNodeColor}
          nodeBorderRadius={8}
          className="bg-brand-paperElev border border-brand-outline"
        />
      </ReactFlow>

      {/* Toolbar (placeholder for Phase 10) */}
      <div className="absolute bottom-4 left-4 flex gap-2 p-2 bg-brand-paperElev border border-brand-outline rounded-lg shadow-lg">
        <button
          className="px-4 py-2 bg-green-600 text-brand-foreground rounded-md font-semibold text-sm cursor-pointer hover:bg-green-700 transition-colors"
          onClick={() => console.log('Run pipeline (coming in Phase 10)')}
        >
          {PIPELINE_UI_TEXT.TOOLBAR_RUN}
        </button>
        <button
          className="px-4 py-2 bg-brand-primary text-brand-foreground rounded-md font-semibold text-sm cursor-pointer hover:bg-brand-primary/90 transition-colors"
          onClick={() => console.log('Auto-layout (coming in Phase 10)')}
        >
          {PIPELINE_UI_TEXT.TOOLBAR_AUTO_LAYOUT}
        </button>
        <button
          className="px-4 py-2 bg-brand-accent text-brand-foreground rounded-md font-semibold text-sm cursor-pointer hover:bg-brand-accent/90 transition-colors"
          onClick={() => console.log('Save pipeline (coming in Phase 10)')}
        >
          {PIPELINE_UI_TEXT.TOOLBAR_SAVE}
        </button>
      </div>
    </div>
  );
}
