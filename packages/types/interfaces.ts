/**
 * Third Eye MCP - Interface Definitions
 * Shared TypeScript interfaces for API contracts
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

/**
 * Provider Configuration
 */
export interface ProviderConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Model Information
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
 * Completion Request
 */
export interface CompletionRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

// CompletionResponse is now exported from providers.ts (SSOT)
// Removed duplicate definition to comply with R01 (SSOT & DRY)

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
 * Session
 */
export interface Session {
  id: string;
  createdAt: string;
  status: SessionStatus;
  configJson: SessionConfig;
}

/**
 * Pipeline Run
 */
export interface PipelineRun {
  id: string;
  sessionId: string;
  eye: EyeName;
  provider: ProviderId;
  model: string;
  inputMd: string;
  outputJson: OverseerEnvelope;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  createdAt: string;
}

/**
 * Pipeline Event (WebSocket)
 */
export interface PipelineEvent {
  id: string;
  sessionId: string;
  type: EventType;
  eye?: EyeName;
  code?: StatusCode;
  md?: string;
  dataJson?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Eye Routing Configuration
 */
export interface EyeRouting {
  eye: EyeName;
  primaryProvider: ProviderId;
  primaryModel: string;
}

/**
 * Persona Version
 */
export interface Persona {
  eye: EyeName;
  version: number;
  content: string;
  active: boolean;
  createdAt: string;
}

/**
 * Prompt Template
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
 * Strictness Profile
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
  createdAt: string;
}

/**
 * Eye Definition (Unified)
 * All eyes use the same structure - no distinction between seeded and user-created
 * Database is single source of truth
 */
export interface Eye {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  personaTemplate?: string;
  defaultRouting?: EyeRouting;
  createdAt: string;
}

/**
 * @deprecated Use Eye interface instead. All eyes are unified.
 */
export type CustomEye = Eye;

/**
 * Pipeline Definition
 */
export interface Pipeline {
  id: string;
  name: string;
  version: number;
  description: string;
  category: PipelineCategory;
  workflowJson: {
    steps: Array<{
      id: string;
      eye?: EyeName;
      type?: "condition" | "user_input" | "terminal";
      next?: string;
      condition?: string;
      true?: string;
      false?: string;
      prompt?: string;
    }>;
  };
  active: boolean;
  createdAt: string;
}

/**
 * Provider Key (encrypted storage)
 */
export interface ProviderKey {
  id: number;
  provider: ProviderId;
  label: string;
  metadata: Record<string, unknown>;
  createdAt: string;
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
 * Routing Decision (from auto-router)
 */
export interface RoutingDecision {
  sessionId: string;
  taskType: "code" | "text" | "unknown";
  recommendedFlow: EyeName[];
  primaryProvider: ProviderId;
  primaryModel: string;
  reasoning: string;
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
