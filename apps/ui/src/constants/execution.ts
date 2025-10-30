/**
 * SSOT: Pipeline Execution Constants
 *
 * Centralized constants for pipeline execution status, colors, and configuration
 */

// Execution Status Values
export const EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
  AWAITING_INPUT: 'awaiting_input',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ExecutionStatus = typeof EXECUTION_STATUS[keyof typeof EXECUTION_STATUS];

// Node Execution Status (subset for node-level status)
export const NODE_STATUS = {
  PENDING: EXECUTION_STATUS.PENDING,
  RUNNING: EXECUTION_STATUS.RUNNING,
  SUCCESS: EXECUTION_STATUS.SUCCESS,
  ERROR: EXECUTION_STATUS.ERROR,
  AWAITING_INPUT: EXECUTION_STATUS.AWAITING_INPUT,
} as const;

export type NodeStatus = typeof NODE_STATUS[keyof typeof NODE_STATUS];

// Status Display Labels (human-readable)
export const EXECUTION_STATUS_LABELS = {
  [EXECUTION_STATUS.PENDING]: 'Pending',
  [EXECUTION_STATUS.RUNNING]: 'Running',
  [EXECUTION_STATUS.SUCCESS]: 'Success',
  [EXECUTION_STATUS.ERROR]: 'Error',
  [EXECUTION_STATUS.AWAITING_INPUT]: 'Awaiting Input',
  [EXECUTION_STATUS.PAUSED]: 'Paused',
  [EXECUTION_STATUS.COMPLETED]: 'Completed',
  [EXECUTION_STATUS.FAILED]: 'Failed',
} as const;

// Status Display Colors (Tailwind classes)
export const STATUS_COLORS = {
  [EXECUTION_STATUS.PENDING]: 'text-slate-400 bg-slate-500/10',
  [EXECUTION_STATUS.RUNNING]: 'text-blue-400 bg-blue-500/10',
  [EXECUTION_STATUS.SUCCESS]: 'text-green-400 bg-green-500/10',
  [EXECUTION_STATUS.ERROR]: 'text-red-400 bg-red-500/10',
  [EXECUTION_STATUS.AWAITING_INPUT]: 'text-yellow-400 bg-yellow-500/10',
  [EXECUTION_STATUS.PAUSED]: 'text-orange-400 bg-orange-500/10',
  [EXECUTION_STATUS.COMPLETED]: 'text-green-400 bg-green-500/10',
  [EXECUTION_STATUS.FAILED]: 'text-red-400 bg-red-500/10',
} as const;

// Node Status Gradient Styles (for CustomNode)
export const NODE_STATUS_GRADIENTS = {
  [NODE_STATUS.RUNNING]: 'bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-blue-400 shadow-blue-500/40 animate-pulse',
  [NODE_STATUS.SUCCESS]: 'bg-gradient-to-br from-green-500/30 to-green-600/20 border-green-400 shadow-green-500/40',
  [NODE_STATUS.ERROR]: 'bg-gradient-to-br from-red-500/30 to-red-600/20 border-red-400 shadow-red-500/40',
  [NODE_STATUS.AWAITING_INPUT]: 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 border-yellow-400 shadow-yellow-500/40',
} as const;

// API Endpoints
export const EXECUTION_API_ENDPOINTS = {
  EXECUTE: '/api/pipeline-execution/execute',
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
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
} as const;

// Content Types
export const CONTENT_TYPES = {
  JSON: 'application/json',
} as const;

// Response Keys
export const RESPONSE_KEYS = {
  OK: 'ok',
  DATA: 'data',
  ERROR: 'error',
  MESSAGE: 'message',
} as const;
