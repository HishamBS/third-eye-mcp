'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';

interface ModelInfo {
  name: string;
  displayName?: string;
  family?: string;
  capability?: {
    ctx?: number;
    vision?: boolean;
    jsonMode?: boolean;
  };
  lastSeen?: string;
}

interface EyeRouting {
  eye: string;
  primaryProvider: string;
  primaryModel: string;
  fallbackProvider?: string;
  fallbackModel?: string;
}

interface ProviderHealth {
  [provider: string]: boolean;
}

const PROVIDERS = [
  { id: 'groq', name: 'Groq', requiresKey: true },
  { id: 'openrouter', name: 'OpenRouter', requiresKey: true },
  { id: 'ollama', name: 'Ollama', requiresKey: false },
  { id: 'lmstudio', name: 'LM Studio', requiresKey: false },
];

export default function ModelsPage() {
  const [models, setModels] = useState<Record<string, ModelInfo[]>>({});
  const [routing, setRouting] = useState<EyeRouting[]>([]);
  const [pendingRoutingChanges, setPendingRoutingChanges] = useState<Record<string, Partial<EyeRouting>>>({});
  const [health, setHealth] = useState<ProviderHealth>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [savingRouting, setSavingRouting] = useState(false);
  const [allEyes, setAllEyes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      fetchAllEyes(),
      fetchRouting(),
      fetchHealth(),
      loadCachedModels(),
    ]);
  };

  const fetchHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        setHealth(data.providers || {});
      }
    } catch (err) {
      console.error('Failed to fetch health:', err);
    }
  };

  const fetchAllEyes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/eyes/all`);
      if (response.ok) {
        const result = await response.json();
        const eyesData = result.data || [];
        // Include ALL eyes (built-in + custom) in routing matrix
        setAllEyes(eyesData.map((eye: { id: string }) => eye.id));
      }
    } catch (error) {
      console.error('Failed to fetch eyes:', error);
    }
  };

  const fetchRouting = async () => {
    try {
      const response = await fetch(`${API_URL}/api/routing`);
      if (response.ok) {
        const result = await response.json();
        const routingData = result.data?.routings || [];
        setRouting(routingData);
      }
    } catch (error) {
      console.error('Failed to fetch routing:', error);
    }
  };

  const loadCachedModels = async () => {
    try {
      const response = await fetch(`${API_URL}/api/models`);
      if (response.ok) {
        const result = await response.json();
        setModels(result.data?.modelsByProvider || {});
      }
    } catch (error) {
      console.error('Failed to load cached models:', error);
    }
  };

  const fetchModels = async (providerId: string) => {
    setLoading(providerId);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/models/${providerId}/refresh`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        const modelsList = result.data?.models || [];
        setModels(prev => ({ ...prev, [providerId]: modelsList }));
        setSuccess(`Refreshed ${modelsList.length} models for ${providerId}`);
        await fetchHealth();
      } else {
        const result = await response.json();
        setError(result.error?.detail || `Failed to fetch models for ${providerId}`);
      }
    } catch (error) {
      setError(`Failed to fetch models for ${providerId}`);
    } finally {
      setLoading(null);
    }
  };

  const handleRoutingChange = (eye: string, updates: Partial<EyeRouting>) => {
    setPendingRoutingChanges(prev => ({
      ...prev,
      [eye]: { ...(prev[eye] || {}), ...updates }
    }));
  };

  const saveAllRoutingChanges = async () => {
    if (Object.keys(pendingRoutingChanges).length === 0) return;

    setSavingRouting(true);
    setError(null);

    try {
      const promises = Object.entries(pendingRoutingChanges).map(async ([eye, updates]) => {
        const currentRouting = routing.find(r => r.eye === eye);
        const fullRouting = { ...currentRouting, ...updates, eye };

        const response = await fetch(`${API_URL}/api/routing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullRouting),
        });

        if (!response.ok) {
          throw new Error(`Failed to update routing for ${eye}`);
        }
      });

      await Promise.all(promises);
      setSuccess(`Saved routing changes for ${Object.keys(pendingRoutingChanges).length} Eye(s)`);
      setPendingRoutingChanges({});
      await fetchRouting();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save routing changes');
    } finally {
      setSavingRouting(false);
    }
  };

  const discardRoutingChanges = () => {
    setPendingRoutingChanges({});
    setSuccess('Discarded routing changes');
  };

  const getRoutingForEye = (eye: string): EyeRouting | undefined => {
    const baseRouting = routing.find(r => r.eye === eye);
    const pendingChanges = pendingRoutingChanges[eye];

    if (!baseRouting) return undefined;

    // Merge pending changes with base routing
    return pendingChanges ? { ...baseRouting, ...pendingChanges } : baseRouting;
  };

  const getEyeIcon = (eye: string) => {
    const iconMap: Record<string, string> = {
      overseer: '🧿',
      sharingan: '👁️',
      'prompt-helper': '✨',
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
    return iconMap[eye] || '👁️';
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
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-slate-400 transition-colors hover:text-brand-accent">
                ← Home
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Models</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Models & Routing</h1>
              </div>
            </div>
            <div className="flex gap-4">
              <Link href="/personas" className="text-sm text-slate-400 transition-colors hover:text-white">
                Personas
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

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <GlassCard>
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-blue-400">ℹ️</span>
              <span className="font-medium text-blue-300">API Keys Configuration</span>
            </div>
            <p className="text-sm text-blue-100">
              Provider API keys are managed in the{' '}
              <Link href="/settings" className="font-semibold underline hover:text-blue-200">
                Settings page
              </Link>
              . Configure Groq, OpenRouter, Ollama, or LM Studio to load models.
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-6 text-xl font-semibold text-white">Available Models</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PROVIDERS.map((provider) => {
              const providerModels = models[provider.id] || [];
              const isHealthy = health[provider.id];

              return (
                <div key={provider.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
                      {isHealthy !== undefined && (
                        <span
                          className={`text-xl ${isHealthy ? 'text-green-400' : 'text-red-400'}`}
                          title={isHealthy ? 'Online' : 'Offline'}
                        >
                          {isHealthy ? '🟢' : '🔴'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => fetchModels(provider.id)}
                      disabled={loading === provider.id}
                      className="rounded-full border border-brand-outline/40 px-3 py-1 text-xs font-semibold text-brand-accent transition hover:border-brand-accent hover:bg-brand-accent/10 disabled:opacity-50"
                    >
                      {loading === provider.id ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>

                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {providerModels.length === 0 ? (
                      <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4 text-center text-sm text-slate-400">
                        {provider.requiresKey ? 'Add API key in Settings' : 'Click refresh to load models'}
                      </div>
                    ) : (
                      providerModels.map((model) => (
                        <div
                          key={model.name}
                          className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-3"
                        >
                          <div className="text-sm font-medium text-white">
                            {model.displayName || model.name}
                          </div>
                          {model.family && (
                            <div className="mt-1 text-xs text-slate-400">Family: {model.family}</div>
                          )}
                          {model.capability && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {model.capability.ctx && (
                                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                                  {model.capability.ctx}k ctx
                                </span>
                              )}
                              {model.capability.vision && (
                                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                                  Vision
                                </span>
                              )}
                              {model.capability.jsonMode && (
                                <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-300">
                                  JSON
                                </span>
                              )}
                            </div>
                          )}
                          {model.lastSeen && (
                            <div className="mt-1 text-xs text-slate-500">
                              Last seen: {new Date(model.lastSeen).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-6 text-xl font-semibold text-white">Eye Routing Matrix</h2>
          <div className="space-y-4">
            {allEyes.map((eye) => {
              const eyeRouting = getRoutingForEye(eye);
              return (
                <motion.div
                  key={eye}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-2xl">{getEyeIcon(eye)}</span>
                    <h3 className="text-lg font-semibold capitalize text-white">
                      {eye.replace(/_/g, ' ')}
                    </h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <h4 className="font-medium text-slate-300">Primary</h4>
                      <div className="space-y-2">
                        <select
                          value={eyeRouting?.primaryProvider || ''}
                          onChange={(e) =>
                            handleRoutingChange(eye, { primaryProvider: e.target.value })
                          }
                          disabled={savingRouting}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                        >
                          <option value="">Select Provider</option>
                          {PROVIDERS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={eyeRouting?.primaryModel || ''}
                          onChange={(e) =>
                            handleRoutingChange(eye, { primaryModel: e.target.value })
                          }
                          disabled={
                            savingRouting ||
                            !eyeRouting?.primaryProvider ||
                            !models[eyeRouting.primaryProvider]
                          }
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                        >
                          <option value="">Select Model</option>
                          {eyeRouting?.primaryProvider &&
                            models[eyeRouting.primaryProvider]?.map((model) => (
                              <option key={model.name} value={model.name}>
                                {model.displayName || model.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-slate-300">Fallback</h4>
                      <div className="space-y-2">
                        <select
                          value={eyeRouting?.fallbackProvider || ''}
                          onChange={(e) =>
                            handleRoutingChange(eye, { fallbackProvider: e.target.value })
                          }
                          disabled={savingRouting}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                        >
                          <option value="">None</option>
                          {PROVIDERS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={eyeRouting?.fallbackModel || ''}
                          onChange={(e) =>
                            handleRoutingChange(eye, { fallbackModel: e.target.value })
                          }
                          disabled={
                            savingRouting ||
                            !eyeRouting?.fallbackProvider ||
                            !models[eyeRouting.fallbackProvider]
                          }
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                        >
                          <option value="">Select Model</option>
                          {eyeRouting?.fallbackProvider &&
                            models[eyeRouting.fallbackProvider]?.map((model) => (
                              <option key={model.name} value={model.name}>
                                {model.displayName || model.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Save/Discard Routing Changes */}
          {Object.keys(pendingRoutingChanges).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center justify-between rounded-xl border border-brand-accent/40 bg-brand-accent/10 p-4"
            >
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium text-white">
                  You have unsaved routing changes for {Object.keys(pendingRoutingChanges).length} Eye{Object.keys(pendingRoutingChanges).length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={discardRoutingChanges}
                  disabled={savingRouting}
                  className="rounded-lg border border-brand-outline/40 bg-brand-paper px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-brand-paperElev disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Discard Changes
                </button>
                <button
                  onClick={saveAllRoutingChanges}
                  disabled={savingRouting}
                  className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingRouting ? 'Saving...' : 'Save Routing Changes'}
                </button>
              </div>
            </motion.div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
