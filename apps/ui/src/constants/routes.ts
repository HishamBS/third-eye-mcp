/**
 * Page Routes - SSOT for all page paths
 * Per R13: No magic strings
 * Per R01: Single source of truth
 */

export const ROUTES = {
  HOME: '/',
  MONITOR: '/monitor',
  PLAYGROUND: (id: string) => `/playground/${id}`,
  SETTINGS: '/settings',
  EYES: '/eyes',
  PERSONAS: '/personas',
  MODELS: '/models',
  PIPELINES: '/pipelines',
  CONNECTIONS: '/connections',
  DATABASE: '/database',
  METRICS: '/metrics',
  AUDIT: '/audit',
  STRICTNESS: '/strictness',
} as const;

