/**
 * @third-eye/types - Shared type definitions for Third Eye MCP
 */

export {
  Envelope,
  validateEnvelope,
  parseEnvelope,
  StatusCodes,
  type StatusCode,
  NextActions,
  type NextAction,
} from "./envelope";

export {
  ProviderModelInfoSchema,
  type ProviderModelInfo,
  CompletionRequestSchema,
  type CompletionRequest,
  CompletionResponseSchema,
  type CompletionResponse,
  HealthResponseSchema,
  type HealthResponse,
  type HealthStatus,
  ProviderConfigSchema,
  type ProviderConfig,
  type ProviderClient,
  type FunctionTool,
  type ToolCall,
  ToolCallSchema,
  type Role,
  ProviderEndpointConfigSchema,
  type ProviderEndpointConfig,
} from "./providers";

export {
  PROVIDERS,
  type ProviderId,
  LOCAL_PROVIDERS,
  type LocalProviderId,
  EYES,
  type EyeName,
  STATUS_CODES,
  SESSION_STATUS,
  type SessionStatus,
  EVENT_TYPES,
  type EventType,
  WS_ENVELOPE_TYPES,
  type WsEnvelopeType,
  STRICTNESS_LEVELS,
  type StrictnessLevel,
  THEMES,
  type ThemeName,
  REPLAY_SPEEDS,
  type ReplaySpeed,
  EXPORT_FORMATS,
  type ExportFormat,
  PROMPT_CATEGORIES,
  type PromptCategory,
  PIPELINE_CATEGORIES,
  type PipelineCategory,
  isStatusCode,
} from "./enums";

export {
  TOOL_NAME,
  CLI_BIN,
  CLI_EXEC,
  DATA_DIRECTORY,
  STRICTNESS_PRESETS,
  DEFAULT_STRICTNESS_PRESET,
} from "./constants";

export type {
  StrictnessSettings,
  StrictnessPresetId,
  StrictnessPreset,
} from "./constants";

export type {
  OverseerEnvelope,
  ModelInfo,
  SessionConfig,
  Session,
  Run,
  PipelineEvent,
  EyeRouting,
  Persona,
  PromptTemplate,
  StrictnessProfile,
  Eye,
  Pipeline,
  PipelineWorkflow,
  ProviderKey,
  RoutingDecisionRequest,
  RoutingDecision,
  McpIntegration,
  Clarification,
  ConversationEvent,
  AppSettings,
  OrderViolation,
  ProblemJson,
  ExportRequest,
  DuelConfig,
  DuelResult,
  MetricsSummary,
  ApiEnvelope,
} from "./interfaces";

export type { PipelineDagNode, PipelineDagEdge, PipelineDag } from "./pipeline";

// Type Guards - R07 SSOT
export {
  VALID_NODE_TYPES,
  type ValidNodeType,
  isValidNodeType,
  isPipelineDagNode,
  isPipelineDagEdge,
  isPipelineDag,
  isNotNull,
  isNonEmptyString,
  isRecord,
  isArrayOf,
  isErrorWithMessage,
  isErrorWithStatus,
  isErrorWithCode,
  safeCast,
  assertType,
} from "./guards";

export { z } from "zod";

// Persona types - SSOT for persona/blueprint data structures
export type {
  PersonaLLMConfig,
  PersonaPhase,
  PersonaEnvelopeContract,
  PersonaMetadata,
  BlueprintApiResponse,
} from "./persona";

export {
  extractMetadata,
  extractPhases,
  extractEnvelopeContract,
  extractReminders,
  extractLLMConfig,
} from "./persona";

// Eye persona types - SSOT for Eye persona configuration
export type {
  EyeVoice,
  EyeColorPalette,
  EyeAnimationSpeeds,
  EyePhrases,
  EyePersonaConfig,
  CustomEyeConfig,
  PipelineContext,
  ClarificationPromptData,
  PlanApprovalData,
  ReviewIssueData,
} from "./theatre";
