'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PersonaWizard } from './PersonaWizard';
import type { PersonaFormState } from '@/types/persona-form';
import { X } from 'lucide-react';
import { UI_HELP_TEXT } from '@third-eye/constants';

/**
 * PersonaWizardModal - Modal wrapper for PersonaWizard
 *
 * Phase 15: Integration layer between Eyes page and PersonaWizard
 *
 * Features:
 * - Loads existing persona by eyeId
 * - Transforms database JSON ↔ PersonaFormState
 * - Saves to /api/personas/blueprints/[eyeId]
 * - Modal overlay with backdrop
 *
 * Per R13: All text from SSOT constants
 * Per R07: Zero `any` types
 */

interface PersonaWizardModalProps {
  readonly isOpen: boolean;
  readonly eyeId: string;
  readonly eyeName: string;
  readonly onClose: () => void;
  readonly onSave: () => void;
}

interface PersonaBlueprintDB {
  readonly metadata_json: {
    readonly eyeId: string;
    readonly name: string;
    readonly description: string;
    readonly version: number;
    readonly capabilities: readonly string[];
  };
  readonly mission: string;
  readonly guidance_json: {
    readonly mission: string;
    readonly check: string;
    readonly reminders: readonly string[];
    readonly example: string;
  } | null;
  readonly validation_json: {
    readonly mission: string;
    readonly check: string;
    readonly reminders: readonly string[];
    readonly example: string;
  } | null;
  readonly envelope_json: {
    readonly requiredKeys: readonly string[];
    readonly requiredDataKeys: readonly string[];
    readonly requiredUiKeys: readonly string[];
  };
  readonly reminders_json: readonly string[];
  readonly llm_config_json: {
    readonly temperature: number;
    readonly top_p: number;
    readonly response_format: 'text' | 'json_object';
    readonly max_tokens: number;
  };
  readonly notes: string;
}

export function PersonaWizardModal({
  isOpen,
  eyeId,
  eyeName,
  onClose,
  onSave,
}: PersonaWizardModalProps) {
  const [initialData, setInitialData] = useState<Partial<PersonaFormState> | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing persona on mount
  useEffect(() => {
    if (isOpen && eyeId) {
      loadPersona();
    }
  }, [isOpen, eyeId]);

  const loadPersona = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/personas/blueprints/${eyeId}`);

      if (response.status === 404) {
        // No persona exists yet - use defaults with eyeId pre-filled
        setInitialData({
          metadata: {
            eyeId,
            name: eyeName,
            description: '',
            version: 1,
            capabilities: [],
          },
        });
        return;
      }

      if (!response.ok) {
        throw new Error(UI_HELP_TEXT.EYES_ERROR_PERSONA_LOAD_FAILED);
      }

      const result = await response.json();
      if (result.success && result.data) {
        const dbData: PersonaBlueprintDB = result.data;

        // Transform database format to PersonaFormState
        const transformedData: Partial<PersonaFormState> = {
          metadata: {
            eyeId: dbData.metadata_json.eyeId,
            name: dbData.metadata_json.name,
            description: dbData.metadata_json.description,
            version: dbData.metadata_json.version,
            capabilities: [...dbData.metadata_json.capabilities],
          },
          mission: dbData.mission,
          guidancePhase: dbData.guidance_json,
          validationPhase: dbData.validation_json,
          envelopeContract: {
            requiredKeys: [...dbData.envelope_json.requiredKeys],
            requiredDataKeys: [...dbData.envelope_json.requiredDataKeys],
            requiredUiKeys: [...dbData.envelope_json.requiredUiKeys],
          },
          reminders: [...dbData.reminders_json],
          llmConfig: {
            temperature: dbData.llm_config_json.temperature,
            top_p: dbData.llm_config_json.top_p,
            response_format: dbData.llm_config_json.response_format,
            max_tokens: dbData.llm_config_json.max_tokens,
          },
          notes: dbData.notes || '',
        };

        setInitialData(transformedData);
      }
    } catch (err) {
      console.error('Failed to load persona:', err);
      setError(UI_HELP_TEXT.EYES_ERROR_PERSONA_LOAD_FAILED);
      // Still allow creating new persona
      setInitialData({
        metadata: {
          eyeId,
          name: eyeName,
          description: '',
          version: 1,
          capabilities: [],
        },
      });
    } finally {
      setLoading(false);
    }
  }, [eyeId, eyeName]);

  const handleSave = useCallback(async (state: PersonaFormState) => {
    setLoading(true);
    setError(null);
    try {
      // Transform PersonaFormState back to database format
      const dbPayload = {
        metadata_json: {
          eyeId: state.metadata.eyeId,
          name: state.metadata.name,
          description: state.metadata.description,
          version: state.metadata.version,
          capabilities: state.metadata.capabilities,
        },
        mission: state.mission,
        guidance_json: state.guidancePhase,
        validation_json: state.validationPhase,
        envelope_json: {
          requiredKeys: state.envelopeContract.requiredKeys,
          requiredDataKeys: state.envelopeContract.requiredDataKeys,
          requiredUiKeys: state.envelopeContract.requiredUiKeys,
        },
        reminders_json: state.reminders,
        llm_config_json: {
          temperature: state.llmConfig.temperature,
          top_p: state.llmConfig.top_p,
          response_format: state.llmConfig.response_format,
          max_tokens: state.llmConfig.max_tokens,
        },
        notes: state.notes,
      };

      const response = await fetch(`/api/personas/blueprints/${eyeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload),
      });

      if (!response.ok) {
        throw new Error(UI_HELP_TEXT.EYES_ERROR_PERSONA_SAVE_FAILED);
      }

      // Notify parent of successful save
      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to save persona:', err);
      setError(UI_HELP_TEXT.EYES_ERROR_PERSONA_SAVE_FAILED);
    } finally {
      setLoading(false);
    }
  }, [eyeId, onSave, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="min-h-screen w-full p-4">
        <div className="mx-auto max-w-6xl my-8">
          {/* Modal Header */}
          <div className="mb-4 flex items-center justify-between rounded-t-2xl bg-brand-paperElev border border-brand-outline p-6">
            <div>
              <h2 className="text-2xl font-bold text-brand-foreground">
                {UI_HELP_TEXT.EYES_PERSONA_MODAL_TITLE.replace('{eyeName}', eyeName)}
              </h2>
              <p className="mt-1 text-sm text-brand-ink/70">
                {UI_HELP_TEXT.EYES_PERSONA_MODAL_SUBTITLE}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="rounded-full p-2 text-brand-ink/60 transition-colors hover:bg-brand-paper hover:text-brand-ink"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && !initialData ? (
            <div className="rounded-2xl bg-brand-paperElev border border-brand-outline p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent"></div>
              <p className="mt-4 text-brand-ink/70">Loading persona configuration...</p>
            </div>
          ) : (
            /* PersonaWizard */
            initialData && (
              <PersonaWizard
                initialData={initialData}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
