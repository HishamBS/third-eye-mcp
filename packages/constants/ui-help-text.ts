/**
 * UI Help Text - Single Source of Truth
 * All tooltip and help text strings for the application
 */

export const UI_HELP_TEXT = Object.freeze({
  // Eyes Page
  EYES_PAGE_TITLE: 'Eyes are specialized AI agents that review and validate your conversations',
  EYES_CUSTOM_FILTER: 'View only your custom-created Eyes',
  EYES_BUILTIN_FILTER: 'View only the built-in Eyes that come with Third Eye',
  EYES_ALL_FILTER: 'View all Eyes including both built-in and custom',
  EYES_CREATE_BUTTON: 'Create a new custom Eye with your own capabilities',
  EYE_CAPABILITIES: 'Special abilities this Eye has for reviewing conversations',
  EYE_STAGE: 'When this Eye runs in the pipeline: Guidance helps before, Validation checks after',

  // Eyes Page - Navigation
  EYES_NAV_HOME: '← Home',
  EYES_NAV_PROMPTS: 'Prompts',
  EYES_NAV_PERSONAS: 'Personas',

  // Eyes Page - Header
  EYES_SECTION_LABEL: 'Eyes',
  EYES_HEADER_TITLE: 'Eyes Management',

  // Eyes Page - Buttons
  EYES_BUTTON_CREATE: '+ Create Custom Eye',
  EYES_BUTTON_CANCEL: 'Cancel',
  EYES_BUTTON_CLOSE_TEST: 'Close Test',
  EYES_BUTTON_CREATE_EYE: 'Create Eye',
  EYES_BUTTON_CREATING: 'Creating...',
  EYES_BUTTON_UPDATE_EYE: 'Update Eye',
  EYES_BUTTON_UPDATING: 'Updating...',
  EYES_BUTTON_RUN_TEST: 'Run Test',
  EYES_BUTTON_TESTING: 'Testing...',
  EYES_BUTTON_EDIT: 'Edit',
  EYES_BUTTON_TEST: 'Test',
  EYES_BUTTON_DELETE: 'Delete',
  EYES_BUTTON_DISCARD_CHANGES: 'Discard Changes',
  EYES_BUTTON_SAVE_CHANGES: 'Save Changes',
  EYES_BUTTON_SAVING: 'Saving...',

  // Eyes Page - Form Titles
  EYES_FORM_TITLE_CREATE: 'Create Custom Eye',
  EYES_FORM_TITLE_EDIT: 'Edit {eyeName}',
  EYES_FORM_TITLE_VIEW: 'View {eyeName}',
  EYES_FORM_TITLE_TEST: 'Test {eyeName}',

  // Eyes Page - Form Labels
  EYES_FORM_LABEL_TEST_INPUT: 'Test Input',
  EYES_FORM_LABEL_TEST_RESULT: 'Test Result',
  EYES_FORM_LABEL_TEST_RESULT_EYE: 'Eye:',
  EYES_FORM_LABEL_TEST_RESULT_RESPONSE: 'Response:',
  EYES_FORM_LABEL_NAME: 'Eye Name (ID)',
  EYES_FORM_LABEL_DESCRIPTION: 'Description',
  EYES_FORM_LABEL_PERSONA: 'Persona (Optional)',
  EYES_FORM_LABEL_INPUT_SCHEMA: 'Input Schema (JSON)',
  EYES_FORM_LABEL_OUTPUT_SCHEMA: 'Output Schema (JSON)',

  // Eyes Page - Placeholders
  EYES_PLACEHOLDER_TEST_INPUT: 'Enter test input for the Eye...',
  EYES_PLACEHOLDER_NAME: 'my_custom_eye',
  EYES_PLACEHOLDER_DESCRIPTION: 'Describe what this Eye does...',

  // Eyes Page - Helper Text
  EYES_HELPER_NAME: 'Lowercase, no spaces. Will be used as tool name: third_eye_{eyeName}',
  EYES_HELPER_PERSONA: 'Link this Eye to a persona for LLM-powered behavior',

  // Eyes Page - Dropdown Options
  EYES_DROPDOWN_NO_PERSONA: '-- No Persona (attach later) --',

  // Eyes Page - Dialogs
  EYES_DIALOG_DISCARD_TITLE: 'Discard Changes',
  EYES_DIALOG_DISCARD_MESSAGE: 'You have unsaved changes. Are you sure you want to discard them?',
  EYES_DIALOG_DISCARD_CONFIRM: 'Discard',
  EYES_DIALOG_DELETE_TITLE: 'Delete Custom Eye',
  EYES_DIALOG_DELETE_MESSAGE: 'Are you sure you want to delete this custom Eye?',
  EYES_DIALOG_DELETE_CONFIRM: 'Delete',

  // Eyes Page - Success Messages
  EYES_SUCCESS_CREATED: 'Custom Eye created successfully',
  EYES_SUCCESS_UPDATED: 'Custom Eye updated successfully',
  EYES_SUCCESS_DELETED: 'Custom Eye deleted successfully',
  EYES_SUCCESS_TEST_COMPLETED: 'Test completed successfully',

  // Eyes Page - Error Fallbacks
  EYES_ERROR_CREATE_FALLBACK: 'Failed to create Eye',
  EYES_ERROR_UPDATE_FALLBACK: 'Failed to update Eye',

  // Eyes Page - Warnings
  EYES_WARNING_UNSAVED_CHANGES: 'You have unsaved changes to this Eye',

  // Eyes Page - Guidelines
  EYES_GUIDELINES_TITLE: 'Custom Eye Guidelines',
  EYES_GUIDELINE_NAMES: '• Eye names must be unique and lowercase with underscores',
  EYES_GUIDELINE_SCHEMAS: '• Input/output schemas must be valid JSON Schema format',
  EYES_GUIDELINE_REGISTRATION: '• Eyes will be automatically registered in MCP server',
  EYES_GUIDELINE_PERSONA: '• Link to a persona from the Prompt Library (future feature)',
  EYES_GUIDELINE_CONTRACT: '• Custom Eyes follow the same Overseer contract as built-in Eyes',

  // Eyes Page - Filter Tabs
  EYES_FILTER_ALL: 'All ({count})',
  EYES_FILTER_BUILTIN: 'Built-In ({count})',
  EYES_FILTER_CUSTOM: 'Custom ({count})',

  // Eyes Page - Empty States
  EYES_EMPTY_CUSTOM_TITLE: 'No Custom Eyes Yet',
  EYES_EMPTY_CUSTOM_DESCRIPTION: 'Custom Eyes are your own specialized AI agents! Create one to add unique capabilities like fact-checking, tone analysis, or custom validation rules.',
  EYES_EMPTY_BUILTIN_TITLE: 'No Built-in Eyes Available',
  EYES_EMPTY_BUILTIN_DESCRIPTION: 'Built-in Eyes are pre-configured AI agents that come with Third Eye MCP. They should be available by default.',
  EYES_EMPTY_ALL_TITLE: 'No Eyes Found',
  EYES_EMPTY_ALL_DESCRIPTION: 'Eyes are specialized AI agents that watch over your conversations. Each Eye has unique capabilities - explore them to get started!',
  EYES_EMPTY_ACTION_CREATE: 'Create Your First Eye',
  EYES_EMPTY_ACTION_VIEW_BUILTIN: 'View Built-in Eyes',

  // Eyes Page - Date Display
  EYES_CREATED_PREFIX: 'Created',

  // Pipelines Page
  PIPELINES_PAGE_TITLE: 'Pipelines are workflows that combine multiple Eyes to review conversations',
  PIPELINE_CREATE_BUTTON: 'Build a new pipeline by dragging and connecting Eyes',
  PIPELINE_NODE_DRAG: 'Drag Eyes from the sidebar to add them to your pipeline',
  PIPELINE_NODE_CONNECT: 'Click and drag from the dot to connect Eyes in sequence',
  PIPELINE_EXECUTION_ORDER: 'Eyes execute from top to bottom in the order they are connected',

  // Monitor Page
  MONITOR_PAGE_TITLE: 'Watch your Eyes work in real-time as they review conversations',
  MONITOR_LIVE_TAB: 'See conversations being reviewed right now',
  MONITOR_QUEUE_TAB: 'See conversations waiting to be reviewed',
  MONITOR_HISTORY_TAB: 'Browse all past conversations that have been reviewed',
  MONITOR_ANALYTICS_TAB: 'View statistics and performance metrics for your Eyes',
  MONITOR_SETTINGS_TAB: 'Configure how monitoring works',

  // Sessions Page
  SESSIONS_PAGE_TITLE: 'Sessions are complete conversation reviews from start to finish',
  SESSIONS_FILTER: 'Filter sessions by status, date, or Eye',
  SESSION_REPLAY: 'Watch a replay of how the Eyes reviewed this conversation',

  // View Mode Toggle
  VIEW_MODE_BEGINNER: 'Simplified interface with helpful explanations',
  VIEW_MODE_ADVANCED: 'Full interface with all technical details and options',

  // Common
  REFRESH_DATA: 'Reload the latest data from the server',
  SEARCH: 'Search by name, description, or capabilities',
  EXPORT: 'Download this data as a file',
  DELETE: 'Permanently remove this item',
  EDIT: 'Modify this item',
  DUPLICATE: 'Create a copy of this item',

  // Loading States
  LOADING_EYES: 'Loading Eyes...',
  LOADING_PIPELINES: 'Loading Pipelines...',
  LOADING_SESSIONS: 'Loading Sessions...',
  LOADING_DATA: 'Loading...',
  LOADING_PERSONAS: 'Loading Personas...',
  LOADING_MODELS: 'Loading Models...',

  // Execution Panel
  EXECUTION_PANEL_TITLE: 'Pipeline Execution',
  EXECUTION_PANEL_CLOSE: 'Close execution panel',
  EXECUTION_START: 'Start Execution',
  EXECUTION_STARTING: 'Starting...',
  EXECUTION_PAUSE: 'Pause',
  EXECUTION_RESUME: 'Resume',
  EXECUTION_AUTO_REFRESH: 'Auto-refresh',
  EXECUTION_DURATION: 'Duration',
  EXECUTION_STEPS_COMPLETED: 'Steps Completed',
  EXECUTION_FINAL_VERDICT: 'Final Verdict',
  EXECUTION_STEPS_TITLE: 'Execution Steps',
  EXECUTION_VERDICT_PREFIX: 'Verdict:',
  EXECUTION_ERROR_PREFIX: 'Error:',
  EXECUTION_TOKENS_SUFFIX: 'tokens',
  EXECUTION_MS_SUFFIX: 'ms',
  EXECUTION_EMPTY_TITLE: 'No execution running',
  EXECUTION_EMPTY_DESCRIPTION: 'Click Start Execution to begin',

  // Error Messages - Friendly Language for Non-Technical Users
  ERROR_EYES_NO_REGISTRY: 'Could not find any Eyes. They might not be set up yet. Please check that Third Eye is running properly.',
  ERROR_EYES_LOAD_FAILED: 'Could not load your Eyes right now. Please check that Third Eye is running and try refreshing the page.',
  ERROR_EYE_NAME_REQUIRED: 'Please give your Eye a name before saving.',
  ERROR_EYE_DESCRIPTION_REQUIRED: 'Please add a description so others know what this Eye does.',
  ERROR_EYE_INVALID_SCHEMA: 'The settings you entered are not in the right format. Please check and try again.',
  ERROR_EYE_SAVE_FAILED: 'Could not save your Eye right now. Please try again in a moment.',
  ERROR_EYE_UPDATE_FAILED: 'Could not update your Eye. Please try again.',
  ERROR_EYE_DELETE_FAILED: 'Could not delete this Eye. Please try again.',
  ERROR_EYE_TEST_INPUT_REQUIRED: 'Please enter some text to test your Eye.',
  ERROR_EYE_TEST_FAILED: 'Could not test your Eye right now. Please try again.',

  ERROR_PIPELINE_SESSION_FAILED: 'Could not start a new session. Please try again.',
  ERROR_PIPELINE_RUN_FAILED: 'Could not run this pipeline. Please make sure Third Eye is running and try again.',
  ERROR_PIPELINE_SAVE_FAILED: 'Could not save your pipeline. Please try again.',

  ERROR_GENERIC_LOAD: 'Having trouble loading this page. Please refresh and try again.',
  ERROR_GENERIC_SAVE: 'Could not save your changes. Please try again.',
  ERROR_GENERIC_DELETE: 'Could not delete this item. Please try again.',

  // ARIA Labels for Accessibility
  ARIA_CREATE_EYE: 'Create a new custom Eye',
  ARIA_CANCEL: 'Cancel and return to list',
  ARIA_SAVE_EYE: 'Save this Eye',
  ARIA_UPDATE_EYE: 'Update Eye settings',
  ARIA_DELETE_EYE: 'Delete this Eye permanently',
  ARIA_EDIT_EYE: 'Edit Eye settings',
  ARIA_TEST_EYE: 'Test this Eye with sample input',
  ARIA_RUN_TEST: 'Run the test',
  ARIA_CLOSE_TEST: 'Close test panel',

  ARIA_CREATE_PIPELINE: 'Create a new pipeline',
  ARIA_SAVE_PIPELINE: 'Save this pipeline',
  ARIA_RUN_PIPELINE: 'Run this pipeline',
  ARIA_EDIT_PIPELINE: 'Edit pipeline settings',

  ARIA_FILTER_ALL: 'Show all Eyes',
  ARIA_FILTER_BUILTIN: 'Show only built-in Eyes',
  ARIA_FILTER_CUSTOM: 'Show only custom Eyes',

  ARIA_NAV_HOME: 'Return to home page',
  ARIA_NAV_EYES: 'Go to Eyes management',
  ARIA_NAV_PIPELINES: 'Go to Pipelines',
  ARIA_NAV_PERSONAS: 'Go to Personas',
  ARIA_NAV_PROMPTS: 'Go to Prompts',
  ARIA_NAV_MODELS: 'Go to Models',
  ARIA_NAV_MONITOR: 'Go to Monitor',
  ARIA_NAV_SESSIONS: 'Go to Sessions',

  ARIA_ERROR_REGION: 'Error message',
  ARIA_SUCCESS_REGION: 'Success message',
  ARIA_LOADING_REGION: 'Loading content',

  // Settings Page - Provider Keys
  ERROR_SETTINGS_KEY_LABEL_REQUIRED: 'Label and API key are required',
  SUCCESS_SETTINGS_KEY_ADDED: 'Provider key added successfully',
  ERROR_SETTINGS_KEY_ADD_FAILED: 'Failed to add provider key',
  SUCCESS_SETTINGS_KEY_UPDATED: 'Provider key updated successfully',
  ERROR_SETTINGS_KEY_UPDATE_FAILED: 'Failed to update provider key',
  SUCCESS_SETTINGS_KEY_TEST_OK: 'key works! Found {count} models',
  ERROR_SETTINGS_KEY_TEST_FAILED: 'key test failed - check your API key',
  ERROR_SETTINGS_KEY_TEST_ERROR: 'Failed to test {provider} key',
  SUCCESS_SETTINGS_KEY_DELETED: 'Provider key deleted',
  ERROR_SETTINGS_KEY_DELETE_FAILED: 'Failed to delete provider key',

  // Settings Page - Telemetry
  SUCCESS_SETTINGS_TELEMETRY_ENABLED: 'Telemetry enabled',
  SUCCESS_SETTINGS_TELEMETRY_DISABLED: 'Telemetry disabled',
  ERROR_SETTINGS_TELEMETRY_FAILED: 'Failed to update telemetry setting',

  // Settings Page - Database
  SUCCESS_SETTINGS_DB_BACKUP: 'Database backup downloaded',
  ERROR_SETTINGS_DB_BACKUP_FAILED: 'Failed to create backup',
  SUCCESS_SETTINGS_DB_RESTORED: 'Database restored successfully. Reloading...',
  ERROR_SETTINGS_DB_RESTORE_FAILED: 'Failed to restore database',
  SUCCESS_SETTINGS_DB_RESET: 'Database reset successfully. Reloading...',
  ERROR_SETTINGS_DB_RESET_FAILED: 'Failed to reset database',

  // Metrics Page
  ERROR_METRICS_FETCH_FAILED: 'Failed to fetch metrics',

  // Dashboard / Homepage
  DASHBOARD_PLATFORM_HIGHLIGHTS_TITLE: 'Platform Highlights',
  DASHBOARD_PLATFORM_HIGHLIGHTS_SUBTITLE: 'Powerful tools for AI orchestration, validation, and analysis. All features work with real-time data.',
});

export type UiHelpTextKey = keyof typeof UI_HELP_TEXT;

/**
 * Platform Highlights - Dashboard Feature Cards
 * Showcases key capabilities of Third Eye MCP
 */
export const PLATFORM_HIGHLIGHTS = Object.freeze([
  {
    id: 'evidence-lens',
    title: 'Evidence Lens',
    description: 'Live claim validation with confidence scores',
    iconName: 'Eye',
    color: 'from-blue-500 to-cyan-500',
    href: '/monitor?tab=evidence',
    demo: '95% confidence',
  },
  {
    id: 'duel-mode',
    title: 'Duel Mode',
    description: 'Model comparison arena',
    iconName: 'Zap',
    color: 'from-purple-500 to-pink-500',
    href: '/duel',
    demo: 'GPT-4 vs Claude',
  },
  {
    id: 'replay-theater',
    title: 'Replay Theater',
    description: 'Session playback with speed controls',
    iconName: 'PlayCircle',
    color: 'from-orange-500 to-red-500',
    href: '/replay',
    demo: '0.5x - 5x speed',
  },
  {
    id: 'kill-switch',
    title: 'Kill Switch',
    description: 'One-click hallucination check',
    iconName: 'ShieldAlert',
    color: 'from-red-500 to-rose-500',
    href: '/monitor',
    demo: 'Re-validate now',
  },
  {
    id: 'visual-plan',
    title: 'Visual Plan Renderer',
    description: 'File tree + Kanban board',
    iconName: 'FolderTree',
    color: 'from-green-500 to-emerald-500',
    href: '/monitor?tab=plan',
    demo: '5 phases tracked',
  },
  {
    id: 'leaderboards',
    title: 'Leaderboards',
    description: 'Provider/model rankings',
    iconName: 'Trophy',
    color: 'from-yellow-500 to-amber-500',
    href: '/metrics',
    demo: 'Groq leads 342ms',
  },
  {
    id: 'export-engine',
    title: 'Export Engine',
    description: 'PDF/HTML/JSON/MD downloads',
    iconName: 'Download',
    color: 'from-indigo-500 to-blue-500',
    href: '/monitor',
    demo: '4 formats ready',
  },
  {
    id: 'adaptive-clarifications',
    title: 'Adaptive Clarifications',
    description: 'Sharingan inline Q&A',
    iconName: 'MessageSquare',
    color: 'from-teal-500 to-cyan-500',
    href: '/monitor?eye=sharingan',
    demo: '3 questions asked',
  },
  {
    id: 'session-memory',
    title: 'Session Memory',
    description: 'Byakugan context tracking',
    iconName: 'History',
    color: 'from-violet-500 to-purple-500',
    href: '/monitor?tab=evidence',
    demo: '12 refs tracked',
  },
]);
