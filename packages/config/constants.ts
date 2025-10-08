/**
 * Third Eye MCP - Configuration Constants
 * All magic numbers and strings as typed constants
 */

import { REPLAY_SPEEDS, THEMES, PROVIDERS } from '@third-eye/types';

/**
 * API Configuration
 */
export const DEFAULT_API_URL = 'http://127.0.0.1:7070' as const;
export const DEFAULT_UI_URL = 'http://127.0.0.1:3300' as const;
export const DEFAULT_SERVER_PORT = 7070 as const;
export const DEFAULT_UI_PORT = 3300 as const;
export const DEFAULT_HOST = '127.0.0.1' as const;

/**
 * Database Configuration
 */
export const DEFAULT_DB_PATH = '~/.third-eye-mcp/mcp.db' as const;
export const DEFAULT_CONFIG_DIR = '~/.third-eye-mcp' as const;

/**
 * Provider Base URLs
 */
export const PROVIDER_BASE_URLS: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://127.0.0.1:11434',
  lmstudio: 'http://127.0.0.1:1234',
} as const;

/**
 * Timeouts (in milliseconds)
 */
export const REQUEST_TIMEOUT = 30000 as const; // 30 seconds
export const POLLING_INTERVAL = 3000 as const; // 3 seconds
export const DEBOUNCE_DELAY = 300 as const; // 300ms
export const TOAST_DURATION = 5000 as const; // 5 seconds

/**
 * Replay Configuration
 */
export const REPLAY_SPEEDS_CONFIG = {
  DEFAULT: 1,
  MIN: 0.5,
  MAX: 5,
  OPTIONS: REPLAY_SPEEDS,
} as const;

/**
 * Theme Configuration
 */
export const THEME_CONFIG = {
  DEFAULT: THEMES.THIRD_EYE,
  DARK_MODE_DEFAULT: true,
  AVAILABLE_THEMES: Object.values(THEMES),
} as const;

/**
 * Pagination
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  SMALL_PAGE_SIZE: 10,
} as const;

/**
 * Validation Limits
 */
export const VALIDATION_LIMITS = {
  MIN_PORT: 1024,
  MAX_PORT: 65535,
  MAX_PROMPT_LENGTH: 10000,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_NAME_LENGTH: 100,
  MIN_AMBIGUITY_THRESHOLD: 0,
  MAX_AMBIGUITY_THRESHOLD: 100,
  MIN_CITATION_CUTOFF: 0,
  MAX_CITATION_CUTOFF: 100,
  MIN_CONSISTENCY_TOLERANCE: 0,
  MAX_CONSISTENCY_TOLERANCE: 100,
} as const;

/**
 * File Size Limits
 */
export const FILE_SIZE_LIMITS = {
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_EXPORT_SIZE: 50 * 1024 * 1024, // 50MB
} as const;

/**
 * WebSocket Configuration
 */
export const WS_CONFIG = {
  RECONNECT_DELAY: 1000,
  MAX_RECONNECT_ATTEMPTS: 5,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
} as const;

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  MODEL_CACHE_TTL: 3600000, // 1 hour
  HEALTH_CHECK_INTERVAL: 60000, // 1 minute
  SESSION_CACHE_TTL: 300000, // 5 minutes
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Failed to connect to server. Please check if the server is running.',
  VALIDATION_ERROR: 'Please check the form for errors.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  TIMEOUT: 'Request timed out. Please try again.',
  RATE_LIMIT: 'Too many requests. Please wait and try again.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully',
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  EXPORTED: 'Export completed successfully',
  COPIED: 'Copied to clipboard',
} as const;

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  HEALTH: '/health',
  OVERSEER: '/overseer/run',
  SESSION: '/api/session',
  MODELS: '/api/models',
  ROUTING: '/api/routing',
  PERSONAS: '/api/personas',
  EYES: '/api/eyes',
  PIPELINES: '/api/pipelines',
  PROMPTS: '/api/prompts',
  STRICTNESS: '/api/strictness',
  PROVIDER_KEYS: '/api/provider-keys',
  APP_SETTINGS: '/api/app-settings',
  DATABASE: '/api/database',
  AUDIT: '/api/audit',
  METRICS: '/api/metrics',
  EXPORT: '/api/export',
} as const;

/**
 * Query Keys for React Query
 */
export const QUERY_KEYS = {
  HEALTH: ['health'],
  SESSIONS: ['sessions'],
  SESSION: (id: string) => ['session', id],
  MODELS: (provider: string) => ['models', provider],
  ROUTING: ['routing'],
  PERSONAS: ['personas'],
  PERSONA: (eye: string) => ['persona', eye],
  EYES: ['eyes'],
  EYE: (name: string) => ['eye', name],
  PIPELINES: ['pipelines'],
  PIPELINE: (id: string) => ['pipeline', id],
  PROMPTS: ['prompts'],
  PROMPT: (id: string) => ['prompt', id],
  STRICTNESS: ['strictness'],
  PROVIDER_KEYS: ['provider-keys'],
  APP_SETTINGS: ['app-settings'],
  METRICS: ['metrics'],
  AUDIT: ['audit'],
} as const;

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  THEME: 'third-eye:theme',
  DARK_MODE: 'third-eye:dark-mode',
  AUTO_OPEN: 'third-eye:auto-open',
  SELECTED_PROVIDER: 'third-eye:selected-provider',
  SIDEBAR_COLLAPSED: 'third-eye:sidebar-collapsed',
  LAST_SESSION: 'third-eye:last-session',
} as const;

/**
 * Built-in Strictness Profile IDs
 */
export const BUILT_IN_PROFILES = {
  CASUAL: 'casual',
  ENTERPRISE: 'enterprise',
  SECURITY: 'security',
} as const;

/**
 * Eye Display Names (for UI)
 */
export const EYE_DISPLAY_NAMES: Record<string, string> = {
  sharingan: 'Sharingan',
  prompt_helper: 'Prompt Helper',
  jogan: 'Jōgan',
  rinnegan_plan: 'Rinnegan (Plan)',
  rinnegan_review: 'Rinnegan (Review)',
  rinnegan_final: 'Rinnegan (Final)',
  mangekyo_scaffold: 'Mangekyō (Scaffold)',
  mangekyo_impl: 'Mangekyō (Implementation)',
  mangekyo_tests: 'Mangekyō (Tests)',
  mangekyo_docs: 'Mangekyō (Docs)',
  tenseigan: 'Tenseigan',
  byakugan: 'Byakugan',
  overseer: 'Overseer',
} as const;

/**
 * Eye Colors (for UI visualization)
 */
export const EYE_COLORS: Record<string, string> = {
  sharingan: '#ef4444', // red
  prompt_helper: '#8b5cf6', // purple
  jogan: '#06b6d4', // cyan
  rinnegan_plan: '#a855f7', // purple
  rinnegan_review: '#9333ea', // purple
  rinnegan_final: '#7c3aed', // violet
  mangekyo_scaffold: '#ec4899', // pink
  mangekyo_impl: '#f43f5e', // rose
  mangekyo_tests: '#fb7185', // rose
  mangekyo_docs: '#fda4af', // rose
  tenseigan: '#10b981', // green
  byakugan: '#f59e0b', // amber
  overseer: '#6366f1', // indigo
} as const;
