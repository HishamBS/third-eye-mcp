/**
 * Strict TypeScript interfaces for all API responses
 * R07 Compliance: No 'any' types, proper strict typing
 * R01 Compliance: SSOT for all API response types
 *
 * NOTE: These are HTTP API response shapes, NOT the canonical entity types.
 * Base entity types (Session, Run, Eye, Persona, Pipeline, etc.) live in
 * @third-eye/types (packages/types/interfaces.ts). The types here are
 * serialized response variants (e.g., Date -> string) and API-specific
 * wrappers/summaries that extend or reshape the base types for HTTP transport.
 */

import type {
  HealthResponse,
  Session,
  Run,
  PipelineEvent,
  Persona,
  EyeRouting,
  StrictnessProfile,
  Pipeline,
} from "@third-eye/types";

// ============================================================================
// SESSION API RESPONSES
// ============================================================================

export interface CreateSessionResponse {
  sessionId: string;
  portalUrl: string;
  session: {
    id: string;
    status: string;
    createdAt: string;
    configJson?: Record<string, unknown>;
  };
}

export interface ListSessionsResponse {
  sessions: Array<{
    id: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
  }>;
}

/**
 * Serialized Session for single-session HTTP responses.
 * Subset of Session from @third-eye/types for API transport.
 */
export interface GetSessionResponse {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  configJson?: Record<string, unknown>;
}

export interface UpdateSessionStatusResponse {
  id: string;
  status: string;
  updatedAt: string;
}

export interface SessionSummaryResponse {
  sessionId: string;
  status: string;
  eventCount: number;
  eyes: {
    [eyeName: string]: {
      runCount: number;
      avgLatency: number;
    };
  };
  createdAt: string;
  duration?: number;
}

/**
 * Serialized Run for HTTP responses. Mirrors Run from @third-eye/types
 * with Date fields serialized to string for JSON transport.
 */
export interface SessionRun extends Omit<Run, "createdAt"> {
  createdAt: string;
}

/**
 * Serialized PipelineEvent for HTTP responses. Mirrors PipelineEvent from
 * @third-eye/types with Date fields serialized to string for JSON transport.
 */
export interface SessionEvent extends Omit<PipelineEvent, "createdAt"> {
  createdAt: string;
}

export interface SessionExportResponse {
  session: GetSessionResponse;
  runs: SessionRun[];
  events: SessionEvent[];
  exportedAt: string;
}

export interface GetSessionRunsResponse {
  sessionId: string;
  runs: SessionRun[];
  limit: number;
  offset: number;
}

export interface SessionContextResponse {
  sessionId: string;
  context: Record<string, unknown>;
}

export interface ClarificationValidationResponse {
  valid: boolean;
  clarificationId: string;
  reason?: string;
}

export interface KillSessionResponse {
  id: string;
  status: "killed";
  stoppedEyes: string[];
  killedAt: string;
}

// ============================================================================
// PERSONAS API RESPONSES
// ============================================================================

/**
 * Serialized Persona for HTTP responses. Subset of Persona from @third-eye/types
 * with Date fields serialized to string and optional fields omitted.
 */
export interface PersonaResponse extends Omit<
  Persona,
  "validationJson" | "remindersJson" | "notes" | "llmConfigJson" | "createdAt"
> {
  createdAt: string;
}

export type ListPersonasResponse = PersonaResponse[];

export type CreatePersonaResponse = PersonaResponse;

export interface GetActivePersonaResponse extends PersonaResponse {
  active: true;
}

// ============================================================================
// ROUTING API RESPONSES
// ============================================================================

/**
 * Serialized EyeRouting for HTTP responses. Mirrors EyeRouting from
 * @third-eye/types with Date fields serialized to string.
 */
export interface RoutingConfigResponse extends Omit<EyeRouting, "createdAt"> {
  createdAt: string;
}

export type ListRoutingResponse = RoutingConfigResponse[];

export type CreateRoutingResponse = RoutingConfigResponse;

export type UpdateRoutingResponse = RoutingConfigResponse;

// ============================================================================
// STRICTNESS API RESPONSES
// ============================================================================

/**
 * Serialized StrictnessProfile for HTTP responses. Mirrors StrictnessProfile from
 * @third-eye/types with Date fields serialized to string and mangekyoStrictness
 * widened to string for transport.
 */
export interface StrictnessProfileResponse extends Omit<
  StrictnessProfile,
  "mangekyoStrictness" | "createdAt"
> {
  mangekyoStrictness: string;
  createdAt: string;
}

export type ListStrictnessProfilesResponse = StrictnessProfileResponse[];

export type CreateStrictnessProfileResponse = StrictnessProfileResponse;

// ============================================================================
// MODELS API RESPONSES
// ============================================================================

export interface CachedModel {
  id: string;
  provider: string;
  model: string;
  displayName?: string;
  family?: string;
  lastSeen: string;
}

export interface ListCachedModelsResponse {
  models: CachedModel[];
}

export interface ProviderModel {
  name: string;
  family?: string;
  capability?: {
    ctx?: number;
    vision?: boolean;
    jsonMode?: boolean;
  };
}

export type ListProviderModelsResponse = ProviderModel[];

// ============================================================================
// PIPELINES API RESPONSES
// ============================================================================

/**
 * Serialized Pipeline for HTTP responses. Mirrors Pipeline from
 * @third-eye/types with Date fields serialized to string.
 */
export interface PipelineResponse extends Omit<Pipeline, "createdAt"> {
  createdAt: string;
}

export type ListPipelinesResponse = PipelineResponse[];

export type CreatePipelineResponse = PipelineResponse;

// ============================================================================
// MCP API RESPONSES
// ============================================================================

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  version: string;
}

export interface McpToolsResponse {
  tools: McpTool[];
}

export interface McpQuickstartResponse {
  quickstart: {
    workflows: Record<string, unknown>;
    routing: Record<string, unknown>;
    primers: Record<string, unknown>;
  };
}

export interface McpSchemasResponse {
  envelope: {
    type: string;
    required: string[];
    properties?: Record<string, unknown>;
  };
  errorCodes: {
    success: string[];
    rejection: string[];
    clarification: string[];
    error: string[];
  };
}

export interface McpExampleOutput {
  eye: string;
  verdict: string;
  metadata?: Record<string, unknown>;
}

export interface McpExample {
  input: Record<string, unknown>;
  output: McpExampleOutput;
}

export interface McpExamplesResponse {
  eye: string;
  examples: McpExample[];
}

export interface McpHealthResponse {
  ok: boolean;
  service: string;
  timestamp: string;
}

// ============================================================================
// HEALTH API RESPONSES
// ============================================================================

export interface HealthCheckResponse extends HealthResponse {
  status: "healthy" | "degraded" | "down";
  host?: string;
  bindAddress?: string;
  timestamp: string;
  error?: string;
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, unknown>;
}
