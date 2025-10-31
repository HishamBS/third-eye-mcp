'use client';

import React, { useState, useCallback } from 'react';
import type { WizardStepProps } from '@/types/persona-form';
import {
  FIELD_LABELS,
  PLACEHOLDERS,
  HELP_TEXT,
  CHAR_LIMITS,
  ARRAY_ACTIONS,
} from '../constants';
import { X, Plus } from 'lucide-react';

/**
 * MetadataStep - Eye identity configuration
 *
 * Per R13: All text from SSOT constants
 * Per R07: Strict typing, no any
 */

export function MetadataStep({ state, dispatch }: WizardStepProps) {
  const [capabilityInput, setCapabilityInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddCapability = useCallback(() => {
    const trimmed = capabilityInput.trim();
    if (!trimmed) return;

    if (state.metadata.capabilities.includes(trimmed)) {
      setErrors({ ...errors, capability: 'Capability already exists' });
      return;
    }

    dispatch({
      type: 'SET_METADATA',
      metadata: {
        ...state.metadata,
        capabilities: [...state.metadata.capabilities, trimmed],
      },
    });
    setCapabilityInput('');
    setErrors({});
  }, [capabilityInput, state.metadata, dispatch, errors]);

  const handleRemoveCapability = useCallback(
    (index: number) => {
      dispatch({
        type: 'SET_METADATA',
        metadata: {
          ...state.metadata,
          capabilities: state.metadata.capabilities.filter((_, i) => i !== index),
        },
      });
    },
    [state.metadata, dispatch]
  );

  return (
    <div className="space-y-6">
      {/* Eye ID */}
      <div>
        <label className="block text-sm font-medium text-brand-ink mb-2">
          {FIELD_LABELS.EYE_ID} *
        </label>
        <input
          type="text"
          value={state.metadata.eyeId}
          onChange={(e) =>
            dispatch({
              type: 'SET_METADATA',
              metadata: { ...state.metadata, eyeId: e.target.value },
            })
          }
          placeholder={PLACEHOLDERS.EYE_ID}
          className="w-full px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-accent"
          minLength={CHAR_LIMITS.EYE_ID_MIN}
          maxLength={CHAR_LIMITS.EYE_ID_MAX}
        />
        <p className="text-xs text-brand-ink/60 mt-1">{HELP_TEXT.EYE_ID}</p>
      </div>

      {/* Eye Name */}
      <div>
        <label className="block text-sm font-medium text-brand-ink mb-2">
          {FIELD_LABELS.EYE_NAME} *
        </label>
        <input
          type="text"
          value={state.metadata.name}
          onChange={(e) =>
            dispatch({
              type: 'SET_METADATA',
              metadata: { ...state.metadata, name: e.target.value },
            })
          }
          placeholder={PLACEHOLDERS.EYE_NAME}
          className="w-full px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-accent"
          minLength={CHAR_LIMITS.NAME_MIN}
          maxLength={CHAR_LIMITS.NAME_MAX}
        />
        <p className="text-xs text-brand-ink/60 mt-1">{HELP_TEXT.EYE_NAME}</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-brand-ink mb-2">
          {FIELD_LABELS.DESCRIPTION} *
        </label>
        <textarea
          value={state.metadata.description}
          onChange={(e) =>
            dispatch({
              type: 'SET_METADATA',
              metadata: { ...state.metadata, description: e.target.value },
            })
          }
          placeholder={PLACEHOLDERS.DESCRIPTION}
          rows={4}
          className="w-full px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
          minLength={CHAR_LIMITS.DESCRIPTION_MIN}
          maxLength={CHAR_LIMITS.DESCRIPTION_MAX}
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-brand-ink/60">{HELP_TEXT.DESCRIPTION}</p>
          <span className="text-xs text-brand-ink/50">
            {state.metadata.description.length}/{CHAR_LIMITS.DESCRIPTION_MAX}
          </span>
        </div>
      </div>

      {/* Version */}
      <div>
        <label className="block text-sm font-medium text-brand-ink mb-2">
          {FIELD_LABELS.VERSION} *
        </label>
        <input
          type="number"
          value={state.metadata.version}
          onChange={(e) =>
            dispatch({
              type: 'SET_METADATA',
              metadata: { ...state.metadata, version: parseInt(e.target.value, 10) || 1 },
            })
          }
          min={1}
          className="w-32 px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-accent"
        />
        <p className="text-xs text-brand-ink/60 mt-1">{HELP_TEXT.VERSION}</p>
      </div>

      {/* Capabilities */}
      <div>
        <label className="block text-sm font-medium text-brand-ink mb-2">
          {FIELD_LABELS.CAPABILITIES}
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={capabilityInput}
            onChange={(e) => setCapabilityInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCapability()}
            placeholder={PLACEHOLDERS.CAPABILITY}
            className="flex-1 px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
          <button
            onClick={handleAddCapability}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-brand-foreground hover:bg-brand-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {ARRAY_ACTIONS.ADD}
          </button>
        </div>

        {errors.capability && (
          <p className="text-xs text-red-500 mb-2">{errors.capability}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {state.metadata.capabilities.map((capability, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/20 text-brand-accent border border-brand-accent/30"
            >
              <span className="text-sm">{capability}</span>
              <button
                onClick={() => handleRemoveCapability(index)}
                className="hover:bg-brand-accent/30 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {state.metadata.capabilities.length === 0 && (
          <p className="text-sm text-brand-ink/50 italic mt-2">
            No capabilities added yet
          </p>
        )}

        <p className="text-xs text-brand-ink/60 mt-2">{HELP_TEXT.CAPABILITIES}</p>
      </div>
    </div>
  );
}
