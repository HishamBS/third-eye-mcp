/**
 * TypeScript Interfaces for Third Eye MCP API Responses
 *
 * SSOT: Entity types are re-exported from @third-eye/types (packages/types/interfaces.ts).
 * This file adds API-specific response envelope types.
 *
 * IMPORTANT: Do NOT define entity interfaces here. Import from @third-eye/types.
 */

// Re-export entity types from SSOT (packages/types/interfaces.ts)
export type {
  Session,
  Eye,
  EyeRouting,
  Persona,
  Run,
  PipelineEvent,
  Pipeline,
  McpIntegration,
  Clarification,
  RoutingDecision,
  RoutingDecisionRequest,
  ConversationEvent,
  ApiEnvelope,
} from "@third-eye/types";

import type {
  Session,
  Run,
  PipelineEvent,
  EyeRouting,
  Pipeline,
  Persona,
  Eye,
  McpIntegration,
  ApiEnvelope,
} from "@third-eye/types";

// ============================================================================
// API ERROR
// ============================================================================

export interface ApiError {
  title: string;
  status: number;
  detail: string;
  type?: string;
  instance?: string;
}

// ============================================================================
// SESSION RESPONSES
// ============================================================================

export interface SessionWithStats extends Session {
  eventCount?: number;
}

// POST /api/session - Create session
export type CreateSessionResponse = ApiEnvelope<{
  sessionId: string;
  portalUrl: string;
  session: Session;
}>;

// GET /api/session - Get all sessions
export type GetAllSessionsResponse = ApiEnvelope<{
  sessions: Session[];
  stats: {
    totalSessions: number;
    totalRuns: number;
    successRate: number;
    avgLatency: number;
  } | null;
  limit: number;
  offset: number;
}>;

// GET /api/session/active - Get active sessions
export type GetActiveSessionsResponse = ApiEnvelope<{
  sessions: SessionWithStats[];
  total: number;
}>;

// GET /api/session/:id - Get specific session
export type GetSessionResponse = ApiEnvelope<{
  session: Session;
}>;

// GET /api/session/:id/runs - Get session runs
export type GetSessionRunsResponse = ApiEnvelope<{
  sessionId: string;
  runs: Run[];
  limit: number;
  offset: number;
  total: number;
}>;

// GET /api/session/:id/events - Get pipeline events
export type GetSessionEventsResponse = ApiEnvelope<PipelineEvent[]>;

// ============================================================================
// ROUTING RESPONSES
// ============================================================================

// GET /api/routing - Get all routing configs
export type GetAllRoutingsResponse = ApiEnvelope<{
  routings: EyeRouting[];
}>;

// GET /api/routing/:eye - Get specific eye routing
export type GetRoutingResponse = ApiEnvelope<{
  routing: EyeRouting;
}>;

// POST /api/routing - Create/update routing
export type CreateRoutingResponse = ApiEnvelope<{
  routing: EyeRouting;
}>;

// ============================================================================
// PIPELINE RESPONSES
// ============================================================================

export interface PipelineRunStatus {
  id: string;
  pipelineId: string;
  sessionId: string;
  status: "pending" | "running" | "completed" | "failed";
  currentStep: number;
  stateJson: Record<string, unknown>;
  createdAt: string | Date;
  completedAt?: string | Date;
}

// GET /api/pipelines - Get all pipelines
export type GetAllPipelinesResponse = ApiEnvelope<{
  pipelines: Pipeline[];
}>;

// GET /api/pipelines/:id - Get specific pipeline
export type GetPipelineResponse = ApiEnvelope<{
  pipeline: Pipeline;
}>;

// GET /api/pipelines/name/:name/versions - Get pipeline versions
export type GetPipelineVersionsResponse = ApiEnvelope<{
  versions: Pipeline[];
}>;

// POST /api/pipelines/:id/execute - Execute pipeline
export type ExecutePipelineResponse = ApiEnvelope<{
  runId: string;
  pipelineId: string;
  sessionId: string;
  workflow: unknown;
  status: string;
  message: string;
}>;

// GET /api/pipelines/:id/runs - Get pipeline runs
export type GetPipelineRunsResponse = ApiEnvelope<{
  runs: PipelineRunStatus[];
}>;

// ============================================================================
// DATABASE RESPONSES
// ============================================================================

export interface TableSchema {
  name: string;
  type: string;
  primary?: boolean;
  autoIncrement?: boolean;
  hidden?: boolean;
}

export interface TableInfo {
  name: string;
  data: Record<string, unknown>[];
  editable: boolean;
  schema: TableSchema[];
}

// GET /api/database/tables - Get all tables
export type GetDatabaseTablesResponse = ApiEnvelope<{
  tables: Record<string, TableInfo>;
}>;

// ============================================================================
// INTEGRATION RESPONSES
// ============================================================================

// GET /api/integrations - Get all integrations
export type GetIntegrationsResponse = ApiEnvelope<{
  integrations: McpIntegration[];
}>;

// GET /api/integrations/:id - Get single integration
export type GetIntegrationResponse = ApiEnvelope<{
  integration: McpIntegration;
}>;

// GET /api/integrations/:id/config - Get rendered config
export type GetIntegrationConfigResponse = ApiEnvelope<{
  config: string;
  configType: string;
  configFiles: string[];
  paths: Record<string, string>;
}>;

// ============================================================================
// PERSONA RESPONSES
// ============================================================================

// GET /api/personas - Get all personas (flat array)
export type GetAllPersonasResponse = ApiEnvelope<Persona[]>;

// GET /api/personas/:eye - Get personas for specific eye
export type GetEyePersonasResponse = ApiEnvelope<{
  eye: string;
  versions: Persona[];
  activeVersion: number | null;
  defaultTemplate?: string;
}>;

// GET /api/personas/:eye/active - Get active persona
export type GetActivePersonaResponse = ApiEnvelope<Persona>;

// POST /api/personas/:eye - Create new persona version
export type CreatePersonaResponse = ApiEnvelope<{
  success: boolean;
  message: string;
  persona: Persona;
}>;

// PATCH /api/personas/:eye/activate/:version - Activate persona version
export type ActivatePersonaResponse = ApiEnvelope<{
  success: boolean;
  message: string;
  persona: Persona;
}>;

// ============================================================================
// EYE RESPONSES (Custom Eyes Management)
// ============================================================================

// GET /api/eyes/all - Get all eyes
export type GetAllEyesResponse = ApiEnvelope<Eye[]>;

// ============================================================================
// METRICS RESPONSES
// ============================================================================

export interface Metrics {
  totalSessions: number;
  totalRuns: number;
  totalCalls: number;
  approvalRate: number;
  avgLatency: number;
  topEyes: Array<{ eye: string; count: number }>;
  topProviders: Array<{ provider: string; count: number }>;
}

export type GetMetricsResponse = Metrics;

// ============================================================================
// LEADERBOARD RESPONSES
// ============================================================================

export interface LeaderboardEntry {
  name: string;
  count: number;
  avgLatency?: number;
  successRate?: number;
}

export interface Leaderboards {
  providers: LeaderboardEntry[];
  models: LeaderboardEntry[];
  eyes: LeaderboardEntry[];
}

export type GetLeaderboardsResponse = Leaderboards;
