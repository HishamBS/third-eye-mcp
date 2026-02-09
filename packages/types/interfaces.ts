/**
 * Third Eye MCP - Interface Definitions
 * Shared TypeScript interfaces for API contracts
 *
 * SSOT: These interfaces reflect the database schema in packages/db/schema.ts.
 * Frontend and backend MUST import from here instead of defining local copies.
 */

import type {
  ProviderId,
  EyeName,
  StatusCode,
  SessionStatus,
  EventType,
  StrictnessLevel,
  ThemeName,
  ExportFormat,
  PromptCategory,
  PipelineCategory,
} from "./enums";

/**
 * Overseer JSON Envelope - Standard Eye response format
 */
export interface OverseerEnvelope {
  tag: EyeName | string;
  ok: boolean;
  code: StatusCode;
  md: string;
  data: Record<string, unknown>;
  next: string;
}

// ProviderConfig, CompletionRequest, CompletionResponse are exported from providers.ts (SSOT)
// Removed duplicate definitions to comply with R01 (SSOT & DRY)

/**
 * App-Level Model Information
 *
 * This represents a model as stored in the application (with provider association,
 * display name, and tracking metadata). For the provider-level model representation
 * (as returned by provider APIs), see ProviderModelInfo in providers.ts.
 */
export interface ModelInfo {
  provider: ProviderId;
  id: string;
  name: string;
  displayName: string;
  family?: string;
  contextWindow?: number;
  maxTokens?: number;
  supportsVision?: boolean;
  supportsJsonMode?: boolean;
  lastSeen: string;
}

/**
 * Session Configuration
 */
export interface SessionConfig {
  agentName?: string;
  displayName?: string;
  strictnessProfileId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Session - matches DB sessions table (8 columns)
 */
export interface Session {
  id: string;
  agentName: string | null;
  model: string | null;
  displayName: string | null;
  status: string;
  createdAt: Date | string;
  lastActivity: Date | string | null;
  configJson: SessionConfig | null;
}

/**
 * Eye Definition (Unified) - matches DB eyes table (12 columns)
 * All eyes use the same structure - no distinction between seeded and user-created
 * Database is single source of truth
 */
export interface Eye {
  id: string;
  slug: string;
  name: string;
  version: number;
  description: string;
  iconSvg: string | null;
  inputSchemaJson: Record<string, unknown>;
  outputSchemaJson: Record<string, unknown>;
  personaId: string | null;
  capabilityTags: string[];
  active: boolean;
  createdAt: Date | string;
}

/**
 * Eye Routing Configuration - matches DB eyes_routing table
 */
export interface EyeRouting {
  id: string;
  eyeId: string;
  primaryProvider: string | null;
  primaryModel: string | null;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  createdAt: Date | string;
}

/**
 * Persona - matches DB personas table (14 columns)
 */
export interface Persona {
  id: string;
  eyeId: string;
  name: string;
  version: number;
  metadataJson: Record<string, unknown>;
  mission: string;
  guidanceJson: Record<string, unknown> | null;
  validationJson: Record<string, unknown> | null;
  envelopeJson: Record<string, unknown>;
  remindersJson: string[];
  notes: string | null;
  llmConfigJson: Record<string, unknown>;
  active: boolean;
  createdAt: Date | string;
}

/**
 * Run - matches DB runs table
 */
export interface Run {
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
  createdAt: Date | string;
}

/**
 * Pipeline Event - matches DB pipeline_events table (9 columns)
 */
export interface PipelineEvent {
  id: string;
  sessionId: string;
  eyeId: string | null;
  type: string;
  code: string | null;
  md: string | null;
  dataJson: Record<string, unknown> | null;
  nextAction: string | null;
  createdAt: Date | string;
}

/**
 * Prompt Template
 * NOTE: No backing DB table yet. Defined for future prompt library feature.
 */
export interface PromptTemplate {
  id: string;
  name: string;
  version: number;
  content: string;
  variablesJson: string[] | null;
  category: PromptCategory;
  tags: string[] | null;
  active: boolean;
  createdAt: string;
}

/**
 * Strictness Profile - matches DB strictness_profiles table
 */
export interface StrictnessProfile {
  id: string;
  name: string;
  description: string | null;
  ambiguityThreshold: number;
  citationCutoff: number;
  consistencyTolerance: number;
  mangekyoStrictness: StrictnessLevel;
  isBuiltIn: boolean;
  createdAt: Date | string;
}

/**
 * Pipeline Workflow Structure - typed shape of Pipeline.workflowJson
 * Used by the UI pipeline builder for typed node/edge access
 */
export interface PipelineWorkflow {
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
}

/**
 * Pipeline Definition - matches DB pipelines table
 * workflowJson is stored as JSON; actual shape depends on pipeline type
 */
export interface Pipeline {
  id: string;
  name: string;
  version: number;
  description: string;
  workflowJson: Record<string, unknown>;
  category: string;
  active: boolean;
  createdAt: Date | string;
}

/**
 * Provider Key (encrypted storage) - matches DB provider_keys table
 */
export interface ProviderKey {
  id: string;
  provider: string;
  label: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date | string;
}

/**
 * Routing Decision Request Analysis
 * Sub-structure stored in routing_decisions.requestAnalysis JSON column
 */
export interface RoutingDecisionRequest {
  readonly requestType: string;
  readonly contentDomain: string;
  readonly complexity: string;
  readonly capabilitiesNeeded: readonly string[];
  readonly originalInput?: string;
}

/**
 * Routing Decision - matches DB routing_decisions table (7 columns)
 */
export interface RoutingDecision {
  id: string;
  sessionId: string;
  requestAnalysis: RoutingDecisionRequest;
  selectedEyes: readonly string[];
  reasoning: string;
  executionMode: "sequential" | "parallel";
  createdAt: Date | number;
}

/**
 * MCP Integration - matches DB mcp_integrations table (16 columns)
 */
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
  enabled: boolean | null;
  displayOrder: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Clarification - matches DB clarifications table (8 columns)
 */
export interface Clarification {
  id: string;
  sessionId: string;
  field: string;
  question: string;
  answer: string | null;
  status: string;
  createdAt: Date | string;
  answeredAt: Date | string | null;
}

/**
 * Conversation Event - matches DB conversation_events table (6 columns)
 */
export interface ConversationEvent {
  id: string;
  sessionId: string;
  eventType: string;
  speaker: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date | string;
}

/**
 * Health Check Response
 */
export interface HealthResponse {
  ok: boolean;
  version: string;
  uptimeSeconds: number;
  database: {
    ok: boolean;
    latencyMs: number;
  };
  providers: Record<
    ProviderId,
    {
      ok: boolean;
      details?: string;
    }
  >;
}

/**
 * App Settings
 */
export interface AppSettings {
  theme: ThemeName;
  darkMode: boolean;
  autoOpen: boolean;
  telemetry: boolean;
}

/**
 * Order Violation
 */
export interface OrderViolation {
  violation: string;
  expectedNext: EyeName[];
  fixInstructions: string;
}

/**
 * RFC7807 Problem JSON
 */
export interface ProblemJson {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

/**
 * Export Request
 */
export interface ExportRequest {
  sessionId: string;
  format: ExportFormat;
  includeEnvelopes?: boolean;
  includeMetadata?: boolean;
}

/**
 * Duel Mode Configuration
 */
export interface DuelConfig {
  sessionId: string;
  task: string;
  competitors: Array<{
    provider: ProviderId;
    model: string;
    label?: string;
  }>;
  judgeEye?: EyeName;
}

/**
 * Duel Result
 */
export interface DuelResult {
  sessionId: string;
  winner: {
    provider: ProviderId;
    model: string;
    score: number;
  };
  competitors: Array<{
    provider: ProviderId;
    model: string;
    score: number;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    verdict: string;
  }>;
  judgeReasoning: string;
}

/**
 * Metrics Summary
 */
export interface MetricsSummary {
  totalSessions: number;
  totalRuns: number;
  successRate: number;
  avgLatency: number;
  providerStats: Record<
    ProviderId,
    {
      runs: number;
      avgLatency: number;
      successRate: number;
    }
  >;
  eyeStats: Record<
    EyeName,
    {
      runs: number;
      approvalRate: number;
      avgLatency: number;
    }
  >;
}

/**
 * Standard API Envelope - wraps all API responses
 */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta: {
    requestId?: string;
    timestamp?: number;
    version?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}
