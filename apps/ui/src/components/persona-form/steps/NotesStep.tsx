'use client';

import React from 'react';
import type { WizardStepProps } from '@/types/persona-form';
import { FIELD_LABELS, PLACEHOLDERS, HELP_TEXT, CHAR_LIMITS } from '../constants';

/**
 * NotesStep - Internal notes configuration
 *
 * Per R13: All text from SSOT constants
 * Per R07: Strict typing, no any
 */

export function NotesStep({ state, dispatch }: WizardStepProps) {
  const charCount = state.notes.length;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-brand-foreground mb-2">
          {FIELD_LABELS.NOTES} (Optional)
        </label>
        <textarea
          value={state.notes}
          onChange={(e) => dispatch({ type: 'SET_NOTES', notes: e.target.value })}
          placeholder={PLACEHOLDERS.NOTES}
          rows={10}
          className="w-full px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none font-mono text-sm"
          maxLength={CHAR_LIMITS.NOTES_MAX}
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-semantic-muted">{HELP_TEXT.NOTES}</p>
          <span className="text-xs text-semantic-muted">
            {charCount}/{CHAR_LIMITS.NOTES_MAX}
          </span>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-brand-paperElev border border-brand-outline">
        <p className="text-sm text-semantic-muted">
          <strong>Note:</strong> These notes are for internal documentation only.
          They will not be sent to the LLM or included in the persona execution.
        </p>
      </div>
    </div>
  );
}
