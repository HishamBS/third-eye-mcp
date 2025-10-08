'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { useDialog } from '@/hooks/useDialog';

interface Eye {
  id: string;
  name: string;
  version: string;
  description: string;
  source: 'built-in' | 'custom';
  personaTemplate?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  defaultRouting?: Record<string, unknown>;
  createdAt?: string;
  personaId?: string | null;
}

interface Persona {
  id: string;
  name: string;
  eye: string;
}

export default function EyesPage() {
  const dialog = useDialog();
  const [eyes, setEyes] = useState<Eye[]>([]);
  const [builtInEyes, setBuiltInEyes] = useState<Eye[]>([]);
  const [customEyes, setCustomEyes] = useState<Eye[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedEye, setSelectedEye] = useState<Eye | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'built-in' | 'custom'>('all');
  const [isTesting, setIsTesting] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    inputSchema: '{\n  "type": "object",\n  "properties": {\n    "input": {"type": "string"}\n  },\n  "required": ["input"]\n}',
    outputSchema: '{\n  "type": "object",\n  "properties": {\n    "result": {"type": "string"}\n  }\n}',
    personaTemplate: '',
    personaId: '',
  });

  // Original form state for detecting changes
  const [originalFormData, setOriginalFormData] = useState(formData);

  useEffect(() => {
    fetchEyes();
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/personas`);
      if (response.ok) {
        const result = await response.json();
        setPersonas(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch personas:', error);
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

  const fetchEyes = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/eyes/all`);
      if (response.ok) {
        const result = await response.json();
        const allEyesData = result.data || [];

        setEyes(allEyesData);
        setBuiltInEyes(allEyesData.filter((e: Eye) => e.source === 'built-in'));
        setCustomEyes(allEyesData.filter((e: Eye) => e.source === 'custom'));
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
    const initialData = {
      name: '',
      description: '',
      inputSchema: '{\n  "type": "object",\n  "properties": {\n    "input": {"type": "string"}\n  },\n  "required": ["input"]\n}',
      outputSchema: '{\n  "type": "object",\n  "properties": {\n    "result": {"type": "string"}\n  }\n}',
      personaTemplate: '',
      personaId: '',
    };
    setFormData(initialData);
    setOriginalFormData(initialData);
    setHasUnsavedChanges(false);
    setIsCreating(true);
    setSelectedEye(null);
  };

  const viewEye = (eye: Eye) => {
    setSelectedEye(eye);
    setIsCreating(false);
    setIsEditing(false);
    setIsTesting(false);
    setTestResult(null);
    setHasUnsavedChanges(false);

    if (eye.source === 'custom') {
      const data = {
        name: eye.name,
        description: eye.description,
        inputSchema: JSON.stringify(eye.inputSchema, null, 2),
        outputSchema: JSON.stringify(eye.outputSchema, null, 2),
        personaTemplate: eye.personaTemplate || '',
      };
      setFormData(data);
      setOriginalFormData(data);
    }
  };

  const discardChanges = () => {
    setFormData(originalFormData);
    setHasUnsavedChanges(false);
  };

  const cancelForm = async () => {
    if (hasUnsavedChanges) {
      const confirmed = await dialog.confirm('Discard Changes', 'You have unsaved changes. Are you sure you want to discard them?', 'Discard', 'Cancel');
      if (!confirmed) {
        return;
      }
    }
    setIsCreating(false);
    setIsEditing(false);
    setSelectedEye(null);
    setIsTesting(false);
    setTestResult(null);
    setTestInput('');
    setHasUnsavedChanges(false);
  };

  const saveEye = async () => {
    if (!formData.name || !formData.description) {
      setError('Name and description are required');
      return;
    }

    let inputSchema, outputSchema;
    try {
      inputSchema = JSON.parse(formData.inputSchema);
      outputSchema = JSON.parse(formData.outputSchema);
    } catch (error) {
      setError('Invalid JSON schema');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description,
        inputSchema,
        outputSchema,
      };

      // Only include personaId if user selected one
      if (formData.personaId) {
        payload.personaId = formData.personaId;
      }

      const response = await fetch('/api/eyes/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess('Custom Eye created successfully');
        setHasUnsavedChanges(false);
        await fetchEyes();
        cancelForm();
      } else {
        const result = await response.json();
        console.error('Custom eye creation failed:', result);
        setError(result.error?.detail || result.error?.title || 'Failed to create Eye');
      }
    } catch (error) {
      console.error('Custom eye creation error:', error);
      setError('Failed to save eye');
    } finally {
      setLoading(false);
    }
  };

  // Track form changes
  useEffect(() => {
    if (isCreating || isEditing) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, originalFormData, isCreating, isEditing]);

  const updateEye = async () => {
    if (!selectedEye || !formData.description) {
      setError('Description is required');
      return;
    }

    let inputSchema, outputSchema;
    try {
      inputSchema = JSON.parse(formData.inputSchema);
      outputSchema = JSON.parse(formData.outputSchema);
    } catch (error) {
      setError('Invalid JSON schema');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

      const payload: any = {
        name: formData.name,
        description: formData.description,
        inputSchema,
        outputSchema,
      };

      // Only include personaId if user selected one
      if (formData.personaId) {
        payload.personaId = formData.personaId;
      }

      const response = await fetch(`${API_URL}/api/eyes/custom/${selectedEye.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess('Custom Eye updated successfully');
        setHasUnsavedChanges(false);
        setIsEditing(false);
        await fetchEyes();
        cancelForm();
      } else {
        const result = await response.json();
        setError(result.error?.detail || 'Failed to update Eye');
      }
    } catch (error) {
      setError('Failed to update eye');
    } finally {
      setLoading(false);
    }
  };

  const deleteEye = async (eyeId: string) => {
    const confirmed = await dialog.confirm('Delete Custom Eye', 'Are you sure you want to delete this custom Eye?', 'Delete', 'Cancel');
    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/eyes/custom/${eyeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Custom Eye deleted successfully');
        await fetchEyes();
        cancelForm();
      } else {
        const result = await response.json();
        setError(result.error?.detail || 'Failed to delete Eye');
      }
    } catch (error) {
      setError('Failed to delete eye');
    }
  };

  const testEye = async () => {
    if (!selectedEye || !testInput) {
      setError('Test input is required');
      return;
    }

    setLoading(true);
    setError(null);
    setTestResult(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/eyes/custom/${selectedEye.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testInput }),
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(result.data);
        setSuccess('Test completed successfully');
      } else {
        const result = await response.json();
        setError(result.error?.detail || 'Test failed');
      }
    } catch (error) {
      setError('Failed to test eye');
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
        {isCreating || isEditing || isTesting || (selectedEye && selectedEye.source === 'custom' && !isCreating && !isEditing && !isTesting) ? (
          /* Eye Creator/Editor/Tester */
          <GlassCard>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {isCreating ? 'Create Custom Eye' : isTesting ? `Test ${selectedEye?.name}` : isEditing ? `Edit ${selectedEye?.name}` : `View ${selectedEye?.name}`}
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={cancelForm}
                  className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                >
                  {isTesting ? 'Close Test' : 'Cancel'}
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
                {isEditing && (
                  <button
                    onClick={updateEye}
                    disabled={loading || !formData.description}
                    className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Eye'}
                  </button>
                )}
                {isTesting && (
                  <button
                    onClick={testEye}
                    disabled={loading || !testInput}
                    className="rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Testing...' : 'Run Test'}
                  </button>
                )}
                {!isCreating && !isEditing && !isTesting && selectedEye && selectedEye.source === 'custom' && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="rounded-full border border-brand-accent px-5 py-2 text-sm font-semibold text-brand-accent transition hover:bg-brand-accent/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setIsTesting(true)}
                      className="rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => selectedEye && deleteEye(selectedEye.id)}
                      className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {isTesting ? (
              /* Test Panel */
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Test Input</label>
                  <textarea
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Enter test input for the Eye..."
                    className="h-40 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  />
                </div>

                {testResult && (
                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5">
                    <h3 className="mb-3 text-lg font-semibold text-white">Test Result</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-slate-300">Eye: {testResult.eyeName}</p>
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-medium text-slate-300">Response:</p>
                        <pre className="overflow-x-auto rounded-lg bg-brand-ink p-4 text-xs text-green-400">
                          {JSON.stringify(testResult.response, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Schema Editor */
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
                    disabled={!isCreating && !isEditing}
                    className="h-24 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Persona (Optional)</label>
                  <select
                    value={formData.personaId}
                    onChange={(e) => setFormData({ ...formData, personaId: e.target.value })}
                    disabled={!isCreating && !isEditing}
                    className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                  >
                    <option value="">-- No Persona (attach later) --</option>
                    {Array.isArray(personas) && personas.map((persona) => (
                      <option key={persona.id} value={persona.id}>
                        {persona.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-400">
                    Link this Eye to a persona for LLM-powered behavior
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Input Schema (JSON)</label>
                    <textarea
                      value={formData.inputSchema}
                      onChange={(e) => setFormData({ ...formData, inputSchema: e.target.value })}
                      disabled={!isCreating && !isEditing}
                      className="h-64 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-green-400 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Output Schema (JSON)</label>
                    <textarea
                      value={formData.outputSchema}
                      onChange={(e) => setFormData({ ...formData, outputSchema: e.target.value })}
                      disabled={!isCreating && !isEditing}
                      className="h-64 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-green-400 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                    />
                  </div>
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
                        You have unsaved changes to this Eye
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
                        onClick={isCreating ? saveEye : updateEye}
                        disabled={loading}
                        className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </motion.div>
                )}

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
            )}
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
