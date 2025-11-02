'use client';

import { useState, useCallback } from 'react';
import type { WizardStepProps } from '@/types/eye-wizard';
import {
  BASIC_INFO_LABELS,
  CHAR_LIMITS,
  VALIDATION_MESSAGES,
} from './constants';

/**
 * BasicInfoStep - Step 1 of EyeWizard
 * Handles name, description, and icon SVG editing
 */
export function BasicInfoStep({ state, dispatch }: WizardStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate name
  const validateName = useCallback((name: string): string | null => {
    if (!name.trim()) {
      return VALIDATION_MESSAGES.NAME_REQUIRED;
    }
    if (name.trim().length < CHAR_LIMITS.NAME_MIN) {
      return VALIDATION_MESSAGES.NAME_TOO_SHORT;
    }
    if (name.trim().length > CHAR_LIMITS.NAME_MAX) {
      return VALIDATION_MESSAGES.NAME_TOO_LONG;
    }
    return null;
  }, []);

  // Validate description
  const validateDescription = useCallback((description: string): string | null => {
    if (!description.trim()) {
      return VALIDATION_MESSAGES.DESCRIPTION_REQUIRED;
    }
    if (description.trim().length < CHAR_LIMITS.DESCRIPTION_MIN) {
      return VALIDATION_MESSAGES.DESCRIPTION_TOO_SHORT;
    }
    if (description.trim().length > CHAR_LIMITS.DESCRIPTION_MAX) {
      return VALIDATION_MESSAGES.DESCRIPTION_TOO_LONG;
    }
    return null;
  }, []);

  // Validate icon SVG
  const validateIconSvg = useCallback((iconSvg: string): string | null => {
    if (iconSvg && iconSvg.length > CHAR_LIMITS.ICON_SVG_MAX) {
      return VALIDATION_MESSAGES.ICON_SVG_TOO_LONG;
    }
    // Basic SVG validation - must start with <svg and end with </svg>
    if (iconSvg && !iconSvg.trim().match(/^<svg[\s\S]*<\/svg>$/i)) {
      return VALIDATION_MESSAGES.ICON_SVG_INVALID;
    }
    return null;
  }, []);

  // Handle name change
  const handleNameChange = useCallback(
    (value: string) => {
      dispatch({
        type: 'UPDATE_BASIC_INFO',
        payload: { name: value },
      });
      // Clear error on change
      if (errors.name) {
        setErrors((prev) => ({ ...prev, name: '' }));
      }
    },
    [dispatch, errors.name]
  );

  // Handle name blur
  const handleNameBlur = useCallback(() => {
    const error = validateName(state.formData.name);
    if (error) {
      setErrors((prev) => ({ ...prev, name: error }));
    }
  }, [state.formData.name, validateName]);

  // Handle description change
  const handleDescriptionChange = useCallback(
    (value: string) => {
      dispatch({
        type: 'UPDATE_BASIC_INFO',
        payload: { description: value },
      });
      // Clear error on change
      if (errors.description) {
        setErrors((prev) => ({ ...prev, description: '' }));
      }
    },
    [dispatch, errors.description]
  );

  // Handle description blur
  const handleDescriptionBlur = useCallback(() => {
    const error = validateDescription(state.formData.description);
    if (error) {
      setErrors((prev) => ({ ...prev, description: error }));
    }
  }, [state.formData.description, validateDescription]);

  // Handle icon SVG change
  const handleIconSvgChange = useCallback(
    (value: string) => {
      dispatch({
        type: 'UPDATE_BASIC_INFO',
        payload: { iconSvg: value },
      });
      // Clear error on change
      if (errors.iconSvg) {
        setErrors((prev) => ({ ...prev, iconSvg: '' }));
      }
    },
    [dispatch, errors.iconSvg]
  );

  // Handle icon SVG blur
  const handleIconSvgBlur = useCallback(() => {
    const error = validateIconSvg(state.formData.iconSvg);
    if (error) {
      setErrors((prev) => ({ ...prev, iconSvg: error }));
    }
  }, [state.formData.iconSvg, validateIconSvg]);

  const { name, description, iconSvg } = state.formData;

  return (
    <div className="space-y-6">
      {/* Name Field */}
      <div>
        <label className="mb-2 block text-sm font-medium text-semantic-muted">
          {BASIC_INFO_LABELS.NAME_LABEL}
          <span className="ml-1 text-status-error">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={handleNameBlur}
          placeholder={BASIC_INFO_LABELS.NAME_PLACEHOLDER}
          className={`w-full rounded-xl border ${
            errors.name ? 'border-status-error' : 'border-brand-outline/50'
          } bg-brand-paper px-4 py-2 text-brand-foreground transition focus:border-brand-accent focus:outline-none`}
          maxLength={CHAR_LIMITS.NAME_MAX}
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.name ? (
            <p className="text-xs text-status-error">{errors.name}</p>
          ) : (
            <p className="text-xs text-semantic-muted">{BASIC_INFO_LABELS.NAME_HELP}</p>
          )}
          <span className="text-xs text-semantic-muted">
            {name.length}/{CHAR_LIMITS.NAME_MAX}
          </span>
        </div>
      </div>

      {/* Description Field */}
      <div>
        <label className="mb-2 block text-sm font-medium text-semantic-muted">
          {BASIC_INFO_LABELS.DESCRIPTION_LABEL}
          <span className="ml-1 text-status-error">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder={BASIC_INFO_LABELS.DESCRIPTION_PLACEHOLDER}
          rows={4}
          className={`w-full rounded-xl border ${
            errors.description ? 'border-status-error' : 'border-brand-outline/50'
          } bg-brand-paper px-4 py-2 text-brand-foreground transition focus:border-brand-accent focus:outline-none`}
          maxLength={CHAR_LIMITS.DESCRIPTION_MAX}
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.description ? (
            <p className="text-xs text-status-error">{errors.description}</p>
          ) : (
            <p className="text-xs text-semantic-muted">{BASIC_INFO_LABELS.DESCRIPTION_HELP}</p>
          )}
          <span className="text-xs text-semantic-muted">
            {description.length}/{CHAR_LIMITS.DESCRIPTION_MAX}
          </span>
        </div>
      </div>

      {/* Icon SVG Field (Optional) */}
      <div>
        <label className="mb-2 block text-sm font-medium text-semantic-muted">
          {BASIC_INFO_LABELS.ICON_SVG_LABEL}
        </label>
        <textarea
          value={iconSvg}
          onChange={(e) => handleIconSvgChange(e.target.value)}
          onBlur={handleIconSvgBlur}
          placeholder={BASIC_INFO_LABELS.ICON_SVG_PLACEHOLDER}
          rows={6}
          className={`font-mono text-sm w-full rounded-xl border ${
            errors.iconSvg ? 'border-status-error' : 'border-brand-outline/50'
          } bg-brand-paper px-4 py-2 text-brand-foreground transition focus:border-brand-accent focus:outline-none`}
          maxLength={CHAR_LIMITS.ICON_SVG_MAX}
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.iconSvg ? (
            <p className="text-xs text-status-error">{errors.iconSvg}</p>
          ) : (
            <p className="text-xs text-semantic-muted">{BASIC_INFO_LABELS.ICON_SVG_HELP}</p>
          )}
          <span className="text-xs text-semantic-muted">
            {iconSvg.length}/{CHAR_LIMITS.ICON_SVG_MAX}
          </span>
        </div>

        {/* SVG Preview */}
        {iconSvg && !errors.iconSvg && (
          <div className="mt-4 rounded-lg border border-brand-outline/50 bg-brand-paperElev p-4">
            <p className="mb-2 text-xs font-medium text-semantic-muted">Preview:</p>
            <div
              className="flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: iconSvg }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
