'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';

interface Eye {
  id: string;
  name: string;
  version: string;
  description: string;
  source: 'built-in' | 'custom';
  personaTemplate?: string;
  inputSchema?: any;
  outputSchema?: any;
  defaultRouting?: any;
  createdAt?: string;
}

export default function EyesPage() {
  const [eyes, setEyes] = useState<Eye[]>([]);
  const [builtInEyes, setBuiltInEyes] = useState<Eye[]>([]);
  const [customEyes, setCustomEyes] = useState<Eye[]>([]);
  const [selectedEye, setSelectedEye] = useState<Eye | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'built-in' | 'custom'>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    inputSchema: '{\n  "type": "object",\n  "properties": {\n    "input": {"type": "string"}\n  },\n  "required": ["input"]\n}',
    outputSchema: '{\n  "type": "object",\n  "properties": {\n    "result": {"type": "string"}\n  }\n}',
    personaTemplate: '',
  });

  useEffect(() => {
    fetchEyes();
  }, []);

  const fetchEyes = async () => {
    try {
      const response = await fetch('/api/eyes/all');
      if (response.ok) {
        const data = await response.json();
        setEyes(data);
        setBuiltInEyes(data.filter((e: Eye) => e.source === 'built-in'));
        setCustomEyes(data.filter((e: Eye) => e.source === 'custom'));
      }
    } catch (error) {
      console.error('Failed to fetch eyes:', error);
    }
  };

  const getFilteredEyes = () => {
    if (viewMode === 'built-in') return builtInEyes;
    if (viewMode === 'custom') return customEyes;
    return eyes;
  };

  const startCreating = () => {
    setFormData({
      name: '',
      description: '',
      inputSchema: '{\n  "type": "object",\n  "properties": {\n    "input": {"type": "string"}\n  },\n  "required": ["input"]\n}',
      outputSchema: '{\n  "type": "object",\n  "properties": {\n    "result": {"type": "string"}\n  }\n}',
      personaTemplate: '',
    });
    setIsCreating(true);
    setSelectedEye(null);
  };

  const viewEye = (eye: Eye) => {
    setSelectedEye(eye);
    setIsCreating(false);

    if (eye.source === 'custom') {
      setFormData({
        name: eye.name,
        description: eye.description,
        inputSchema: JSON.stringify(eye.inputSchema, null, 2),
        outputSchema: JSON.stringify(eye.outputSchema, null, 2),
        personaTemplate: eye.personaTemplate || '',
      });
    }
  };

  const cancelForm = () => {
    setIsCreating(false);
    setSelectedEye(null);
  };

  const saveEye = async () => {
    if (!formData.name || !formData.description) {
      alert('Name and description are required');
      return;
    }

    let inputSchema, outputSchema;
    try {
      inputSchema = JSON.parse(formData.inputSchema);
      outputSchema = JSON.parse(formData.outputSchema);
    } catch (error) {
      alert('Invalid JSON schema');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/eyes/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          inputSchema,
          outputSchema,
          personaId: null,
        }),
      });

      if (response.ok) {
        await fetchEyes();
        cancelForm();
      }
    } catch (error) {
      console.error('Failed to save eye:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEyeIcon = (eyeId: string) => {
    const iconMap: Record<string, string> = {
      overseer: '🧿',
      sharingan: '👁️',
      helper: '✨',
      jogan: '🔮',
      rinnegan_requirements: '🌀',
      rinnegan_review: '🌀',
      rinnegan_approval: '🌀',
      mangekyo_scaffold: '⚡',
      mangekyo_impl: '⚡',
      mangekyo_tests: '⚡',
      mangekyo_docs: '⚡',
      tenseigan: '💫',
      byakugan: '👀',
    };
    return iconMap[eyeId] || '👁️';
  };

  const getEyeColor = (eyeId: string) => {
    if (eyeId.includes('sharingan')) return 'border-eye-sharingan/40 bg-eye-sharingan/5';
    if (eyeId.includes('rinnegan')) return 'border-eye-rinnegan/40 bg-eye-rinnegan/5';
    if (eyeId.includes('tenseigan')) return 'border-eye-tenseigan/40 bg-eye-tenseigan/5';
    if (eyeId.includes('byakugan')) return 'border-eye-byakugan/40 bg-eye-byakugan/5';
    if (eyeId.includes('mangekyo')) return 'border-eye-mangekyo/40 bg-eye-mangekyo/5';
    if (eyeId.includes('jogan')) return 'border-eye-jogan/40 bg-eye-jogan/5';
    if (eyeId === 'overseer') return 'border-brand-accent/40 bg-brand-accent/5';
    if (eyeId === 'helper') return 'border-eye-prompt/40 bg-eye-prompt/5';
    return 'border-slate-500/40 bg-slate-500/5';
  };

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
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Eyes</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Eyes Management</h1>
              </div>
            </div>
            <div className="flex gap-4">
              <Link href="/prompts" className="text-sm text-slate-400 transition-colors hover:text-white">
                Prompts
              </Link>
              <Link href="/personas" className="text-sm text-slate-400 transition-colors hover:text-white">
                Personas
              </Link>
              <button
                onClick={startCreating}
                className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              >
                + Create Custom Eye
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {isCreating || (selectedEye && selectedEye.source === 'custom') ? (
          /* Eye Creator/Editor */
          <GlassCard>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {isCreating ? 'Create Custom Eye' : `View ${selectedEye?.name}`}
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={cancelForm}
                  className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                >
                  Cancel
                </button>
                {isCreating && (
                  <button
                    onClick={saveEye}
                    disabled={loading || !formData.name || !formData.description}
                    className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Eye'}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Eye Name (ID)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="my_custom_eye"
                  disabled={!isCreating}
                  className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Lowercase, no spaces. Will be used as tool name: third_eye_{formData.name}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this Eye does..."
                  disabled={!isCreating}
                  className="h-24 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Input Schema (JSON)</label>
                  <textarea
                    value={formData.inputSchema}
                    onChange={(e) => setFormData({ ...formData, inputSchema: e.target.value })}
                    disabled={!isCreating}
                    className="h-64 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-green-400 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Output Schema (JSON)</label>
                  <textarea
                    value={formData.outputSchema}
                    onChange={(e) => setFormData({ ...formData, outputSchema: e.target.value })}
                    disabled={!isCreating}
                    className="h-64 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-green-400 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-yellow-700/50 bg-yellow-900/10 p-5">
                <h4 className="font-medium text-yellow-300">Custom Eye Guidelines</h4>
                <ul className="mt-3 space-y-1 text-sm text-yellow-100">
                  <li>• Eye names must be unique and lowercase with underscores</li>
                  <li>• Input/output schemas must be valid JSON Schema format</li>
                  <li>• Eyes will be automatically registered in MCP server</li>
                  <li>• Link to a persona from the Prompt Library (future feature)</li>
                  <li>• Custom Eyes follow the same Overseer contract as built-in Eyes</li>
                </ul>
              </div>
            </div>
          </GlassCard>
        ) : (
          /* Eyes Grid */
          <div>
            {/* View Mode Tabs */}
            <div className="mb-6 flex gap-3">
              <button
                onClick={() => setViewMode('all')}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  viewMode === 'all'
                    ? 'bg-brand-accent text-brand-ink'
                    : 'border border-brand-outline/40 text-slate-300 hover:border-brand-accent hover:text-brand-accent'
                }`}
              >
                All ({eyes.length})
              </button>
              <button
                onClick={() => setViewMode('built-in')}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  viewMode === 'built-in'
                    ? 'bg-brand-accent text-brand-ink'
                    : 'border border-brand-outline/40 text-slate-300 hover:border-brand-accent hover:text-brand-accent'
                }`}
              >
                Built-In ({builtInEyes.length})
              </button>
              <button
                onClick={() => setViewMode('custom')}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  viewMode === 'custom'
                    ? 'bg-brand-accent text-brand-ink'
                    : 'border border-brand-outline/40 text-slate-300 hover:border-brand-accent hover:text-brand-accent'
                }`}
              >
                Custom ({customEyes.length})
              </button>
            </div>

            {/* Eyes Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {getFilteredEyes().map((eye, index) => (
                <motion.button
                  key={eye.id}
                  onClick={() => viewEye(eye)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`rounded-2xl border p-6 text-left shadow-lg transition-all hover:shadow-xl ${getEyeColor(eye.id)}`}
                >
                  <div className="mb-4 text-center">
                    <div className="mb-3 text-5xl">{getEyeIcon(eye.id)}</div>
                    <h3 className="mb-1 text-xl font-bold text-white">{eye.name}</h3>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm text-white/80">v{eye.version}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          eye.source === 'built-in'
                            ? 'bg-white/20 text-white'
                            : 'bg-green-500/30 text-green-100'
                        }`}
                      >
                        {eye.source}
                      </span>
                    </div>
                  </div>

                  <p className="line-clamp-3 text-center text-sm text-white/90">
                    {eye.description}
                  </p>

                  {eye.source === 'custom' && (
                    <div className="mt-4 border-t border-white/20 pt-4 text-center">
                      <span className="text-xs text-white/70">
                        Created {new Date(eye.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>

            {getFilteredEyes().length === 0 && (
              <div className="rounded-2xl border border-brand-outline/60 bg-brand-paperElev/80 p-12 text-center shadow-glass">
                <p className="mb-4 text-lg text-slate-400">
                  No {viewMode === 'custom' ? 'custom' : ''} Eyes found
                </p>
                {viewMode === 'custom' && (
                  <button
                    onClick={startCreating}
                    className="rounded-full bg-brand-accent px-6 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary"
                  >
                    Create First Custom Eye
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
