'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';

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
  workflowJson: any;
  active: boolean;
  createdAt: string;
}

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [pipelineVersions, setPipelineVersions] = useState<PipelineVersion[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    workflow: '',
    category: 'custom',
  });

  useEffect(() => {
    fetchPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      const pipeline = pipelines.find(p => p.name === selectedPipeline);
      if (pipeline) {
        fetchPipelineVersions(pipeline.name);
      }
    } else {
      setPipelineVersions([]);
    }
  }, [selectedPipeline, pipelines]);

  const fetchPipelines = async () => {
    try {
      const response = await fetch('/api/pipelines');
      if (response.ok) {
        const data = await response.json();
        setPipelines(data);
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
    }
  };

  const fetchPipelineVersions = async (name: string) => {
    try {
      const response = await fetch(`/api/pipelines/name/${encodeURIComponent(name)}/versions`);
      if (response.ok) {
        const data = await response.json();
        setPipelineVersions(data);
      }
    } catch (error) {
      console.error('Failed to fetch pipeline versions:', error);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setFormData({
      name: '',
      description: '',
      workflow: JSON.stringify({
        steps: [
          { id: 'start', eye: 'sharingan', next: 'end' },
          { id: 'end', type: 'terminal' }
        ]
      }, null, 2),
      category: 'custom',
    });
  };

  const handleEdit = (pipeline: Pipeline) => {
    setIsEditing(true);
    setIsCreating(false);
    setFormData({
      name: pipeline.name,
      description: pipeline.description,
      workflow: JSON.stringify(pipeline.workflowJson, null, 2),
      category: pipeline.category,
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({
      name: '',
      description: '',
      workflow: '',
      category: 'custom',
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description || !formData.workflow) {
      alert('Please fill in all required fields');
      return;
    }

    let workflowJson;
    try {
      workflowJson = JSON.parse(formData.workflow);
    } catch (e) {
      alert('Invalid JSON in workflow field');
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
        await fetchPipelines();
        handleCancel();
      } else {
        const error = await response.json();
        alert(`Failed to save pipeline: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save pipeline:', error);
      alert('Failed to save pipeline');
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
    if (!confirm('Are you sure you want to deactivate this pipeline?')) {
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

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[360px,1fr]">
          {/* Pipelines List */}
          <div>
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Pipelines</h2>
            <div className="space-y-4">
              {uniquePipelines.map((pipeline, index) => {
                const isSelected = selectedPipeline === pipeline.name;

                return (
                  <motion.div
                    key={pipeline.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedPipeline(isSelected ? '' : pipeline.name)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${getPipelineCategoryColor(pipeline.category)} ${
                      isSelected ? 'ring-2 ring-brand-accent' : ''
                    }`}
                  >
                    <div className="text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold">{pipeline.name}</h3>
                          <p className="mt-1 text-sm opacity-80">{pipeline.description}</p>
                          <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                            <span>v{pipeline.version}</span>
                            <span>•</span>
                            <span className="capitalize">{pipeline.category}</span>
                            {pipeline.active && (
                              <>
                                <span>•</span>
                                <span className="text-green-400">Active</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(pipeline);
                          }}
                          className="ml-2 rounded-full bg-white/20 px-3 py-1 text-sm transition-colors hover:bg-white/30"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {uniquePipelines.length === 0 && (
                <div className="py-8 text-center text-slate-400">
                  No pipelines found. Create one to get started.
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div>
            {isCreating || isEditing ? (
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

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Workflow JSON <span className="text-brand-primary">*</span>
                    </label>
                    <textarea
                      value={formData.workflow}
                      onChange={(e) => setFormData({ ...formData, workflow: e.target.value })}
                      className="h-96 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-green-400 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                      placeholder='{"steps": [...]}'
                    />
                  </div>

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
                <h2 className="mb-6 text-xl font-semibold text-white">
                  {selectedPipeline} Versions
                </h2>

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

                        <div className="rounded-lg bg-brand-paper/70 p-3">
                          <pre className="overflow-x-auto whitespace-pre-wrap text-sm text-slate-300">
                            {JSON.stringify(version.workflowJson, null, 2)}
                          </pre>
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
                  Select a pipeline from the left to view versions or create a new one
                </p>
                <div className="space-y-2 text-sm text-slate-500">
                  <p>• Orchestrate multi-Eye workflows</p>
                  <p>• Add conditional logic and user input steps</p>
                  <p>• Version control for pipeline iterations</p>
                  <p>• Activate/deactivate pipeline versions</p>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
