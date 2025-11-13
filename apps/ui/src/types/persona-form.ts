/**
 * PersonaWizard Type Definitions
 *
 * Per R07: Strict typing, zero `any`
 * All form state, validation, and step interfaces
 */

// ============================================================================
// Form Data Interfaces (maps to PersonaBlueprint schema)
// ============================================================================

export interface MetadataFormData {
  readonly eyeId: string;
  readonly name: string;
  readonly description: string;
  readonly version: number;
  readonly capabilities: readonly string[];
}

export interface PhaseFormData {
  readonly mission: string;
  readonly check: string;
  readonly reminders: readonly string[];
  readonly example: string;
}

export interface EnvelopeFormData {
  readonly requiredKeys: readonly string[];
  readonly requiredDataKeys: readonly string[];
  readonly requiredUiKeys: readonly string[];
}

export interface LLMConfigFormData {
  readonly temperature: number;
  readonly top_p: number;
  readonly response_format: "text" | "json_object";
  readonly max_tokens: number;
}

// ============================================================================
// Wizard State
// ============================================================================

export interface PersonaFormState {
  readonly currentStep: number;
  readonly metadata: MetadataFormData;
  readonly mission: string;
  readonly guidancePhase: PhaseFormData | null;
  readonly validationPhase: PhaseFormData | null;
  readonly envelopeContract: EnvelopeFormData;
  readonly reminders: readonly string[];
  readonly llmConfig: LLMConfigFormData;
  readonly notes: string;
  readonly isDirty: boolean;
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

export interface StepValidation {
  readonly stepId: number;
  readonly isValid: boolean;
  readonly errors: readonly FieldError[];
}

// ============================================================================
// Actions (for useReducer)
// ============================================================================

export type PersonaFormAction =
  | { readonly type: "SET_STEP"; readonly step: number }
  | { readonly type: "SET_METADATA"; readonly metadata: MetadataFormData }
  | { readonly type: "SET_MISSION"; readonly mission: string }
  | {
      readonly type: "SET_GUIDANCE_PHASE";
      readonly guidancePhase: PhaseFormData | null;
    }
  | {
      readonly type: "SET_VALIDATION_PHASE";
      readonly validationPhase: PhaseFormData | null;
    }
  | {
      readonly type: "SET_ENVELOPE_CONTRACT";
      readonly envelopeContract: EnvelopeFormData;
    }
  | { readonly type: "SET_REMINDERS"; readonly reminders: readonly string[] }
  | { readonly type: "SET_LLM_CONFIG"; readonly llmConfig: LLMConfigFormData }
  | { readonly type: "SET_NOTES"; readonly notes: string }
  | { readonly type: "NEXT_STEP" }
  | { readonly type: "PREVIOUS_STEP" }
  | { readonly type: "RESET" }
  | { readonly type: "MARK_CLEAN" }
  | {
      readonly type: "LOAD_IMPORTED_DATA";
      readonly data: Partial<PersonaFormState>;
    };

// ============================================================================
// Props
// ============================================================================

export interface PersonaWizardProps {
  readonly initialData?: Partial<PersonaFormState>;
  readonly onSave: (data: PersonaFormState) => Promise<void>;
  readonly onCancel: () => void;
}

export interface WizardStepProps {
  readonly state: PersonaFormState;
  readonly dispatch: React.Dispatch<PersonaFormAction>;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
}
