'use client';

import React, { useState, useCallback } from 'react';
import type { WizardStepProps } from '@/types/persona-form';
import { FIELD_LABELS, PLACEHOLDERS, HELP_TEXT, ARRAY_ACTIONS } from '../constants';
import { X, Plus } from 'lucide-react';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE } from '@/constants/color-mappings';

/**
 * EnvelopeStep - Envelope contract configuration
 *
 * Per R13: All text from SSOT constants
 * Per R07: Strict typing, no any
 */

export function EnvelopeStep({ state, dispatch }: WizardStepProps) {
  const [requiredKeyInput, setRequiredKeyInput] = useState('');
  const [dataKeyInput, setDataKeyInput] = useState('');
  const [uiKeyInput, setUiKeyInput] = useState('');

  const handleAddKey = useCallback(
    (type: 'requiredKeys' | 'requiredDataKeys' | 'requiredUiKeys', value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      const currentKeys = state.envelopeContract[type];
      if (currentKeys.includes(trimmed)) return; // Duplicate

      dispatch({
        type: 'SET_ENVELOPE_CONTRACT',
        envelopeContract: {
          ...state.envelopeContract,
          [type]: [...currentKeys, trimmed],
        },
      });

      // Clear input
      if (type === 'requiredKeys') setRequiredKeyInput('');
      else if (type === 'requiredDataKeys') setDataKeyInput('');
      else setUiKeyInput('');
    },
    [state.envelopeContract, dispatch]
  );

  const handleRemoveKey = useCallback(
    (type: 'requiredKeys' | 'requiredDataKeys' | 'requiredUiKeys', index: number) => {
      dispatch({
        type: 'SET_ENVELOPE_CONTRACT',
        envelopeContract: {
          ...state.envelopeContract,
          [type]: state.envelopeContract[type].filter((_, i) => i !== index),
        },
      });
    },
    [state.envelopeContract, dispatch]
  );

  return (
    <div className="space-y-8">
      {/* Required Keys */}
      <div>
        <label className="block text-sm font-medium text-brand-foreground mb-2">
          {FIELD_LABELS.REQUIRED_KEYS}
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={requiredKeyInput}
            onChange={(e) => setRequiredKeyInput(e.target.value)}
            onKeyPress={(e) =>
              e.key === 'Enter' && handleAddKey('requiredKeys', requiredKeyInput)
            }
            placeholder={PLACEHOLDERS.KEY}
            className="flex-1 px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
          <button
            onClick={() => handleAddKey('requiredKeys', requiredKeyInput)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-brand-foreground hover:bg-brand-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {ARRAY_ACTIONS.ADD}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {state.envelopeContract.requiredKeys.map((key, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/20 text-brand-accent border border-brand-accent/30"
            >
              <span className="text-sm font-mono">{key}</span>
              <button
                onClick={() => handleRemoveKey('requiredKeys', index)}
                className="hover:bg-brand-accent/30 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-semantic-muted">{HELP_TEXT.REQUIRED_KEYS}</p>
      </div>

      {/* Required Data Keys */}
      <div>
        <label className="block text-sm font-medium text-brand-foreground mb-2">
          {FIELD_LABELS.REQUIRED_DATA_KEYS}
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={dataKeyInput}
            onChange={(e) => setDataKeyInput(e.target.value)}
            onKeyPress={(e) =>
              e.key === 'Enter' && handleAddKey('requiredDataKeys', dataKeyInput)
            }
            placeholder={PLACEHOLDERS.KEY}
            className="flex-1 px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
          <button
            onClick={() => handleAddKey('requiredDataKeys', dataKeyInput)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-brand-foreground hover:bg-brand-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {ARRAY_ACTIONS.ADD}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {state.envelopeContract.requiredDataKeys.map((key, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1 rounded-full ${STATUS_BG_COLORS_SUBTLE.info} ${STATUS_TEXT_COLORS.info} border ${STATUS_BORDER_COLORS_SUBTLE.info}"
            >
              <span className="text-sm font-mono">{key}</span>
              <button
                onClick={() => handleRemoveKey('requiredDataKeys', index)}
                className="hover:${STATUS_BG_COLORS_SUBTLE.info} rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-semantic-muted">{HELP_TEXT.REQUIRED_DATA_KEYS}</p>
      </div>

      {/* Required UI Keys */}
      <div>
        <label className="block text-sm font-medium text-brand-foreground mb-2">
          {FIELD_LABELS.REQUIRED_UI_KEYS}
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={uiKeyInput}
            onChange={(e) => setUiKeyInput(e.target.value)}
            onKeyPress={(e) =>
              e.key === 'Enter' && handleAddKey('requiredUiKeys', uiKeyInput)
            }
            placeholder={PLACEHOLDERS.KEY}
            className="flex-1 px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
          <button
            onClick={() => handleAddKey('requiredUiKeys', uiKeyInput)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-brand-foreground hover:bg-brand-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {ARRAY_ACTIONS.ADD}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {state.envelopeContract.requiredUiKeys.map((key, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1 rounded-full ${STATUS_BG_COLORS_SUBTLE.info} ${STATUS_TEXT_COLORS.info} border ${STATUS_BORDER_COLORS_SUBTLE.info}"
            >
              <span className="text-sm font-mono">{key}</span>
              <button
                onClick={() => handleRemoveKey('requiredUiKeys', index)}
                className="hover:${STATUS_BG_COLORS_SUBTLE.info} rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-semantic-muted">{HELP_TEXT.REQUIRED_UI_KEYS}</p>
      </div>
    </div>
  );
}
