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
import { Trash2, Plus, Settings, Square, GitBranch, RotateCw, MessageSquare, Eye } from 'lucide-react';
import { SwitchNodeConfigModal } from './SwitchNodeConfigModal';
import { IFNodeConfigModal } from './IFNodeConfigModal';
import { LoopNodeConfigModal } from './LoopNodeConfigModal';
import { NODE_TYPES } from './pipeline/constants';
import type { WorkflowJson } from './pipeline/types';

// Custom Node Component
function EyeNode({ data }: { data: { label: string; eye?: string; type?: string } }) {
  const getNodeColor = () => {
    if (data.type === NODE_TYPES.TERMINAL) return 'bg-slate-600 border-slate-400';
    if (data.type === NODE_TYPES.CONDITION) return 'bg-yellow-600 border-yellow-400';
    if (data.type === NODE_TYPES.SWITCH) return 'bg-orange-600 border-orange-400';
    if (data.type === NODE_TYPES.LOOP) return 'bg-cyan-600 border-cyan-400';
    if (data.type === NODE_TYPES.USER_INPUT) return 'bg-purple-600 border-purple-400';
    if (data.eye) return 'bg-blue-600 border-blue-400';
    return 'bg-gray-600 border-gray-400';
  };

  const getIcon = () => {
    const iconClass = "h-4 w-4";
    if (data.type === NODE_TYPES.TERMINAL) return <Square className={iconClass} />;
    if (data.type === NODE_TYPES.CONDITION) return <GitBranch className={iconClass} />;
    if (data.type === NODE_TYPES.SWITCH) return <GitBranch className={iconClass} />;
    if (data.type === NODE_TYPES.LOOP) return <RotateCw className={iconClass} />;
    if (data.type === NODE_TYPES.USER_INPUT) return <MessageSquare className={iconClass} />;
    if (data.eye) return <Eye className={iconClass} />;
    return <Square className={iconClass} />;
  };

  return (
    <div className={`rounded-xl border-2 px-4 py-3 shadow-lg ${getNodeColor()}`}>
      <div className="flex items-center gap-2">
        <span className="text-white">{getIcon()}</span>
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
  workflowJson: WorkflowJson;
  onChange?: (workflow: WorkflowJson) => void;
  readOnly?: boolean;
}

export function PipelineFlowBuilder({ workflowJson, onChange, readOnly = false }: PipelineFlowBuilderProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [showEyeMenu, setShowEyeMenu] = useState(false);
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [ifModalOpen, setIfModalOpen] = useState(false);
  const [loopModalOpen, setLoopModalOpen] = useState(false);
  const [availableEyes, setAvailableEyes] = useState<string[]>([]);
  const selectedNode = selectedNodes[0] ?? null;
  const selectedStep = selectedNode
    ? workflowJson.steps.find((step) => step.id === selectedNode.id) ?? null
    : null;
  const selectedStepType = selectedStep?.type ?? NODE_TYPES.EYE;

  // Fetch available eyes from API
  useEffect(() => {
    const fetchEyes = async () => {
      try {
        const response = await fetch('/api/eyes');
        if (response.ok) {
          const result = await response.json();
          const eyeNames = result.data?.map((eye: { name: string }) => eye.name) || [];
          setAvailableEyes(eyeNames);
        }
      } catch (error) {
        console.error('Failed to fetch eyes:', error);
        // Set empty array on error - user will need to create eyes first
        setAvailableEyes([]);
      }
    };
    fetchEyes();
  }, []);

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
      if (step.type === NODE_TYPES.CONDITION && step.true && step.false) {
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
    (type: typeof NODE_TYPES[keyof typeof NODE_TYPES], eyeName?: string) => {
      if (readOnly) return;

      const newId = `step_${Date.now()}`;
      const maxY = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.y)) : 0;

      const newNode: Node = {
        id: newId,
        type: 'eyeNode',
        position: { x: 250, y: maxY + 120 },
        data: {
          label: newId,
          ...(type === NODE_TYPES.EYE && eyeName ? { eye: eyeName } : {}),
          ...(type !== NODE_TYPES.EYE ? { type } : {}),
        },
      };

      const newNodes = [...nodes, newNode];
      setNodes(newNodes);

      // Update workflow JSON
      if (onChange) {
        const newStep = {
          id: newId,
          ...(type === NODE_TYPES.EYE && eyeName ? { eye: eyeName } : {}),
          ...(type !== NODE_TYPES.EYE ? { type } : {}),
        };

        onChange({ steps: [...workflowJson.steps, newStep] });
      }
    },
    [nodes, onChange, workflowJson, readOnly]
  );

  const updateWorkflowStep = useCallback(
    (stepId: string, updates: Record<string, unknown>) => {
      if (!onChange) return;

      const updatedSteps = workflowJson.steps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      );

      onChange({ steps: updatedSteps });

      if ('eye' in updates || 'type' in updates) {
        setNodes((prev) =>
          prev.map((node) =>
            node.id === stepId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    ...(updates.eye !== undefined ? { eye: updates.eye as string | undefined } : {}),
                    ...(updates.type !== undefined ? { type: updates.type as string | undefined } : {}),
                  },
                }
              : node
          )
        );
      }
    },
    [onChange, workflowJson.steps]
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
    <div className="rounded-xl border border-brand-outline/50 bg-brand-ink/50">
      <div className="h-[520px] w-full">
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
                          addNode(NODE_TYPES.EYE, eye);
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

              {/* Add IF/Condition Button */}
              <button
                onClick={() => addNode(NODE_TYPES.CONDITION)}
                className="flex items-center gap-2 rounded-lg bg-yellow-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-yellow-700"
              >
                <Plus className="h-4 w-4" />
                IF
              </button>

              {/* Add Switch Button */}
              <button
                onClick={() => addNode(NODE_TYPES.SWITCH)}
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
              >
                <Plus className="h-4 w-4" />
                Switch
              </button>

              {/* Add Loop Button */}
              <button
                onClick={() => addNode(NODE_TYPES.LOOP)}
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
              >
                <Plus className="h-4 w-4" />
                Loop
              </button>

              {/* Add User Input Button */}
              <button
                onClick={() => addNode(NODE_TYPES.USER_INPUT)}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" />
                User Input
              </button>

              {/* Add Terminal Button */}
              <button
                onClick={() => addNode(NODE_TYPES.TERMINAL)}
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

      {!readOnly && selectedStep && (
        <div className="mt-4 rounded-xl border border-brand-outline/40 bg-brand-paper/80 p-4 text-sm">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-100">Step Configuration</h4>
            {/* Configure Button for nodes with modals */}
            {(selectedStepType === NODE_TYPES.CONDITION || selectedStepType === NODE_TYPES.SWITCH || selectedStepType === NODE_TYPES.LOOP) && (
              <button
                onClick={() => {
                  if (selectedStepType === NODE_TYPES.CONDITION) setIfModalOpen(true);
                  else if (selectedStepType === NODE_TYPES.SWITCH) setSwitchModalOpen(true);
                  else if (selectedStepType === NODE_TYPES.LOOP) setLoopModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-accent/90"
              >
                <Settings className="h-4 w-4" />
                Configure
              </button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Step ID</label>
              <input
                value={selectedStep.id}
                disabled
                className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Type</label>
              <select
                value={selectedStepType}
                onChange={(e) => {
                  const value = e.target.value as typeof NODE_TYPES[keyof typeof NODE_TYPES];
                  const updates: Record<string, unknown> = {};
                  if (value === NODE_TYPES.EYE) {
                    updates.type = undefined;
                    updates['true'] = undefined;
                    updates['false'] = undefined;
                  } else {
                    updates.type = value;
                    if (value !== NODE_TYPES.CONDITION) {
                      updates['true'] = undefined;
                      updates['false'] = undefined;
                    }
                  }
                  updateWorkflowStep(selectedStep.id, updates);
                }}
                className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-slate-200 focus:border-brand-accent focus:outline-none"
              >
                <option value={NODE_TYPES.EYE}>Eye</option>
                <option value={NODE_TYPES.CONDITION}>IF/Condition</option>
                <option value={NODE_TYPES.SWITCH}>Switch</option>
                <option value={NODE_TYPES.LOOP}>Loop</option>
                <option value={NODE_TYPES.USER_INPUT}>User Input</option>
                <option value={NODE_TYPES.TERMINAL}>Terminal</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Eye</label>
              <input
                value={selectedStep.eye ?? ''}
                onChange={(e) =>
                  updateWorkflowStep(selectedStep.id, { eye: e.target.value.trim() || undefined })
                }
                placeholder="e.g., sharingan"
                className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-slate-200 focus:border-brand-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Next Step</label>
              <input
                value={selectedStep.next ?? ''}
                onChange={(e) =>
                  updateWorkflowStep(selectedStep.id, { next: e.target.value.trim() || undefined })
                }
                placeholder="step identifier"
                className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-slate-200 focus:border-brand-accent focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-400">Prompt / Notes</label>
              <textarea
                value={selectedStep.prompt ?? ''}
                onChange={(e) =>
                  updateWorkflowStep(selectedStep.id, { prompt: e.target.value || undefined })
                }
                rows={3}
                className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-slate-200 focus:border-brand-accent focus:outline-none"
              />
            </div>
            {selectedStepType === NODE_TYPES.CONDITION && (
              <>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-400">Condition</label>
                  <textarea
                    value={selectedStep.condition ?? ''}
                    onChange={(e) =>
                      updateWorkflowStep(selectedStep.id, { condition: e.target.value || undefined })
                    }
                    rows={2}
                    className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-slate-200 focus:border-brand-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">True Branch</label>
                  <input
                    value={selectedStep.true ?? ''}
                    onChange={(e) =>
                      updateWorkflowStep(selectedStep.id, { ['true']: e.target.value.trim() || undefined })
                    }
                    placeholder="next step when true"
                    className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-slate-200 focus:border-brand-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">False Branch</label>
                  <input
                    value={selectedStep.false ?? ''}
                    onChange={(e) =>
                      updateWorkflowStep(selectedStep.id, { ['false']: e.target.value.trim() || undefined })
                    }
                    placeholder="next step when false"
                    className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-slate-200 focus:border-brand-accent focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Configuration Modals */}
      {!readOnly && selectedStep && (
        <>
          {/* Switch Node Config Modal */}
          <SwitchNodeConfigModal
            isOpen={switchModalOpen}
            onClose={() => setSwitchModalOpen(false)}
            stepId={selectedStep.id}
            initialConfig={selectedStep.switchConfig as any}
            onSave={(config) => {
              updateWorkflowStep(selectedStep.id, { switchConfig: config });
              setSwitchModalOpen(false);
            }}
          />

          {/* IF Node Config Modal */}
          <IFNodeConfigModal
            isOpen={ifModalOpen}
            onClose={() => setIfModalOpen(false)}
            stepId={selectedStep.id}
            initialConfig={{
              condition: selectedStep.condition || '',
              trueLabel: selectedStep.trueLabel as string,
              falseLabel: selectedStep.falseLabel as string,
            }}
            onSave={(config) => {
              updateWorkflowStep(selectedStep.id, {
                condition: config.condition,
                trueLabel: config.trueLabel,
                falseLabel: config.falseLabel,
              });
              setIfModalOpen(false);
            }}
          />

          {/* Loop Node Config Modal */}
          <LoopNodeConfigModal
            isOpen={loopModalOpen}
            onClose={() => setLoopModalOpen(false)}
            stepId={selectedStep.id}
            initialConfig={selectedStep.loopConfig as any}
            onSave={(config) => {
              updateWorkflowStep(selectedStep.id, { loopConfig: config });
              setLoopModalOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}
