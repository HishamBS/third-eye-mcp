'use client';

import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  NodeChange,
  EdgeChange,
  Connection,
  MarkerType,
  NodeTypes,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Trash2, Plus } from 'lucide-react';

// Custom Node Component
function EyeNode({ data }: { data: { label: string; eye?: string; type?: string } }) {
  const getNodeColor = () => {
    if (data.type === 'terminal') return 'bg-slate-600 border-slate-400';
    if (data.type === 'condition') return 'bg-yellow-600 border-yellow-400';
    if (data.type === 'user_input') return 'bg-purple-600 border-purple-400';
    if (data.eye) return 'bg-blue-600 border-blue-400';
    return 'bg-gray-600 border-gray-400';
  };

  const getIcon = () => {
    if (data.type === 'terminal') return '⏹️';
    if (data.type === 'condition') return '🔀';
    if (data.type === 'user_input') return '💬';
    if (data.eye === 'sharingan') return '👁️';
    if (data.eye === 'rinnegan') return '🔮';
    if (data.eye === 'byakugan') return '👀';
    if (data.eye === 'jogan') return '⚡';
    if (data.eye === 'tenseigan') return '✨';
    if (data.eye === 'mangekyo') return '🌀';
    return '📦';
  };

  return (
    <div className={`rounded-xl border-2 px-4 py-3 shadow-lg ${getNodeColor()}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{getIcon()}</span>
        <div className="text-white">
          <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
            {data.eye || data.type || 'Step'}
          </div>
          <div className="text-sm font-medium">{data.label}</div>
        </div>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  eyeNode: EyeNode,
};

interface PipelineFlowBuilderProps {
  workflowJson: {
    steps: Array<{
      id: string;
      eye?: string;
      type?: string;
      next?: string;
      condition?: string;
      true?: string;
      false?: string;
      prompt?: string;
    }>;
  };
  onChange?: (workflow: any) => void;
  readOnly?: boolean;
}

export function PipelineFlowBuilder({ workflowJson, onChange, readOnly = false }: PipelineFlowBuilderProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [showEyeMenu, setShowEyeMenu] = useState(false);

  const availableEyes = [
    'sharingan',
    'rinnegan',
    'byakugan',
    'jogan',
    'tenseigan',
    'mangekyo',
    'overseer',
    'helper',
  ];

  // Convert workflow JSON to React Flow nodes and edges
  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const stepMap = new Map(workflowJson.steps.map((step) => [step.id, step]));

    workflowJson.steps.forEach((step, index) => {
      // Create node
      newNodes.push({
        id: step.id,
        type: 'eyeNode',
        position: { x: 250, y: index * 120 + 50 },
        data: {
          label: step.id,
          eye: step.eye,
          type: step.type,
        },
      });

      // Create edges
      if (step.next) {
        newEdges.push({
          id: `${step.id}-${step.next}`,
          source: step.id,
          target: step.next,
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          style: { stroke: '#64b5f6', strokeWidth: 2 },
        });
      }

      // Handle conditional edges
      if (step.type === 'condition' && step.true && step.false) {
        newEdges.push({
          id: `${step.id}-true`,
          source: step.id,
          target: step.true,
          label: 'true',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          style: { stroke: '#66bb6a', strokeWidth: 2 },
        });
        newEdges.push({
          id: `${step.id}-false`,
          source: step.id,
          target: step.false,
          label: 'false',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          style: { stroke: '#ef5350', strokeWidth: 2 },
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [workflowJson]);

  const addNode = useCallback(
    (type: 'eye' | 'condition' | 'user_input' | 'terminal', eyeName?: string) => {
      if (readOnly) return;

      const newId = `step_${Date.now()}`;
      const maxY = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.y)) : 0;

      const newNode: Node = {
        id: newId,
        type: 'eyeNode',
        position: { x: 250, y: maxY + 120 },
        data: {
          label: newId,
          ...(type === 'eye' && eyeName ? { eye: eyeName } : {}),
          ...(type !== 'eye' ? { type } : {}),
        },
      };

      const newNodes = [...nodes, newNode];
      setNodes(newNodes);

      // Update workflow JSON
      if (onChange) {
        const newStep: any = {
          id: newId,
          ...(type === 'eye' && eyeName ? { eye: eyeName } : {}),
          ...(type !== 'eye' ? { type } : {}),
        };

        onChange({ steps: [...workflowJson.steps, newStep] });
      }
    },
    [nodes, onChange, workflowJson, readOnly]
  );

  const deleteSelectedNodes = useCallback(() => {
    if (readOnly || selectedNodes.length === 0) return;

    const selectedIds = selectedNodes.map(n => n.id);
    const newNodes = nodes.filter(n => !selectedIds.includes(n.id));
    const newEdges = edges.filter(e => !selectedIds.includes(e.source) && !selectedIds.includes(e.target));

    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNodes([]);

    // Update workflow JSON
    if (onChange) {
      const newSteps = workflowJson.steps.filter(step => !selectedIds.includes(step.id));
      onChange({ steps: newSteps });
    }
  }, [nodes, edges, selectedNodes, onChange, workflowJson, readOnly]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (readOnly) return;
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [readOnly]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      setSelectedNodes(selectedNodes);
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (readOnly) return;
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [readOnly]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
            style: { stroke: '#64b5f6', strokeWidth: 2 },
          },
          eds
        )
      );

      // Update workflow JSON if onChange provided
      if (onChange && connection.source && connection.target) {
        const updatedSteps = workflowJson.steps.map((step) => {
          if (step.id === connection.source) {
            return { ...step, next: connection.target as string };
          }
          return step;
        });
        onChange({ steps: updatedSteps });
      }
    },
    [readOnly, onChange, workflowJson]
  );

  return (
    <div className="h-[600px] w-full rounded-xl border border-brand-outline/50 bg-brand-ink/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
      >
        <Background color="#374151" gap={16} />
        <Controls />

        {/* Toolbar Panel */}
        {!readOnly && (
          <Panel position="top-left" className="flex flex-col gap-2 p-2 bg-brand-paper/90 rounded-xl border border-brand-outline/40">
            {/* Add Eye Button */}
            <div className="relative">
              <button
                onClick={() => setShowEyeMenu(!showEyeMenu)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Eye
              </button>
              {showEyeMenu && (
                <div className="absolute left-0 top-full mt-1 z-10 w-48 rounded-lg border border-brand-outline/40 bg-brand-paper shadow-xl">
                  {availableEyes.map(eye => (
                    <button
                      key={eye}
                      onClick={() => {
                        addNode('eye', eye);
                        setShowEyeMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white transition hover:bg-brand-paperElev capitalize"
                    >
                      {eye}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add Condition Button */}
            <button
              onClick={() => addNode('condition')}
              className="flex items-center gap-2 rounded-lg bg-yellow-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-yellow-700"
            >
              <Plus className="h-4 w-4" />
              Condition
            </button>

            {/* Add User Input Button */}
            <button
              onClick={() => addNode('user_input')}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              User Input
            </button>

            {/* Add Terminal Button */}
            <button
              onClick={() => addNode('terminal')}
              className="flex items-center gap-2 rounded-lg bg-slate-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" />
              Terminal
            </button>

            {/* Delete Selected Button */}
            {selectedNodes.length > 0 && (
              <button
                onClick={deleteSelectedNodes}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedNodes.length})
              </button>
            )}
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
