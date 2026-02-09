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
  ModelInfoSchema,
  type ModelInfo,
  CompletionRequestSchema,
  type CompletionRequest,
  CompletionResponseSchema,
  type CompletionResponse,
  HealthResponseSchema,
  type HealthResponse,
  ProviderConfigSchema,
  type ProviderConfig,
  type ProviderClient,
  type Role,
} from "./providers";

export {
  PROVIDERS,
  type ProviderId,
  EYES,
  type EyeName,
  STATUS_CODES,
  SESSION_STATUS,
  type SessionStatus,
  EVENT_TYPES,
  type EventType,
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
  SessionConfig,
  Session,
  Run,
  PipelineRun,
  PipelineEvent,
  EyeRouting,
  Persona,
  PromptTemplate,
  StrictnessProfile,
  CustomEye,
  Eye,
  Pipeline,
  ProviderKey,
  RoutingDecisionRequest,
  RoutingDecision,
  McpIntegration,
  Clarification,
  ConversationEvent,
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
