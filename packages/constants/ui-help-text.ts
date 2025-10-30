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
});

export type UiHelpTextKey = keyof typeof UI_HELP_TEXT;
