/**
 * CustomEyeWizard Type Definitions
 *
 * Per R07: Strict typing, zero `any`
 * All form state, validation, and step interfaces
 */

// ============================================================================
// Form Data Interfaces
// ============================================================================

export interface CustomEyeFormData {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: string; // JSON string
  readonly outputSchema: string; // JSON string
  readonly iconSvg: string;
  readonly personaId: string;
}

// ============================================================================
// Wizard State
// ============================================================================

export interface CustomEyeFormState {
  readonly currentStep: number;
  readonly formData: CustomEyeFormData;
  readonly isDirty: boolean;
  readonly isEditing: boolean;
  readonly eyeId?: string; // For edit mode
}

// ============================================================================
// Wizard Step Configuration
// ============================================================================

export interface WizardStep {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly isOptional: boolean;
}

// ============================================================================
// Validation
// ============================================================================

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly FieldError[];
}

// ============================================================================
// Actions (for useReducer)
// ============================================================================

export type CustomEyeFormAction =
  | { readonly type: 'SET_STEP'; readonly step: number }
  | { readonly type: 'SET_FORM_DATA'; readonly formData: Partial<CustomEyeFormData> }
  | { readonly type: 'SET_NAME'; readonly name: string }
  | { readonly type: 'SET_DESCRIPTION'; readonly description: string }
  | { readonly type: 'SET_INPUT_SCHEMA'; readonly inputSchema: string }
  | { readonly type: 'SET_OUTPUT_SCHEMA'; readonly outputSchema: string }
  | { readonly type: 'SET_ICON_SVG'; readonly iconSvg: string }
  | { readonly type: 'SET_PERSONA_ID'; readonly personaId: string }
  | { readonly type: 'NEXT_STEP' }
  | { readonly type: 'PREVIOUS_STEP' }
  | { readonly type: 'RESET' }
  | { readonly type: 'MARK_CLEAN' }
  | { readonly type: 'LOAD_TEMPLATE'; readonly inputSchema: string; readonly outputSchema: string };

// ============================================================================
// Props
// ============================================================================

export interface CustomEyeWizardProps {
  readonly initialData?: Partial<CustomEyeFormData>;
  readonly eyeId?: string; // For edit mode
  readonly onSave: (data: CustomEyeFormData) => Promise<void>;
  readonly onCancel: () => void;
}

export interface WizardStepProps {
  readonly state: CustomEyeFormState;
  readonly dispatch: React.Dispatch<CustomEyeFormAction>;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
}

// ============================================================================
// Schema Template
// ============================================================================

export interface SchemaTemplate {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly output: Record<string, unknown>;
}
