/**
 * User Messages - SSOT for all user-facing strings
 * Per R13: No magic strings
 * Per R01: Single source of truth
 */

export const MESSAGES = {
  // Session management
  CONFIRM_DELETE_SESSION: "Delete this session?",
  ERROR_DELETE_SESSION: "Failed to delete session",
  ERROR_DELETE_SESSION_GENERIC: "Error deleting session",
  ERROR_DELETE_SESSIONS: "Failed to delete sessions. Please try again.",
  ERROR_DELETE_SESSIONS_GENERIC:
    "Error deleting sessions. Please check console.",

  // Button labels
  DELETE_ALL: "Delete All",
  DELETING: "Deleting...",

  // Models & Routing
  REFRESH_ALL_MODELS: "Refresh All Models",
  REFRESHING_MODELS: "Refreshing...",
  SAVING_ROUTING: "Saving...",
  ROUTING_SAVED: "Routing saved successfully",
  ROUTING_SAVED_MULTIPLE: (count: number) =>
    `Saved routing changes for ${count} Eye${count > 1 ? "s" : ""}`,
  ROUTING_DISCARDED: "Routing changes discarded",
  UNSAVED_CHANGES: (count: number) =>
    `You have unsaved routing changes for ${count} Eye${count > 1 ? "s" : ""}`,
  NO_MODELS_FOUND: "No models found",
  ADD_API_KEY_SETTINGS: "Add API key in Settings",
  CLICK_REFRESH_LOAD_MODELS: "Click refresh to load models",
  SELECT_PROVIDER: "Select Provider",
  SELECT_MODEL: "Select Model",
  NONE: "None",
  COPY_FROM_OVERSEER: "Copy from Overseer",
  RESET_TO_DEFAULT: "Reset to Default",
  USE_SAME_AS_PRIMARY: "Use Same as Primary",
  CLEAR_ROUTING: "Clear Routing",
  CONFIGURE_PROVIDERS_ROUTE_MODELS:
    "Configure providers and route models to Eyes",
} as const;
