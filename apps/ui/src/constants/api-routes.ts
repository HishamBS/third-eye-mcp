/**
 * API Routes - SSOT for all API endpoints
 * Per R13: No magic strings
 * Per R01: Single source of truth
 */

export const API_ROUTES = {
  // Eyes (unified - no built-in vs custom distinction)
  EYES: "/api/eyes",
  EYES_ALL: "/api/eyes/all",
  EYES_BY_ID: (id: string) => `/api/eyes/${id}`,

  // Personas
  PERSONAS: "/api/personas",
  PERSONAS_BY_EYE: (eye: string) => `/api/personas/${eye}`,
  PERSONAS_ACTIVE: (eye: string) => `/api/personas/${eye}/active`,
  PERSONAS_ACTIVATE: (eye: string, version: number) =>
    `/api/personas/${eye}/activate/${version}`,

  // Pipelines
  PIPELINES: "/api/pipelines",
  PIPELINES_BY_ID: (id: string) => `/api/pipelines/${id}`,
  PIPELINES_EXECUTE: (id: string) => `/api/pipelines/${id}/execute`,
  PIPELINES_RUNS: (id: string) => `/api/pipelines/${id}/runs`,
  PIPELINES_VERSIONS: (name: string) => `/api/pipelines/name/${name}/versions`,

  // Sessions
  SESSION: "/api/session",
  SESSION_ACTIVE: "/api/session/active",
  SESSION_BY_ID: (id: string) => `/api/session/${id}`,
  SESSION_RUNS: (id: string) => `/api/session/${id}/runs`,
  SESSION_EVENTS: (id: string) => `/api/session/${id}/events`,
  SESSION_KILL: (id: string) => `/api/session/${id}/kill`,
  SESSION_CLARIFICATIONS: (id: string) => `/api/session/${id}/clarifications`,
  SESSION_INTENT_CONFIRMATIONS: (id: string) =>
    `/api/session/${id}/intent-confirmations`,
  SESSION_ROUTING: (id: string) => `/api/session/${id}/routing`,
  SESSION_PIPELINE_STATE: (id: string) => `/api/session/${id}/pipeline-state`,
  SESSION_CONTEXT: (id: string) => `/api/session/${id}/context`,
  SESSION_CLARIFICATION_VALIDATE: (
    sessionId: string,
    clarificationId: string,
  ) => `/api/session/${sessionId}/clarifications/${clarificationId}/validate`,

  // Intent Confirmations
  INTENT_CONFIRMATION_SUBMIT: (id: string) =>
    `/api/intent-confirmations/${id}/submit`,
  INTENT_CONFIRMATIONS_SESSION: (sessionId: string) =>
    `/api/intent-confirmations/session/${sessionId}`,

  // Conversation Events
  CONVERSATION_EVENTS: (sessionId: string) =>
    `/api/conversation-events/session/${sessionId}`,

  // Routing
  ROUTING: "/api/routing",
  ROUTING_BY_EYE: (eye: string) => `/api/routing/${eye}`,

  // Database
  DATABASE_TABLES: "/api/database/tables",

  // Integrations
  INTEGRATIONS: "/api/integrations",
  INTEGRATIONS_BY_ID: (id: string) => `/api/integrations/${id}`,
  INTEGRATIONS_CONFIG: (id: string) => `/api/integrations/${id}/config`,

  // Metrics
  METRICS: "/api/metrics",
  METRICS_LEADERBOARDS: "/api/metrics/leaderboards",
} as const;
