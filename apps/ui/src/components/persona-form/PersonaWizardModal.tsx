"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PersonaWizard } from "./PersonaWizard";
import type { PersonaFormState } from "@/types/persona-form";
import { X } from "lucide-react";
import { UI_HELP_TEXT } from "@third-eye/constants";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";
import { API_BASE_URL } from "@/consts/api";

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

export function PersonaWizardModal({
  isOpen,
  eyeId,
  eyeName,
  onClose,
  onSave,
}: PersonaWizardModalProps) {
  const [initialData, setInitialData] = useState<
    Partial<PersonaFormState> | undefined
  >(undefined);
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
      const response = await fetch(
        `${API_BASE_URL}/api/personas/blueprints/${eyeId}`,
      );

      if (response.status === 404) {
        // No persona exists yet - use defaults with eyeId pre-filled
        setInitialData({
          metadata: {
            eyeId,
            name: eyeName,
            description: "",
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
        const apiData = result.data;

        // Safely extract data with null checks
        // Backend may return camelCase (metadata) or snake_case (metadata_json)
        const metadata = apiData.metadata ?? apiData.metadataJson ?? {};
        const guidancePhase =
          apiData.phases?.guidance ??
          apiData.guidanceJson ??
          apiData.guidance_json ??
          null;
        const validationPhase =
          apiData.phases?.validation ??
          apiData.validationJson ??
          apiData.validation_json ??
          null;
        const envelope =
          apiData.envelopeContract ??
          apiData.envelopeJson ??
          apiData.envelope_json ??
          {};
        const reminders =
          apiData.reminders ??
          apiData.remindersJson ??
          apiData.reminders_json ??
          [];
        const llmConfig =
          apiData.llmConfig ??
          apiData.llmConfigJson ??
          apiData.llm_config_json ??
          {};

        // Transform database format to PersonaFormState with null coalescing
        const transformedData: Partial<PersonaFormState> = {
          metadata: {
            eyeId: metadata.eyeId ?? apiData.eyeId ?? eyeId,
            name: metadata.name ?? apiData.name ?? eyeName,
            description: metadata.description ?? "",
            version: metadata.version ?? apiData.version ?? 1,
            capabilities: [
              ...(metadata.capabilities ?? apiData.capabilities ?? []),
            ],
          },
          mission: apiData.mission ?? "",
          guidancePhase: guidancePhase,
          validationPhase: validationPhase,
          envelopeContract: {
            requiredKeys: [...(envelope.requiredKeys ?? [])],
            requiredDataKeys: [...(envelope.requiredDataKeys ?? [])],
            requiredUiKeys: [...(envelope.requiredUiKeys ?? [])],
          },
          reminders: [...reminders],
          llmConfig: {
            temperature: llmConfig.temperature ?? 0.7,
            top_p: llmConfig.top_p ?? 1.0,
            response_format: llmConfig.response_format ?? "text",
            max_tokens: llmConfig.max_tokens ?? 4096,
          },
          notes: apiData.notes ?? "",
        };

        setInitialData(transformedData);
      } else {
        // No data in response - set defaults
        setInitialData({
          metadata: {
            eyeId,
            name: eyeName,
            description: "",
            version: 1,
            capabilities: [],
          },
        });
      }
    } catch (err) {
      console.error("Failed to load persona:", err);
      setError(UI_HELP_TEXT.EYES_ERROR_PERSONA_LOAD_FAILED);
      // Still allow creating new persona
      setInitialData({
        metadata: {
          eyeId,
          name: eyeName,
          description: "",
          version: 1,
          capabilities: [],
        },
      });
    } finally {
      setLoading(false);
    }
  }, [eyeId, eyeName]);

  const handleSave = useCallback(
    async (state: PersonaFormState) => {
      setLoading(true);
      setError(null);
      try {
        // Transform PersonaFormState back to database format
        const dbPayload = {
          metadataJson: {
            eyeId: state.metadata.eyeId,
            name: state.metadata.name,
            description: state.metadata.description,
            version: state.metadata.version,
            capabilities: state.metadata.capabilities,
          },
          mission: state.mission,
          guidanceJson: state.guidancePhase,
          validationJson: state.validationPhase,
          envelopeJson: {
            requiredKeys: state.envelopeContract.requiredKeys,
            requiredDataKeys: state.envelopeContract.requiredDataKeys,
            requiredUiKeys: state.envelopeContract.requiredUiKeys,
          },
          remindersJson: state.reminders,
          llmConfigJson: {
            temperature: state.llmConfig.temperature,
            top_p: state.llmConfig.top_p,
            response_format: state.llmConfig.response_format,
            max_tokens: state.llmConfig.max_tokens,
          },
          notes: state.notes,
        };

        const response = await fetch(
          `${API_BASE_URL}/api/personas/blueprints/${eyeId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dbPayload),
          },
        );

        if (!response.ok) {
          throw new Error(UI_HELP_TEXT.EYES_ERROR_PERSONA_SAVE_FAILED);
        }

        // Notify parent of successful save
        onSave();
        onClose();
      } catch (err) {
        console.error("Failed to save persona:", err);
        setError(UI_HELP_TEXT.EYES_ERROR_PERSONA_SAVE_FAILED);
      } finally {
        setLoading(false);
      }
    },
    [eyeId, onSave, onClose],
  );

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
                {UI_HELP_TEXT.EYES_PERSONA_MODAL_TITLE.replace(
                  "{eyeName}",
                  eyeName,
                )}
              </h2>
              <p className="mt-1 text-sm text-semantic-muted">
                {UI_HELP_TEXT.EYES_PERSONA_MODAL_SUBTITLE}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="rounded-full p-2 text-semantic-muted transition-colors hover:bg-brand-paper hover:text-brand-foreground"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div
              className={`mb-4 rounded-lg border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} p-4 ${STATUS_TEXT_COLORS.error}`}
            >
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && !initialData ? (
            <div className="rounded-2xl bg-brand-paperElev border border-brand-outline p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent"></div>
              <p className="mt-4 text-semantic-muted">
                Loading persona configuration...
              </p>
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
