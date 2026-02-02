/**
 * Session Constants - SSOT for all session-related values
 *
 * R13 Compliance: No magic strings in session management
 */

import { freezeTokens, tokenValues } from "./taxonomy";
import type { TokenLiteral } from "./taxonomy";

/**
 * Session Status Values
 */
export const SessionStatus = freezeTokens({
  ACTIVE: "active",
  COMPLETED: "completed",
  FAILED: "failed",
  KILLED: "killed",
} as const);

export type SessionStatus = TokenLiteral<typeof SessionStatus>;
export const ALL_SESSION_STATUSES = tokenValues(SessionStatus);

// Individual status constants for direct usage
export const SESSION_STATUS_ACTIVE = SessionStatus.ACTIVE;
export const SESSION_STATUS_COMPLETED = SessionStatus.COMPLETED;
export const SESSION_STATUS_FAILED = SessionStatus.FAILED;
export const SESSION_STATUS_KILLED = SessionStatus.KILLED;

// Validation array (subset for Zod schema)
export const VALID_SESSION_STATUSES = [
  SESSION_STATUS_ACTIVE,
  SESSION_STATUS_COMPLETED,
  SESSION_STATUS_FAILED,
] as const;

/**
 * Context Source Values
 */
export const ContextSource = freezeTokens({
  USER: "user",
  EYE: "eye",
} as const);

export type ContextSource = TokenLiteral<typeof ContextSource>;
export const ALL_CONTEXT_SOURCES = tokenValues(ContextSource);

export const CONTEXT_SOURCE_USER = ContextSource.USER;
export const CONTEXT_SOURCE_EYE = ContextSource.EYE;

export const VALID_CONTEXT_SOURCES = [
  CONTEXT_SOURCE_USER,
  CONTEXT_SOURCE_EYE,
] as const;

/**
 * Export Format Values
 */
export const ExportFormat = freezeTokens({
  JSON: "json",
  MARKDOWN: "md",
  CSV: "csv",
  HTML: "html",
  PDF: "pdf",
} as const);

export type ExportFormat = TokenLiteral<typeof ExportFormat>;
export const ALL_EXPORT_FORMATS = tokenValues(ExportFormat);

export const EXPORT_FORMAT_JSON = ExportFormat.JSON;
export const EXPORT_FORMAT_MD = ExportFormat.MARKDOWN;
export const EXPORT_FORMAT_CSV = ExportFormat.CSV;
export const EXPORT_FORMAT_HTML = ExportFormat.HTML;
export const EXPORT_FORMAT_PDF = ExportFormat.PDF;

export const VALID_EXPORT_FORMATS = [
  EXPORT_FORMAT_JSON,
  EXPORT_FORMAT_MD,
  EXPORT_FORMAT_CSV,
  EXPORT_FORMAT_HTML,
  EXPORT_FORMAT_PDF,
] as const;

/**
 * Default/Fallback Values
 */
export const DEFAULT_AGENT_NAME = "Unknown Agent";
export const DEFAULT_MODEL_NAME = "Unknown Model";
export const DEFAULT_EYE_NAME = "Unknown Eye";
export const DEFAULT_SYSTEM_ENTITY_NAME = "System";
export const DEFAULT_VERDICT_STATUS = "UNKNOWN";
export const DISPLAY_NOT_AVAILABLE = "N/A";

/**
 * Pagination Defaults
 */
export const DEFAULT_PAGINATION_LIMIT = 50;
export const DEFAULT_PAGINATION_OFFSET = 0;
export const DEFAULT_RUNS_PAGINATION_LIMIT = 100;
export const DEFAULT_EVENTS_PAGINATION_LIMIT = 500;

/**
 * Success Code Prefix
 */
export const SUCCESS_CODE_PREFIX = "OK_";

/**
 * Query Parameter Values
 */
export const QUERY_PARAM_TRUE_VALUE = "true";

/**
 * WebSocket Event Types
 */
export const WS_EVENT_SESSION_CREATED = "session_created";
export const WS_EVENT_SESSION_STATUS_UPDATED = "session_status_updated";
export const WS_EVENT_SESSION_KILLED = "session_killed";
export const WS_EVENT_EYE_RERUN = "eye_rerun";
export const WS_EVENT_CONTEXT_UPDATED = "context_updated";
export const WS_EVENT_CONTEXT_REMOVED = "context_removed";

/**
 * Console Logging Messages
 */
export const LOG_WS_BROADCAST_SKIPPED = "WebSocket broadcast skipped:";
export const LOG_SESSION_CREATE_FAILED = "Failed to create session:";
export const LOG_SESSION_OPEN_FAILED = "Failed to open session:";
export const LOG_BROWSER_OPEN_FAILED = "Failed to auto-open browser:";
export const LOG_ACTIVE_SESSIONS_FETCH_FAILED = "Failed to fetch active sessions:";
export const LOG_SESSIONS_FETCH_FAILED = "Failed to fetch sessions:";
export const LOG_SESSION_FETCH_FAILED = "Failed to fetch session:";
export const LOG_SESSION_RUNS_FETCH_FAILED = "Failed to fetch session runs:";
export const LOG_PIPELINE_EVENTS_FETCH_FAILED = "Failed to fetch pipeline events:";
export const LOG_SESSION_SUMMARY_FETCH_FAILED = "Failed to fetch session summary:";
export const LOG_SESSION_STATUS_UPDATE_FAILED = "Failed to update session status:";
export const LOG_SESSION_KILL_FAILED = "Failed to kill session:";
export const LOG_EYE_RERUN_FAILED = "Failed to rerun Eye:";
export const LOG_SESSION_CONTEXT_FETCH_FAILED = "Failed to fetch session context:";
export const LOG_CONTEXT_ADD_FAILED = "Failed to add context:";
export const LOG_CONTEXT_REMOVE_FAILED = "Failed to remove context:";
export const LOG_SESSION_EXPORT_FAILED = "Failed to export session:";
export const LOG_CLARIFICATION_VALIDATION_FAILED = "Failed to validate clarification:";
export const LOG_CLARIFICATIONS_FETCH_FAILED = "Failed to fetch clarifications:";
export const LOG_INTENT_CONFIRMATIONS_FETCH_FAILED = "Failed to fetch intent confirmations:";
export const LOG_ROUTING_FETCH_FAILED = "Failed to fetch routing decision:";
export const LOG_BULK_DELETE_FAILED = "Failed to bulk delete sessions:";

/**
 * CSV Export Constants
 */
export const CSV_EXPORT_HEADER = "eye,model,latency_ms,tokens_in,tokens_out,verdict,created_at\n";

/**
 * Validation Contradiction Keywords
 */
export const VALIDATION_AFFIRMATIVE_KEYWORD = "yes";
export const VALIDATION_NEGATIVE_KEYWORD = "no";
export const VALIDATION_INTENT_BUILD_KEYWORD = "build";
export const VALIDATION_INTENT_DELETE_KEYWORD = "delete";

/**
 * Helper Functions for Dynamic Messages
 */

/**
 * Format browser opened log message with emoji
 */
export const formatBrowserOpenedLog = (sessionId: string, portalUrl: string): string =>
  `🧿 Browser opened for session ${sessionId}: ${portalUrl}`;

/**
 * Format session killed log message with emoji
 */
export const formatSessionKilledLog = (
  sessionId: string,
  stoppedEyeCount: number,
  stoppedEyes: string[],
): string =>
  `🛑 Session ${sessionId} killed. Stopped ${stoppedEyeCount} Eyes: ${stoppedEyes.join(", ")}`;

/**
 * Format eye rerun log message with emoji
 */
export const formatEyeRerunLog = (eyeName: string, sessionId: string): string =>
  `🔄 Reran ${eyeName} for session ${sessionId}`;

/**
 * Format session delete failed log message
 */
export const formatSessionDeleteFailedLog = (sessionId: string): string =>
  `Failed to delete session ${sessionId}:`;

/**
 * Format session killed success message
 */
export const formatSessionKilledMessage = (stoppedEyeCount: number): string =>
  `Killed session and stopped ${stoppedEyeCount} Eye(s)`;

/**
 * Format sessions deleted success message
 */
export const formatSessionsDeletedMessage = (deletedCount: number): string =>
  `Deleted ${deletedCount} session(s) and associated data`;

/**
 * Build monitor portal URL
 */
export const buildMonitorPortalUrl = (
  host: string,
  port: number,
  sessionId: string,
): string =>
  `http://${host}:${port}/monitor?sessionId=${sessionId}`;

/**
 * Build session portal URL
 */
export const buildSessionPortalUrl = (
  host: string,
  port: number,
  sessionId: string,
): string =>
  `http://${host}:${port}/session/${sessionId}`;

/**
 * Format display name with version
 */
export const formatDisplayNameWithVersion = (
  displayBase: string,
  version: string,
): string =>
  `${displayBase} (${version})`;

/**
 * Format JSON export filename
 */
export const formatJsonExportFilename = (sessionId: string): string =>
  `attachment; filename="session-${sessionId}.json"`;

/**
 * Format Markdown export filename
 */
export const formatMarkdownExportFilename = (sessionId: string): string =>
  `attachment; filename="session-${sessionId}.md"`;

/**
 * Format CSV export filename
 */
export const formatCsvExportFilename = (sessionId: string): string =>
  `attachment; filename="session-${sessionId}.csv"`;

/**
 * Format Markdown session header
 */
export const formatMarkdownSessionHeader = (sessionId: string): string =>
  `# Session ${sessionId}\n\n`;

/**
 * Format Markdown event title with fallback for system events
 */
export const formatMarkdownEventTitle = (
  eyeName: string | null,
  eventCode: string,
): string =>
  `### ${eyeName || DEFAULT_SYSTEM_ENTITY_NAME} - ${eventCode}\n`;

/**
 * Format Markdown run summary header
 */
export const formatMarkdownRunHeader = (eyeName: string | null): string =>
  `### ${eyeName || DEFAULT_EYE_NAME}\n`;

/**
 * Format CSV row for export
 */
export const formatCsvRow = (
  eyeName: string | null,
  model: string | null,
  latencyMs: number | null,
  tokensIn: number | null,
  tokensOut: number | null,
  verdict: string,
  createdAt: Date,
): string =>
  `${eyeName || "Unknown"},${model || DISPLAY_NOT_AVAILABLE},${latencyMs || 0},${tokensIn || 0},${tokensOut || 0},${verdict},${new Date(createdAt).toISOString()}\n`;

/**
 * Format missing field validation detail
 */
export const formatMissingFieldDetail = (fieldName: string): string =>
  `Missing required field: ${fieldName}`;

/**
 * Format missing fields validation detail
 */
export const formatMissingFieldsDetail = (fields: string[]): string =>
  `Missing required fields: ${fields.join(", ")}`;

/**
 * Format valid options validation detail
 */
export const formatValidOptionsDetail = (
  fieldName: string,
  options: string[],
): string =>
  `Invalid ${fieldName}. Must be: ${options.join(", ")}`;

/**
 * Format answer too short suggestion
 */
export const formatAnswerTooShortSuggestion = (minLength: number): string =>
  `Please provide more detail (at least ${minLength} characters)`;
