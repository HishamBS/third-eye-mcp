/**
 * PersonaWizard SSOT - All wizard text and configuration
 *
 * Per R13: NO string literals in wizard components.
 * All text, labels, messages defined here.
 */

export const WIZARD_STEPS = {
  METADATA: 0,
  MISSION: 1,
  GUIDANCE: 2,
  VALIDATION: 3,
  ENVELOPE: 4,
  REMINDERS: 5,
  LLM_CONFIG: 6,
  NOTES: 7,
  REVIEW: 8,
} as const;

export const TOTAL_STEPS = 9;

export const STEP_TITLES = {
  [WIZARD_STEPS.METADATA]: 'Eye & Metadata',
  [WIZARD_STEPS.MISSION]: 'Core Mission',
  [WIZARD_STEPS.GUIDANCE]: 'Guidance Phase',
  [WIZARD_STEPS.VALIDATION]: 'Validation Phase',
  [WIZARD_STEPS.ENVELOPE]: 'Envelope Contract',
  [WIZARD_STEPS.REMINDERS]: 'General Reminders',
  [WIZARD_STEPS.LLM_CONFIG]: 'LLM Configuration',
  [WIZARD_STEPS.NOTES]: 'Internal Notes',
  [WIZARD_STEPS.REVIEW]: 'Review & Save',
} as const;

export const STEP_DESCRIPTIONS = {
  [WIZARD_STEPS.METADATA]: 'Define the Eye identity, name, description, and core capabilities',
  [WIZARD_STEPS.MISSION]: 'Articulate the primary mission statement for this Eye',
  [WIZARD_STEPS.GUIDANCE]: 'Configure the guidance phase: mission, checks, reminders, and examples',
  [WIZARD_STEPS.VALIDATION]: 'Configure the validation phase: mission, checks, reminders, and examples',
  [WIZARD_STEPS.ENVELOPE]: 'Specify required keys for the data envelope contract',
  [WIZARD_STEPS.REMINDERS]: 'Add general reminders that apply to all phases',
  [WIZARD_STEPS.LLM_CONFIG]: 'Configure LLM parameters: temperature, top_p, response format, max tokens',
  [WIZARD_STEPS.NOTES]: 'Optional internal notes for documentation and context',
  [WIZARD_STEPS.REVIEW]: 'Review all configuration and export the persona blueprint',
} as const;

export const BUTTON_LABELS = {
  PREVIOUS: 'Previous',
  NEXT: 'Next',
  SKIP: 'Skip',
  SAVE_DRAFT: 'Save Draft',
  FINISH: 'Finish & Save',
  CANCEL: 'Cancel',
  EXPORT_JSON: 'Export JSON',
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  MIN_LENGTH: 'Must be at least {min} characters',
  MAX_LENGTH: 'Must be at most {max} characters',
  INVALID_JSON: 'Invalid JSON format',
  DUPLICATE_CAPABILITY: 'Capability already exists',
  EMPTY_ARRAY: 'At least one item is required',
  INVALID_NUMBER: 'Must be a valid number',
  OUT_OF_RANGE: 'Value must be between {min} and {max}',
} as const;

export const WIZARD_TEXT = {
  TITLE: 'Persona Configuration Wizard',
  SUBTITLE: 'Create or edit an Eye persona with structured form-based configuration',
  PROGRESS_LABEL: 'Step {current} of {total}',
  UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?',
  SAVE_SUCCESS: 'Persona saved successfully',
  SAVE_ERROR: 'Failed to save persona',
  VALIDATION_ERROR: 'Please fix validation errors before proceeding',
} as const;

export const OPTIONAL_STEPS = new Set([
  WIZARD_STEPS.VALIDATION,
  WIZARD_STEPS.NOTES,
]);
