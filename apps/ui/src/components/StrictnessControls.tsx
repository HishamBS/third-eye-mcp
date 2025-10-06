'use client';

import { useUI, DEFAULT_STRICTNESS } from '@/contexts/UIContext';
import { Sliders, Shield, AlertTriangle, Sparkles } from 'lucide-react';
import { useState } from 'react';

export function StrictnessControls() {
  const { strictness, setStrictness, applyStrictnessProfile } = useUI();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSliderChange = (key: keyof typeof strictness, value: number) => {
    setStrictness({
      ...strictness,
      [key]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* Preset Profiles */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Shield className="h-5 w-5 text-brand-accent" />
          Strictness Profiles
        </h3>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Casual */}
          <button
            onClick={() => applyStrictnessProfile('casual')}
            className="group rounded-xl border border-brand-outline/40 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-6 text-left transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20"
          >
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <h4 className="font-semibold text-white">Casual</h4>
            </div>
            <p className="mb-4 text-sm text-slate-300">
              Relaxed validation for quick iterations and brainstorming.
            </p>
            <div className="space-y-1 text-xs text-slate-400">
              <p>• Ambiguity: 60/100</p>
              <p>• Citation: 0.5</p>
              <p>• Code Review: 50%</p>
            </div>
          </button>

          {/* Enterprise */}
          <button
            onClick={() => applyStrictnessProfile('enterprise')}
            className="group rounded-xl border border-brand-outline/40 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-6 text-left transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20"
          >
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              <h4 className="font-semibold text-white">Enterprise</h4>
            </div>
            <p className="mb-4 text-sm text-slate-300">
              Balanced validation for production-grade work.
            </p>
            <div className="space-y-1 text-xs text-slate-400">
              <p>• Ambiguity: 40/100</p>
              <p>• Citation: 0.7</p>
              <p>• Code Review: 70%</p>
            </div>
          </button>

          {/* Security */}
          <button
            onClick={() => applyStrictnessProfile('security')}
            className="group rounded-xl border border-brand-outline/40 bg-gradient-to-br from-red-500/10 to-red-600/5 p-6 text-left transition-all hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/20"
          >
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <h4 className="font-semibold text-white">Security</h4>
            </div>
            <p className="mb-4 text-sm text-slate-300">
              Maximum validation for security-critical code.
            </p>
            <div className="space-y-1 text-xs text-slate-400">
              <p>• Ambiguity: 20/100</p>
              <p>• Citation: 0.9</p>
              <p>• Code Review: 90%</p>
            </div>
          </button>
        </div>
      </div>

      {/* Advanced Sliders */}
      <div className="rounded-2xl border border-brand-outline/40 bg-brand-paper/60 p-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mb-4 flex w-full items-center justify-between text-left"
        >
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Sliders className="h-5 w-5 text-brand-accent" />
            Advanced Settings
          </h3>
          <span className="text-sm text-slate-400">
            {showAdvanced ? 'Hide' : 'Show'}
          </span>
        </button>

        {showAdvanced && (
          <div className="space-y-6">
            {/* Ambiguity Threshold */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">
                  Ambiguity Threshold
                </label>
                <span className="text-sm font-bold text-brand-accent">
                  {strictness.ambiguityThreshold}/100
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={strictness.ambiguityThreshold}
                onChange={(e) => handleSliderChange('ambiguityThreshold', parseInt(e.target.value))}
                className="w-full accent-brand-accent"
              />
              <p className="mt-1 text-xs text-slate-400">
                Lower values are stricter. Scores above this threshold trigger clarification.
              </p>
            </div>

            {/* Citation Cutoff */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">
                  Citation Confidence Cutoff
                </label>
                <span className="text-sm font-bold text-brand-accent">
                  {(strictness.citationCutoff * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={strictness.citationCutoff}
                onChange={(e) => handleSliderChange('citationCutoff', parseFloat(e.target.value))}
                className="w-full accent-brand-accent"
              />
              <p className="mt-1 text-xs text-slate-400">
                Minimum confidence required for evidence citations to be accepted.
              </p>
            </div>

            {/* Consistency Tolerance */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">
                  Consistency Tolerance
                </label>
                <span className="text-sm font-bold text-brand-accent">
                  {strictness.consistencyTolerance}/100
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={strictness.consistencyTolerance}
                onChange={(e) => handleSliderChange('consistencyTolerance', parseInt(e.target.value))}
                className="w-full accent-brand-accent"
              />
              <p className="mt-1 text-xs text-slate-400">
                Lower values are stricter. Controls how much inconsistency is tolerated.
              </p>
            </div>

            {/* Mangekyō Strictness */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">
                  Code Review Strictness (Mangekyō)
                </label>
                <span className="text-sm font-bold text-brand-accent">
                  {strictness.mangekyoStrictness}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={strictness.mangekyoStrictness}
                onChange={(e) => handleSliderChange('mangekyoStrictness', parseInt(e.target.value))}
                className="w-full accent-brand-accent"
              />
              <p className="mt-1 text-xs text-slate-400">
                Minimum passing score for code review gates (Implementation, Tests, Docs, Security).
              </p>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => applyStrictnessProfile('enterprise')}
              className="w-full rounded-full border border-brand-outline/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
            >
              Reset to Enterprise Defaults
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
