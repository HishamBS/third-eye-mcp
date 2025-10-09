/**
 * TypeScript Interfaces for Third Eye MCP API Responses
 *
 * These interfaces match the exact backend response structures.
 * All endpoints use the Overseer Envelope format:
 * {
 *   success: boolean,
 *   data: T,
 *   meta: { requestId, timestamp }
 * }
 *
 * IMPORTANT: Frontend MUST match backend exactly (Architectural Principle from FINAL_OVERSEER_VISION.md)
 * - NO defensive transformations (|| [], || {}, .data?.x)
 * - Trust backend structure
 * - Throw clear errors if structure doesn't match
 */

// ============================================================================
// BASE ENVELOPE
// ============================================================================

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta: {
    requestId?: string;
    timestamp?: string;
  };
}

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

export interface Session {
  id: string;
  agentName: string;
  model: string | null;
  displayName: string;
  createdAt: Date | string;
  status: 'active' | 'completed' | 'failed' | 'killed';
  configJson: any;
}

export interface SessionWithStats extends Session {
  eventCount?: number;
  lastActivity?: Date | string;
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
export interface Run {
  id: string;
  sessionId: string;
  eye: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  createdAt: Date | string;
  outputJson: any;
}

export type GetSessionRunsResponse = ApiEnvelope<{
  sessionId: string;
  runs: Run[];
  limit: number;
  offset: number;
  total: number;
}>;

// GET /api/session/:id/events - Get pipeline events
export interface PipelineEvent {
  id: string;
  sessionId: string;
  eye: string | null;
  code: string;
  md: string | null;
  createdAt: Date | string;
}

export type GetSessionEventsResponse = ApiEnvelope<PipelineEvent[]>;

// ============================================================================
// ROUTING RESPONSES
// ============================================================================

export interface EyeRouting {
  eye: string;
  primaryProvider: string;
  primaryModel: string;
  fallbackProvider: string | null;
  fallbackModel: string | null;
}

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

export interface Pipeline {
  id: string;
  name: string;
  version: number;
  description: string;
  workflowJson: {
    steps: Array<{
      id: string;
      eye?: string;
      type?: string;
      next?: string;
      condition?: string;
      true?: string;
      false?: string;
      prompt?: string;
    }>;
  };
  category: string;
  active: boolean;
  createdAt: string | Date;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  sessionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
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
  workflow: any;
  status: string;
  message: string;
}>;

// GET /api/pipelines/:id/runs - Get pipeline runs
export type GetPipelineRunsResponse = ApiEnvelope<{
  runs: PipelineRun[];
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
  data: Record<string, any>[];
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

export interface McpIntegration {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  status: string;
  platforms: string[];
  configType: string;
  configFiles: string[];
  configTemplate: string;
  setupSteps: string[];
  docsUrl: string | null;
  enabled: boolean;
  displayOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

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

export interface Persona {
  eye: string;
  version: number;
  content: string;
  active: boolean;
  createdAt: string | Date;
}

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

export interface Eye {
  id: string;
  name: string;
  version: string;
  description: string;
  source: 'built-in' | 'custom';
  personaTemplate?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  defaultRouting?: Record<string, unknown>;
  createdAt?: string | Date;
  personaId?: string | null;
}

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

export type GetMetricsResponse = Metrics; // Note: /api/metrics is a Next.js API route (not wrapped in envelope)

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

export type GetLeaderboardsResponse = Leaderboards; // Note: /api/metrics/leaderboards is a Next.js API route (not wrapped in envelope)
