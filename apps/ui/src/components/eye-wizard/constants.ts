/**
 * SSOT Constants for EyeWizard (R01, R13)
 * All text, limits, and configuration centralized
 */

import { EyeWizardStep } from '@/types/eye-wizard';

/**
 * Character limits for validation
 */
export const CHAR_LIMITS = {
  NAME_MIN: 3,
  NAME_MAX: 64,
  DESCRIPTION_MIN: 10,
  DESCRIPTION_MAX: 500,
  ICON_SVG_MAX: 10000,
} as const;

/**
 * Step metadata
 */
export const STEP_CONFIG = {
  [EyeWizardStep.BASIC_INFO]: {
    title: 'Basic Information',
    description: 'Configure the name, description, and icon for your Eye',
    icon: '📝',
  },
  [EyeWizardStep.SCHEMAS]: {
    title: 'Input & Output Schemas',
    description: 'Define the data structures your Eye will work with',
    icon: '🔧',
  },
  [EyeWizardStep.PERSONA]: {
    title: 'Assign Persona',
    description: 'Optionally link this Eye to a specific Persona',
    icon: '🤖',
  },
  [EyeWizardStep.REVIEW]: {
    title: 'Review & Save',
    description: 'Review your configuration and save changes',
    icon: '✅',
  },
} as const;

/**
 * Button labels
 */
export const BUTTON_LABELS = {
  NEXT: 'Next',
  PREVIOUS: 'Previous',
  SAVE: 'Save Eye',
  CANCEL: 'Cancel',
  CLOSE: 'Close',
  RESET: 'Reset',
  ADD: 'Add',
  REMOVE: 'Remove',
  EDIT: 'Edit',
  DELETE: 'Delete',
  IMPORT: 'Import',
  EXPORT: 'Export',
} as const;

/**
 * Field labels and placeholders - Basic Info Step
 */
export const BASIC_INFO_LABELS = {
  NAME_LABEL: 'Eye Name',
  NAME_PLACEHOLDER: 'Enter a unique name for this Eye',
  NAME_HELP: `Name must be between ${CHAR_LIMITS.NAME_MIN} and ${CHAR_LIMITS.NAME_MAX} characters`,

  DESCRIPTION_LABEL: 'Description',
  DESCRIPTION_PLACEHOLDER: 'Describe the purpose and capabilities of this Eye',
  DESCRIPTION_HELP: `Description must be between ${CHAR_LIMITS.DESCRIPTION_MIN} and ${CHAR_LIMITS.DESCRIPTION_MAX} characters`,

  ICON_SVG_LABEL: 'Icon SVG (Optional)',
  ICON_SVG_PLACEHOLDER: '<svg>...</svg>',
  ICON_SVG_HELP: 'Provide custom SVG code for the Eye icon',
} as const;

/**
 * Field labels and placeholders - Schema Step
 */
export const SCHEMA_LABELS = {
  INPUT_SCHEMA_LABEL: 'Input Schema',
  INPUT_SCHEMA_PLACEHOLDER: '{}',
  INPUT_SCHEMA_HELP: 'Define the expected input structure for this Eye',

  OUTPUT_SCHEMA_LABEL: 'Output Schema',
  OUTPUT_SCHEMA_PLACEHOLDER: '{}',
  OUTPUT_SCHEMA_HELP: 'Define the expected output structure for this Eye',

  JSON_EDITOR_LABEL: 'JSON Editor',
  VISUAL_BUILDER_LABEL: 'Visual Builder',

  ADD_PROPERTY: 'Add Property',
  PROPERTY_NAME: 'Property Name',
  PROPERTY_TYPE: 'Property Type',
  PROPERTY_REQUIRED: 'Required',
} as const;

/**
 * Field labels and placeholders - Persona Step
 */
export const PERSONA_LABELS = {
  PERSONA_SELECT_LABEL: 'Select Persona',
  PERSONA_SELECT_PLACEHOLDER: 'Choose a Persona to link with this Eye',
  PERSONA_SELECT_HELP: 'Link this Eye to a Persona for enhanced capabilities',
  PERSONA_NONE: 'No Persona',
  PERSONA_LOADING: 'Loading personas...',
  PERSONA_ERROR: 'Failed to load personas',
} as const;

/**
 * Review step labels
 */
export const REVIEW_LABELS = {
  TITLE: 'Review Your Configuration',
  SUBTITLE: 'Please review all settings before saving',
  SECTION_BASIC_INFO: 'Basic Information',
  SECTION_SCHEMAS: 'Schemas',
  SECTION_PERSONA: 'Linked Persona',
  JSON_PREVIEW: 'JSON Preview',
  VALIDATION_SUCCESS: 'All fields validated successfully',
  VALIDATION_ERROR: 'Please fix validation errors before saving',
} as const;

/**
 * Validation error messages
 */
export const VALIDATION_MESSAGES = {
  NAME_REQUIRED: 'Eye name is required',
  NAME_TOO_SHORT: `Name must be at least ${CHAR_LIMITS.NAME_MIN} characters`,
  NAME_TOO_LONG: `Name must not exceed ${CHAR_LIMITS.NAME_MAX} characters`,
  NAME_INVALID: 'Name contains invalid characters',

  DESCRIPTION_REQUIRED: 'Description is required',
  DESCRIPTION_TOO_SHORT: `Description must be at least ${CHAR_LIMITS.DESCRIPTION_MIN} characters`,
  DESCRIPTION_TOO_LONG: `Description must not exceed ${CHAR_LIMITS.DESCRIPTION_MAX} characters`,

  ICON_SVG_TOO_LONG: `Icon SVG must not exceed ${CHAR_LIMITS.ICON_SVG_MAX} characters`,
  ICON_SVG_INVALID: 'Invalid SVG format',

  INPUT_SCHEMA_INVALID_JSON: 'Input schema must be valid JSON',
  OUTPUT_SCHEMA_INVALID_JSON: 'Output schema must be valid JSON',

  GENERIC_ERROR: 'An error occurred. Please try again.',
} as const;

/**
 * Success/info messages
 */
export const SUCCESS_MESSAGES = {
  EYE_SAVED: 'Eye saved successfully',
  EYE_UPDATED: 'Eye updated successfully',
  EYE_CREATED: 'Eye created successfully',
} as const;

/**
 * Help text and tooltips
 */
export const HELP_TEXT = {
  WIZARD_INTRO: 'This wizard will guide you through configuring your Eye. You can navigate between steps and your progress will be saved.',
  REQUIRED_FIELD: 'This field is required',
  OPTIONAL_FIELD: 'This field is optional',
  UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?',
} as const;

/**
 * Progress indicator labels
 */
export const PROGRESS_LABELS = {
  STEP_OF: (current: number, total: number) => `Step ${current + 1} of ${total}`,
  PROGRESS_PERCENTAGE: (current: number, total: number) => `${Math.round(((current + 1) / total) * 100)}%`,
} as const;

/**
 * Default values
 */
export const DEFAULT_VALUES = {
  NAME: '',
  DESCRIPTION: '',
  ICON_SVG: '',
  INPUT_SCHEMA: '{}',
  OUTPUT_SCHEMA: '{}',
  PERSONA_ID: '',
} as const;

/**
 * Wizard configuration
 */
export const WIZARD_CONFIG = {
  TOTAL_STEPS: 4,
  FIRST_STEP: EyeWizardStep.BASIC_INFO,
  LAST_STEP: EyeWizardStep.REVIEW,
  ALLOW_SKIP_OPTIONAL: true,
  CONFIRM_UNSAVED_CHANGES: true,
} as const;
