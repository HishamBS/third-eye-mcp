'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';

interface ModelInfo {
  name: string;
  family?: string;
  capability?: {
    ctx?: number;
    vision?: boolean;
    jsonMode?: boolean;
  };
}

interface EyeRouting {
  eye: string;
  primaryProvider: string;
  primaryModel: string;
  fallbackProvider?: string;
  fallbackModel?: string;
}

interface ProviderModels {
  [providerId: string]: ModelInfo[];
}

const PROVIDERS = [
  { id: 'groq', name: 'Groq', requiresKey: true },
  { id: 'openrouter', name: 'OpenRouter', requiresKey: true },
  { id: 'ollama', name: 'Ollama', requiresKey: false },
  { id: 'lmstudio', name: 'LM Studio', requiresKey: false },
];

export default function ModelsPage() {
  const [models, setModels] = useState<ProviderModels>({});
  const [routing, setRouting] = useState<EyeRouting[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<{[key: string]: string}>({});
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<{[key: string]: 'saving' | 'saved' | 'error'}>({});
  const [allEyes, setAllEyes] = useState<string[]>([]);

  useEffect(() => {
    fetchAllEyes();
    fetchRouting();
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

  const fetchRouting = async () => {
    try {
      const response = await fetch('/api/routing');
      if (response.ok) {
        const routingData = await response.json();
        setRouting(routingData);
      }
    } catch (error) {
      console.error('Failed to fetch routing:', error);
    }
  };

  const fetchModels = async (providerId: string) => {
    setLoading(providerId);
    try {
      const response = await fetch(`/api/models/${providerId}`);
      if (response.ok) {
        const modelData = await response.json();
        setModels(prev => ({ ...prev, [providerId]: modelData }));
      } else {
        console.error(`Failed to fetch models for ${providerId}`);
      }
    } catch (error) {
      console.error(`Failed to fetch models for ${providerId}:`, error);
    } finally {
      setLoading(null);
    }
  };

  const updateRouting = async (eye: string, updates: Partial<EyeRouting>) => {
    try {
      const response = await fetch('/api/routing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eye,
          ...updates,
        }),
      });

      if (response.ok) {
        await fetchRouting();
      }
    } catch (error) {
      console.error('Failed to update routing:', error);
    }
  };

  const getRoutingForEye = (eye: string): EyeRouting | undefined => {
    return routing.find(r => r.eye === eye);
  };

  const saveApiKey = async (providerId: string) => {
    const key = apiKeys[providerId];
    if (!key || !key.trim()) {
      return;
    }

    setSaveStatus(prev => ({ ...prev, [providerId]: 'saving' }));

    try {
      const response = await fetch('/api/provider-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: providerId,
          label: `${providerId} API Key`,
          apiKey: key.trim(),
        }),
      });

      if (response.ok) {
        setSavedKeys(prev => new Set([...prev, providerId]));
        setSaveStatus(prev => ({ ...prev, [providerId]: 'saved' }));
        setTimeout(() => fetchModels(providerId), 500);
      } else {
        setSaveStatus(prev => ({ ...prev, [providerId]: 'error' }));
      }
    } catch (error) {
      console.error(`Failed to save API key for ${providerId}:`, error);
      setSaveStatus(prev => ({ ...prev, [providerId]: 'error' }));
    }
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

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* API Keys moved to Settings page */}
        <GlassCard>
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-blue-400">ℹ️</span>
              <span className="font-medium text-blue-300">API Keys Configuration</span>
            </div>
            <p className="text-sm text-blue-100">
              Provider API keys are now managed in the <Link href="/settings" className="font-semibold underline hover:text-blue-200">Settings page</Link>.
              Navigate to Settings to configure your Groq and OpenRouter API keys.
            </p>
          </div>
        </GlassCard>

        {/* Models Section */}
        <GlassCard>
          <h2 className="mb-4 text-xl font-semibold text-white">Available Models</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PROVIDERS.map(provider => (
              <div key={provider.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
                  <button
                    onClick={() => fetchModels(provider.id)}
                    disabled={loading === provider.id}
                    className="rounded-full border border-brand-outline/40 px-3 py-1 text-xs font-semibold text-brand-accent transition hover:border-brand-accent hover:bg-brand-accent/10 disabled:opacity-50"
                  >
                    {loading === provider.id ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {models[provider.id]?.map(model => (
                    <div
                      key={model.name}
                      className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-3"
                    >
                      <div className="text-sm font-medium text-white">{model.name}</div>
                      {model.family && (
                        <div className="text-xs text-slate-400">Family: {model.family}</div>
                      )}
                      {model.capability && (
                        <div className="text-xs text-slate-400">
                          {model.capability.ctx && `Context: ${model.capability.ctx}`}
                          {model.capability.vision && ' • Vision'}
                          {model.capability.jsonMode && ' • JSON'}
                        </div>
                      )}
                    </div>
                  )) || (
                    <div className="text-sm text-slate-400">
                      Click refresh to load models
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Routing Matrix Section */}
        <GlassCard>
          <h2 className="mb-4 text-xl font-semibold text-white">Eye Routing Matrix</h2>
          <div className="space-y-4">
            {allEyes.map(eye => {
              const eyeRouting = getRoutingForEye(eye);
              return (
                <motion.div
                  key={eye}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-2xl">
                      {eye === 'sharingan' ? '👁️' : eye === 'rinnegan' ? '🌀' : '💫'}
                    </span>
                    <h3 className="text-lg font-semibold capitalize text-white">{eye}</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Primary Routing */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-slate-300">Primary</h4>
                      <div className="space-y-2">
                        <select
                          value={eyeRouting?.primaryProvider || ''}
                          onChange={(e) => updateRouting(eye, { primaryProvider: e.target.value })}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                        >
                          <option value="">Select Provider</option>
                          {PROVIDERS.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <select
                          value={eyeRouting?.primaryModel || ''}
                          onChange={(e) => updateRouting(eye, { primaryModel: e.target.value })}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                          disabled={!eyeRouting?.primaryProvider || !models[eyeRouting.primaryProvider]}
                        >
                          <option value="">Select Model</option>
                          {eyeRouting?.primaryProvider && models[eyeRouting.primaryProvider]?.map(model => (
                            <option key={model.name} value={model.name}>{model.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Fallback Routing */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-slate-300">Fallback</h4>
                      <div className="space-y-2">
                        <select
                          value={eyeRouting?.fallbackProvider || ''}
                          onChange={(e) => updateRouting(eye, { fallbackProvider: e.target.value })}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                        >
                          <option value="">Select Provider</option>
                          {PROVIDERS.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <select
                          value={eyeRouting?.fallbackModel || ''}
                          onChange={(e) => updateRouting(eye, { fallbackModel: e.target.value })}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                          disabled={!eyeRouting?.fallbackProvider || !models[eyeRouting.fallbackProvider]}
                        >
                          <option value="">Select Model</option>
                          {eyeRouting?.fallbackProvider && models[eyeRouting.fallbackProvider]?.map(model => (
                            <option key={model.name} value={model.name}>{model.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
