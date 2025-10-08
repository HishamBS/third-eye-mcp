'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { useDialog } from '@/hooks/useDialog';
import { PipelineFlowBuilder } from '@/components/PipelineFlowBuilder';

interface Pipeline {
  id: string;
  name: string;
  version: number;
  description: string;
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
  category: string;
  active: boolean;
  createdAt: string;
}

interface PipelineVersion {
  id: string;
  version: number;
  description: string;
  workflowJson: Pipeline['workflowJson'];
  active: boolean;
  createdAt: string;
}

interface PipelineRun {
  id: string;
  pipelineId: string;
  sessionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: number;
  stateJson: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
}

export default function PipelinesPage() {
  const dialog = useDialog();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [pipelineVersions, setPipelineVersions] = useState<PipelineVersion[]>([]);
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRuns, setShowRuns] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editorMode, setEditorMode] = useState<'json' | 'visual'>('visual');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    workflow: '',
    category: 'custom',
  });

  const [originalFormData, setOriginalFormData] = useState(formData);

  useEffect(() => {
    fetchPipelines();
  }, []);

  // Auto-select system-default pipeline when pipelines are loaded
  useEffect(() => {
    console.log('[Pipelines] Auto-select effect triggered:', {
      pipelinesCount: pipelines.length,
      selectedPipeline,
      hasSystemDefault: pipelines.some(p => p.name === 'system-default'),
    });

    if (pipelines.length > 0 && !selectedPipeline) {
      const systemDefault = pipelines.find(p => p.name === 'system-default');
      if (systemDefault) {
        console.log('[Pipelines] Auto-selecting system-default');
        setSelectedPipeline(systemDefault.name);
      } else {
        console.warn('[Pipelines] system-default pipeline not found in:', pipelines.map(p => p.name));
      }
    }
  }, [pipelines, selectedPipeline]);

  useEffect(() => {
    if (selectedPipeline) {
      const pipeline = pipelines.find(p => p.name === selectedPipeline);
      if (pipeline) {
        fetchPipelineVersions(pipeline.name);
        fetchPipelineRuns(pipeline.id);
      }
    } else {
      setPipelineVersions([]);
      setPipelineRuns([]);
    }
  }, [selectedPipeline, pipelines]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchPipelines = async () => {
    try {
      const response = await fetch('/api/pipelines');
      if (response.ok) {
        const result = await response.json();
        console.log('[Pipelines] API response:', result);
        // Backend returns {success, data: [...], meta}, NOT {data: {pipelines: [...]}}
        setPipelines(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
    }
  };

  const fetchPipelineVersions = async (name: string) => {
    try {
      const response = await fetch(`/api/pipelines/name/${encodeURIComponent(name)}/versions`);
      if (response.ok) {
        const result = await response.json();
        setPipelineVersions(result.data?.versions || []);
      }
    } catch (error) {
      console.error('Failed to fetch pipeline versions:', error);
    }
  };

  const fetchPipelineRuns = async (pipelineId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/pipelines/${pipelineId}/runs`);
      if (response.ok) {
        const result = await response.json();
        setPipelineRuns(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch pipeline runs:', error);
    }
  };

  const handleRunPipeline = async (pipelineId: string) => {
    setRunningPipeline(pipelineId);
    setError(null);
    setSuccess(null);

    try {
      // Create session first
      const sessionResponse = await fetch(`${API_URL}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!sessionResponse.ok) {
        setError('Failed to create session');
        setRunningPipeline(null);
        return;
      }

      const sessionResult = await sessionResponse.json();
      const sessionId = sessionResult.data?.sessionId;

      // Execute pipeline with session
      const response = await fetch(`${API_URL}/api/pipelines/${pipelineId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          input: { trigger: 'manual' }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Pipeline run created: ${result.data?.runId} (Session: ${sessionId})`);
        await fetchPipelineRuns(pipelineId);
      } else {
        const result = await response.json();
        setError(result.error?.detail || 'Failed to run pipeline');
      }
    } catch (error) {
      setError('Failed to run pipeline');
    } finally {
      setRunningPipeline(null);
    }
  };

  const handleCreate = () => {
    const initialData = {
      name: '',
      description: '',
      workflow: JSON.stringify({
        steps: [
          { id: 'start', eye: 'sharingan', next: 'end' },
          { id: 'end', type: 'terminal' }
        ]
      }, null, 2),
      category: 'custom',
    };
    setFormData(initialData);
    setOriginalFormData(initialData);
    setHasUnsavedChanges(false);
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleEdit = (pipeline: Pipeline) => {
    const data = {
      name: pipeline.name,
      description: pipeline.description,
      workflow: JSON.stringify(pipeline.workflowJson, null, 2),
      category: pipeline.category,
    };
    setFormData(data);
    setOriginalFormData(data);
    setHasUnsavedChanges(false);
    setIsEditing(true);
    setIsCreating(false);
  };

  const discardChanges = () => {
    setFormData(originalFormData);
    setHasUnsavedChanges(false);
  };

  const handleCancel = async () => {
    if (hasUnsavedChanges) {
      const confirmed = await dialog.confirm(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        'Discard',
        'Cancel'
      );
      if (!confirmed) {
        return;
      }
    }
    setIsCreating(false);
    setIsEditing(false);
    setHasUnsavedChanges(false);
    setFormData({
      name: '',
      description: '',
      workflow: '',
      category: 'custom',
    });
  };

  // Track form changes
  useEffect(() => {
    if (isCreating || isEditing) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, originalFormData, isCreating, isEditing]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.description || !formData.workflow) {
      await dialog.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    let workflowJson;
    try {
      workflowJson = JSON.parse(formData.workflow);
    } catch (e) {
      await dialog.alert('Invalid JSON', 'Invalid JSON in workflow field. Please check your syntax.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          workflow: workflowJson,
          category: formData.category,
        }),
      });

      if (response.ok) {
        setSuccess('Pipeline saved successfully');
        setHasUnsavedChanges(false);
        await fetchPipelines();
        handleCancel();
      } else {
        const result = await response.json();
        setError(result.error?.detail || 'Failed to save pipeline');
      }
    } catch (error) {
      setError('Failed to save pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (pipelineId: string) => {
    try {
      const response = await fetch(`/api/pipelines/${pipelineId}/activate`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchPipelines();
        if (selectedPipeline) {
          await fetchPipelineVersions(selectedPipeline);
        }
      }
    } catch (error) {
      console.error('Failed to activate pipeline:', error);
    }
  };

  const handleDelete = async (pipelineId: string) => {
    const confirmed = await dialog.confirm(
      'Deactivate Pipeline',
      'Are you sure you want to deactivate this pipeline?',
      'Deactivate',
      'Cancel'
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/pipelines/${pipelineId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchPipelines();
        if (selectedPipeline) {
          await fetchPipelineVersions(selectedPipeline);
        }
      }
    } catch (error) {
      console.error('Failed to delete pipeline:', error);
    }
  };

  const getPipelineCategoryColor = (category: string) => {
    switch (category) {
      case 'built-in': return 'border-eye-jogan/40 bg-eye-jogan/5';
      case 'custom': return 'border-brand-accent/40 bg-brand-accent/5';
      default: return 'border-brand-outline/40 bg-brand-paper/50';
    }
  };

  const groupedPipelines = pipelines.reduce((acc, pipeline) => {
    if (!acc[pipeline.name]) {
      acc[pipeline.name] = pipeline;
    }
    return acc;
  }, {} as Record<string, Pipeline>);

  const uniquePipelines = Object.values(groupedPipelines);

  return (
    <div className="min-h-screen bg-brand-ink">
      {/* Header */}
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-slate-400 transition-colors hover:text-brand-accent">
                ← Home
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Workflows</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Pipelines</h1>
              </div>
            </div>
            <div className="flex gap-4">
              <Link href="/models" className="text-sm text-slate-400 transition-colors hover:text-white">
                Models
              </Link>
              <Link href="/personas" className="text-sm text-slate-400 transition-colors hover:text-white">
                Personas
              </Link>
              <button
                onClick={handleCreate}
                className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              >
                + Create Pipeline
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-xl border border-green-500/50 bg-green-500/10 p-4 text-green-400">
            {success}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Pipeline Selector */}
        <div className="mb-8">
          <label className="mb-3 block text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
            Select Pipeline
          </label>
          <select
            value={selectedPipeline}
            onChange={(e) => setSelectedPipeline(e.target.value)}
            className="w-full max-w-xl rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
          >
            <option value="">-- Choose a pipeline --</option>
            {uniquePipelines.map((pipeline) => (
              <option key={pipeline.name} value={pipeline.name}>
                {pipeline.name} (v{pipeline.version}) - {pipeline.category}
              </option>
            ))}
          </select>

          {selectedPipeline && uniquePipelines.find(p => p.name === selectedPipeline) && (
            <div className="mt-4 rounded-xl border border-brand-outline/50 bg-brand-paperElev/30 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{selectedPipeline}</h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {uniquePipelines.find(p => p.name === selectedPipeline)?.description}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                    <span className="capitalize">
                      {uniquePipelines.find(p => p.name === selectedPipeline)?.category}
                    </span>
                    <span>•</span>
                    <span>v{uniquePipelines.find(p => p.name === selectedPipeline)?.version}</span>
                    {uniquePipelines.find(p => p.name === selectedPipeline)?.active && (
                      <>
                        <span>•</span>
                        <span className="text-green-400">Active</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => {
                      const pipeline = uniquePipelines.find(p => p.name === selectedPipeline);
                      if (pipeline) handleRunPipeline(pipeline.id);
                    }}
                    disabled={runningPipeline !== null}
                    className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    {runningPipeline ? 'Running...' : 'Run Pipeline'}
                  </button>
                  <button
                    onClick={() => {
                      const pipeline = uniquePipelines.find(p => p.name === selectedPipeline);
                      if (pipeline) handleEdit(pipeline);
                    }}
                    className="rounded-full border border-brand-outline/50 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div>
            {showRuns ? (
              /* Pipeline Runs */
              <GlassCard>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Pipeline Runs</h2>
                  <button
                    onClick={() => setShowRuns(false)}
                    className="text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    Back to Versions
                  </button>
                </div>

                {pipelineRuns.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-lg text-slate-400">No runs yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pipelineRuns.map((run) => (
                      <div
                        key={run.id}
                        className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-white">Run {run.id.slice(0, 8)}</h3>
                              <span
                                className={`rounded-full px-2 py-1 text-xs ${
                                  run.status === 'completed'
                                    ? 'bg-green-500/20 text-green-400'
                                    : run.status === 'failed'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}
                              >
                                {run.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-400">
                              Session: {run.sessionId}
                            </p>
                            <p className="text-sm text-slate-400">
                              Step: {run.currentStep} | Started: {new Date(run.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            ) : isCreating || isEditing ? (
              /* Pipeline Editor */
              <GlassCard>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    {isCreating ? 'Create New Pipeline' : `Edit ${formData.name}`}
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancel}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Pipeline'}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Name {isCreating && <span className="text-brand-primary">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={isEditing}
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                      placeholder="my_pipeline"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Description <span className="text-brand-primary">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="h-24 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                      placeholder="Describe what this pipeline does..."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                    >
                      <option value="custom">Custom</option>
                      <option value="built-in">Built-in</option>
                    </select>
                  </div>

                  {/* Editor Mode Toggle */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Workflow Editor
                    </label>
                    <div className="flex gap-2 rounded-xl border border-brand-outline/50 bg-brand-paper p-1">
                      <button
                        type="button"
                        onClick={() => setEditorMode('visual')}
                        className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                          editorMode === 'visual'
                            ? 'bg-brand-accent text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🎨 Visual Builder
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorMode('json')}
                        className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                          editorMode === 'json'
                            ? 'bg-brand-accent text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        📝 JSON Editor
                      </button>
                    </div>
                  </div>

                  {/* Workflow Editor */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Workflow <span className="text-brand-primary">*</span>
                    </label>
                    {editorMode === 'visual' ? (
                      <div className="overflow-hidden rounded-xl">
                        {formData.workflow && (() => {
                          try {
                            const workflow = JSON.parse(formData.workflow);
                            return (
                              <PipelineFlowBuilder
                                workflowJson={workflow}
                                onChange={(newWorkflow) => {
                                  setFormData({ ...formData, workflow: JSON.stringify(newWorkflow, null, 2) });
                                }}
                                readOnly={false}
                              />
                            );
                          } catch (e) {
                            return (
                              <div className="flex h-[600px] items-center justify-center rounded-xl border border-red-500/50 bg-red-500/10 text-red-400">
                                Invalid JSON - switch to JSON editor to fix
                              </div>
                            );
                          }
                        })()}
                      </div>
                    ) : (
                      <textarea
                        value={formData.workflow}
                        onChange={(e) => setFormData({ ...formData, workflow: e.target.value })}
                        className="h-96 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-green-400 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                        placeholder='{"steps": [...]}'
                      />
                    )}
                  </div>

                  {/* Save/Discard Changes Banner */}
                  {hasUnsavedChanges && (isCreating || isEditing) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between rounded-xl border border-brand-accent/40 bg-brand-accent/10 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm font-medium text-white">
                          You have unsaved changes to this pipeline
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={discardChanges}
                          disabled={loading}
                          className="rounded-lg border border-brand-outline/40 bg-brand-paper px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-brand-paperElev disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Discard Changes
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={loading}
                          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loading ? 'Saving...' : 'Save Pipeline'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div className="rounded-xl border border-yellow-700/50 bg-yellow-900/10 p-5">
                    <h4 className="font-medium text-yellow-300">Pipeline Workflow Format</h4>
                    <ul className="mt-3 space-y-1 text-sm text-yellow-100">
                      <li>• Define workflow as JSON with array of steps</li>
                      <li>• Each step has: id, eye (or type), next</li>
                      <li>• Conditional steps: type: 'condition', condition, true, false</li>
                      <li>• User input steps: type: 'user_input', prompt, next</li>
                      <li>• Terminal step: type: 'terminal'</li>
                    </ul>
                  </div>
                </div>
              </GlassCard>
            ) : selectedPipeline ? (
              /* Pipeline Versions */
              <GlassCard>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    {selectedPipeline} Versions
                  </h2>
                  <button
                    onClick={() => setShowRuns(true)}
                    className="rounded-full border border-brand-outline/50 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                  >
                    View Runs ({pipelineRuns.length})
                  </button>
                </div>

                {pipelineVersions.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-lg text-slate-400">No versions found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pipelineVersions.map((version) => (
                      <div
                        key={version.id}
                        className={`rounded-xl border p-4 ${
                          version.active
                            ? 'border-brand-accent/50 bg-brand-accent/5'
                            : 'border-brand-outline/40 bg-brand-paper/50'
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-white">
                              Version {version.version}
                              {version.active && (
                                <span className="ml-2 rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                                  Active
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-slate-400">
                              {new Date(version.createdAt).toLocaleString()}
                            </p>
                            <p className="mt-2 text-sm text-slate-300">{version.description}</p>
                          </div>
                          <div className="flex gap-2">
                            {!version.active && (
                              <button
                                onClick={() => handleActivate(version.id)}
                                className="rounded-full bg-green-600 px-3 py-1 text-sm text-white transition-colors hover:bg-green-700"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(version.id)}
                              className="rounded-full bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Visual Flow Diagram */}
                          {version.workflowJson?.steps && (
                            <div className="rounded-lg border border-brand-outline/40 bg-brand-paper/70 p-4">
                              <h4 className="mb-3 text-sm font-semibold text-slate-300">Visual Flow</h4>
                              <div className="overflow-hidden rounded-lg">
                                <PipelineFlowBuilder
                                  workflowJson={version.workflowJson}
                                  readOnly={true}
                                />
                              </div>
                            </div>
                          )}

                          {/* List View */}
                          {version.workflowJson?.steps && (
                            <details className="rounded-lg border border-brand-outline/40 bg-brand-paper/70 p-4">
                              <summary className="cursor-pointer text-sm font-semibold text-slate-300">
                                View Steps List
                              </summary>
                              <div className="mt-3 space-y-2">
                                {version.workflowJson.steps.map((step, idx: number) => (
                                  <div
                                    key={step.id}
                                    className="flex items-center gap-3 rounded-lg bg-brand-ink/50 p-3"
                                  >
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-accent/20 text-sm font-semibold text-brand-accent">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-white">{step.id}</span>
                                        {step.eye && (
                                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                                            {step.eye}
                                          </span>
                                        )}
                                        {step.type && (
                                          <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                                            {step.type}
                                          </span>
                                        )}
                                      </div>
                                      {step.next && (
                                        <div className="mt-1 text-xs text-slate-400">
                                          → next: {step.next}
                                        </div>
                                      )}
                                      {step.condition && (
                                        <div className="mt-1 text-xs text-yellow-400">
                                          Condition: true → {step.true} | false → {step.false}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}

                          {/* JSON View */}
                          <details className="rounded-lg bg-brand-paper/70 p-3">
                            <summary className="cursor-pointer text-sm font-medium text-slate-300">
                              View Raw JSON
                            </summary>
                            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-400">
                              {JSON.stringify(version.workflowJson, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            ) : (
              /* Welcome Screen */
              <GlassCard className="p-12 text-center">
                <h2 className="mb-4 text-2xl font-semibold text-white">Pipeline Management</h2>
                <p className="mb-6 text-lg text-slate-400">
                  Select a pipeline above to view versions or create a new one
                </p>
                <div className="space-y-2 text-sm text-slate-500">
                  <p>• Orchestrate multi-Eye workflows with sequential validation</p>
                  <p>• Add conditional logic and user input steps</p>
                  <p>• Version control for pipeline iterations</p>
                  <p>• Activate/deactivate pipeline versions</p>
                  <p>• See the <strong>system-default</strong> pipeline for a comprehensive example</p>
                </div>
              </GlassCard>
            )}
          </div>
      </div>
    </div>
  );
}
