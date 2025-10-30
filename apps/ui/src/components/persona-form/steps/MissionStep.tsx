'use client';

import React, { useState } from 'react';
import type { WizardStepProps } from '@/types/persona-form';
import {
  FIELD_LABELS,
  PLACEHOLDERS,
  HELP_TEXT,
  CHAR_LIMITS,
  MISSION_TEMPLATES,
} from '../constants';
import { FileText } from 'lucide-react';

/**
 * MissionStep - Core mission configuration
 *
 * Per R13: All text from SSOT constants
 * Per R07: Strict typing, no any
 */

export function MissionStep({ state, dispatch }: WizardStepProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  const handleTemplateSelect = (template: string) => {
    dispatch({ type: 'SET_MISSION', mission: template });
    setShowTemplates(false);
  };

  const charCount = state.mission.length;
  const isValid =
    charCount >= CHAR_LIMITS.MISSION_MIN && charCount <= CHAR_LIMITS.MISSION_MAX;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-brand-ink">
            {FIELD_LABELS.MISSION} *
          </label>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 text-xs text-brand-accent hover:text-brand-accent/80"
          >
            <FileText className="w-3 h-3" />
            {showTemplates ? 'Hide' : 'Show'} Templates
          </button>
        </div>

        {showTemplates && (
          <div className="mb-4 p-4 rounded-lg bg-brand-paperElev border border-brand-outline space-y-2">
            <p className="text-xs font-medium text-brand-ink/70 mb-2">
              Select a template to get started:
            </p>
            {Object.entries(MISSION_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => handleTemplateSelect(template)}
                className="block w-full text-left p-3 rounded-lg bg-brand-paper hover:bg-brand-accent/10 border border-brand-outline hover:border-brand-accent transition-colors text-sm text-brand-ink"
              >
                <div className="font-medium text-brand-accent mb-1">
                  {key.charAt(0) + key.slice(1).toLowerCase()}
                </div>
                <div className="text-xs text-brand-ink/70">{template}</div>
              </button>
            ))}
          </div>
        )}

        <textarea
          value={state.mission}
          onChange={(e) => dispatch({ type: 'SET_MISSION', mission: e.target.value })}
          placeholder={PLACEHOLDERS.MISSION}
          rows={8}
          className={`w-full px-4 py-2 rounded-lg border bg-brand-paper text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none ${
            !isValid && charCount > 0
              ? 'border-red-500'
              : 'border-brand-outline'
          }`}
          minLength={CHAR_LIMITS.MISSION_MIN}
          maxLength={CHAR_LIMITS.MISSION_MAX}
        />

        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-brand-ink/60">{HELP_TEXT.MISSION}</p>
          <span
            className={`text-xs ${
              isValid ? 'text-brand-ink/50' : 'text-red-500'
            }`}
          >
            {charCount}/{CHAR_LIMITS.MISSION_MAX} (min: {CHAR_LIMITS.MISSION_MIN})
          </span>
        </div>

        {!isValid && charCount > 0 && (
          <p className="text-xs text-red-500 mt-1">
            Mission must be between {CHAR_LIMITS.MISSION_MIN} and{' '}
            {CHAR_LIMITS.MISSION_MAX} characters
          </p>
        )}
      </div>
    </div>
  );
}
