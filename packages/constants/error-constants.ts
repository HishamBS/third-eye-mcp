/**
 * Error Constants - SSOT for all API error responses
 *
 * R13 Compliance: No magic strings in error handling
 */

import { freezeTokens, tokenValues } from "./taxonomy";
import type { TokenLiteral } from "./taxonomy";

/**
 * API Error Codes - Machine-readable error identifiers for API responses
 */
export const ApiErrorCode = freezeTokens({
  // Validation errors
  INVALID_REQUEST: "INVALID_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_CATEGORY: "INVALID_CATEGORY",
  INVALID_INPUT: "INVALID_INPUT",
  EMPTY_INPUT: "EMPTY_INPUT",
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  INVALID_LIMIT: "INVALID_LIMIT",
  INVALID_ID: "INVALID_ID",
  INVALID_FORMAT: "INVALID_FORMAT",
  INVALID_FILE: "INVALID_FILE",
  MISSING_SESSION_ID: "MISSING_SESSION_ID",
  MISSING_ID: "MISSING_ID",
  MISSING_INPUT: "MISSING_INPUT",

  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  PIPELINE_NOT_FOUND: "PIPELINE_NOT_FOUND",
  EXECUTION_NOT_FOUND: "EXECUTION_NOT_FOUND",
  POLICY_NOT_FOUND: "POLICY_NOT_FOUND",
  EYE_NOT_FOUND: "EYE_NOT_FOUND",
  EYE_ICON_NOT_FOUND: "EYE_ICON_NOT_FOUND",
  BLUEPRINT_NOT_FOUND: "BLUEPRINT_NOT_FOUND",
  PERSONA_NOT_FOUND: "PERSONA_NOT_FOUND",
  PERSONA_VERSION_NOT_FOUND: "PERSONA_VERSION_NOT_FOUND",
  VERSION_NOT_FOUND: "VERSION_NOT_FOUND",
  VERSIONS_NOT_FOUND: "VERSIONS_NOT_FOUND",
  VERSION_MISMATCH: "VERSION_MISMATCH",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  DUEL_NOT_FOUND: "DUEL_NOT_FOUND",
  INTEGRATION_NOT_FOUND: "INTEGRATION_NOT_FOUND",
  PROFILE_NOT_FOUND: "PROFILE_NOT_FOUND",
  CLARIFICATION_NOT_FOUND: "CLARIFICATION_NOT_FOUND",
  DATABASE_NOT_FOUND: "DATABASE_NOT_FOUND",

  // DAG/Workflow errors
  INVALID_PIPELINE_DAG: "INVALID_PIPELINE_DAG",
  INVALID_WORKFLOW: "INVALID_WORKFLOW",

  // Operation errors
  POLICY_CREATE_FAILED: "POLICY_CREATE_FAILED",
  POLICY_UPDATE_FAILED: "POLICY_UPDATE_FAILED",
  PIPELINE_CREATE_FAILED: "PIPELINE_CREATE_FAILED",
  PIPELINE_UPDATE_FAILED: "PIPELINE_UPDATE_FAILED",
  PIPELINE_EXECUTION_FAILED: "PIPELINE_EXECUTION_FAILED",
  CANNOT_DELETE_ACTIVE_VERSION: "CANNOT_DELETE_ACTIVE_VERSION",
  SESSION_CREATE_FAILED: "SESSION_CREATE_FAILED",
  INVALID_OPERATION: "INVALID_OPERATION",
  CANNOT_EDIT_BUILTIN: "CANNOT_EDIT_BUILTIN",
  CANNOT_DELETE_BUILTIN: "CANNOT_DELETE_BUILTIN",
  OVERSEER_EXECUTION_FAILED: "OVERSEER_EXECUTION_FAILED",
  PROVIDER_AUTH_FAILED: "PROVIDER_AUTH_FAILED",

  // System errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const);

export type ApiErrorCode = TokenLiteral<typeof ApiErrorCode>;
export const ALL_API_ERROR_CODES = tokenValues(ApiErrorCode);

/**
 * API Error Titles - Human-readable error categories for API responses
 */
export const ApiErrorTitle = freezeTokens({
  // Validation error titles
  VALIDATION_ERROR: "Validation Error",
  INVALID_REQUEST: "Invalid Request",
  INVALID_INPUT: "Invalid Input",
  EMPTY_INPUT: "Missing Input",
  INVALID_PAYLOAD: "Invalid Payload",
  INVALID_LIMIT: "Invalid Limit",
  INVALID_ID: "Invalid ID",
  INVALID_FORMAT: "Invalid Format",
  INVALID_FILE: "Invalid File",
  INVALID_CATEGORY: "Invalid Category",
  MISSING_SESSION_ID: "Missing Session ID",
  MISSING_ID: "Missing ID",
  MISSING_INPUT: "Missing Input",

  // DAG/Workflow error titles
  INVALID_PIPELINE_DAG: "Invalid Pipeline DAG",
  INVALID_WORKFLOW: "Invalid Workflow",

  // Resource not found titles
  PIPELINE_NOT_FOUND: "Pipeline Not Found",
  EXECUTION_NOT_FOUND: "Execution Not Found",
  POLICY_NOT_FOUND: "Policy Not Found",
  EYE_NOT_FOUND: "Eye Not Found",
  EYE_ICON_NOT_FOUND: "Eye Icon Not Found",
  BLUEPRINT_NOT_FOUND: "Blueprint Not Found",
  PERSONA_NOT_FOUND: "Persona Not Found",
  PERSONA_VERSION_NOT_FOUND: "Persona Version Not Found",
  VERSION_NOT_FOUND: "Version Not Found",
  VERSIONS_NOT_FOUND: "Versions Not Found",
  SESSION_NOT_FOUND: "Session Not Found",
  DUEL_NOT_FOUND: "Duel Not Found",
  INTEGRATION_NOT_FOUND: "Integration Not Found",
  PROFILE_NOT_FOUND: "Profile Not Found",
  CLARIFICATION_NOT_FOUND: "Clarification Not Found",
  DATABASE_NOT_FOUND: "Database Not Found",

  // Operation error titles
  POLICY_CREATE_ERROR: "Policy Creation Error",
  POLICY_UPDATE_ERROR: "Policy Update Error",
  PIPELINE_CREATE_ERROR: "Pipeline Creation Error",
  PIPELINE_UPDATE_ERROR: "Pipeline Update Error",
  SESSION_CREATE_ERROR: "Session Creation Error",
  VERSION_MISMATCH: "Version Mismatch",
  CANNOT_DELETE_ACTIVE_VERSION: "Cannot Delete Active Version",
  INVALID_OPERATION: "Invalid Operation",
  CANNOT_EDIT_BUILTIN: "Cannot Edit Built-in Profile",
  CANNOT_DELETE_BUILTIN: "Cannot Delete Built-in Profile",
  OVERSEER_EXECUTION_ERROR: "Overseer Execution Failed",
  PIPELINE_EXECUTION_ERROR: "Pipeline Execution Failed",
  PROVIDER_AUTH_ERROR: "Provider Authentication Failed",
  INTERNAL_ERROR: "Internal Server Error",
} as const);

export type ApiErrorTitle = TokenLiteral<typeof ApiErrorTitle>;
export const ALL_API_ERROR_TITLES = tokenValues(ApiErrorTitle);

/**
 * API Error Messages - Detailed error descriptions for API responses
 */
export const ApiErrorMessage = {
  // Validation messages
  INVALID_REQUEST_BODY: "Invalid request body",
  POLICY_REQUIRED_FIELDS: "name and mandatoryEyes (array) are required",
  EYE_SEQUENCE_REQUIRED: "eyeSequence (array) is required",
  EMPTY_INPUT_DETAIL: "Input cannot be empty",
  INVALID_PAYLOAD_DETAIL: "Invalid request payload",
  INVALID_LIMIT_DETAIL: "Limit must be a positive integer",
  MISSING_SESSION_ID_DETAIL: "Missing required field: sessionId",
  MISSING_INPUT_DETAIL: "Missing required input",
  INVALID_ID_DETAIL: "Invalid ID format",
  INVALID_FORMAT_DETAIL: "Invalid format",
  INVALID_FILE_DETAIL: "Invalid file",

  // DAG validation messages
  WORKFLOW_JSON_MISSING: "Pipeline workflow JSON is missing or invalid",
  NODES_ARRAY_REQUIRED: "Pipeline DAG must have a 'nodes' array",
  EDGES_ARRAY_REQUIRED: "Pipeline DAG must have an 'edges' array",
  NODES_EMPTY: "Pipeline DAG must have at least one node",

  // Generic failure messages
  FAILED_TO_FETCH: "Failed to fetch",
  FAILED_TO_CREATE: "Failed to create",
  FAILED_TO_UPDATE: "Failed to update",
  FAILED_TO_DELETE: "Failed to delete",
  FAILED_TO_EXECUTE: "Failed to execute",

  // Not found messages
  PIPELINE_NOT_FOUND_DETAIL: "The requested pipeline could not be found",
  EXECUTION_NOT_FOUND_DETAIL: "Execution not found for runId",
  NO_ACTIVE_EXECUTION: "No active execution found for runId",
  BLUEPRINT_NOT_FOUND_DETAIL: "Blueprint not found",
  EYE_NOT_FOUND_DETAIL: "The requested eye could not be found",
  EYE_ICON_NOT_FOUND_DETAIL: "Eye icon not found",
  PERSONA_NOT_FOUND_DETAIL: "The requested persona could not be found",
  PERSONA_VERSION_NOT_FOUND_DETAIL: "The requested persona version could not be found",
  VERSION_NOT_FOUND_DETAIL: "The requested version could not be found",
  VERSIONS_NOT_FOUND_DETAIL: "No versions found",
  SESSION_NOT_FOUND_DETAIL: "The requested session could not be found",
  DUEL_NOT_FOUND_DETAIL: "The requested duel could not be found",
  INTEGRATION_NOT_FOUND_DETAIL: "The requested integration could not be found",
  PROFILE_NOT_FOUND_DETAIL: "The requested profile could not be found",
  CLARIFICATION_NOT_FOUND_DETAIL: "Clarification not found",
  DATABASE_NOT_FOUND_DETAIL: "Database not found",

  // Operation messages
  VERSION_MISMATCH_DETAIL: "Version does not belong to this persona",
  CANNOT_DELETE_ACTIVE_VERSION_DETAIL: "Cannot delete the active version",
  SESSION_CREATE_FAILED_DETAIL: "Failed to create new session",
  PIPELINE_EXECUTION_FAILED_DETAIL: "Pipeline execution failed",
  OVERSEER_EXECUTION_FAILED_DETAIL: "Overseer execution failed",
  PROVIDER_AUTH_FAILED_DETAIL: "Provider authentication failed",
  CANNOT_EDIT_BUILTIN_DETAIL: "Cannot edit built-in profiles",
  CANNOT_DELETE_BUILTIN_DETAIL: "Cannot delete built-in profiles",

  // Leaderboard messages
  INVALID_CATEGORY_DETAIL: "Supported categories: fastest, cheapest, reliable, popular, quality",
  NO_DATA_AVAILABLE: "No data available for the selected time range",
  LEADERBOARD_FETCH_FAILED: "Failed to fetch leaderboard",
  LEADERBOARD_SUMMARY_FETCH_FAILED: "Failed to fetch leaderboard summary",
  TRENDING_MODELS_FETCH_FAILED: "Failed to fetch trending models",

  // Pipeline success messages
  PIPELINE_CREATED: "Pipeline created successfully",
  PIPELINE_UPDATED: "Pipeline updated (new version created)",
  PIPELINE_DEACTIVATED: "Pipeline deactivated",

  // Policy success messages
  POLICY_DELETED: "Policy deleted successfully",
  POLICY_ACTIVATED: "Policy activated successfully",
  POLICY_DEACTIVATED: "Policy deactivated successfully",
  POLICY_FETCH_FAILED: "Failed to fetch policies",
  POLICY_SINGLE_FETCH_FAILED: "Failed to fetch policy",
  POLICY_CREATE_FAILED_DETAIL: "Failed to create policy",
  POLICY_UPDATE_FAILED_DETAIL: "Failed to update policy",
  POLICY_DELETE_FAILED: "Failed to delete policy",
  POLICY_TEST_FAILED: "Failed to test policy",
  POLICY_ACTIVATE_FAILED: "Failed to activate policy",
  POLICY_DEACTIVATE_FAILED: "Failed to deactivate policy",

  // Pipeline error messages
  PIPELINE_FETCH_FAILED: "Failed to fetch pipelines",
  PIPELINE_SINGLE_FETCH_FAILED: "Failed to fetch pipeline",
  PIPELINE_VERSIONS_FETCH_FAILED: "Failed to fetch pipeline versions",
  PIPELINE_CREATE_FAILED_DETAIL: "Failed to create pipeline",
  PIPELINE_UPDATE_FAILED_DETAIL: "Failed to update pipeline",
  PIPELINE_ACTIVATE_FAILED: "Failed to activate pipeline",
  PIPELINE_DELETE_FAILED: "Failed to delete pipeline",
  PIPELINE_RUNS_FETCH_FAILED: "Failed to fetch pipeline runs",
  PIPELINE_EXECUTE_FAILED: "Failed to execute pipeline",

  // Session error messages
  SESSION_CREATE_FAILED: "Failed to create session",
  SESSION_OPEN_FAILED: "Failed to open session",
  SESSION_FETCH_FAILED: "Failed to fetch session",
  SESSIONS_FETCH_FAILED: "Failed to fetch sessions",
  ACTIVE_SESSIONS_FETCH_FAILED: "Failed to fetch active sessions",
  SESSION_RUNS_FETCH_FAILED: "Failed to fetch session runs",
  SESSION_SUMMARY_FETCH_FAILED: "Failed to fetch session summary",
  SESSION_STATUS_UPDATE_FAILED: "Failed to update session status",
  SESSION_KILL_FAILED: "Failed to kill session",
  SESSION_CONTEXT_FETCH_FAILED: "Failed to fetch session context",
  SESSION_EXPORT_FAILED: "Failed to export session",
  SESSIONS_BULK_DELETE_FAILED: "Failed to bulk delete sessions",

  // Eye rerun errors
  EYE_RERUN_FAILED: "Failed to rerun Eye",

  // Pipeline events errors
  PIPELINE_EVENTS_FETCH_FAILED: "Failed to fetch pipeline events",

  // Context errors
  CONTEXT_ADD_FAILED: "Failed to add context",
  CONTEXT_REMOVE_FAILED: "Failed to remove context",

  // Clarification errors
  CLARIFICATIONS_FETCH_FAILED: "Failed to fetch clarifications",
  CLARIFICATION_VALIDATION_FAILED: "Failed to validate clarification",

  // Intent confirmation errors
  INTENT_CONFIRMATIONS_FETCH_FAILED: "Failed to fetch intent confirmations",

  // Routing errors
  ROUTING_FETCH_FAILED: "Failed to fetch routing decision",

  // Session validation details
  VALIDATION_INVALID_STATUS: "Invalid status. Must be: active, completed, or failed",
  VALIDATION_INVALID_SOURCE: "Invalid source. Must be: user or eye",
  VALIDATION_INVALID_EXPORT_FORMAT: "Invalid format. Must be: json, md, or csv",
  VALIDATION_MISSING_CONTEXT_FIELDS: "Missing required fields: source, key, value",
  VALIDATION_BULK_DELETE_PARAMS: "Provide either sessionIds (array) or olderThan (ISO date string)",

  // Clarification validation messages
  VALIDATION_ANSWER_TOO_SHORT_REASON: "Answer too short",
  VALIDATION_ANSWER_TOO_SHORT_SUGGESTION: "Please provide more detail (at least 3 characters)",
  VALIDATION_CONTRADICTION_REASON: "Answer contradicts previous clarification",
  VALIDATION_CONTRADICTION_SUGGESTION: "Please review your previous answers for consistency",
  VALIDATION_INTENT_CONTRADICTION_REASON: "Answer contradicts stated intent",
  VALIDATION_INTENT_CONTRADICTION_BUILD_SUGGESTION: "Your answer seems to contradict your original intent to build something",

  // Session operation messages (not errors - descriptive only)
  SESSION_ALREADY_KILLED: "Session already killed",

  // Generic error fallback
  UNKNOWN_ERROR: "Unknown error",
} as const;

export type ApiErrorMessageKey = keyof typeof ApiErrorMessage;

/**
 * Helper functions for dynamic error messages
 */
export const formatPolicyNotFound = (policyId: string): string =>
  `Policy '${policyId}' not found`;

export const formatPipelineVersionActivated = (version: number): string =>
  `Pipeline version ${version} activated`;

export const formatErrorWithMessage = (
  baseMessage: string,
  errorMessage: string,
): string => `${baseMessage}: ${errorMessage}`;
