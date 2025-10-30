/**
 * CustomEyeWizard SSOT - All wizard text and configuration
 *
 * Per R13: NO string literals in wizard components.
 * All text, labels, messages defined here.
 */

export const WIZARD_STEPS = {
  BASIC_INFO: 0,
  SCHEMAS: 1,
  ICON: 2,
  PERSONA: 3,
  REVIEW: 4,
} as const;

export const TOTAL_STEPS = 5;

export const STEP_TITLES = {
  [WIZARD_STEPS.BASIC_INFO]: 'Basic Information',
  [WIZARD_STEPS.SCHEMAS]: 'Input & Output Schemas',
  [WIZARD_STEPS.ICON]: 'Custom Icon',
  [WIZARD_STEPS.PERSONA]: 'Persona Configuration',
  [WIZARD_STEPS.REVIEW]: 'Review & Create',
} as const;

export const STEP_DESCRIPTIONS = {
  [WIZARD_STEPS.BASIC_INFO]: 'Define the name and description for your custom Eye',
  [WIZARD_STEPS.SCHEMAS]: 'Specify JSON schemas for input and output data',
  [WIZARD_STEPS.ICON]: 'Upload a custom SVG icon (optional)',
  [WIZARD_STEPS.PERSONA]: 'Associate with an existing persona or create later',
  [WIZARD_STEPS.REVIEW]: 'Review all configuration before creating the Eye',
} as const;

export const BUTTON_LABELS = {
  PREVIOUS: 'Previous',
  NEXT: 'Next',
  SKIP: 'Skip',
  CANCEL: 'Cancel',
  CREATE_EYE: 'Create Eye',
  UPDATE_EYE: 'Update Eye',
  USE_TEMPLATE: 'Use Template',
} as const;

export const WIZARD_TEXT = {
  TITLE_CREATE: 'Create Custom Eye',
  TITLE_EDIT: 'Edit Custom Eye',
  SUBTITLE: 'Configure your custom Eye with input/output schemas and persona integration',
  PROGRESS_LABEL: 'Step {current} of {total}',
  UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?',
  VALIDATION_ERROR: 'Please fix validation errors before proceeding',
} as const;

export const FIELD_LABELS = {
  NAME: 'Eye Name',
  DESCRIPTION: 'Description',
  INPUT_SCHEMA: 'Input Schema',
  OUTPUT_SCHEMA: 'Output Schema',
  ICON_SVG: 'Icon SVG',
  PERSONA: 'Associated Persona',
} as const;

export const PLACEHOLDERS = {
  NAME: 'e.g., semantic-analyzer',
  DESCRIPTION: 'Describe what this custom Eye does',
  INPUT_SCHEMA: '{\n  "type": "object",\n  "properties": {\n    "input": {"type": "string"}\n  },\n  "required": ["input"]\n}',
  OUTPUT_SCHEMA: '{\n  "type": "object",\n  "properties": {\n    "result": {"type": "string"}\n  }\n}',
  ICON_SVG: '<svg>...</svg>',
} as const;

export const HELP_TEXT = {
  NAME: 'Unique identifier for this Eye (lowercase, hyphens allowed)',
  DESCRIPTION: 'Detailed description of what this Eye does and when to use it',
  INPUT_SCHEMA: 'JSON Schema defining the expected input structure',
  OUTPUT_SCHEMA: 'JSON Schema defining the expected output structure',
  ICON_SVG: 'Paste SVG content here to customize the Eye icon',
  PERSONA: 'Link to an existing persona or leave empty to configure later',
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_JSON: 'Invalid JSON format',
  INVALID_JSON_SCHEMA: 'Invalid JSON Schema format',
  NAME_TOO_SHORT: 'Name must be at least 3 characters',
  NAME_TOO_LONG: 'Name must be at most 50 characters',
  DESCRIPTION_TOO_SHORT: 'Description must be at least 10 characters',
  DESCRIPTION_TOO_LONG: 'Description must be at most 500 characters',
} as const;

export const SCHEMA_TEMPLATES = {
  SIMPLE_TEXT: {
    name: 'Simple Text Processing',
    input: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Input text to process' },
      },
      required: ['text'],
    },
    output: {
      type: 'object',
      properties: {
        result: { type: 'string', description: 'Processed text result' },
      },
      required: ['result'],
    },
  },
  DATA_VALIDATION: {
    name: 'Data Validation',
    input: {
      type: 'object',
      properties: {
        data: { type: 'object', description: 'Data to validate' },
        schema: { type: 'object', description: 'Validation schema' },
      },
      required: ['data', 'schema'],
    },
    output: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', description: 'Validation result' },
        errors: { type: 'array', items: { type: 'string' }, description: 'Validation errors' },
      },
      required: ['valid'],
    },
  },
  JSON_TRANSFORMATION: {
    name: 'JSON Transformation',
    input: {
      type: 'object',
      properties: {
        source: { type: 'object', description: 'Source JSON object' },
        mapping: { type: 'object', description: 'Transformation mapping rules' },
      },
      required: ['source'],
    },
    output: {
      type: 'object',
      properties: {
        transformed: { type: 'object', description: 'Transformed JSON object' },
      },
      required: ['transformed'],
    },
  },
} as const;

export const OPTIONAL_STEPS = new Set([
  WIZARD_STEPS.ICON,
  WIZARD_STEPS.PERSONA,
]);
