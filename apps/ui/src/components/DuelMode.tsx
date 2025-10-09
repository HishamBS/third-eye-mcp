'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Trophy, Clock, Zap } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';

const ALLOWED_PROVIDERS = ['groq', 'ollama', 'lmstudio'] as const;

const PROVIDER_LABELS: Record<string, string> = {
  groq: 'Groq',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
};

const FALLBACK_PROVIDER_MODELS: Record<string, string[]> = {
  groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
  ollama: ['llama3.1:8b', 'qwen2.5:14b'],
  lmstudio: ['local-model'],
};

interface DuelConfig {
  provider: string;
  model: string;
}

interface DuelResult {
  provider: string;
  providerLabel?: string;
  model: string;
  output: string;
  latency: number;
  tokens: { input: number; output: number };
  cost?: number;
  verdict: 'APPROVED' | 'REJECTED' | 'NEEDS_INPUT';
  confidence?: number;
  score: number;
}

export interface DuelModeProps {
  sessionId: string;
  prompt: string;
  onComplete?: (results: DuelResult[]) => void;
}

export function DuelMode({ sessionId, prompt, onComplete }: DuelModeProps) {
  const dialog = useDialog();
  const [selectedConfigs, setSelectedConfigs] = useState<DuelConfig[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DuelResult[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<Record<string, string[]>>(FALLBACK_PROVIDER_MODELS);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [stagedProvider, setStagedProvider] = useState<string>('');
  const [stagedModel, setStagedModel] = useState<string>('');

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoadingProviders(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
        const response = await fetch(`${API_URL}/api/models`);
        if (!response.ok) {
          setAvailableProviders(FALLBACK_PROVIDER_MODELS);
          return;
        }

        const payload = await response.json();
        const modelsByProvider = payload?.modelsByProvider ?? {};

        const mapped: Record<string, string[]> = {};
        for (const provider of ALLOWED_PROVIDERS) {
          const entries = Array.isArray(modelsByProvider?.[provider])
            ? modelsByProvider[provider]
            : [];
          const names = entries
            .map((model: any) => {
              if (typeof model === 'string') return model;
              if (model?.name) return model.name;
              if (model?.displayName) return model.displayName;
              return '';
            })
            .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
            .filter((name) => !/claude|chatgpt|gpt/i.test(name));

          if (names.length > 0) {
            mapped[provider] = names;
          }
        }

        setAvailableProviders(Object.keys(mapped).length > 0 ? mapped : FALLBACK_PROVIDER_MODELS);
      } catch (error) {
        console.error('Failed to load provider models for duel mode:', error);
        setAvailableProviders(FALLBACK_PROVIDER_MODELS);
      } finally {
        setLoadingProviders(false);
      }
    };

    fetchProviders();
  }, []);

  useEffect(() => {
    const providers = Object.keys(availableProviders);
    if (providers.length === 0) {
      setStagedProvider('');
      setStagedModel('');
      return;
    }

    if (!stagedProvider || !availableProviders[stagedProvider]) {
      const firstProvider = providers[0];
      setStagedProvider(firstProvider);
      const models = availableProviders[firstProvider] || [];
      setStagedModel(models[0] ?? '');
    }
  }, [availableProviders, stagedProvider]);

  useEffect(() => {
    if (!stagedProvider) return;
    const models = availableProviders[stagedProvider] || [];
    if (!models.includes(stagedModel)) {
      setStagedModel(models[0] ?? '');
    }
  }, [stagedProvider, availableProviders]);

  const formatProviderName = (provider: string) =>
    PROVIDER_LABELS[provider] || provider.replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const addConfig = async (provider: string, model: string) => {
    if (selectedConfigs.length >= 4) {
      await dialog.alert('Maximum Models', 'Maximum 4 models for duel');
      return;
    }
    if (selectedConfigs.some(c => c.provider === provider && c.model === model)) {
      await dialog.alert('Duplicate Model', 'Model already selected');
      return;
    }
    setSelectedConfigs([...selectedConfigs, { provider, model }]);
  };

  const handleAddCurrentConfig = async () => {
    if (!stagedProvider || !stagedModel) {
      await dialog.alert('Selection Required', 'Choose both a provider and a model before adding a competitor.');
      return;
    }
    await addConfig(stagedProvider, stagedModel);
  };

  const removeConfig = (index: number) => {
    setSelectedConfigs(selectedConfigs.filter((_, i) => i !== index));
  };

  const runDuel = async () => {
    if (selectedConfigs.length < 2) {
      await dialog.alert('Insufficient Models', 'Select at least 2 models to duel');
      return;
    }

    setIsRunning(true);
    setResults([]);
    setWinner(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/duel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          prompt,
          configs: selectedConfigs,
        }),
      });

      if (!response.ok) {
        throw new Error('Duel request failed');
      }

      const data = await response.json();
      const duelResults: DuelResult[] = data.results || [];

      const sortedResults = duelResults.sort((a, b) => b.score - a.score);
      setResults(sortedResults);

      if (sortedResults.length > 0) {
        const top = sortedResults[0];
        setWinner(`${top.providerLabel ?? formatProviderName(top.provider)}/${top.model}`);
      }

      if (onComplete) {
        onComplete(sortedResults);
      }
    } catch (error) {
      console.error('Duel error:', error);
      await dialog.alert('Duel Failed', 'Failed to run duel. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'APPROVED':
        return <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">✓ Approved</span>;
      case 'REJECTED':
        return <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400">✗ Rejected</span>;
      case 'NEEDS_INPUT':
        return <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs text-yellow-400">⚠ Needs Input</span>;
      default:
        return <span className="rounded-full bg-gray-500/20 px-2 py-1 text-xs text-gray-400">Unknown</span>;
    }
  };

  return (
    <div className="rounded-2xl border border-brand-outline/40 bg-brand-paper/50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">⚔️ Duel Mode</h2>
          <p className="mt-1 text-sm text-slate-400">Compare 2-4 models side-by-side</p>
        </div>
        <button
          onClick={runDuel}
          disabled={selectedConfigs.length < 2 || isRunning}
          className={`flex items-center space-x-2 rounded-lg px-4 py-2 font-semibold transition ${
            selectedConfigs.length >= 2 && !isRunning
              ? 'bg-brand-accent text-white hover:bg-brand-accent/90'
              : 'cursor-not-allowed bg-gray-600 text-gray-400'
          }`}
        >
          {isRunning ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>Start Duel</span>
            </>
          )}
        </button>
      </div>

      {/* Model Selection */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Selected Models ({selectedConfigs.length}/4)</h3>
        <div className="grid grid-cols-2 gap-3">
          {selectedConfigs.map((config, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center justify-between rounded-lg border border-brand-outline/40 bg-brand-ink/60 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">{formatProviderName(config.provider)}</p>
                <p className="text-xs text-slate-400">{config.model}</p>
              </div>
              <button
                onClick={() => removeConfig(index)}
                className="rounded-full p-1 text-red-400 hover:bg-red-500/20"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </div>

        {selectedConfigs.length < 4 && (
          <div className="mt-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase text-slate-500">Configure competitor</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Provider</label>
                <select
                  className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-sm text-slate-200 focus:border-brand-accent focus:outline-none"
                  value={stagedProvider}
                  onChange={(e) => setStagedProvider(e.target.value)}
                  disabled={loadingProviders || Object.keys(availableProviders).length === 0 || isRunning}
                >
                  {Object.keys(availableProviders).length === 0 && <option value="">No providers</option>}
                  {Object.keys(availableProviders).map((provider) => (
                    <option key={provider} value={provider}>
                      {formatProviderName(provider)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Model</label>
                <select
                  className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-sm text-slate-200 focus:border-brand-accent focus:outline-none"
                  value={stagedModel}
                  onChange={(e) => setStagedModel(e.target.value)}
                  disabled={
                    loadingProviders ||
                    !stagedProvider ||
                    (availableProviders[stagedProvider]?.length ?? 0) === 0 ||
                    isRunning
                  }
                >
                  {(availableProviders[stagedProvider] || []).map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {loadingProviders && (
              <p className="text-xs text-slate-500">Loading provider models...</p>
            )}
            <button
              type="button"
              onClick={handleAddCurrentConfig}
              disabled={
                !stagedProvider ||
                !stagedModel ||
                isRunning ||
                (availableProviders[stagedProvider]?.length ?? 0) === 0
              }
              className="inline-flex items-center justify-center rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-300"
            >
              Add Competitor
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div className="mb-4 flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <h3 className="text-lg font-bold text-slate-100">Results</h3>
            {winner && <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-sm font-semibold text-yellow-400">Winner: {winner}</span>}
          </div>

          <div className="space-y-4">
            {results.map((result, index) => (
              <motion.div
                key={index}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-xl border p-4 ${
                  index === 0
                    ? 'border-yellow-500/60 bg-yellow-500/10'
                    : 'border-brand-outline/40 bg-brand-ink/40'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {index === 0 && <Trophy className="h-5 w-5 text-yellow-400" />}
                    <div>
                      <p className="font-semibold text-slate-100">
                        #{index + 1} {(result.providerLabel ?? formatProviderName(result.provider))} / {result.model}
                      </p>
                      <div className="mt-1 flex items-center space-x-2">
                        {getVerdictBadge(result.verdict)}
                        {result.confidence !== undefined && (
                          <span className="text-xs text-slate-400">Confidence: {result.confidence}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 rounded-lg bg-brand-paper/50 p-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <div>
                      <p className="text-slate-500">Latency</p>
                      <p className="font-semibold text-slate-200">{result.latency}ms</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    <div>
                      <p className="text-slate-500">Tokens</p>
                      <p className="font-semibold text-slate-200">
                        {result.tokens.input} / {result.tokens.output}
                      </p>
                    </div>
                  </div>
                  {result.cost !== undefined && (
                    <div>
                      <p className="text-slate-500">Cost</p>
                      <p className="font-semibold text-slate-200">${result.cost.toFixed(4)}</p>
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-lg bg-brand-ink/60 p-3">
                  <p className="mb-1 text-xs font-semibold text-slate-400">Output:</p>
                  <p className="text-sm text-slate-300">{result.output || 'No output available'}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {isRunning && results.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-brand-accent border-t-transparent mx-auto" />
            <p className="text-slate-400">Running duel across {selectedConfigs.length} models...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DuelMode;
