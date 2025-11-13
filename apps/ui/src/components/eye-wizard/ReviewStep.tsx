"use client";

import { useState, useMemo } from "react";
import type { WizardStepProps } from "@/types/eye-wizard";
import { formDataToPayload } from "@/types/eye-wizard";
import { REVIEW_LABELS, BUTTON_LABELS, VALIDATION_MESSAGES } from "./constants";
import {
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
  STATUS_TEXT_COLORS,
} from "@/constants/color-mappings";

interface ReviewStepProps extends WizardStepProps {
  readonly onSave: () => Promise<void>;
}

/**
 * ReviewStep - Step 4 of EyeWizard
 * Final review and save
 */
export function ReviewStep({ state, onSave }: ReviewStepProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Validate all fields
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!state.formData.name.trim()) {
      errors.push("Eye name is required");
    }
    if (!state.formData.description.trim()) {
      errors.push("Description is required");
    }

    // Validate JSON schemas
    try {
      JSON.parse(state.formData.inputSchema);
    } catch {
      errors.push("Input schema contains invalid JSON");
    }

    try {
      JSON.parse(state.formData.outputSchema);
    } catch {
      errors.push("Output schema contains invalid JSON");
    }

    return errors;
  }, [state.formData]);

  // Generate API payload
  const apiPayload = useMemo(() => {
    try {
      return formDataToPayload(state.formData);
    } catch (error) {
      console.error("Failed to generate API payload:", error);
      return null;
    }
  }, [state.formData]);

  // Handle save
  const handleSave = async () => {
    if (validationErrors.length > 0) {
      setSaveError(VALIDATION_MESSAGES.GENERIC_ERROR);
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      await onSave();
    } catch (error) {
      console.error("Failed to save Eye:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : VALIDATION_MESSAGES.GENERIC_ERROR,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-brand-foreground">
          {REVIEW_LABELS.TITLE}
        </h2>
        <p className="mt-1 text-sm text-semantic-muted">
          {REVIEW_LABELS.SUBTITLE}
        </p>
      </div>

      {/* Validation Status */}
      {validationErrors.length > 0 ? (
        <div
          className={`rounded-lg border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} p-4`}
        >
          <p
            className={`mb-2 text-sm font-semibold ${STATUS_TEXT_COLORS.error}`}
          >
            {REVIEW_LABELS.VALIDATION_ERROR}
          </p>
          <ul
            className={`list-inside list-disc space-y-1 text-sm ${STATUS_TEXT_COLORS.error}`}
          >
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          className={`rounded-lg border ${STATUS_BORDER_COLORS_SUBTLE.success} ${STATUS_BG_COLORS_SUBTLE.success} p-4`}
        >
          <p className={`text-sm font-semibold ${STATUS_TEXT_COLORS.success}`}>
            ✓ {REVIEW_LABELS.VALIDATION_SUCCESS}
          </p>
        </div>
      )}

      {/* Save Error */}
      {saveError && (
        <div
          className={`rounded-lg border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} p-4`}
        >
          <p className={`text-sm ${STATUS_TEXT_COLORS.error}`}>{saveError}</p>
        </div>
      )}

      {/* Review Sections */}
      <div className="space-y-4">
        {/* Basic Information */}
        <div className="rounded-lg border border-brand-outline/50 bg-brand-paperElev p-4">
          <h3 className="mb-3 text-sm font-semibold text-brand-accent">
            {REVIEW_LABELS.SECTION_BASIC_INFO}
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-semantic-muted">Name:</span>
              <span className="ml-2 text-brand-foreground">
                {state.formData.name || "N/A"}
              </span>
            </div>
            <div>
              <span className="font-medium text-semantic-muted">
                Description:
              </span>
              <p className="mt-1 text-brand-foreground">
                {state.formData.description || "N/A"}
              </p>
            </div>
            {state.formData.iconSvg && (
              <div>
                <span className="font-medium text-semantic-muted">
                  Custom Icon:
                </span>
                <span className="ml-2 text-brand-accent">✓ Configured</span>
              </div>
            )}
          </div>
        </div>

        {/* Schemas */}
        <div className="rounded-lg border border-brand-outline/50 bg-brand-paperElev p-4">
          <h3 className="mb-3 text-sm font-semibold text-brand-accent">
            {REVIEW_LABELS.SECTION_SCHEMAS}
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-semantic-muted">
                Input Schema:
              </span>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-brand-ink p-2 text-xs text-status-success">
                {state.formData.inputSchema}
              </pre>
            </div>
            <div>
              <span className="font-medium text-semantic-muted">
                Output Schema:
              </span>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-brand-ink p-2 text-xs text-status-success">
                {state.formData.outputSchema}
              </pre>
            </div>
          </div>
        </div>

        {/* Persona */}
        <div className="rounded-lg border border-brand-outline/50 bg-brand-paperElev p-4">
          <h3 className="mb-3 text-sm font-semibold text-brand-accent">
            {REVIEW_LABELS.SECTION_PERSONA}
          </h3>
          <div className="text-sm">
            {state.formData.personaId ? (
              <span className="text-brand-foreground">
                {state.formData.personaId}
              </span>
            ) : (
              <span className="text-semantic-muted">No persona linked</span>
            )}
          </div>
        </div>
      </div>

      {/* JSON Preview Toggle */}
      <div>
        <button
          onClick={() => setShowJsonPreview(!showJsonPreview)}
          className="text-sm font-medium text-brand-accent transition hover:text-brand-primary"
        >
          {showJsonPreview ? "▼" : "▶"} {REVIEW_LABELS.JSON_PREVIEW}
        </button>
        {showJsonPreview && apiPayload && (
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-brand-outline/50 bg-brand-ink p-4 text-xs text-status-success">
            {JSON.stringify(apiPayload, null, 2)}
          </pre>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || validationErrors.length > 0}
          className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
            isSaving || validationErrors.length > 0
              ? "cursor-not-allowed bg-brand-outline/20 text-semantic-muted"
              : "bg-brand-accent text-brand-foreground hover:bg-brand-primary"
          }`}
        >
          {isSaving ? "Saving..." : BUTTON_LABELS.SAVE}
        </button>
      </div>
    </div>
  );
}
