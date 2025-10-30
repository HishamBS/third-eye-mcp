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
});

export type UiHelpTextKey = keyof typeof UI_HELP_TEXT;
