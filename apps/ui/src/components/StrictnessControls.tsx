'use client';

import { useUI } from '@/contexts/UIContext';
import { Sliders, Shield, AlertTriangle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { STRICTNESS_PRESETS } from '@third-eye/types';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE } from '@/constants/color-mappings';
import { GRADIENT, SHADOW } from '@/constants/design-tokens';

export function StrictnessControls() {
  const { strictness, setStrictness, applyStrictnessProfile } = useUI();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const casual = STRICTNESS_PRESETS.casual.settings;
  const enterprise = STRICTNESS_PRESETS.enterprise.settings;
  const security = STRICTNESS_PRESETS.security.settings;

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
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-foreground">
          <Shield className="h-5 w-5 text-brand-accent" />
          Strictness Profiles
        </h3>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Casual */}
          <button
            onClick={() => applyStrictnessProfile('casual')}
            className="group rounded-xl border border-brand-outline/40 bg-gradient-to-br from-semantic-success/10 to-semantic-success/5 p-6 text-left transition-all hover:border-semantic-success/50 hover:shadow-lg hover:shadow-semantic-success/20"
          >
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 ${STATUS_TEXT_COLORS.success}" />
              <h4 className="font-semibold text-brand-foreground">Casual</h4>
            </div>
            <p className="mb-4 text-sm text-semantic-muted">
              Relaxed validation for quick iterations and brainstorming.
            </p>
            <div className="space-y-1 text-xs text-semantic-muted">
              <p>• Ambiguity: {casual.ambiguityThreshold}/100</p>
              <p>• Citation: {casual.citationCutoff}%</p>
              <p>• Code Review: {casual.mangekyoStrictness}%</p>
            </div>
          </button>

          {/* Enterprise */}
          <button
            onClick={() => applyStrictnessProfile('enterprise')}
            className={`group rounded-xl border border-brand-outline/40 bg-gradient-to-br ${GRADIENT.info} p-6 text-left transition-all hover:${STATUS_BORDER_COLORS_SUBTLE.info} hover:shadow-lg`}
            style={{ ['--tw-shadow-color' as string]: 'rgb(var(--color-info) / 0.2)' }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 ${STATUS_TEXT_COLORS.info}" />
              <h4 className="font-semibold text-brand-foreground">Enterprise</h4>
            </div>
            <p className="mb-4 text-sm text-semantic-muted">
              Balanced validation for production-grade work.
            </p>
            <div className="space-y-1 text-xs text-semantic-muted">
              <p>• Ambiguity: {enterprise.ambiguityThreshold}/100</p>
              <p>• Citation: {enterprise.citationCutoff}%</p>
              <p>• Code Review: {enterprise.mangekyoStrictness}%</p>
            </div>
          </button>

          {/* Security */}
          <button
            onClick={() => applyStrictnessProfile('security')}
            className={`group rounded-xl border border-brand-outline/40 bg-gradient-to-br ${GRADIENT.error} p-6 text-left transition-all hover:${STATUS_BORDER_COLORS_SUBTLE.error} hover:shadow-lg`}
            style={{ ['--tw-shadow-color' as string]: 'rgb(var(--color-error) / 0.2)' }}
          >
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 ${STATUS_TEXT_COLORS.error}" />
              <h4 className="font-semibold text-brand-foreground">Security</h4>
            </div>
            <p className="mb-4 text-sm text-semantic-muted">
              Maximum validation for security-critical code.
            </p>
            <div className="space-y-1 text-xs text-semantic-muted">
              <p>• Ambiguity: {security.ambiguityThreshold}/100</p>
              <p>• Citation: {security.citationCutoff}%</p>
              <p>• Code Review: {security.mangekyoStrictness}%</p>
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
          <h3 className="flex items-center gap-2 text-lg font-semibold text-brand-foreground">
            <Sliders className="h-5 w-5 text-brand-accent" />
            Advanced Settings
          </h3>
          <span className="text-sm text-semantic-muted">
            {showAdvanced ? 'Hide' : 'Show'}
          </span>
        </button>

        {showAdvanced && (
          <div className="space-y-6">
            {/* Ambiguity Threshold */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-semantic-muted">
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
              <p className="mt-1 text-xs text-semantic-muted">
                Lower values are stricter. Scores above this threshold trigger clarification.
              </p>
            </div>

            {/* Citation Cutoff */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-semantic-muted">
                  Citation Confidence Cutoff
                </label>
                <span className="text-sm font-bold text-brand-accent">
                  {strictness.citationCutoff}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={strictness.citationCutoff}
                onChange={(e) => handleSliderChange('citationCutoff', parseInt(e.target.value))}
                className="w-full accent-brand-accent"
              />
              <p className="mt-1 text-xs text-semantic-muted">
                Minimum confidence required for evidence citations to be accepted.
              </p>
            </div>

            {/* Consistency Tolerance */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-semantic-muted">
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
              <p className="mt-1 text-xs text-semantic-muted">
                Lower values are stricter. Controls how much inconsistency is tolerated.
              </p>
            </div>

            {/* Mangekyō Strictness */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-semantic-muted">
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
              <p className="mt-1 text-xs text-semantic-muted">
                Minimum passing score for code review gates (Implementation, Tests, Docs, Security).
              </p>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => applyStrictnessProfile('enterprise')}
              className="w-full rounded-full border border-brand-outline/50 px-4 py-2 text-sm font-medium text-semantic-muted transition hover:border-brand-accent hover:text-brand-accent"
            >
              Reset to Enterprise Defaults
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
