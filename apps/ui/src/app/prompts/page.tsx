'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { useDialog } from '@/hooks/useDialog';

interface Prompt {
  id: string;
  name: string;
  version: number;
  content: string;
  variablesJson: string[] | null;
  category: string;
  tags: string[] | null;
  active: boolean;
  createdAt: string;
}

export default function PromptsPage() {
  const dialog = useDialog();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<Prompt[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    variables: [] as string[],
    category: 'general',
    tags: [] as string[],
  });

  useEffect(() => {
    fetchPrompts();
    fetchMetadata();
  }, []);

  useEffect(() => {
    filterPrompts();
  }, [prompts, selectedCategory, selectedTag]);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      if (response.ok) {
        const data = await response.json();
        setPrompts(data);
      }
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch('/api/prompts/meta/categories'),
        fetch('/api/prompts/meta/tags'),
      ]);

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }

      if (tagsRes.ok) {
        const data = await tagsRes.json();
        setAllTags(data.tags || []);
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
    }
  };

  const filterPrompts = () => {
    let filtered = prompts;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (selectedTag !== 'all') {
      filtered = filtered.filter((p) => p.tags?.includes(selectedTag));
    }

    setFilteredPrompts(filtered);
  };

  const startCreating = () => {
    setFormData({
      name: '',
      content: '',
      variables: [],
      category: 'general',
      tags: [],
    });
    setIsCreating(true);
    setIsEditing(false);
    setSelectedPrompt(null);
  };

  const startEditing = (prompt: Prompt) => {
    setFormData({
      name: prompt.name,
      content: prompt.content,
      variables: prompt.variablesJson || [],
      category: prompt.category,
      tags: prompt.tags || [],
    });
    setSelectedPrompt(prompt);
    setIsEditing(true);
    setIsCreating(false);
  };

  const cancelForm = () => {
    setIsCreating(false);
    setIsEditing(false);
    setSelectedPrompt(null);
  };

  const savePrompt = async () => {
    if (!formData.name || !formData.content) {
      await dialog.alert('Validation Error', 'Name and content are required');
      return;
    }

    setLoading(true);
    try {
      const url = isEditing && selectedPrompt
        ? `/api/prompts/${selectedPrompt.id}`
        : '/api/prompts';

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          content: formData.content,
          variables: formData.variables.length > 0 ? formData.variables : null,
          category: formData.category,
          tags: formData.tags.length > 0 ? formData.tags : null,
        }),
      });

      if (response.ok) {
        await fetchPrompts();
        await fetchMetadata();
        cancelForm();
      }
    } catch (error) {
      console.error('Failed to save prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const addVariable = async () => {
    const varName = await dialog.prompt('Add Variable', 'Enter variable name (without {{ }}):');
    if (varName && !formData.variables.includes(varName)) {
      setFormData({
        ...formData,
        variables: [...formData.variables, varName],
      });
    }
  };

  const removeVariable = (varName: string) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter((v) => v !== varName),
    });
  };

  const addTag = async () => {
    const tag = await dialog.prompt('Add Tag', 'Enter tag:');
    if (tag && !formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag],
      });
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const viewVersions = async (promptName: string) => {
    try {
      const response = await fetch(`/api/prompts/name/${promptName}/versions`);
      if (response.ok) {
        const result = await response.json();
        setVersions(result.data || []);
        setShowVersions(true);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
      setError('Failed to load versions');
    }
  };

  const toggleActivate = async (promptId: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/prompts/${promptId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentState }),
      });

      if (response.ok) {
        setSuccess(`Prompt ${!currentState ? 'activated' : 'deactivated'}`);
        await fetchPrompts();
      } else {
        setError('Failed to update prompt status');
      }
    } catch (error) {
      setError('Failed to update prompt status');
    }
  };

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
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Templates</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Prompt Library</h1>
              </div>
            </div>
            <div className="flex gap-4">
              <Link href="/personas" className="text-sm text-slate-400 transition-colors hover:text-white">
                Personas
              </Link>
              <Link href="/models" className="text-sm text-slate-400 transition-colors hover:text-white">
                Models
              </Link>
              <button
                onClick={startCreating}
                className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              >
                + New Prompt
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
        <div className="grid gap-8 lg:grid-cols-[280px,1fr]">
          {/* Filters Sidebar */}
          <div>
            <GlassCard className="sticky top-4">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Filters</h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-3 py-2 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Tag</label>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-3 py-2 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  >
                    <option value="all">All Tags</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-brand-outline/40 pt-4">
                  <div className="text-sm text-slate-400">
                    <div>Total: {prompts.length}</div>
                    <div>Filtered: {filteredPrompts.length}</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Main Content */}
          <div>
            {showVersions ? (
              /* Version History */
              <GlassCard>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Version History</h2>
                  <button
                    onClick={() => setShowVersions(false)}
                    className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                  >
                    Back to Library
                  </button>
                </div>

                <div className="space-y-4">
                  {versions.map((ver) => (
                    <div key={ver.id} className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-5">
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{ver.name} v{ver.version}</h3>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs ${
                              ver.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {ver.active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(ver.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleActivate(ver.id, ver.active)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            ver.active
                              ? 'border border-red-500/50 text-red-400 hover:bg-red-500/10'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {ver.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                      <div className="rounded-xl bg-brand-ink/50 p-3">
                        <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300">
                          {ver.content.length > 200 ? ver.content.substring(0, 200) + '...' : ver.content}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            ) : isCreating || isEditing ? (
              /* Prompt Editor */
              <GlassCard>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    {isCreating ? 'Create New Prompt' : `Edit ${formData.name}`}
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={cancelForm}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={savePrompt}
                      disabled={loading || !formData.name || !formData.content}
                      className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : isEditing ? 'Update (New Version)' : 'Create'}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter prompt name..."
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                      disabled={isEditing}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                    >
                      <option value="general">General</option>
                      <option value="eye">Eye Persona</option>
                      <option value="template">Template</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Variables {formData.variables.length > 0 && `(${formData.variables.length})`}
                    </label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {formData.variables.map((varName) => (
                        <span
                          key={varName}
                          className="flex items-center gap-2 rounded-full bg-brand-accent/20 px-3 py-1 text-sm text-brand-accent"
                        >
                          <code>{`{{${varName}}}`}</code>
                          <button
                            onClick={() => removeVariable(varName)}
                            className="hover:text-brand-primary"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={addVariable}
                      className="rounded-full border border-brand-outline/40 px-3 py-1 text-sm text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      + Add Variable
                    </button>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Tags {formData.tags.length > 0 && `(${formData.tags.length})`}
                    </label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-2 rounded-full bg-eye-jogan/20 px-3 py-1 text-sm text-eye-jogan"
                        >
                          <span>{tag}</span>
                          <button onClick={() => removeTag(tag)} className="hover:text-eye-jogan/80">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={addTag}
                      className="rounded-full border border-brand-outline/40 px-3 py-1 text-sm text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      + Add Tag
                    </button>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Prompt Content</label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Enter prompt content... Use {{variable_name}} for variables"
                      className="h-96 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                    />
                  </div>

                  <div className="rounded-xl border border-yellow-700/50 bg-yellow-900/10 p-5">
                    <h4 className="font-medium text-yellow-300">Variable Syntax</h4>
                    <ul className="mt-3 space-y-1 text-sm text-yellow-100">
                      <li>• Use <code className="rounded bg-yellow-900/40 px-1">{`{{variable_name}}`}</code> in content</li>
                      <li>• Variables will be interpolated when prompt is used</li>
                      <li>• Add variables above to track which ones are expected</li>
                    </ul>
                  </div>
                </div>
              </GlassCard>
            ) : (
              /* Prompts Grid */
              <div className="space-y-4">
                {filteredPrompts.length === 0 ? (
                  <GlassCard className="py-12 text-center">
                    <p className="mb-4 text-lg text-slate-400">No prompts found</p>
                    <button
                      onClick={startCreating}
                      className="rounded-full bg-brand-accent px-6 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary"
                    >
                      Create First Prompt
                    </button>
                  </GlassCard>
                ) : (
                  filteredPrompts.map((prompt, index) => (
                    <motion.div
                      key={prompt.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <GlassCard className="transition-all hover:border-brand-accent/50">
                        <div className="mb-4 flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{prompt.name}</h3>
                            <div className="mt-1 flex items-center gap-3">
                              <span className="text-sm text-slate-400">
                                v{prompt.version}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-xs ${
                                prompt.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {prompt.active ? 'Active' : 'Inactive'}
                              </span>
                              <span className="rounded-full bg-brand-accent/20 px-2 py-0.5 text-xs text-brand-accent">
                                {prompt.category}
                              </span>
                              {prompt.variablesJson && prompt.variablesJson.length > 0 && (
                                <span className="text-xs text-slate-400">
                                  {prompt.variablesJson.length} variable{prompt.variablesJson.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => viewVersions(prompt.name)}
                              className="rounded-full border border-brand-outline/40 px-3 py-1 text-sm text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                            >
                              Versions
                            </button>
                            <button
                              onClick={() => toggleActivate(prompt.id, prompt.active)}
                              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                                prompt.active
                                  ? 'border border-red-500/50 text-red-400 hover:bg-red-500/10'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {prompt.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => startEditing(prompt)}
                              className="rounded-full border border-brand-outline/40 px-3 py-1 text-sm text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                            >
                              Edit
                            </button>
                          </div>
                        </div>

                        <div className="mb-3 rounded-xl bg-brand-paper/70 p-4">
                          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300">
                            {prompt.content.length > 300
                              ? prompt.content.substring(0, 300) + '...'
                              : prompt.content}
                          </pre>
                        </div>

                        {prompt.tags && prompt.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {prompt.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-eye-jogan/20 px-2 py-0.5 text-xs text-eye-jogan"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </GlassCard>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
