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
  [WIZARD_STEPS.METADATA]: "Eye & Metadata",
  [WIZARD_STEPS.MISSION]: "Core Mission",
  [WIZARD_STEPS.GUIDANCE]: "Guidance Phase",
  [WIZARD_STEPS.VALIDATION]: "Validation Phase",
  [WIZARD_STEPS.ENVELOPE]: "Envelope Contract",
  [WIZARD_STEPS.REMINDERS]: "General Reminders",
  [WIZARD_STEPS.LLM_CONFIG]: "LLM Configuration",
  [WIZARD_STEPS.NOTES]: "Internal Notes",
  [WIZARD_STEPS.REVIEW]: "Review & Save",
} as const;

export const STEP_DESCRIPTIONS = {
  [WIZARD_STEPS.METADATA]:
    "Define the Eye identity, name, description, and core capabilities",
  [WIZARD_STEPS.MISSION]:
    "Articulate the primary mission statement for this Eye",
  [WIZARD_STEPS.GUIDANCE]:
    "Configure the guidance phase: mission, checks, reminders, and examples",
  [WIZARD_STEPS.VALIDATION]:
    "Configure the validation phase: mission, checks, reminders, and examples",
  [WIZARD_STEPS.ENVELOPE]:
    "Specify required keys for the data envelope contract",
  [WIZARD_STEPS.REMINDERS]: "Add general reminders that apply to all phases",
  [WIZARD_STEPS.LLM_CONFIG]:
    "Configure LLM parameters: temperature, top_p, response format, max tokens",
  [WIZARD_STEPS.NOTES]: "Optional internal notes for documentation and context",
  [WIZARD_STEPS.REVIEW]:
    "Review all configuration and export the persona blueprint",
} as const;

export const BUTTON_LABELS = {
  PREVIOUS: "Previous",
  NEXT: "Next",
  SKIP: "Skip",
  SAVE_DRAFT: "Save Draft",
  FINISH: "Finish & Save",
  CANCEL: "Cancel",
  EXPORT_JSON: "Export JSON",
  IMPORT_JSON: "Import JSON",
  START_FROM_TEMPLATE: "Start from Template",
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: "This field is required",
  MIN_LENGTH: "Must be at least {min} characters",
  MAX_LENGTH: "Must be at most {max} characters",
  INVALID_JSON: "Invalid JSON format",
  DUPLICATE_CAPABILITY: "Capability already exists",
  EMPTY_ARRAY: "At least one item is required",
  INVALID_NUMBER: "Must be a valid number",
  OUT_OF_RANGE: "Value must be between {min} and {max}",
} as const;

export const WIZARD_TEXT = {
  TITLE: "Persona Configuration Wizard",
  SUBTITLE:
    "Create or edit an Eye persona with structured form-based configuration",
  PROGRESS_LABEL: "Step {current} of {total}",
  UNSAVED_CHANGES: "You have unsaved changes. Are you sure you want to leave?",
  SAVE_SUCCESS: "Persona saved successfully",
  SAVE_ERROR: "Failed to save persona",
  VALIDATION_ERROR: "Please fix validation errors before proceeding",
  IMPORT_SUCCESS: "Persona imported successfully",
  IMPORT_ERROR: "Failed to import persona",
  IMPORT_INVALID_JSON: "Invalid JSON file. Please select a valid persona file.",
  IMPORT_MISSING_FIELDS: "Imported file is missing required fields",
  EXPORT_SUCCESS: "Persona exported successfully",
  TEMPLATE_REPLACE_CONFIRM:
    "Loading a template will replace your current work. Continue?",
} as const;

export const TEMPLATE_SELECTOR_TEXT = {
  TITLE: "Start from Template",
  SUBTITLE: "Choose a pre-built persona template to get started quickly",
  SEARCH_PLACEHOLDER: "Search templates...",
  ALL_CATEGORIES: "All Categories",
  NO_RESULTS: "No templates found",
  SELECT_BUTTON: "Use Template",
} as const;

export const OPTIONAL_STEPS = new Set([
  WIZARD_STEPS.VALIDATION,
  WIZARD_STEPS.NOTES,
]);

// ============================================================================
// Form Field Labels & Placeholders (Per R13: NO string literals in components)
// ============================================================================

export const FIELD_LABELS = {
  // Metadata Step
  EYE_ID: "Eye ID",
  EYE_NAME: "Eye Name",
  DESCRIPTION: "Description",
  VERSION: "Version",
  CAPABILITIES: "Capabilities",
  ADD_CAPABILITY: "Add Capability",

  // Mission Step
  MISSION: "Mission Statement",

  // Guidance/Validation Phase Steps
  PHASE_MISSION: "Phase Mission",
  CHECK_LOGIC: "Check Logic",
  PHASE_REMINDERS: "Phase Reminders",
  EXAMPLE_JSON: "Example JSON",
  ADD_REMINDER: "Add Reminder",

  // Envelope Step
  REQUIRED_KEYS: "Required Keys (top-level)",
  REQUIRED_DATA_KEYS: "Required Data Keys",
  REQUIRED_UI_KEYS: "Required UI Keys",
  ADD_KEY: "Add Key",

  // Reminders Step
  GENERAL_REMINDERS: "General Reminders",

  // LLM Config Step
  TEMPERATURE: "Temperature",
  TOP_P: "Top P",
  RESPONSE_FORMAT: "Response Format",
  MAX_TOKENS: "Max Tokens",

  // Notes Step
  NOTES: "Internal Notes",

  // Review Step
  REVIEW_TITLE: "Review Configuration",
  EXPORT_TITLE: "Export Options",
} as const;

export const PLACEHOLDERS = {
  EYE_ID: "e.g., overseer, guidance, validation",
  EYE_NAME: "e.g., Guidance Eye",
  DESCRIPTION: "Describe the purpose and responsibilities of this Eye",
  CAPABILITY: "e.g., semantic-analysis",
  MISSION: "Define the primary objective this Eye will accomplish",
  PHASE_MISSION: "What should this phase accomplish?",
  CHECK_LOGIC: "Define validation criteria or checks for this phase",
  REMINDER: "Enter a reminder",
  KEY: "e.g., userId, data, ui",
  EXAMPLE_JSON: '{"example": "data structure"}',
  NOTES: "Optional internal notes (not sent to LLM)",
} as const;

export const HELP_TEXT = {
  EYE_ID: "Unique identifier for this Eye (lowercase, hyphens allowed)",
  EYE_NAME: "Human-readable display name",
  DESCRIPTION: "Detailed description of this Eye's purpose and capabilities",
  VERSION: "Persona version number (increments with changes)",
  CAPABILITIES: "Tags describing what this Eye can do",
  MISSION: "The primary mission statement that guides this Eye's behavior",
  PHASE_MISSION: "Mission specific to this phase of operation",
  CHECK_LOGIC: "Criteria or validation logic for this phase",
  EXAMPLE_JSON: "Example data structure this phase expects or produces",
  REQUIRED_KEYS: "Top-level envelope keys that must be present",
  REQUIRED_DATA_KEYS: "Keys required in the data object",
  REQUIRED_UI_KEYS: "Keys required in the ui object",
  TEMPERATURE: "Controls randomness. 0 = deterministic, 2 = very creative",
  TOP_P: "Nucleus sampling. Controls diversity. 1 = consider all tokens",
  RESPONSE_FORMAT: "Expected response format from LLM",
  MAX_TOKENS: "Maximum number of tokens in LLM response",
  NOTES: "Internal documentation, not sent to LLM",
} as const;

export const CHAR_LIMITS = {
  EYE_ID_MIN: 3,
  EYE_ID_MAX: 50,
  NAME_MIN: 3,
  NAME_MAX: 100,
  DESCRIPTION_MIN: 10,
  DESCRIPTION_MAX: 500,
  MISSION_MIN: 100,
  MISSION_MAX: 2000,
  PHASE_MISSION_MIN: 50,
  PHASE_MISSION_MAX: 1000,
  CHECK_LOGIC_MIN: 20,
  CHECK_LOGIC_MAX: 1000,
  REMINDER_MIN: 5,
  REMINDER_MAX: 200,
  KEY_MIN: 1,
  KEY_MAX: 50,
  NOTES_MIN: 0,
  NOTES_MAX: 5000,
} as const;

export const LLM_CONFIG_RANGES = {
  TEMPERATURE: { min: 0, max: 2, step: 0.1, default: 0 },
  TOP_P: { min: 0, max: 1, step: 0.05, default: 1 },
  MAX_TOKENS: { min: 100, max: 8000, step: 100, default: 2000 },
} as const;

export const RESPONSE_FORMATS = {
  JSON_OBJECT: "json_object",
  TEXT: "text",
} as const;

export const RESPONSE_FORMAT_LABELS = {
  [RESPONSE_FORMATS.JSON_OBJECT]: "JSON Object",
  [RESPONSE_FORMATS.TEXT]: "Text",
} as const;

// Mission Templates (examples for quick start)
export const MISSION_TEMPLATES = {
  GUIDANCE:
    "Provide strategic guidance and recommendations based on input data, ensuring alignment with user goals and constraints.",
  VALIDATION:
    "Validate input data for completeness, correctness, and consistency. Flag any issues or anomalies for user review.",
  TRANSFORMATION:
    "Transform input data into a structured output format, applying necessary rules and business logic.",
  ANALYSIS:
    "Analyze input data to extract insights, patterns, and actionable intelligence.",
  SYNTHESIS:
    "Synthesize information from multiple sources into a coherent, unified response.",
} as const;

// Common Reminder Templates
export const REMINDER_TEMPLATES = [
  "Always validate input before processing",
  "Maintain consistency with previous outputs",
  "Consider edge cases and error scenarios",
  "Prioritize user safety and data privacy",
  "Provide clear, actionable recommendations",
  "Cite sources when making claims",
  "Be concise but comprehensive",
] as const;

// Array Management
export const ARRAY_ACTIONS = {
  ADD: "Add",
  REMOVE: "Remove",
  CLEAR_ALL: "Clear All",
  MOVE_UP: "Move Up",
  MOVE_DOWN: "Move Down",
} as const;
