/**
 * Strict TypeScript interfaces for all API responses
 * R07 Compliance: No 'any' types, proper strict typing
 * R01 Compliance: SSOT for all API response types
 */

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

export interface SessionRun {
  id: string;
  sessionId: string;
  eye: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  latency: number;
  createdAt: string;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
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

export interface PersonaResponse {
  id: string;
  eye: string;
  version: number;
  content: string;
  active: boolean;
  createdAt: string;
}

export type ListPersonasResponse = PersonaResponse[];

export interface CreatePersonaResponse {
  id: string;
  eye: string;
  version: number;
  content: string;
  active: boolean;
  createdAt: string;
}

export interface GetActivePersonaResponse {
  id: string;
  eye: string;
  version: number;
  content: string;
  active: true;
  createdAt: string;
}

// ============================================================================
// ROUTING API RESPONSES
// ============================================================================

export interface RoutingConfigResponse {
  id: string;
  eye: string;
  primaryProvider: string;
  primaryModel: string;
  createdAt: string;
}

export type ListRoutingResponse = RoutingConfigResponse[];

export type CreateRoutingResponse = RoutingConfigResponse;

export type UpdateRoutingResponse = RoutingConfigResponse;

// ============================================================================
// STRICTNESS API RESPONSES
// ============================================================================

export interface StrictnessProfileResponse {
  id: string;
  name: string;
  sharinganMinScore: number;
  rinneganRequireTests: boolean;
  tenseiganMinConfidence: number;
  byakuganAllowPartial: boolean;
  mangekyoStrictness: "strict" | "moderate" | "lenient";
  joganRequireEvidence: boolean;
  overseerMinApprovals: number;
  custom: boolean;
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

export interface PipelineResponse {
  id: string;
  name: string;
  version: number;
  steps: string[];
  active: boolean;
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
  [key: string]: unknown;
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

export interface HealthCheckResponse {
  ok: boolean;
  status: "healthy" | "degraded" | "down";
  version?: string;
  uptime_seconds?: number;
  host?: string;
  bindAddress?: string;
  timestamp: string;
  checks?: {
    database?: { ok: boolean };
    providers?: { ok: boolean };
  };
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
