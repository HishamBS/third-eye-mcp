/**
 * Third Eye MCP - Type Definitions and Enums
 * Centralized type-safe constants to replace string literals
 */

import { StatusCodes } from './envelope';

/**
 * Provider IDs - Supported LLM providers
 */
export const PROVIDERS = ['groq', 'openrouter', 'ollama', 'lmstudio'] as const;
export type ProviderId = typeof PROVIDERS[number];

/**
 * Eye Names - All Eyes in the pipeline
 */
export const EYES = [
  'sharingan',
  'prompt_helper',
  'jogan',
  'rinnegan_plan',
  'rinnegan_review',
  'rinnegan_final',
  'mangekyo_scaffold',
  'mangekyo_impl',
  'mangekyo_tests',
  'mangekyo_docs',
  'tenseigan',
  'byakugan',
  'overseer',
] as const;
export type EyeName = typeof EYES[number];

/**
 * Eye Status Codes - Standardized response codes
 */
export const STATUS_CODES = StatusCodes;
export type StatusCode = typeof STATUS_CODES[keyof typeof STATUS_CODES];

/**
 * Session Status - Pipeline execution state
 */
export const SESSION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  AWAITING_INPUT: 'awaiting_input',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;
export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];

/**
 * Pipeline Event Types - WebSocket event categories
 */
export const EVENT_TYPES = {
  EYE_START: 'eye_start',
  EYE_COMPLETE: 'eye_complete',
  EYE_ERROR: 'eye_error',
  USER_INPUT_REQUEST: 'user_input_request',
  USER_INPUT_RECEIVED: 'user_input_received',
  ROUTING_CHANGE: 'routing_change',
  PERSONA_CHANGE: 'persona_change',
  SESSION_COMPLETE: 'session_complete',
  SESSION_ERROR: 'session_error',
} as const;
export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

/**
 * Strictness Levels - Mangekyō validation modes
 */
export const STRICTNESS_LEVELS = {
  LENIENT: 'lenient',
  STANDARD: 'standard',
  STRICT: 'strict',
} as const;
export type StrictnessLevel = typeof STRICTNESS_LEVELS[keyof typeof STRICTNESS_LEVELS];

/**
 * Theme Names - UI themes
 */
export const THEMES = {
  THIRD_EYE: 'third-eye',
  MIDNIGHT: 'midnight',
  OCEAN: 'ocean',
  FOREST: 'forest',
  SUNSET: 'sunset',
  MONOCHROME: 'monochrome',
  OVERSEER: 'overseer', // Legacy compatibility
} as const;
export type ThemeName = typeof THEMES[keyof typeof THEMES];

/**
 * Replay Speeds - Timeline playback speeds
 */
export const REPLAY_SPEEDS = [0.5, 1, 1.5, 2, 5] as const;
export type ReplaySpeed = typeof REPLAY_SPEEDS[number];

/**
 * Export Formats - Session export formats
 */
export const EXPORT_FORMATS = {
  PDF: 'pdf',
  HTML: 'html',
  JSON: 'json',
  MARKDOWN: 'markdown',
} as const;
export type ExportFormat = typeof EXPORT_FORMATS[keyof typeof EXPORT_FORMATS];

/**
 * Prompt Categories - Prompt library categories
 */
export const PROMPT_CATEGORIES = {
  GENERAL: 'general',
  EYE: 'eye',
  TEMPLATE: 'template',
  CUSTOM: 'custom',
} as const;
export type PromptCategory = typeof PROMPT_CATEGORIES[keyof typeof PROMPT_CATEGORIES];

/**
 * Pipeline Categories - Pipeline types
 */
export const PIPELINE_CATEGORIES = {
  BUILT_IN: 'built-in',
  CUSTOM: 'custom',
  CODE: 'code',
  TEXT: 'text',
} as const;
export type PipelineCategory = typeof PIPELINE_CATEGORIES[keyof typeof PIPELINE_CATEGORIES];

/**
 * Helper functions for type checking
 */
export const isProvider = (value: string): value is ProviderId => {
  return PROVIDERS.includes(value as ProviderId);
};

export const isEye = (value: string): value is EyeName => {
  return EYES.includes(value as EyeName);
};

export const isStatusCode = (value: string): value is StatusCode => {
  return Object.values(STATUS_CODES).includes(value as StatusCode);
};

export const isSessionStatus = (value: string): value is SessionStatus => {
  return Object.values(SESSION_STATUS).includes(value as SessionStatus);
};
