'use client';

import type { WizardStepProps } from '@/types/custom-eye-form';
import { FIELD_LABELS, PLACEHOLDERS, HELP_TEXT } from '../constants';

/**
 * BasicInfoStep - Step 1 of CustomEyeWizard
 *
 * Per R07: Strict typing
 * Per R13: All text from SSOT
 */

export function BasicInfoStep({ state, dispatch }: WizardStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          {FIELD_LABELS.NAME}
        </label>
        <input
          type="text"
          value={state.formData.name}
          onChange={(e) =>
            dispatch({ type: 'SET_NAME', name: e.target.value })
          }
          placeholder={PLACEHOLDERS.NAME}
          disabled={state.isEditing}
          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-slate-400">{HELP_TEXT.NAME}</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          {FIELD_LABELS.DESCRIPTION}
        </label>
        <textarea
          value={state.formData.description}
          onChange={(e) =>
            dispatch({ type: 'SET_DESCRIPTION', description: e.target.value })
          }
          placeholder={PLACEHOLDERS.DESCRIPTION}
          rows={4}
          className="w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
        />
        <p className="mt-1 text-xs text-slate-400">{HELP_TEXT.DESCRIPTION}</p>
      </div>
    </div>
  );
}
