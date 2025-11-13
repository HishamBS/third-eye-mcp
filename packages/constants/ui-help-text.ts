/**
 * UI Help Text - Single Source of Truth
 * All tooltip and help text strings for the application
 */

export const UI_HELP_TEXT = Object.freeze({
  // Eyes Page
  EYES_PAGE_TITLE:
    "Eyes are specialized AI agents that review and validate your conversations",
  EYES_CUSTOM_FILTER: "View only your custom-created Eyes",
  EYES_BUILTIN_FILTER: "View only the built-in Eyes that come with Third Eye",
  EYES_ALL_FILTER: "View all Eyes including both built-in and custom",
  EYES_CREATE_BUTTON: "Create a new custom Eye with your own capabilities",
  EYE_CAPABILITIES:
    "Special abilities this Eye has for reviewing conversations",
  EYE_STAGE:
    "When this Eye runs in the pipeline: Guidance helps before, Validation checks after",

  // Eyes Page - Navigation
  EYES_NAV_HOME: "← Home",
  EYES_NAV_PROMPTS: "Prompts",
  EYES_NAV_PERSONAS: "Personas",

  // Eyes Page - Header
  EYES_SECTION_LABEL: "Eyes",
  EYES_HEADER_TITLE: "Eyes Management",

  // Eyes Page - Buttons
  EYES_BUTTON_CREATE: "+ Create Custom Eye",
  EYES_BUTTON_CANCEL: "Cancel",
  EYES_BUTTON_CLOSE_TEST: "Close Test",
  EYES_BUTTON_CREATE_EYE: "Create Eye",
  EYES_BUTTON_CREATING: "Creating...",
  EYES_BUTTON_UPDATE_EYE: "Update Eye",
  EYES_BUTTON_UPDATING: "Updating...",
  EYES_BUTTON_RUN_TEST: "Run Test",
  EYES_BUTTON_TESTING: "Testing...",
  EYES_BUTTON_EDIT: "Edit",
  EYES_BUTTON_TEST: "Test",
  EYES_BUTTON_DELETE: "Delete",
  EYES_BUTTON_DISCARD_CHANGES: "Discard Changes",
  EYES_BUTTON_SAVE_CHANGES: "Save Changes",
  EYES_BUTTON_SAVING: "Saving...",

  // Eyes Page - Form Titles
  EYES_FORM_TITLE_CREATE: "Create Custom Eye",
  EYES_FORM_TITLE_EDIT: "Edit {eyeName}",
  EYES_FORM_TITLE_VIEW: "View {eyeName}",
  EYES_FORM_TITLE_TEST: "Test {eyeName}",

  // Eyes Page - Form Labels
  EYES_FORM_LABEL_TEST_INPUT: "Test Input",
  EYES_FORM_LABEL_TEST_RESULT: "Test Result",
  EYES_FORM_LABEL_TEST_RESULT_EYE: "Eye:",
  EYES_FORM_LABEL_TEST_RESULT_RESPONSE: "Response:",
  EYES_FORM_LABEL_NAME: "Eye Name (ID)",
  EYES_FORM_LABEL_DESCRIPTION: "Description",
  EYES_FORM_LABEL_PERSONA: "Persona (Optional)",
  EYES_FORM_LABEL_INPUT_SCHEMA: "Input Schema (JSON)",
  EYES_FORM_LABEL_OUTPUT_SCHEMA: "Output Schema (JSON)",

  // Eyes Page - Placeholders
  EYES_PLACEHOLDER_TEST_INPUT: "Enter test input for the Eye...",
  EYES_PLACEHOLDER_NAME: "my_custom_eye",
  EYES_PLACEHOLDER_DESCRIPTION: "Describe what this Eye does...",

  // Eyes Page - Helper Text
  EYES_HELPER_NAME:
    "Lowercase, no spaces. Will be used as tool name: third_eye_{eyeName}",
  EYES_HELPER_PERSONA: "Link this Eye to a persona for LLM-powered behavior",

  // Eyes Page - Dropdown Options
  EYES_DROPDOWN_NO_PERSONA: "-- No Persona (attach later) --",

  // Eyes Page - Dialogs
  EYES_DIALOG_DISCARD_TITLE: "Discard Changes",
  EYES_DIALOG_DISCARD_MESSAGE:
    "You have unsaved changes. Are you sure you want to discard them?",
  EYES_DIALOG_DISCARD_CONFIRM: "Discard",
  EYES_DIALOG_DELETE_TITLE: "Delete Custom Eye",
  EYES_DIALOG_DELETE_MESSAGE:
    "Are you sure you want to delete this custom Eye?",
  EYES_DIALOG_DELETE_CONFIRM: "Delete",

  // Eyes Page - Success Messages
  EYES_SUCCESS_CREATED: "Custom Eye created successfully",
  EYES_SUCCESS_UPDATED: "Custom Eye updated successfully",
  EYES_SUCCESS_DELETED: "Custom Eye deleted successfully",
  EYES_SUCCESS_TEST_COMPLETED: "Test completed successfully",

  // Eyes Page - Error Fallbacks
  EYES_ERROR_CREATE_FALLBACK: "Failed to create Eye",
  EYES_ERROR_UPDATE_FALLBACK: "Failed to update Eye",

  // Eyes Page - Warnings
  EYES_WARNING_UNSAVED_CHANGES: "You have unsaved changes to this Eye",

  // Eyes Page - Guidelines
  EYES_GUIDELINES_TITLE: "Custom Eye Guidelines",
  EYES_GUIDELINE_NAMES:
    "• Eye names must be unique and lowercase with underscores",
  EYES_GUIDELINE_SCHEMAS:
    "• Input/output schemas must be valid JSON Schema format",
  EYES_GUIDELINE_REGISTRATION:
    "• Eyes will be automatically registered in MCP server",
  EYES_GUIDELINE_PERSONA:
    "• Link to a persona from the Prompt Library (future feature)",
  EYES_GUIDELINE_CONTRACT:
    "• Custom Eyes follow the same Overseer contract as built-in Eyes",

  // Eyes Page - Filter Tabs
  EYES_FILTER_ALL: "All ({count})",
  EYES_FILTER_BUILTIN: "Built-In ({count})",
  EYES_FILTER_CUSTOM: "Custom ({count})",

  // Eyes Page - Empty States
  EYES_EMPTY_CUSTOM_TITLE: "No Custom Eyes Yet",
  EYES_EMPTY_CUSTOM_DESCRIPTION:
    "Custom Eyes are your own specialized AI agents! Create one to add unique capabilities like fact-checking, tone analysis, or custom validation rules.",
  EYES_EMPTY_BUILTIN_TITLE: "No Built-in Eyes Available",
  EYES_EMPTY_BUILTIN_DESCRIPTION:
    "Built-in Eyes are pre-configured AI agents that come with Third Eye MCP. They should be available by default.",
  EYES_EMPTY_ALL_TITLE: "No Eyes Found",
  EYES_EMPTY_ALL_DESCRIPTION:
    "Eyes are specialized AI agents that watch over your conversations. Each Eye has unique capabilities - explore them to get started!",
  EYES_EMPTY_ACTION_CREATE: "Create Your First Eye",
  EYES_EMPTY_ACTION_VIEW_BUILTIN: "View Built-in Eyes",

  // Eyes Page - Date Display
  EYES_CREATED_PREFIX: "Created",

  // Eyes Page - Persona Configuration (Phase 15)
  EYES_BUTTON_CONFIGURE_PERSONA: "Configure Persona",
  EYES_PERSONA_MODAL_TITLE: "Configure Persona for {eyeName}",
  EYES_PERSONA_MODAL_SUBTITLE:
    "Define the AI behavior and capabilities for this Eye",
  EYES_PERSONA_MODAL_CLOSE: "Close Without Saving",
  EYES_PERSONA_MODAL_SAVE: "Save Persona",
  EYES_PERSONA_CONFIGURED_BADGE: "Persona Configured",
  EYES_PERSONA_NOT_CONFIGURED: "No Persona",
  EYES_ERROR_PERSONA_LOAD_FAILED: "Failed to load persona configuration",
  EYES_ERROR_PERSONA_SAVE_FAILED: "Failed to save persona configuration",
  EYES_SUCCESS_PERSONA_SAVED: "Persona configuration saved successfully",

  // Pipeline Builder - Persona Configuration (Phase 16)
  PIPELINE_BUTTON_CONFIGURE_PERSONA: "Configure Persona",
  PIPELINE_PERSONA_CONFIG_HINT:
    "Define how this Eye behaves in this specific pipeline node",
  PIPELINE_SUCCESS_PERSONA_SAVED:
    "Node persona configuration saved successfully",

  // Personas Page - Navigation
  PERSONAS_NAV_HOME: "← Home",
  PERSONAS_NAV_MODELS: "Models",
  PERSONAS_NAV_SETTINGS: "Settings",

  // Personas Page - Header
  PERSONAS_SECTION_LABEL: "Personas",
  PERSONAS_HEADER_TITLE: "Eye Personas",

  // Personas Page - Buttons
  PERSONAS_BUTTON_EDIT: "Edit",
  PERSONAS_BUTTON_EDITING: "Editing...",
  PERSONAS_BUTTON_EXPORT_MD: "MD",
  PERSONAS_BUTTON_EXPORT_PDF: "PDF",
  PERSONAS_BUTTON_EXPORT_JSON: "JSON",
  PERSONAS_BUTTON_CLOSE: "Close",
  PERSONAS_BUTTON_CANCEL: "Cancel",
  PERSONAS_BUTTON_PUBLISHING: "Publishing...",
  PERSONAS_BUTTON_PUBLISH: "Publish (Hot-Reload)",
  PERSONAS_BUTTON_CREATE_VERSION: "Create New Version",
  PERSONAS_BUTTON_CREATE_FIRST: "Create First Persona",
  PERSONAS_BUTTON_VIEW_DIFF: "View Diff",
  PERSONAS_BUTTON_ACTIVATE: "Activate",
  PERSONAS_BUTTON_REVERT: "Revert",

  // Personas Page - Labels
  PERSONAS_LABEL_EYES: "Eyes",
  PERSONAS_LABEL_MISSION: "Mission",
  PERSONAS_LABEL_CAPABILITIES: "Capabilities",
  PERSONAS_LABEL_PHASES: "Phases",
  PERSONAS_LABEL_GUIDANCE_PHASE: "Guidance Phase",
  PERSONAS_LABEL_VALIDATION_PHASE: "Validation Phase",
  PERSONAS_LABEL_CHECK: "Check:",
  PERSONAS_LABEL_REMINDERS: "Reminders:",
  PERSONAS_LABEL_ENVELOPE: "Envelope Contract",
  PERSONAS_LABEL_REQUIRED_KEYS: "Required Keys:",
  PERSONAS_LABEL_REQUIRED_DATA_KEYS: "Required Data Keys:",
  PERSONAS_LABEL_REQUIRED_UI_KEYS: "Required UI Keys:",
  PERSONAS_LABEL_NOTES: "Notes",
  PERSONAS_LABEL_DIFF_TITLE: "Persona Diff",
  PERSONAS_LABEL_CHANGES_SUMMARY: "Changes Summary",
  PERSONAS_LABEL_NAME: "Name",
  PERSONAS_LABEL_DESCRIPTION: "Description",
  PERSONAS_LABEL_HOT_RELOAD_TITLE: "Hot-Reload Enabled",

  // Personas Page - Titles
  PERSONAS_TITLE_EDIT: "Edit {personaName} Persona",
  PERSONAS_TITLE_VERSIONS: "{personaName} Persona Versions",

  // Personas Page - Export
  PERSONAS_EXPORT_MD_TITLE: "Export as Markdown",
  PERSONAS_EXPORT_PDF_TITLE: "Export as PDF",
  PERSONAS_EXPORT_JSON_TITLE: "Export as JSON",

  // Personas Page - Placeholders
  PERSONAS_PLACEHOLDER_NAME: "Overseer",
  PERSONAS_PLACEHOLDER_DESCRIPTION: "Navigator that analyzes requests...",
  PERSONAS_PLACEHOLDER_MISSION: "You are the BRAIN of Third Eye MCP...",
  PERSONAS_PLACEHOLDER_CAPABILITIES: "Select capabilities...",

  // Personas Page - Messages
  PERSONAS_MESSAGE_CAPABILITIES_SELECTED: "{count} capability{plural} selected",
  PERSONAS_MESSAGE_HOT_RELOAD_DESC:
    "Changes take effect immediately for new runs (no restart needed)",
  PERSONAS_MESSAGE_LINES_CHANGED: "{count} lines changed",
  PERSONAS_MESSAGE_VERSION_LABEL: "Version {version}",
  PERSONAS_MESSAGE_VERSION_ACTIVE: "Version {version} (Active)",
  PERSONAS_MESSAGE_ACTIVE_BADGE: "Active",

  // Personas Page - Errors
  PERSONAS_ERROR_LOAD_FAILED: "Failed to load personas",
  PERSONAS_ERROR_NAME_REQUIRED: "Name is required",
  PERSONAS_ERROR_SAVE_FAILED: "Failed to save persona",
  PERSONAS_ERROR_ACTIVATE_FAILED: "Failed to activate version",
  PERSONAS_ERROR_DIFF_VERSIONS_SAME: "Please select two different versions",
  PERSONAS_ERROR_LOAD_DIFF_FAILED: "Failed to load diff",
  PERSONAS_ERROR_VERSION_NOT_FOUND: "Version not found",
  PERSONAS_ERROR_REVERT_FAILED: "Failed to revert",

  // Personas Page - Success Messages
  PERSONAS_SUCCESS_SAVED: "Persona blueprint saved to database successfully",
  PERSONAS_SUCCESS_ACTIVATED: "Version {version} activated (hot-reloaded)",
  PERSONAS_SUCCESS_REVERTED: "Reverted to version {version} (hot-reloaded)",

  // Personas Page - Dialogs
  PERSONAS_DIALOG_REVERT_TITLE: "Revert Persona",
  PERSONAS_DIALOG_REVERT_MESSAGE:
    "Revert {eyeName} to version {version}? This will create a new version.",
  PERSONAS_DIALOG_REVERT_CONFIRM: "Revert",
  PERSONAS_DIALOG_REVERT_CANCEL: "Cancel",

  // Personas Page - Welcome Screen
  PERSONAS_WELCOME_TITLE: "Persona Management",
  PERSONAS_WELCOME_SUBTITLE:
    "Select an Eye from the left to view and edit its personas",
  PERSONAS_WELCOME_BULLET_1:
    "• Each Eye has versioned personas with system prompts",
  PERSONAS_WELCOME_BULLET_2: "• Only one version can be active at a time",
  PERSONAS_WELCOME_BULLET_3:
    "• Changes take effect immediately for new runs (hot-reload)",
  PERSONAS_WELCOME_BULLET_4: "• Previous versions are preserved for rollback",
  PERSONAS_WELCOME_BULLET_5:
    '• Click "Edit" on any Eye to create or modify its persona',
  PERSONAS_WELCOME_NO_PERSONAS:
    "No personas detected. Make sure the server is running and personas are properly configured.",

  // Personas Page - Empty States
  PERSONAS_EMPTY_TITLE: "No personas found",
  PERSONAS_EMPTY_ACTION: "Create First Persona",

  // Personas Page - Version Selects
  PERSONAS_VERSION_SELECT_1: "Select version 1",
  PERSONAS_VERSION_SELECT_2: "Select version 2",

  // Pipelines Page
  PIPELINES_PAGE_TITLE:
    "Pipelines are workflows that combine multiple Eyes to review conversations",
  PIPELINE_CREATE_BUTTON:
    "Build a new pipeline by dragging and connecting Eyes",
  PIPELINE_NODE_DRAG: "Drag Eyes from the sidebar to add them to your pipeline",
  PIPELINE_NODE_CONNECT:
    "Click and drag from the dot to connect Eyes in sequence",
  PIPELINE_EXECUTION_ORDER:
    "Eyes execute from top to bottom in the order they are connected",

  // Monitor Page
  MONITOR_PAGE_TITLE:
    "Watch your Eyes work in real-time as they review conversations",
  MONITOR_LIVE_TAB: "See conversations being reviewed right now",
  MONITOR_QUEUE_TAB: "See conversations waiting to be reviewed",
  MONITOR_HISTORY_TAB: "Browse all past conversations that have been reviewed",
  MONITOR_ANALYTICS_TAB:
    "View statistics and performance metrics for your Eyes",
  MONITOR_SETTINGS_TAB: "Configure how monitoring works",

  // Sessions Page
  SESSIONS_PAGE_TITLE:
    "Sessions are complete conversation reviews from start to finish",
  SESSIONS_FILTER: "Filter sessions by status, date, or Eye",
  SESSION_REPLAY: "Watch a replay of how the Eyes reviewed this conversation",

  // View Mode Toggle
  VIEW_MODE_BEGINNER: "Simplified interface with helpful explanations",
  VIEW_MODE_ADVANCED: "Full interface with all technical details and options",

  // Common
  REFRESH_DATA: "Reload the latest data from the server",
  SEARCH: "Search by name, description, or capabilities",
  EXPORT: "Download this data as a file",
  DELETE: "Permanently remove this item",
  EDIT: "Modify this item",
  DUPLICATE: "Create a copy of this item",

  // Loading States
  LOADING_EYES: "Loading Eyes...",
  LOADING_PIPELINES: "Loading Pipelines...",
  LOADING_SESSIONS: "Loading Sessions...",
  LOADING_DATA: "Loading...",
  LOADING_PERSONAS: "Loading Personas...",
  LOADING_MODELS: "Loading Models...",

  // Execution Panel
  EXECUTION_PANEL_TITLE: "Pipeline Execution",
  EXECUTION_PANEL_CLOSE: "Close execution panel",
  EXECUTION_START: "Start Execution",
  EXECUTION_STARTING: "Starting...",
  EXECUTION_PAUSE: "Pause",
  EXECUTION_RESUME: "Resume",
  EXECUTION_AUTO_REFRESH: "Auto-refresh",
  EXECUTION_DURATION: "Duration",
  EXECUTION_STEPS_COMPLETED: "Steps Completed",
  EXECUTION_FINAL_VERDICT: "Final Verdict",
  EXECUTION_STEPS_TITLE: "Execution Steps",
  EXECUTION_VERDICT_PREFIX: "Verdict:",
  EXECUTION_ERROR_PREFIX: "Error:",
  EXECUTION_TOKENS_SUFFIX: "tokens",
  EXECUTION_MS_SUFFIX: "ms",
  EXECUTION_EMPTY_TITLE: "No execution running",
  EXECUTION_EMPTY_DESCRIPTION: "Click Start Execution to begin",

  // Error Messages - Friendly Language for Non-Technical Users
  ERROR_EYES_NO_REGISTRY:
    "Could not find any Eyes. They might not be set up yet. Please check that Third Eye is running properly.",
  ERROR_EYES_LOAD_FAILED:
    "Could not load your Eyes right now. Please check that Third Eye is running and try refreshing the page.",
  ERROR_EYE_NAME_REQUIRED: "Please give your Eye a name before saving.",
  ERROR_EYE_DESCRIPTION_REQUIRED:
    "Please add a description so others know what this Eye does.",
  ERROR_EYE_INVALID_SCHEMA:
    "The settings you entered are not in the right format. Please check and try again.",
  ERROR_EYE_SAVE_FAILED:
    "Could not save your Eye right now. Please try again in a moment.",
  ERROR_EYE_UPDATE_FAILED: "Could not update your Eye. Please try again.",
  ERROR_EYE_DELETE_FAILED: "Could not delete this Eye. Please try again.",
  ERROR_EYE_TEST_INPUT_REQUIRED: "Please enter some text to test your Eye.",
  ERROR_EYE_TEST_FAILED: "Could not test your Eye right now. Please try again.",

  ERROR_PIPELINE_SESSION_FAILED:
    "Could not start a new session. Please try again.",
  ERROR_PIPELINE_RUN_FAILED:
    "Could not run this pipeline. Please make sure Third Eye is running and try again.",
  ERROR_PIPELINE_SAVE_FAILED: "Could not save your pipeline. Please try again.",

  ERROR_GENERIC_LOAD:
    "Having trouble loading this page. Please refresh and try again.",
  ERROR_GENERIC_SAVE: "Could not save your changes. Please try again.",
  ERROR_GENERIC_DELETE: "Could not delete this item. Please try again.",

  // ARIA Labels for Accessibility
  ARIA_CREATE_EYE: "Create a new custom Eye",
  ARIA_CANCEL: "Cancel and return to list",
  ARIA_SAVE_EYE: "Save this Eye",
  ARIA_UPDATE_EYE: "Update Eye settings",
  ARIA_DELETE_EYE: "Delete this Eye permanently",
  ARIA_EDIT_EYE: "Edit Eye settings",
  ARIA_TEST_EYE: "Test this Eye with sample input",
  ARIA_RUN_TEST: "Run the test",
  ARIA_CLOSE_TEST: "Close test panel",

  ARIA_CREATE_PIPELINE: "Create a new pipeline",
  ARIA_SAVE_PIPELINE: "Save this pipeline",
  ARIA_RUN_PIPELINE: "Run this pipeline",
  ARIA_EDIT_PIPELINE: "Edit pipeline settings",

  ARIA_FILTER_ALL: "Show all Eyes",
  ARIA_FILTER_BUILTIN: "Show only built-in Eyes",
  ARIA_FILTER_CUSTOM: "Show only custom Eyes",

  ARIA_NAV_HOME: "Return to home page",
  ARIA_NAV_EYES: "Go to Eyes management",
  ARIA_NAV_PIPELINES: "Go to Pipelines",
  ARIA_NAV_PERSONAS: "Go to Personas",
  ARIA_NAV_PROMPTS: "Go to Prompts",
  ARIA_NAV_MODELS: "Go to Models",
  ARIA_NAV_MONITOR: "Go to Monitor",
  ARIA_NAV_SESSIONS: "Go to Sessions",

  ARIA_ERROR_REGION: "Error message",
  ARIA_SUCCESS_REGION: "Success message",
  ARIA_LOADING_REGION: "Loading content",

  // Settings Page - Provider Keys
  ERROR_SETTINGS_KEY_LABEL_REQUIRED: "Label and API key are required",
  SUCCESS_SETTINGS_KEY_ADDED: "Provider key added successfully",
  ERROR_SETTINGS_KEY_ADD_FAILED: "Failed to add provider key",
  SUCCESS_SETTINGS_KEY_UPDATED: "Provider key updated successfully",
  ERROR_SETTINGS_KEY_UPDATE_FAILED: "Failed to update provider key",
  SUCCESS_SETTINGS_KEY_TEST_OK: "key works! Found {count} models",
  ERROR_SETTINGS_KEY_TEST_FAILED: "key test failed - check your API key",
  ERROR_SETTINGS_KEY_TEST_ERROR: "Failed to test {provider} key",
  SUCCESS_SETTINGS_KEY_DELETED: "Provider key deleted",
  ERROR_SETTINGS_KEY_DELETE_FAILED: "Failed to delete provider key",

  // Settings Page - Telemetry
  SUCCESS_SETTINGS_TELEMETRY_ENABLED: "Telemetry enabled",
  SUCCESS_SETTINGS_TELEMETRY_DISABLED: "Telemetry disabled",
  ERROR_SETTINGS_TELEMETRY_FAILED: "Failed to update telemetry setting",

  // Settings Page - Database
  SUCCESS_SETTINGS_DB_BACKUP: "Database backup downloaded",
  ERROR_SETTINGS_DB_BACKUP_FAILED: "Failed to create backup",
  SUCCESS_SETTINGS_DB_RESTORED: "Database restored successfully. Reloading...",
  ERROR_SETTINGS_DB_RESTORE_FAILED: "Failed to restore database",
  SUCCESS_SETTINGS_DB_RESET: "Database reset successfully. Reloading...",
  ERROR_SETTINGS_DB_RESET_FAILED: "Failed to reset database",

  // Metrics Page
  ERROR_METRICS_FETCH_FAILED: "Failed to fetch metrics",

  // Dashboard / Homepage
  DASHBOARD_PLATFORM_HIGHLIGHTS_TITLE: "Platform Highlights",
  DASHBOARD_PLATFORM_HIGHLIGHTS_SUBTITLE:
    "Powerful tools for AI orchestration, validation, and analysis. All features work with real-time data.",

  // Pipelines Page - Navigation
  PIPELINES_NAV_HOME: "← Home",
  PIPELINES_NAV_MODELS: "Models",
  PIPELINES_NAV_PERSONAS: "Personas",
  PIPELINES_SECTION_LABEL: "Workflows",
  PIPELINES_HEADER_TITLE: "Pipelines",

  // Pipelines Page - Buttons
  PIPELINES_BUTTON_CREATE: "+ Create Pipeline",
  PIPELINES_BUTTON_RUN: "Run Pipeline",
  PIPELINES_BUTTON_RUNNING: "Running...",
  PIPELINES_BUTTON_EDIT: "Edit",
  PIPELINES_BUTTON_BACK_TO_VERSIONS: "Back to Versions",
  PIPELINES_BUTTON_CANCEL: "Cancel",
  PIPELINES_BUTTON_SAVE: "Save Pipeline",
  PIPELINES_BUTTON_SAVING: "Saving...",
  PIPELINES_BUTTON_VISUAL_BUILDER: "Visual Builder",
  PIPELINES_BUTTON_JSON_EDITOR: "JSON Editor",
  PIPELINES_BUTTON_DISCARD: "Discard Changes",
  PIPELINES_BUTTON_VIEW_RUNS: "View Runs ({count})",
  PIPELINES_BUTTON_ACTIVATE: "Activate",
  PIPELINES_BUTTON_DELETE: "Delete",
  PIPELINES_BUTTON_VIEW_STEPS: "View Steps List",
  PIPELINES_BUTTON_VIEW_JSON: "View Raw JSON",

  // Pipelines Page - Section Headers
  PIPELINES_SECTION_RUNS: "Pipeline Runs",
  PIPELINES_SECTION_VERSIONS: "{name} Versions",

  // Pipelines Page - Form Labels
  PIPELINES_LABEL_NAME: "Name",
  PIPELINES_LABEL_DESCRIPTION: "Description",
  PIPELINES_LABEL_CATEGORY: "Category",
  PIPELINES_LABEL_WORKFLOW_EDITOR: "Workflow Editor",
  PIPELINES_LABEL_WORKFLOW: "Workflow",
  PIPELINES_LABEL_SELECT_PIPELINE: "Select Pipeline",
  PIPELINES_LABEL_VISUAL_FLOW: "Visual Flow",

  // Pipelines Page - Placeholders
  PIPELINES_PLACEHOLDER_NAME: "my_pipeline",
  PIPELINES_PLACEHOLDER_DESCRIPTION: "Describe what this pipeline does...",
  PIPELINES_PLACEHOLDER_JSON: '{"steps": [...]}',

  // Pipelines Page - Dropdown Options
  PIPELINES_SELECT_CHOOSE: "-- Choose a pipeline --",
  PIPELINES_SELECT_CUSTOM: "Custom",
  PIPELINES_SELECT_BUILTIN: "Built-in",

  // Pipelines Page - Badges
  PIPELINES_BADGE_ACTIVE: "Active",
  PIPELINES_BADGE_ACTIVE_VERSION: "Active",

  // Pipelines Page - Empty States
  PIPELINES_EMPTY_NO_RUNS: "No runs yet",
  PIPELINES_EMPTY_NO_VERSIONS: "No versions found",

  // Pipelines Page - Messages
  PIPELINES_MESSAGE_UNSAVED: "You have unsaved changes to this pipeline",
  PIPELINES_TITLE_CREATE: "Create New Pipeline",
  PIPELINES_TITLE_EDIT: "Edit {name}",

  // Pipelines Page - Dialogs
  PIPELINES_DIALOG_DISCARD_TITLE: "Discard Changes",
  PIPELINES_DIALOG_DISCARD_MESSAGE:
    "You have unsaved changes. Are you sure you want to discard them?",
  PIPELINES_DIALOG_DISCARD_CONFIRM: "Discard",
  PIPELINES_DIALOG_DISCARD_CANCEL: "Cancel",
  PIPELINES_DIALOG_DEACTIVATE_TITLE: "Deactivate Pipeline",
  PIPELINES_DIALOG_DEACTIVATE_MESSAGE:
    "Are you sure you want to deactivate this pipeline?",
  PIPELINES_DIALOG_DEACTIVATE_CONFIRM: "Deactivate",
  PIPELINES_DIALOG_DEACTIVATE_CANCEL: "Cancel",

  // Pipelines Page - Alerts
  PIPELINES_ALERT_VALIDATION_TITLE: "Validation Error",
  PIPELINES_ALERT_VALIDATION_MESSAGE: "Please fill in all required fields",
  PIPELINES_ALERT_INVALID_JSON_TITLE: "Invalid JSON",
  PIPELINES_ALERT_INVALID_JSON_MESSAGE:
    "Invalid JSON in workflow field. Please check your syntax.",

  // Pipelines Page - Success Messages
  PIPELINES_SUCCESS_SAVED: "Pipeline saved successfully",

  // Pipelines Page - Welcome Screen
  PIPELINES_WELCOME_TITLE: "Pipeline Management",
  PIPELINES_WELCOME_SUBTITLE:
    "Select a pipeline above to view versions or create a new one",
  PIPELINES_WELCOME_BULLET_1:
    "• Orchestrate multi-Eye workflows with sequential validation",
  PIPELINES_WELCOME_BULLET_2: "• Add conditional logic and user input steps",
  PIPELINES_WELCOME_BULLET_3: "• Version control for pipeline iterations",
  PIPELINES_WELCOME_BULLET_4: "• Activate/deactivate pipeline versions",
  PIPELINES_WELCOME_BULLET_5:
    "• See the <strong>system-default</strong> pipeline for a comprehensive example",

  // Pipelines Page - Help Text
  PIPELINES_HELP_FORMAT_TITLE: "Pipeline Workflow Format",
  PIPELINES_HELP_FORMAT_1: "• Define workflow as JSON with array of steps",
  PIPELINES_HELP_FORMAT_2: "• Each step has: id, eye (or type), next",
  PIPELINES_HELP_FORMAT_3:
    "• Conditional steps: type: 'condition', condition, true, false",
  PIPELINES_HELP_FORMAT_4:
    "• User input steps: type: 'user_input', prompt, next",
  PIPELINES_HELP_FORMAT_5: "• Terminal step: type: 'terminal'",

  // Connections Page - Header & Navigation
  CONNECTIONS_HEADER_TITLE: "MCP Connection Guides",
  CONNECTIONS_SUBTITLE:
    "Connect Third Eye MCP to your favorite AI tools. Click an integration to view setup instructions.",
  CONNECTIONS_BUTTON_ADD: "Add Integration",
  CONNECTIONS_TOOLTIP_EDIT: "Edit integration",
  CONNECTIONS_TOOLTIP_DELETE: "Delete integration",
  CONNECTIONS_ERROR_PREFIX: "Error: ",

  // Connections Page - Card Content
  CONNECTIONS_SECTION_CONFIG_FILE: "Configuration File",
  CONNECTIONS_SECTION_CONFIGURATION: "Configuration",
  CONNECTIONS_BUTTON_COPIED: "Copied!",
  CONNECTIONS_BUTTON_COPY_CONFIG: "Copy Config",
  CONNECTIONS_SECTION_SETUP: "Setup Instructions",
  CONNECTIONS_LINK_DOCS: "Official Documentation",

  // Connections Page - Empty State
  CONNECTIONS_EMPTY_MESSAGE:
    "No integrations available. Please check your server configuration.",

  // Connections Page - Modal Titles
  CONNECTIONS_MODAL_TITLE_EDIT: "Edit Integration",
  CONNECTIONS_MODAL_TITLE_ADD: "Add Integration",

  // Connections Page - Form Labels
  CONNECTIONS_LABEL_NAME: "Name",
  CONNECTIONS_LABEL_SLUG: "Slug",
  CONNECTIONS_LABEL_LOGO_URL: "Logo URL",
  CONNECTIONS_LABEL_DESCRIPTION: "Description",
  CONNECTIONS_LABEL_CONFIG_TYPE: "Config Type",
  CONNECTIONS_LABEL_CONFIG_FILES: "Config Files (JSON Array)",
  CONNECTIONS_LABEL_CONFIG_TEMPLATE: "Config Template",
  CONNECTIONS_LABEL_SETUP_STEPS: "Setup Steps (JSON Array)",
  CONNECTIONS_LABEL_DOCS_URL: "Documentation URL",
  CONNECTIONS_LABEL_ENABLED: "Enabled (visible to users)",

  // Connections Page - Placeholders
  CONNECTIONS_PLACEHOLDER_NAME: "e.g., Claude Desktop",
  CONNECTIONS_PLACEHOLDER_SLUG: "e.g., claude-desktop",
  CONNECTIONS_PLACEHOLDER_URL: "https://...",
  CONNECTIONS_PLACEHOLDER_DESCRIPTION:
    "Brief description of the integration...",
  CONNECTIONS_PLACEHOLDER_CONFIG_FILES:
    '[{"platform": "macos", "path": "~/Library/..."}]',
  CONNECTIONS_PLACEHOLDER_CONFIG_TEMPLATE:
    "Configuration template with placeholders like {{HOME}}...",
  CONNECTIONS_PLACEHOLDER_SETUP_STEPS:
    '[{"title": "Step 1", "description": "...", "code": null}]',

  // Connections Page - Dropdown Options
  CONNECTIONS_SELECT_JSON: "JSON",
  CONNECTIONS_SELECT_TOML: "TOML",
  CONNECTIONS_SELECT_YAML: "YAML",

  // Connections Page - Buttons
  CONNECTIONS_BUTTON_CANCEL: "Cancel",
  CONNECTIONS_BUTTON_SAVING: "Saving...",
  CONNECTIONS_BUTTON_UPDATE: "Update",
  CONNECTIONS_BUTTON_CREATE: "Create",
  CONNECTIONS_BUTTON_DELETE: "Delete",

  // Connections Page - Validation Errors
  CONNECTIONS_ERROR_NAME_REQUIRED: "Name is required",
  CONNECTIONS_ERROR_SLUG_REQUIRED: "Slug is required",
  CONNECTIONS_ERROR_CONFIG_REQUIRED: "Configuration template is required",
  CONNECTIONS_ERROR_INVALID_JSON: "Invalid JSON format",

  // Connections Page - Success Messages
  CONNECTIONS_SUCCESS_CREATED: "Integration created successfully",
  CONNECTIONS_SUCCESS_UPDATED: "Integration updated successfully",
  CONNECTIONS_SUCCESS_DELETED: "Integration deleted successfully",

  // Connections Page - Error Messages
  CONNECTIONS_ERROR_LOAD_FAILED: "Failed to load integrations",
  CONNECTIONS_ERROR_CREATE_FAILED: "Failed to create integration",
  CONNECTIONS_ERROR_UPDATE_FAILED: "Failed to update integration",
  CONNECTIONS_ERROR_DELETE_FAILED: "Failed to delete integration",

  // Connections Page - Delete Dialog
  CONNECTIONS_DIALOG_DELETE_TITLE: "Delete Integration",
  CONNECTIONS_DIALOG_DELETE_MESSAGE:
    'Are you sure you want to delete "{name}"? This action cannot be undone.',
  CONNECTIONS_DIALOG_DELETE_CONFIRM: "Delete",
  CONNECTIONS_DIALOG_DELETE_CANCEL: "Cancel",

  // Strictness Page - Navigation
  STRICTNESS_NAV_HOME: "← Home",
  STRICTNESS_SECTION_LABEL: "Validation",
  STRICTNESS_HEADER_TITLE: "Strictness Profiles",
  STRICTNESS_NAV_MODELS: "Models",
  STRICTNESS_NAV_PERSONAS: "Personas",

  // Strictness Page - Buttons
  STRICTNESS_BUTTON_CREATE: "+ Create Profile",
  STRICTNESS_BUTTON_EDIT: "Edit",
  STRICTNESS_BUTTON_CANCEL: "Cancel",
  STRICTNESS_BUTTON_SAVING: "Saving...",
  STRICTNESS_BUTTON_SAVE: "Save Profile",
  STRICTNESS_BUTTON_DELETE: "Delete",

  // Strictness Page - Section Headers
  STRICTNESS_SECTION_BUILTIN: "Built-in Profiles",
  STRICTNESS_SECTION_CUSTOM: "Custom Profiles",

  // Strictness Page - Empty State
  STRICTNESS_EMPTY_CUSTOM: "No custom profiles yet",

  // Strictness Page - Strictness Labels
  STRICTNESS_LABEL_VERY_STRICT: "Very Strict",
  STRICTNESS_LABEL_STRICT: "Strict",
  STRICTNESS_LABEL_BALANCED: "Balanced",
  STRICTNESS_LABEL_LENIENT: "Lenient",

  // Strictness Page - Badges
  STRICTNESS_BADGE_BUILTIN: "Built-in",
  STRICTNESS_BADGE_CUSTOM: "Custom",
  STRICTNESS_NO_DESCRIPTION: "No description",

  // Strictness Page - Editor Titles
  STRICTNESS_TITLE_CREATE: "Create New Profile",
  STRICTNESS_TITLE_EDIT: "Edit {name}",

  // Strictness Page - Form Labels
  STRICTNESS_LABEL_NAME: "Name",
  STRICTNESS_LABEL_DESCRIPTION: "Description",
  STRICTNESS_LABEL_AMBIGUITY: "Ambiguity Threshold",
  STRICTNESS_LABEL_CITATION: "Citation Cutoff",
  STRICTNESS_LABEL_CONSISTENCY: "Consistency Tolerance",
  STRICTNESS_LABEL_MANGEKYO: "Mangekyo Strictness",

  // Strictness Page - Placeholders
  STRICTNESS_PLACEHOLDER_NAME: "My Custom Profile",
  STRICTNESS_PLACEHOLDER_DESCRIPTION: "Describe when to use this profile...",

  // Strictness Page - Help Text
  STRICTNESS_HELP_AMBIGUITY: "Lower = more questions asked by Sharingan",
  STRICTNESS_HELP_CITATION: "Higher = requires more citations (Tenseigan)",
  STRICTNESS_HELP_CONSISTENCY:
    "Higher = more tolerant of inconsistencies (Byakugan)",
  STRICTNESS_HELP_MANGEKYO: "Code review strictness level",

  // Strictness Page - Dropdown Options
  STRICTNESS_OPTION_LENIENT: "Lenient",
  STRICTNESS_OPTION_STANDARD: "Standard",
  STRICTNESS_OPTION_STRICT: "Strict",

  // Strictness Page - Guidelines
  STRICTNESS_GUIDELINES_TITLE: "Profile Guidelines",
  STRICTNESS_GUIDELINES_CASUAL:
    "• Casual: Relaxed validation for prototyping (50/50/60)",
  STRICTNESS_GUIDELINES_ENTERPRISE:
    "• Enterprise: Balanced for production (30/70/80)",
  STRICTNESS_GUIDELINES_SECURITY:
    "• Security: Maximum validation for critical systems (10/90/95)",
  STRICTNESS_GUIDELINES_CUSTOM: "• Custom: Tailor thresholds to your needs",

  // Strictness Page - Detail View Headers
  STRICTNESS_DETAIL_AMBIGUITY: "Ambiguity Threshold",
  STRICTNESS_DETAIL_CITATION: "Citation Cutoff",
  STRICTNESS_DETAIL_CONSISTENCY: "Consistency Tolerance",
  STRICTNESS_DETAIL_MANGEKYO: "Mangekyo Strictness",

  // Strictness Page - Detail View Descriptions
  STRICTNESS_DESC_AMBIGUITY:
    "Controls how many clarification questions Sharingan asks",
  STRICTNESS_DESC_CITATION: "Minimum score for Tenseigan evidence validation",
  STRICTNESS_DESC_CONSISTENCY: "How much inconsistency Byakugan tolerates",
  STRICTNESS_DESC_MANGEKYO: "Code review validation level",

  // Strictness Page - Applied To Section
  STRICTNESS_APPLIED_TITLE: "Applied To",
  STRICTNESS_APPLIED_DESC:
    "This profile affects: Sharingan (ambiguity), Tenseigan (citations), Byakugan (consistency), Mangekyo (code review), Rinnegan (planning)",

  // Strictness Page - Welcome Screen
  STRICTNESS_WELCOME_TITLE: "Strictness Configuration",
  STRICTNESS_WELCOME_SUBTITLE:
    "Select a profile from the left to view details or create a custom profile",
  STRICTNESS_WELCOME_BULLET_1:
    "• Control validation thresholds across all Eyes",
  STRICTNESS_WELCOME_BULLET_2:
    "• Built-in profiles: Casual, Enterprise, Security",
  STRICTNESS_WELCOME_BULLET_3:
    "• Create custom profiles for specific workflows",
  STRICTNESS_WELCOME_BULLET_4:
    "• Fine-tune ambiguity, citations, and consistency checks",

  // Strictness Page - Dialog Messages
  STRICTNESS_DIALOG_CANNOT_EDIT_TITLE: "Cannot Edit",
  STRICTNESS_DIALOG_CANNOT_EDIT_MESSAGE: "Built-in profiles cannot be edited",
  STRICTNESS_DIALOG_VALIDATION_TITLE: "Validation Error",
  STRICTNESS_DIALOG_VALIDATION_MESSAGE: "Please provide a profile name",
  STRICTNESS_DIALOG_CREATE_FAILED_TITLE: "Create Failed",
  STRICTNESS_DIALOG_CREATE_FAILED_MESSAGE: "Failed to create profile: {error}",
  STRICTNESS_DIALOG_UPDATE_FAILED_TITLE: "Update Failed",
  STRICTNESS_DIALOG_UPDATE_FAILED_MESSAGE: "Failed to update profile: {error}",
  STRICTNESS_DIALOG_ERROR_TITLE: "Error",
  STRICTNESS_DIALOG_ERROR_SAVE: "Failed to save profile",
  STRICTNESS_DIALOG_CANNOT_DELETE_TITLE: "Cannot Delete",
  STRICTNESS_DIALOG_CANNOT_DELETE_MESSAGE:
    "Built-in profiles cannot be deleted",
  STRICTNESS_DIALOG_DELETE_TITLE: "Delete Profile",
  STRICTNESS_DIALOG_DELETE_MESSAGE:
    'Are you sure you want to delete the profile "{name}"? This action cannot be undone.',
  STRICTNESS_DIALOG_DELETE_CONFIRM: "Delete",
  STRICTNESS_DIALOG_DELETE_CANCEL: "Cancel",
  STRICTNESS_DIALOG_DELETE_FAILED_TITLE: "Delete Failed",
  STRICTNESS_DIALOG_DELETE_FAILED_MESSAGE: "Failed to delete profile: {error}",
  STRICTNESS_DIALOG_ERROR_DELETE: "Failed to delete profile",
  STRICTNESS_ERROR_UNKNOWN: "Unknown error",
});

export type UiHelpTextKey = keyof typeof UI_HELP_TEXT;

/**
 * Platform Highlights - Dashboard Feature Cards
 * Showcases key capabilities of Third Eye MCP
 */
export const PLATFORM_HIGHLIGHTS = Object.freeze([
  {
    id: "evidence-lens",
    title: "Evidence Lens",
    description: "Live claim validation with confidence scores",
    iconName: "Eye",
    color: "from-blue-500 to-cyan-500",
    href: "/monitor?tab=evidence",
    demo: "95% confidence",
  },
  {
    id: "duel-mode",
    title: "Duel Mode",
    description: "Model comparison arena",
    iconName: "Zap",
    color: "from-purple-500 to-pink-500",
    href: "/duel",
    demo: "GPT-4 vs Claude",
  },
  {
    id: "replay-theater",
    title: "Replay Theater",
    description: "Session playback with speed controls",
    iconName: "PlayCircle",
    color: "from-orange-500 to-red-500",
    href: "/replay",
    demo: "0.5x - 5x speed",
  },
  {
    id: "kill-switch",
    title: "Kill Switch",
    description: "One-click hallucination check",
    iconName: "ShieldAlert",
    color: "from-red-500 to-rose-500",
    href: "/monitor",
    demo: "Re-validate now",
  },
  {
    id: "visual-plan",
    title: "Visual Plan Renderer",
    description: "File tree + Kanban board",
    iconName: "FolderTree",
    color: "from-green-500 to-emerald-500",
    href: "/monitor?tab=plan",
    demo: "5 phases tracked",
  },
  {
    id: "leaderboards",
    title: "Leaderboards",
    description: "Provider/model rankings",
    iconName: "Trophy",
    color: "from-yellow-500 to-amber-500",
    href: "/metrics",
    demo: "Groq leads 342ms",
  },
  {
    id: "export-engine",
    title: "Export Engine",
    description: "PDF/HTML/JSON/MD downloads",
    iconName: "Download",
    color: "from-indigo-500 to-blue-500",
    href: "/monitor",
    demo: "4 formats ready",
  },
  {
    id: "adaptive-clarifications",
    title: "Adaptive Clarifications",
    description: "Sharingan inline Q&A",
    iconName: "MessageSquare",
    color: "from-teal-500 to-cyan-500",
    href: "/monitor?eye=sharingan",
    demo: "3 questions asked",
  },
  {
    id: "session-memory",
    title: "Session Memory",
    description: "Byakugan context tracking",
    iconName: "History",
    color: "from-violet-500 to-purple-500",
    href: "/monitor?tab=evidence",
    demo: "12 refs tracked",
  },
]);
