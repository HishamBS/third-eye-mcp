'use client';

import React, { useState, useCallback } from 'react';
import type { WizardStepProps } from '@/types/persona-form';
import { Construction, Plus, X, Download } from 'lucide-react';
import { FIELD_LABELS, PLACEHOLDERS, ARRAY_ACTIONS, REMINDER_TEMPLATES } from '../constants';

/**
 * Simplified Step Components - Phase 14 Part 2
 *
 * These are functional but simplified versions.
 * Future enhancements: drag-reorder, JSON syntax highlighting, collapsible cards.
 */

function PlaceholderStep({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Construction className="w-16 h-16 text-brand-accent/50 mb-4" />
      <h3 className="text-xl font-semibold text-brand-ink mb-2">{title}</h3>
      <p className="text-brand-ink/70 max-w-md">{description}</p>
      <p className="text-sm text-brand-ink/50 mt-4">
        Advanced features coming in future updates
      </p>
    </div>
  );
}

export function GuidanceStep(props: WizardStepProps) {
  return (
    <PlaceholderStep
      title="Guidance Phase Configuration"
      description="Configure mission, check logic, reminders, and example JSON for the guidance phase. Full implementation with JSON editor and reminder management coming soon."
    />
  );
}

export function ValidationStep(props: WizardStepProps) {
  return (
    <PlaceholderStep
      title="Validation Phase Configuration"
      description="Optional validation phase configuration with enable/disable toggle. Full implementation coming soon."
    />
  );
}

export function RemindersStep({ state, dispatch }: WizardStepProps) {
  const [reminderInput, setReminderInput] = useState('');

  const handleAddReminder = useCallback(() => {
    const trimmed = reminderInput.trim();
    if (!trimmed || state.reminders.includes(trimmed)) return;

    dispatch({
      type: 'SET_REMINDERS',
      reminders: [...state.reminders, trimmed],
    });
    setReminderInput('');
  }, [reminderInput, state.reminders, dispatch]);

  const handleRemoveReminder = useCallback(
    (index: number) => {
      dispatch({
        type: 'SET_REMINDERS',
        reminders: state.reminders.filter((_, i) => i !== index),
      });
    },
    [state.reminders, dispatch]
  );

  const handleAddTemplate = useCallback(
    (template: string) => {
      if (state.reminders.includes(template)) return;
      dispatch({
        type: 'SET_REMINDERS',
        reminders: [...state.reminders, template],
      });
    },
    [state.reminders, dispatch]
  );

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-brand-ink mb-2">
          {FIELD_LABELS.GENERAL_REMINDERS}
        </label>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={reminderInput}
            onChange={(e) => setReminderInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddReminder()}
            placeholder={PLACEHOLDERS.REMINDER}
            className="flex-1 px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
          <button
            onClick={handleAddReminder}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {ARRAY_ACTIONS.ADD}
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {state.reminders.map((reminder, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-brand-paperElev border border-brand-outline"
            >
              <span className="text-sm text-brand-ink">{reminder}</span>
              <button
                onClick={() => handleRemoveReminder(index)}
                className="text-brand-ink/40 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {state.reminders.length === 0 && (
          <p className="text-sm text-brand-ink/50 italic mb-4">
            No reminders added yet
          </p>
        )}

        <details className="mt-4">
          <summary className="text-sm font-medium text-brand-accent cursor-pointer mb-2">
            Quick Add Templates
          </summary>
          <div className="space-y-1 pl-4">
            {REMINDER_TEMPLATES.map((template, index) => (
              <button
                key={index}
                onClick={() => handleAddTemplate(template)}
                disabled={state.reminders.includes(template)}
                className="block w-full text-left text-sm py-2 px-3 rounded-lg hover:bg-brand-paperElev border border-transparent hover:border-brand-outline transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-brand-ink"
              >
                {template}
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

export function ReviewStep({ state }: WizardStepProps) {
  const [showJSON, setShowJSON] = useState(false);

  const personaData = {
    metadata: {
      ...state.metadata,
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
    },
    mission: state.mission,
    guidancePhase: state.guidancePhase,
    validationPhase: state.validationPhase,
    envelopeContract: state.envelopeContract,
    reminders: state.reminders,
    llmConfig: state.llmConfig,
    notes: state.notes,
  };

  const personaJSON = JSON.stringify(personaData, null, 2);

  const handleDownload = () => {
    const eyeId = state.metadata.eyeId || 'draft';
    const name = state.metadata.name.replace(/\s+/g, '-').toLowerCase() || 'unnamed';
    const version = state.metadata.version || 1;
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${eyeId}-${name}-v${version}-${timestamp}.json`;

    const blob = new Blob([personaJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-brand-ink">
          {FIELD_LABELS.REVIEW_TITLE}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJSON(!showJSON)}
            className="px-4 py-2 rounded-lg border border-brand-outline text-brand-ink hover:bg-brand-paperElev transition-colors text-sm"
          >
            {showJSON ? 'Hide' : 'Show'} JSON
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      </div>

      {showJSON ? (
        <div className="relative">
          <pre className="p-4 rounded-lg bg-brand-paper border border-brand-outline text-sm font-mono text-brand-ink overflow-x-auto max-h-[500px] overflow-y-auto">
            {personaJSON}
          </pre>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-brand-paperElev border border-brand-outline">
            <h4 className="font-semibold text-brand-ink mb-2">Metadata</h4>
            <p className="text-sm text-brand-ink/70">
              <strong>Eye ID:</strong> {state.metadata.eyeId || '(not set)'}
            </p>
            <p className="text-sm text-brand-ink/70">
              <strong>Name:</strong> {state.metadata.name || '(not set)'}
            </p>
            <p className="text-sm text-brand-ink/70">
              <strong>Capabilities:</strong> {state.metadata.capabilities.length} capabilities
            </p>
          </div>

          <div className="p-4 rounded-lg bg-brand-paperElev border border-brand-outline">
            <h4 className="font-semibold text-brand-ink mb-2">Mission</h4>
            <p className="text-sm text-brand-ink/70">
              {state.mission || '(not set)'} ({state.mission.length} chars)
            </p>
          </div>

          <div className="p-4 rounded-lg bg-brand-paperElev border border-brand-outline">
            <h4 className="font-semibold text-brand-ink mb-2">Envelope Contract</h4>
            <p className="text-sm text-brand-ink/70">
              <strong>Required Keys:</strong> {state.envelopeContract.requiredKeys.length}
            </p>
            <p className="text-sm text-brand-ink/70">
              <strong>Data Keys:</strong> {state.envelopeContract.requiredDataKeys.length}
            </p>
            <p className="text-sm text-brand-ink/70">
              <strong>UI Keys:</strong> {state.envelopeContract.requiredUiKeys.length}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-brand-paperElev border border-brand-outline">
            <h4 className="font-semibold text-brand-ink mb-2">Reminders</h4>
            <p className="text-sm text-brand-ink/70">
              {state.reminders.length} reminders configured
            </p>
          </div>

          <div className="p-4 rounded-lg bg-brand-paperElev border border-brand-outline">
            <h4 className="font-semibold text-brand-ink mb-2">LLM Configuration</h4>
            <p className="text-sm text-brand-ink/70">
              <strong>Temperature:</strong> {state.llmConfig.temperature}
            </p>
            <p className="text-sm text-brand-ink/70">
              <strong>Top P:</strong> {state.llmConfig.top_p}
            </p>
            <p className="text-sm text-brand-ink/70">
              <strong>Max Tokens:</strong> {state.llmConfig.max_tokens}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
