/**
 * Type definitions for EyeWizard component
 * Follows PersonaWizard pattern with strict typing (R07)
 */

import type { Eye } from './api';

/**
 * Wizard step identifiers
 */
export enum EyeWizardStep {
  BASIC_INFO = 0,
  SCHEMAS = 1,
  PERSONA = 2,
  REVIEW = 3,
}

/**
 * Form data structure for Eye editing
 */
export interface EyeFormData {
  readonly name: string;
  readonly description: string;
  readonly iconSvg: string;
  readonly inputSchema: string; // JSON string
  readonly outputSchema: string; // JSON string
  readonly personaId: string;
}

/**
 * Complete wizard state
 */
export interface EyeFormState {
  readonly currentStep: EyeWizardStep;
  readonly formData: EyeFormData;
  readonly isDirty: boolean;
  readonly isEditing: boolean;
  readonly eyeId?: string;
}

/**
 * Reducer action types
 */
export type EyeFormAction =
  | { readonly type: 'SET_STEP'; readonly payload: EyeWizardStep }
  | { readonly type: 'NEXT_STEP' }
  | { readonly type: 'PREVIOUS_STEP' }
  | { readonly type: 'UPDATE_BASIC_INFO'; readonly payload: Partial<Pick<EyeFormData, 'name' | 'description' | 'iconSvg'>> }
  | { readonly type: 'UPDATE_SCHEMAS'; readonly payload: Partial<Pick<EyeFormData, 'inputSchema' | 'outputSchema'>> }
  | { readonly type: 'UPDATE_PERSONA'; readonly payload: string }
  | { readonly type: 'RESET' }
  | { readonly type: 'MARK_CLEAN' }
  | { readonly type: 'LOAD_EYE_DATA'; readonly payload: Eye };

/**
 * Props for individual wizard step components
 */
export interface WizardStepProps {
  readonly state: EyeFormState;
  readonly dispatch: React.Dispatch<EyeFormAction>;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
}

/**
 * Props for main EyeWizard component
 */
export interface EyeWizardProps {
  readonly initialData?: Partial<EyeFormData>;
  readonly eyeId?: string;
  readonly isEditing?: boolean;
  readonly onSave: (data: EyeFormData, eyeId?: string) => Promise<void>;
  readonly onCancel: () => void;
}

/**
 * Props for EyeWizardModal wrapper
 */
export interface EyeWizardModalProps {
  readonly isOpen: boolean;
  readonly eyeId?: string;
  readonly eyeName?: string;
  readonly onClose: () => void;
  readonly onSuccess?: () => void;
}

/**
 * API payload for updating Eye
 */
export interface UpdateEyePayload {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly outputSchema: Record<string, unknown>;
  readonly iconSvg?: string;
  readonly personaId?: string;
}

/**
 * Convert form data to API payload
 */
export function formDataToPayload(formData: EyeFormData): UpdateEyePayload {
  return {
    name: formData.name.trim(),
    description: formData.description.trim(),
    inputSchema: formData.inputSchema ? JSON.parse(formData.inputSchema) : {},
    outputSchema: formData.outputSchema ? JSON.parse(formData.outputSchema) : {},
    iconSvg: formData.iconSvg.trim() || undefined,
    personaId: formData.personaId.trim() || undefined,
  };
}

/**
 * Convert Eye to form data
 */
export function eyeToFormData(eye: Eye): EyeFormData {
  return {
    name: eye.name || '',
    description: eye.description || '',
    iconSvg: '', // TODO: Add iconSvg field to Eye type if available
    inputSchema: eye.inputSchema ? JSON.stringify(eye.inputSchema, null, 2) : '{}',
    outputSchema: eye.outputSchema ? JSON.stringify(eye.outputSchema, null, 2) : '{}',
    personaId: eye.personaId || '',
  };
}
