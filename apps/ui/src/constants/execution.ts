/**
 * SSOT: Pipeline Execution Constants
 *
 * Centralized constants for pipeline execution status, colors, and configuration
 */

// Execution Status Values
export const EXECUTION_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  ERROR: "error",
  AWAITING_INPUT: "awaiting_input",
  PAUSED: "paused",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ExecutionStatus =
  (typeof EXECUTION_STATUS)[keyof typeof EXECUTION_STATUS];

// Node Execution Status (subset for node-level status)
export const NODE_STATUS = {
  PENDING: EXECUTION_STATUS.PENDING,
  RUNNING: EXECUTION_STATUS.RUNNING,
  SUCCESS: EXECUTION_STATUS.SUCCESS,
  ERROR: EXECUTION_STATUS.ERROR,
  AWAITING_INPUT: EXECUTION_STATUS.AWAITING_INPUT,
} as const;

export type NodeStatus = (typeof NODE_STATUS)[keyof typeof NODE_STATUS];

// Status Display Labels (human-readable)
export const EXECUTION_STATUS_LABELS = {
  [EXECUTION_STATUS.PENDING]: "Pending",
  [EXECUTION_STATUS.RUNNING]: "Running",
  [EXECUTION_STATUS.SUCCESS]: "Success",
  [EXECUTION_STATUS.ERROR]: "Error",
  [EXECUTION_STATUS.AWAITING_INPUT]: "Awaiting Input",
  [EXECUTION_STATUS.PAUSED]: "Paused",
  [EXECUTION_STATUS.COMPLETED]: "Completed",
  [EXECUTION_STATUS.FAILED]: "Failed",
} as const;

// Status Display Colors (Tailwind classes)
// Uses semantic color tokens from @/constants/color-mappings (SSOT)
export const STATUS_COLORS = {
  [EXECUTION_STATUS.PENDING]: "text-semantic-muted bg-brand-outline/10",
  [EXECUTION_STATUS.RUNNING]: "text-semantic-info bg-semantic-info/10",
  [EXECUTION_STATUS.SUCCESS]: "text-semantic-success bg-semantic-success/10",
  [EXECUTION_STATUS.ERROR]: "text-semantic-error bg-semantic-error/10",
  [EXECUTION_STATUS.AWAITING_INPUT]:
    "text-semantic-warning bg-semantic-warning/10",
  [EXECUTION_STATUS.PAUSED]: "text-semantic-warning bg-semantic-warning/10",
  [EXECUTION_STATUS.COMPLETED]: "text-semantic-success bg-semantic-success/10",
  [EXECUTION_STATUS.FAILED]: "text-semantic-error bg-semantic-error/10",
} as const;

// Node Status Gradient Styles (for CustomNode)
// Uses semantic color tokens from theme system (SSOT)
export const NODE_STATUS_GRADIENTS = {
  [NODE_STATUS.RUNNING]:
    "bg-gradient-to-br from-semantic-info/30 to-semantic-info/20 border-semantic-info shadow-semantic-info/40 animate-pulse",
  [NODE_STATUS.SUCCESS]:
    "bg-gradient-to-br from-semantic-success/30 to-semantic-success/20 border-semantic-success shadow-semantic-success/40",
  [NODE_STATUS.ERROR]:
    "bg-gradient-to-br from-semantic-error/30 to-semantic-error/20 border-semantic-error shadow-semantic-error/40",
  [NODE_STATUS.AWAITING_INPUT]:
    "bg-gradient-to-br from-semantic-warning/30 to-semantic-warning/20 border-semantic-warning shadow-semantic-warning/40",
} as const;

// API Endpoints
export const EXECUTION_API_ENDPOINTS = {
  EXECUTE: "/api/pipeline-execution/execute",
  PAUSE: (runId: string) => `/api/pipeline-execution/pause/${runId}`,
  RESUME: (runId: string) => `/api/pipeline-execution/resume/${runId}`,
  STATUS: (runId: string) => `/api/pipeline-execution/status/${runId}`,
} as const;

// Polling Configuration
export const EXECUTION_POLLING_CONFIG = {
  INTERVAL_MS: 2000,
  TIMEOUT_MS: 30000,
} as const;

// HTTP Methods
export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
} as const;

// Content Types
export const CONTENT_TYPES = {
  JSON: "application/json",
} as const;

// Response Keys
export const RESPONSE_KEYS = {
  OK: "ok",
  DATA: "data",
  ERROR: "error",
  MESSAGE: "message",
} as const;
