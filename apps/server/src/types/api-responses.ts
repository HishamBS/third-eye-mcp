/**
 * Strict TypeScript interfaces for all API responses
 * R07 Compliance: No 'any' types, proper strict typing
 * R01 Compliance: SSOT for all API response types
 */

import type { HealthResponse } from "@third-eye/types";

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
  eyeId: string;
  provider: string;
  model: string;
  inputMd: string;
  outputJson: Record<string, unknown> | null;
  tokensIn: number | null;
  tokensOut: number | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  eyeId: string | null;
  type: string;
  code: string | null;
  md: string | null;
  dataJson: Record<string, unknown> | null;
  nextAction: string | null;
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

export interface PersonaResponse {
  id: string;
  eyeId: string;
  name: string;
  version: number;
  metadataJson: Record<string, unknown>;
  mission: string;
  guidanceJson: Record<string, unknown> | null;
  envelopeJson: Record<string, unknown>;
  active: boolean;
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

export interface RoutingConfigResponse {
  id: string;
  eyeId: string;
  primaryProvider: string | null;
  primaryModel: string | null;
  fallbackProvider: string | null;
  fallbackModel: string | null;
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
  description: string | null;
  ambiguityThreshold: number;
  citationCutoff: number;
  consistencyTolerance: number;
  mangekyoStrictness: string;
  isBuiltIn: boolean;
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
  description: string;
  workflowJson: Record<string, unknown>;
  category: string;
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
