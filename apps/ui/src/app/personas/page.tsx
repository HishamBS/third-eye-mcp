'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';

interface Persona {
  eye: string;
  version: number;
  content: string;
  active: boolean;
  createdAt: string;
}

interface PersonaVersion {
  version: number;
  content: string;
  active: boolean;
  createdAt: string;
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedEye, setSelectedEye] = useState<string>('');
  const [eyeVersions, setEyeVersions] = useState<PersonaVersion[]>([]);
  const [editingPersona, setEditingPersona] = useState<string>('');
  const [personaContent, setPersonaContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [allEyes, setAllEyes] = useState<string[]>([]);

  useEffect(() => {
    fetchAllEyes();
    fetchPersonas();
  }, []);

  const fetchAllEyes = async () => {
    try {
      const response = await fetch('/api/eyes/all');
      if (response.ok) {
        const eyes = await response.json();
        setAllEyes(eyes.map((eye: any) => eye.id));
      }
    } catch (error) {
      console.error('Failed to fetch eyes:', error);
    }
  };

  useEffect(() => {
    if (selectedEye) {
      const versions = personas
        .filter(p => p.eye === selectedEye)
        .map(p => ({
          version: p.version,
          content: p.content,
          active: p.active,
          createdAt: p.createdAt,
        }))
        .sort((a, b) => b.version - a.version);
      setEyeVersions(versions);
    } else {
      setEyeVersions([]);
    }
  }, [selectedEye, personas]);

  const fetchPersonas = async () => {
    try {
      const response = await fetch('/api/personas');
      if (response.ok) {
        const data = await response.json();
        setPersonas(data);
      }
    } catch (error) {
      console.error('Failed to fetch personas:', error);
    }
  };

  const getActivePersona = (eye: string): Persona | undefined => {
    return personas.find(p => p.eye === eye && p.active);
  };

  const startEditing = (eye: string) => {
    const activePersona = getActivePersona(eye);
    setEditingPersona(eye);
    setPersonaContent(activePersona?.content || '');
  };

  const cancelEditing = () => {
    setEditingPersona('');
    setPersonaContent('');
  };

  const savePersona = async () => {
    if (!editingPersona || !personaContent.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eye: editingPersona,
          content: personaContent.trim(),
          active: true,
        }),
      });

      if (response.ok) {
        await fetchPersonas();
        setEditingPersona('');
        setPersonaContent('');
      }
    } catch (error) {
      console.error('Failed to save persona:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEyeIcon = (eye: string) => {
    const icons: Record<string, string> = {
      sharingan: '👁️',
      rinnegan: '🌀',
      tenseigan: '💫',
      jogan: '🔮',
      byakugan: '👀',
      mangekyo: '⚡',
    };
    return icons[eye] || '👁️';
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

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
          {/* Eyes List */}
          <div>
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Eyes</h2>
            <div className="space-y-4">
              {allEyes.map((eye, index) => {
                const activePersona = getActivePersona(eye);
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
                        <span className="text-2xl">{getEyeIcon(eye)}</span>
                        <div>
                          <h3 className="font-bold capitalize">{eye}</h3>
                          <p className="text-xs opacity-80">
                            Version {activePersona?.version || 1}
                            {activePersona?.active && ' (Active)'}
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
            {editingPersona ? (
              /* Persona Editor */
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
                      disabled={loading || !personaContent.trim()}
                      className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save & Activate'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Persona Content
                    </label>
                    <textarea
                      value={personaContent}
                      onChange={(e) => setPersonaContent(e.target.value)}
                      placeholder="Enter the system prompt for this Eye persona..."
                      className="h-64 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                    />
                  </div>

                  <div className="rounded-xl border border-yellow-700/50 bg-yellow-900/10 p-5">
                    <h4 className="font-medium text-yellow-300">Persona Guidelines</h4>
                    <ul className="mt-3 space-y-1 text-sm text-yellow-100">
                      <li>• Define the Eye's role and responsibilities clearly</li>
                      <li>• Specify the expected output format (Overseer JSON envelope)</li>
                      <li>• Include any specific instructions or constraints</li>
                      <li>• Changes take effect immediately for new runs</li>
                    </ul>
                  </div>
                </div>
              </GlassCard>
            ) : selectedEye ? (
              /* Persona Versions */
              <GlassCard>
                <h2 className="mb-6 text-xl font-semibold text-white">
                  {selectedEye} Persona Versions
                </h2>

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
                        </div>

                        <div className="rounded-lg bg-brand-paper/70 p-3">
                          <pre className="whitespace-pre-wrap text-sm text-slate-300">
                            {version.content}
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
                <h2 className="mb-4 text-2xl font-semibold text-white">Persona Management</h2>
                <p className="mb-6 text-lg text-slate-400">
                  Select an Eye from the left to view and edit its personas
                </p>
                <div className="space-y-2 text-sm text-slate-500">
                  <p>• Each Eye has versioned personas with system prompts</p>
                  <p>• Only one version can be active at a time</p>
                  <p>• Changes take effect immediately for new runs</p>
                  <p>• Previous versions are preserved for rollback</p>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
