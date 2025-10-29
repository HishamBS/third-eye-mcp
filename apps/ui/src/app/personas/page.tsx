'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { useDialog } from '@/hooks/useDialog';

interface Persona {
  id: string;
  eyeId: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  iconPath: string;
  mission: string;
  phases: {
    guidance: {
      stage: string;
      mission: string;
      check: string;
      reminders: readonly string[];
      example: string;
    };
    validation: {
      stage: string;
      mission: string;
      check: string;
      reminders: readonly string[];
      example: string;
    };
  };
  envelopeContract: {
    requiredKeys: readonly string[];
    requiredDataKeys: readonly string[];
    requiredUiKeys: readonly string[];
  };
  reminders: readonly string[];
  notes?: string;
}

interface PersonaVersion {
  version: number;
  content: string;
  active: boolean;
  createdAt: string;
}

export default function PersonasPage() {
  const dialog = useDialog();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedEye, setSelectedEye] = useState<string>('');
  const [eyeVersions, setEyeVersions] = useState<PersonaVersion[]>([]);
  const [editingPersona, setEditingPersona] = useState<string>('');
  const [personaContent, setPersonaContent] = useState<string>('');
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    mission: '',
    capabilities: [] as string[],
    capabilitiesText: '',
  });
  const [loading, setLoading] = useState(false);
  const [allEyes, setAllEyes] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const [diffVersions, setDiffVersions] = useState<{v1: number; v2: number}>({v1: 0, v2: 0});
  const [diffResult, setDiffResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    guidance: false,
    validation: false,
    envelope: false,
  });

  useEffect(() => {
    fetchAllEyes();
    fetchPersonas();

    // Set up WebSocket listener for persona updates
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'persona_activated') {
          fetchPersonas();
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    // Try to connect to WebSocket if available
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070').replace('http', 'ws');
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.addEventListener('message', handleMessage);
    } catch (e) {
      console.debug('WebSocket not available:', e);
    }

    return () => {
      if (ws) {
        ws.removeEventListener('message', handleMessage);
        ws.close();
      }
    };
  }, []);

  const fetchAllEyes = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/eyes/all`);
      if (response.ok) {
        const result = await response.json();
        const allEyesData = result.data || [];
        // Include ALL eyes (built-in + custom) for persona editing
        setAllEyes(allEyesData.map((eye: { id: string }) => eye.id));
      }
    } catch (error) {
      console.error('Failed to fetch eyes:', error);
    }
  };

  useEffect(() => {
    if (selectedEye) {
      const persona = personas.find(p => p.id === selectedEye);
      if (persona) {
        setEyeVersions([{
          version: 1,
          content: `${persona.name}\n\n${persona.mission}`,
          active: true,
          createdAt: new Date().toISOString(),
        }]);
      } else {
        setEyeVersions([]);
      }
    } else {
      setEyeVersions([]);
    }
  }, [selectedEye, personas]);

  const fetchPersonas = async () => {
    try {
      const response = await fetch('/api/personas/blueprints');
      if (response.ok) {
        const result = await response.json();
        const personasArray = Array.isArray(result.data) ? result.data : [];
        setPersonas(personasArray as Persona[]);
      }
    } catch (error) {
      console.error('Failed to fetch personas:', error);
      setError('Failed to load personas');
    }
  };

  const getPersonaById = (eyeId: string): Persona | undefined => {
    return personas.find(p => p.id === eyeId);
  };

  const startEditing = (eyeId: string) => {
    const persona = getPersonaById(eyeId);
    setEditingPersona(eyeId);
    if (persona) {
      setEditForm({
        name: persona.name,
        description: persona.description,
        mission: persona.mission,
        capabilities: persona.capabilities,
        capabilitiesText: persona.capabilities.join(', '),
      });
    }
  };

  const cancelEditing = () => {
    setEditingPersona('');
    setPersonaContent('');
  };

  const savePersona = async () => {
    if (!editingPersona || !personaContent.trim()) {
      setError('Persona content is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/personas/${editingPersona}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: personaContent.trim(),
        }),
      });

      if (response.ok) {
        setSuccess('Persona published successfully (hot-reloaded)');
        await fetchPersonas();
        setEditingPersona('');
        setPersonaContent('');
      } else {
        const result = await response.json();
        setError(result.error?.detail || 'Failed to save persona');
      }
    } catch (error) {
      setError('Failed to save persona');
    } finally {
      setLoading(false);
    }
  };

  const activateVersion = async (eye: string, version: number) => {
    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/personas/${eye}/activate/${version}`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setSuccess(`Version ${version} activated (hot-reloaded)`);
        await fetchPersonas();
      } else {
        setError('Failed to activate version');
      }
    } catch (error) {
      setError('Failed to activate version');
    } finally {
      setLoading(false);
    }
  };

  const viewDiff = async (eye: string, v1: number, v2: number) => {
    if (v1 === v2) {
      setError('Please select two different versions');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/personas/${eye}/diff/${v1}/${v2}`);

      if (response.ok) {
        const result = await response.json();
        setDiffResult(result.data);
        setShowDiff(true);
      } else {
        setError('Failed to load diff');
      }
    } catch (error) {
      setError('Failed to load diff');
    } finally {
      setLoading(false);
    }
  };

  const revertToVersion = async (eye: string, version: number) => {
    const confirmed = await dialog.confirm('Revert Persona', `Revert ${eye} to version ${version}? This will create a new version.`, 'Revert', 'Cancel');
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const versionToRevert = eyeVersions.find(v => v.version === version);
      if (!versionToRevert) {
        setError('Version not found');
        return;
      }

      const response = await fetch(`${API_URL}/api/personas/${eye}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: versionToRevert.content }),
      });

      if (response.ok) {
        setSuccess(`Reverted to version ${version} (hot-reloaded)`);
        await fetchPersonas();
      } else {
        setError('Failed to revert');
      }
    } catch (error) {
      setError('Failed to revert');
    } finally {
      setLoading(false);
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

  const getEyeIconPath = (eye: string) => {
    return `/eyes/${eye}.svg`;
  };

  const getEyeColor = (eye: string) => {
    if (eye.includes('sharingan')) return 'border-eye-sharingan/40 bg-eye-sharingan/5';
    if (eye.includes('rinnegan')) return 'border-eye-rinnegan/40 bg-eye-rinnegan/5';
    if (eye.includes('tenseigan')) return 'border-eye-tenseigan/40 bg-eye-tenseigan/5';
    if (eye.includes('jogan')) return 'border-eye-jogan/40 bg-eye-jogan/5';
    if (eye.includes('byakugan')) return 'border-eye-byakugan/40 bg-eye-byakugan/5';
    if (eye.includes('mangekyo')) return 'border-eye-mangekyo/40 bg-eye-mangekyo/5';
    return 'border-brand-accent/40 bg-brand-accent/5';
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
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Personas</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Eye Personas</h1>
              </div>
            </div>
            <div className="flex gap-4">
              <Link href="/models" className="text-sm text-slate-400 transition-colors hover:text-white">
                Models
              </Link>
              <Link href="/settings" className="text-sm text-slate-400 transition-colors hover:text-white">
                Settings
              </Link>
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
        <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
          {/* Eyes List */}
          <div>
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Eyes</h2>
            <div className="space-y-4">
              {personas.map((persona, index) => {
                const eye = persona.id;
                const isSelected = selectedEye === eye;
                const isEditing = editingPersona === eye;

                return (
                  <motion.div
                    key={eye}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedEye(isSelected ? '' : eye)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${getEyeColor(eye)} ${
                      isSelected ? 'ring-2 ring-brand-accent' : ''
                    }`}
                  >
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                          <img 
                            src={getEyeIconPath(eye)} 
                            alt={`${persona.name} icon`}
                            className="h-8 w-8"
                            onError={(e) => {
                              // Fallback to emoji if SVG fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div>
                            <h3 className="font-bold capitalize">
                              {persona.name}
                            </h3>
                            <p className="text-xs opacity-80">
                              {persona.description}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(eye);
                          }}
                          className="rounded-full bg-white/20 px-3 py-1 text-xs transition hover:bg-white/30"
                        >
                          {isEditing ? 'Editing...' : 'Edit'}
                        </button>
                      </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div>
            {selectedEye && !editingPersona && !showDiff ? (
              /* Persona Detail View */
              <GlassCard>
                {(() => {
                  const persona = getPersonaById(selectedEye);
                  if (!persona) return null;
                  
                  return (
                    <>
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-semibold text-white">{persona.name}</h2>
                          <p className="mt-1 text-sm text-slate-400">{persona.description}</p>
                        </div>
                        <button
                          onClick={() => startEditing(selectedEye)}
                          className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary"
                        >
                          Edit
                        </button>
                      </div>
                      
                      <div className="prose prose-invert max-w-none">
                        <section className="mb-8">
                          <h3 className="mb-3 text-lg font-semibold text-white">Mission</h3>
                          <p className="text-slate-300">{persona.mission}</p>
                        </section>
                        
                        <section className="mb-8">
                          <h3 className="mb-3 text-lg font-semibold text-white">Capabilities</h3>
                          <div className="flex flex-wrap gap-2">
                            {persona.capabilities.map((cap) => (
                              <span key={cap} className="rounded-full bg-brand-accent/20 px-3 py-1 text-sm text-brand-accent">
                                {cap}
                              </span>
                            ))}
                          </div>
                        </section>
                        
                        <section className="mb-6">
                          <h3 className="mb-3 text-lg font-semibold text-white">Phases</h3>
                          <div className="space-y-3">
                            {persona.phases.guidance && (
                              <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 overflow-hidden">
                                <button
                                  onClick={() => setExpandedSections(prev => ({ ...prev, guidance: !prev.guidance }))}
                                  className="w-full p-4 flex items-center justify-between text-left hover:bg-blue-500/20 transition"
                                >
                                  <h4 className="font-semibold text-blue-300">Guidance Phase</h4>
                                  <span className="text-blue-300">{expandedSections.guidance ? '▼' : '▶'}</span>
                                </button>
                                {expandedSections.guidance && (
                                  <div className="px-4 pb-4 space-y-3">
                                    <p className="text-sm text-slate-300">{persona.phases.guidance.mission}</p>
                                    <div>
                                      <p className="mb-1 text-xs font-semibold text-blue-300">Check:</p>
                                      <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
                                        {persona.phases.guidance.check.split(',').map((item, idx) => (
                                          <li key={idx}>{item.trim()}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    {persona.phases.guidance.reminders && persona.phases.guidance.reminders.length > 0 && (
                                      <div>
                                        <p className="mb-1 text-xs font-semibold text-blue-300">Reminders:</p>
                                        <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
                                          {persona.phases.guidance.reminders.map((reminder, idx) => (
                                            <li key={idx}>{reminder}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {persona.phases.validation && (
                              <div className="rounded-xl border border-green-500/40 bg-green-500/10 overflow-hidden">
                                <button
                                  onClick={() => setExpandedSections(prev => ({ ...prev, validation: !prev.validation }))}
                                  className="w-full p-4 flex items-center justify-between text-left hover:bg-green-500/20 transition"
                                >
                                  <h4 className="font-semibold text-green-300">Validation Phase</h4>
                                  <span className="text-green-300">{expandedSections.validation ? '▼' : '▶'}</span>
                                </button>
                                {expandedSections.validation && (
                                  <div className="px-4 pb-4 space-y-3">
                                    <p className="text-sm text-slate-300">{persona.phases.validation.mission}</p>
                                    <div>
                                      <p className="mb-1 text-xs font-semibold text-green-300">Check:</p>
                                      <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
                                        {persona.phases.validation.check.split(',').map((item, idx) => (
                                          <li key={idx}>{item.trim()}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    {persona.phases.validation.reminders && persona.phases.validation.reminders.length > 0 && (
                                      <div>
                                        <p className="mb-1 text-xs font-semibold text-green-300">Reminders:</p>
                                        <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
                                          {persona.phases.validation.reminders.map((reminder, idx) => (
                                            <li key={idx}>{reminder}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </section>
                        
                        <section className="mb-6">
                          <div className="rounded-xl border border-brand-outline/50 bg-brand-paper/30 overflow-hidden">
                            <button
                              onClick={() => setExpandedSections(prev => ({ ...prev, envelope: !prev.envelope }))}
                              className="w-full p-4 flex items-center justify-between text-left hover:bg-brand-paper/50 transition"
                            >
                              <h3 className="text-lg font-semibold text-white">Envelope Contract</h3>
                              <span className="text-brand-accent">{expandedSections.envelope ? '▼' : '▶'}</span>
                            </button>
                            {expandedSections.envelope && (
                              <div className="px-4 pb-4 space-y-3">
                                <div>
                                  <p className="mb-1 text-xs font-semibold text-brand-accent">Required Keys:</p>
                                  <ul className="list-inside list-disc text-sm text-slate-300">
                                    {persona.envelopeContract.requiredKeys.map((key, idx) => (
                                      <li key={idx}>{key}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="mb-1 text-xs font-semibold text-brand-accent">Required Data Keys:</p>
                                  <ul className="list-inside list-disc text-sm text-slate-300">
                                    {persona.envelopeContract.requiredDataKeys.map((key, idx) => (
                                      <li key={idx}>{key}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="mb-1 text-xs font-semibold text-brand-accent">Required UI Keys:</p>
                                  <ul className="list-inside list-disc text-sm text-slate-300">
                                    {persona.envelopeContract.requiredUiKeys.map((key, idx) => (
                                      <li key={idx}>{key}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>
                        </section>
                        
                        {persona.notes && (
                          <section className="mb-8">
                            <h3 className="mb-3 text-lg font-semibold text-white">Notes</h3>
                            <p className="text-slate-300">{persona.notes}</p>
                          </section>
                        )}
                      </div>
                    </>
                  );
                })()}
              </GlassCard>
            ) : showDiff && diffResult ? (
              /* Diff View */
              <GlassCard>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Persona Diff</h2>
                  <button
                    onClick={() => { setShowDiff(false); setDiffResult(null); }}
                    className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="rounded-full bg-red-500/20 px-3 py-1 text-red-400">
                      Version {diffResult.v1}
                    </span>
                    <span>→</span>
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-green-400">
                      Version {diffResult.v2}
                    </span>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-red-400">Version {diffResult.v1}</h3>
                      <pre className="h-96 overflow-auto rounded-xl bg-brand-ink/50 p-4 text-xs text-slate-300">
                        {diffResult.content1}
                      </pre>
                    </div>
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-green-400">Version {diffResult.v2}</h3>
                      <pre className="h-96 overflow-auto rounded-xl bg-brand-ink/50 p-4 text-xs text-slate-300">
                        {diffResult.content2}
                      </pre>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-blue-300">Changes Summary</h4>
                    <p className="text-sm text-blue-100">
                      {diffResult.changedLines || 0} lines changed
                    </p>
                  </div>
                </div>
              </GlassCard>
            ) : editingPersona ? (
              /* Persona Editor Form */
              <GlassCard>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    Edit {editingPersona} Persona
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={cancelEditing}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={savePersona}
                      disabled={loading || !editForm.name.trim()}
                      className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary disabled:opacity-50"
                    >
                      {loading ? 'Publishing...' : 'Publish (Hot-Reload)'}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                        placeholder="Overseer"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Description
                      </label>
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                        placeholder="Navigator that analyzes requests..."
                      />
                    </div>
                  </div>

                  {/* Mission */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Mission
                    </label>
                    <textarea
                      value={editForm.mission}
                      onChange={(e) => setEditForm(prev => ({ ...prev, mission: e.target.value }))}
                      rows={3}
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                      placeholder="You are the BRAIN of Third Eye MCP..."
                    />
                  </div>

                  {/* Capabilities */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Capabilities (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={editForm.capabilitiesText}
                      onChange={(e) => setEditForm(prev => ({ 
                        ...prev, 
                        capabilitiesText: e.target.value,
                        capabilities: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
                      }))}
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                      placeholder="auto_routing, orchestration, master_coordination"
                    />
                    {editForm.capabilities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {editForm.capabilities.map((cap, idx) => (
                          <span key={idx} className="rounded-full bg-brand-accent/20 px-3 py-1 text-xs text-brand-accent">
                            {cap}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-yellow-700/50 bg-yellow-900/10 p-5">
                    <h4 className="font-medium text-yellow-300">Hot-Reload Enabled</h4>
                    <p className="mt-2 text-sm text-yellow-100">
                      Changes take effect immediately for new runs (no restart needed)
                    </p>
                  </div>
                </div>
              </GlassCard>
            ) : selectedEye ? (
              /* Persona Versions */
              <GlassCard>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    {selectedEye} Persona Versions
                  </h2>
                  <button
                    onClick={() => startEditing(selectedEye)}
                    className="rounded-full bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary"
                  >
                    Create New Version
                  </button>
                </div>

                {eyeVersions.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="mb-4 text-lg text-slate-400">No personas found</p>
                    <button
                      onClick={() => startEditing(selectedEye)}
                      className="rounded-full bg-brand-accent px-6 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary"
                    >
                      Create First Persona
                    </button>
                  </div>
                ) : (
                  <>
                  <div className="mb-6 flex gap-3">
                    <select
                      value={diffVersions.v1}
                      onChange={(e) => setDiffVersions({ ...diffVersions, v1: parseInt(e.target.value) })}
                      className="rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none"
                    >
                      <option value="0">Select version 1</option>
                      {eyeVersions.map((v) => (
                        <option key={v.version} value={v.version}>
                          Version {v.version} {v.active ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                    <select
                      value={diffVersions.v2}
                      onChange={(e) => setDiffVersions({ ...diffVersions, v2: parseInt(e.target.value) })}
                      className="rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none"
                    >
                      <option value="0">Select version 2</option>
                      {eyeVersions.map((v) => (
                        <option key={v.version} value={v.version}>
                          Version {v.version} {v.active ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => viewDiff(selectedEye, diffVersions.v1, diffVersions.v2)}
                      disabled={!diffVersions.v1 || !diffVersions.v2 || diffVersions.v1 === diffVersions.v2}
                      className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      View Diff
                    </button>
                  </div>

                  <div className="space-y-4">
                    {eyeVersions.map((version) => (
                      <div
                        key={version.version}
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
                          </div>
                          <div className="flex gap-2">
                            {!version.active && (
                              <button
                                onClick={() => activateVersion(selectedEye, version.version)}
                                disabled={loading}
                                className="rounded-full border border-green-600/50 px-4 py-1.5 text-xs font-semibold text-green-400 transition hover:bg-green-600/20 disabled:opacity-50"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => revertToVersion(selectedEye, version.version)}
                              disabled={loading}
                              className="rounded-full border border-blue-600/50 px-4 py-1.5 text-xs font-semibold text-blue-400 transition hover:bg-blue-600/20 disabled:opacity-50"
                            >
                              Revert
                            </button>
                          </div>
                        </div>

                        <div className="rounded-lg bg-brand-paper/70 p-3">
                          <pre className="whitespace-pre-wrap text-sm text-slate-300">
                            {version.content}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </GlassCard>
            ) : (
              /* Welcome Screen */
              <GlassCard className="p-12 text-center">
                <h2 className="mb-4 text-2xl font-semibold text-white">Persona Management</h2>
                <p className="mb-6 text-lg text-slate-400">
                  Select an Eye from the left to view and edit its personas
                </p>
                <div className="space-y-2 text-sm text-slate-500">
                  <p>• Each Eye has versioned personas with system prompts</p>
                  <p>• Only one version can be active at a time</p>
                  <p>• Changes take effect immediately for new runs (hot-reload)</p>
                  <p>• Previous versions are preserved for rollback</p>
                  <p>• Click "Edit" on any Eye to create or modify its persona</p>
                </div>
                {personas.length === 0 && (
                  <div className="mt-8 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
                    <p className="text-yellow-400 text-sm">
                      No personas detected. Make sure the server is running and personas are properly configured.
                    </p>
                  </div>
                )}
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
