'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WizardStepProps } from '@/types/eye-wizard';
import type { Persona } from '@/types/api';
import { PERSONA_LABELS } from './constants';
import { API_BASE_URL } from '@/consts/api';
import { STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE, STATUS_TEXT_COLORS } from '@/constants/color-mappings';

/**
 * PersonaStep - Step 3 of EyeWizard
 * Handles optional persona selection and linking
 */
export function PersonaStep({ state, dispatch }: WizardStepProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  // Fetch personas on mount
  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/api/personas`);

        if (!response.ok) {
          throw new Error('Failed to fetch personas');
        }

        const data = await response.json();
        setPersonas(data.data || []);

        // If current Eye has a persona, find and set it
        if (state.formData.personaId) {
          const currentPersona = (data.data || []).find(
            (p: Persona) => p.id === state.formData.personaId
          );
          setSelectedPersona(currentPersona || null);
        }
      } catch (err) {
        console.error('Failed to fetch personas:', err);
        setError(PERSONA_LABELS.PERSONA_ERROR);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonas();
  }, [state.formData.personaId]);

  // Handle persona selection
  const handlePersonaSelect = useCallback(
    (personaId: string) => {
      dispatch({
        type: 'UPDATE_PERSONA',
        payload: personaId,
      });

      // Update selected persona for preview
      if (personaId) {
        const persona = personas.find((p) => p.id === personaId);
        setSelectedPersona(persona || null);
      } else {
        setSelectedPersona(null);
      }
    },
    [dispatch, personas]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-brand-outline/20 border-t-brand-accent" />
          <p className="text-sm text-semantic-muted">{PERSONA_LABELS.PERSONA_LOADING}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className={`rounded-lg border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} p-6 text-center`}>
          <p className={`text-sm ${STATUS_TEXT_COLORS.error}`}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-brand-foreground transition hover:bg-brand-accent/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Persona Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-semantic-muted">
          {PERSONA_LABELS.PERSONA_SELECT_LABEL}
        </label>
        <select
          value={state.formData.personaId || ''}
          onChange={(e) => handlePersonaSelect(e.target.value)}
          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-brand-foreground transition focus:border-brand-accent focus:outline-none"
        >
          <option value="">{PERSONA_LABELS.PERSONA_NONE}</option>
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.name} (v{persona.version})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-semantic-muted">{PERSONA_LABELS.PERSONA_SELECT_HELP}</p>
      </div>

      {/* Selected Persona Preview */}
      {selectedPersona && (
        <div className="rounded-lg border border-brand-outline/50 bg-brand-paperElev p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-brand-foreground">{selectedPersona.name}</h3>
              <p className="mt-1 text-sm text-semantic-muted">Version {selectedPersona.version}</p>
            </div>
            {selectedPersona.active && (
              <span className={`rounded-full ${STATUS_BG_COLORS_SUBTLE.success} px-3 py-1 text-xs font-medium ${STATUS_TEXT_COLORS.success}`}>
                Active
              </span>
            )}
          </div>

          {/* Mission */}
          {selectedPersona.mission && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-semibold text-brand-foreground">Mission</h4>
              <p className="text-sm text-semantic-muted">{selectedPersona.mission}</p>
            </div>
          )}

          {/* Capabilities */}
          {selectedPersona.metadata?.capabilities && selectedPersona.metadata.capabilities.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-brand-foreground">Capabilities</h4>
              <div className="flex flex-wrap gap-2">
                {selectedPersona.metadata.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="rounded-full bg-brand-accent/20 px-3 py-1 text-xs font-medium text-brand-accent"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      {!selectedPersona && (
        <div className={`rounded-lg border ${STATUS_BORDER_COLORS_SUBTLE.info} ${STATUS_BG_COLORS_SUBTLE.info} p-4`}>
          <p className={`text-sm ${STATUS_TEXT_COLORS.info}`}>
            💡 <strong>Optional:</strong> Linking a Persona to your Eye enhances its capabilities
            with specialized behavior, guidance phases, and validation rules. You can skip this step
            and add a Persona later.
          </p>
        </div>
      )}
    </div>
  );
}
