'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';

interface Eye {
  id: string;
  name: string;
  version: string;
  description: string;
  source: 'built-in' | 'custom';
  personaTemplate?: string;
}

interface Persona {
  id: string;
  eye: string;
  name: string;
  version: number;
  content: string;
  active: boolean;
  createdAt: string;
}

interface EyeRouting {
  eye: string;
  primaryProvider: string | null;
  primaryModel: string | null;
  fallbackProvider: string | null;
  fallbackModel: string | null;
}

export default function EyeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eyeId = params.id as string;

  const [eye, setEye] = useState<Eye | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [routing, setRouting] = useState<EyeRouting | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'persona' | 'routing' | 'test'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Persona editing state
  const [isEditingPersona, setIsEditingPersona] = useState(false);
  const [personaContent, setPersonaContent] = useState('');

  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    fetchEyeData();
  }, [eyeId]);

  const fetchEyeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

      // Fetch Eye details
      const eyesRes = await fetch(`${API_URL}/api/eyes/all`);
      if (eyesRes.ok) {
        const result = await eyesRes.json();
        const foundEye = result.data?.find((e: Eye) => e.id === eyeId);
        setEye(foundEye || null);
      }

      // Fetch personas for this Eye
      const personasRes = await fetch(`${API_URL}/api/personas/${eyeId}`);
      if (personasRes.ok) {
        const result = await personasRes.json();
        setPersonas(result.data?.versions || []);
      }

      // Fetch routing configuration
      const routingRes = await fetch(`${API_URL}/api/routing`);
      if (routingRes.ok) {
        const result = await routingRes.json();
        const eyeRouting = result.data?.find((r: EyeRouting) => r.eye === eyeId);
        setRouting(eyeRouting || null);
      }
    } catch (err) {
      setError('Failed to load Eye details');
    } finally {
      setLoading(false);
    }
  };

  const startEditingName = () => {
    setEditedName(eye?.name || '');
    setIsEditingName(true);
  };

  const saveName = async () => {
    if (!editedName.trim()) {
      setError('Eye name cannot be empty');
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/eyes/${eyeId}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: editedName.trim() }),
      });

      if (response.ok) {
        setSuccess('Eye name updated successfully');
        setIsEditingName(false);
        await fetchEyeData();
      } else {
        const result = await response.json();
        setError(result.error?.detail || 'Failed to update Eye name');
      }
    } catch (err) {
      setError('Failed to update Eye name');
    }
  };

  const startEditingPersona = () => {
    const activePersona = personas.find(p => p.active);
    setPersonaContent(activePersona?.content || '');
    setIsEditingPersona(true);
  };

  const savePersona = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/personas/${eyeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: personaContent }),
      });

      if (response.ok) {
        setSuccess('Persona saved successfully!');
        setIsEditingPersona(false);
        await fetchEyeData();
      } else {
        setError('Failed to save persona');
      }
    } catch (err) {
      setError('Failed to save persona');
    }
  };

  const activatePersona = async (version: number) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/personas/${eyeId}/activate/${version}`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setSuccess(`Version ${version} activated!`);
        await fetchEyeData();
      } else {
        setError('Failed to activate version');
      }
    } catch (err) {
      setError('Failed to activate version');
    }
  };

  const getEyeIcon = (id: string) => {
    const iconMap: Record<string, string> = {
      overseer: '🧿',
      sharingan: '👁️',
      'prompt-helper': '✨',
      jogan: '🔮',
      rinnegan: '🌀',
      mangekyo: '⚡',
      tenseigan: '💫',
      byakugan: '👀',
    };
    return iconMap[id] || '👁️';
  };

  const getEyeColor = (id: string) => {
    if (id.includes('sharingan')) return 'border-eye-sharingan/40 bg-eye-sharingan/5';
    if (id.includes('rinnegan')) return 'border-eye-rinnegan/40 bg-eye-rinnegan/5';
    if (id.includes('tenseigan')) return 'border-eye-tenseigan/40 bg-eye-tenseigan/5';
    if (id.includes('jogan')) return 'border-eye-jogan/40 bg-eye-jogan/5';
    if (id.includes('byakugan')) return 'border-eye-byakugan/40 bg-eye-byakugan/5';
    if (id.includes('mangekyo')) return 'border-eye-mangekyo/40 bg-eye-mangekyo/5';
    if (id === 'overseer') return 'border-brand-accent/40 bg-brand-accent/5';
    if (id === 'prompt-helper') return 'border-eye-prompt/40 bg-eye-prompt/5';
    return 'border-slate-500/40 bg-slate-500/5';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-ink flex items-center justify-center">
        <p className="text-white">Loading Eye details...</p>
      </div>
    );
  }

  if (!eye) {
    return (
      <div className="min-h-screen bg-brand-ink flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Eye not found</p>
          <Link href="/eyes" className="text-brand-accent hover:underline">← Back to Eyes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-ink">
      {/* Header */}
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/eyes" className="text-slate-400 transition-colors hover:text-brand-accent">
                ← Back to Eyes
              </Link>
              <div className="flex items-center gap-4">
                <div className="text-5xl">{getEyeIcon(eye.id)}</div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">{eye.source}</p>
                  <h1 className="mt-1 text-2xl font-semibold text-white capitalize">{eye.name}</h1>
                  <p className="text-sm text-slate-400">v{eye.version}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Tabs */}
      <div className="border-b border-brand-outline/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-6">
            {(['overview', 'persona', 'routing', 'test'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-2 py-4 text-sm font-semibold capitalize transition ${
                  activeTab === tab
                    ? 'border-brand-accent text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <GlassCard>
            <h2 className="mb-6 text-xl font-semibold text-white">Eye Overview</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                {isEditingName ? (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="flex-1 rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none"
                      placeholder="Enter Eye name"
                    />
                    <button
                      onClick={saveName}
                      className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-white capitalize flex-1">{eye.name}</p>
                    <button
                      onClick={startEditingName}
                      className="rounded-full border border-brand-outline/50 px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      Edit Name
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <p className="text-white">{eye.description}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Source</label>
                <span className={`inline-block rounded-full px-3 py-1 text-sm ${
                  eye.source === 'built-in' ? 'bg-white/20 text-white' : 'bg-green-500/30 text-green-100'
                }`}>
                  {eye.source}
                </span>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Persona Tab */}
        {activeTab === 'persona' && (
          <GlassCard>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Persona Management</h2>
              {!isEditingPersona && (
                <button
                  onClick={startEditingPersona}
                  className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary"
                >
                  Create New Version
                </button>
              )}
            </div>

            {isEditingPersona ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Persona Content</label>
                  <textarea
                    value={personaContent}
                    onChange={(e) => setPersonaContent(e.target.value)}
                    className="h-96 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-white focus:border-brand-accent focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditingPersona(false)}
                    className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePersona}
                    className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary"
                  >
                    Save Persona
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {personas.length === 0 ? (
                  <p className="text-slate-400">No personas found</p>
                ) : (
                  personas.map((persona) => (
                    <div
                      key={persona.id}
                      className={`rounded-xl border p-4 ${
                        persona.active
                          ? 'border-brand-accent/50 bg-brand-accent/5'
                          : 'border-brand-outline/40 bg-brand-paper/50'
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-white">
                            Version {persona.version}
                            {persona.active && (
                              <span className="ml-2 rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                                Active
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-slate-400">
                            {new Date(persona.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!persona.active && (
                          <button
                            onClick={() => activatePersona(persona.version)}
                            className="rounded-full border border-green-600/50 px-4 py-1.5 text-xs font-semibold text-green-400 transition hover:bg-green-600/20"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                      <div className="rounded-lg bg-brand-paper/70 p-3">
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-300">
                          {persona.content.substring(0, 500)}...
                        </pre>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </GlassCard>
        )}

        {/* Routing Tab */}
        {activeTab === 'routing' && (
          <GlassCard>
            <h2 className="mb-6 text-xl font-semibold text-white">Routing Configuration</h2>
            {routing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Primary Provider</label>
                  <p className="text-white">{routing.primaryProvider || 'Not configured'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Primary Model</label>
                  <p className="text-white">{routing.primaryModel || 'Not configured'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Fallback Provider</label>
                  <p className="text-white">{routing.fallbackProvider || 'Not configured'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Fallback Model</label>
                  <p className="text-white">{routing.fallbackModel || 'Not configured'}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">No routing configuration found</p>
            )}
          </GlassCard>
        )}

        {/* Test Tab */}
        {activeTab === 'test' && (
          <GlassCard>
            <h2 className="mb-6 text-xl font-semibold text-white">Test Eye</h2>
            <p className="text-slate-400">Test functionality coming soon...</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
