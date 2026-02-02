/**
 * @third-eye/core - Eyes orchestrator, envelope validator, routing, personas
 */

// Core orchestrator
export { EyeOrchestrator } from "./orchestrator";

// Intelligent pipeline orchestrator
export {
  PipelineOrchestrator,
  pipelineOrchestrator,
} from "./pipeline-orchestrator";
export type {
  PipelineDefinition,
  PipelineStep,
  PipelineExecutionContext,
  PipelineExecutionResult,
} from "./pipeline-orchestrator";

// Encryption utilities
export * from "./encryption";

// Model discovery and caching
export { ModelDiscoveryService, modelDiscovery } from "./model-discovery";
export type { ModelCacheEntry } from "./model-discovery";

// WebSocket bridge registration
export {
  registerWebSocketBridge,
  clearWebSocketBridge,
  getWebSocketBridge,
} from "./websocket-registry";
export type { WebSocketBridge } from "./websocket-registry";

// Guidance functions
export { getWorkflowGuidance, shouldDelegate } from "./guidance";

// Dynamic routing (Phase 17)
export { DynamicRouter, dynamicRouter } from "./routing/dynamic-router";
export type {
  EyeRouteStep,
  EyeSequence,
  ValidationResult,
  SessionContext,
} from "./routing/dynamic-router";

// Pause/Resume mechanism (Phase 1-A3)
export { PauseResumeManager } from "./pause-resume-manager";
export type {
  PipelineState,
  PendingQuestion,
  HumanResponse,
} from "./pause-resume-manager";

// Intent Confirmation (Phase 2-B)
export { IntentConfirmationManager } from "./intent-confirmation-manager";
export type {
  IntentConfirmation,
  ConfirmationResponse,
} from "./intent-confirmation-manager";

// Three Routing Modes (Phase 1-A2)
export { RoutingMode } from "./routing/routing-modes";
export type {
  RoutingPolicy,
  Constraint,
  PipelineTemplate,
  PolicyValidationResult,
  RoutingContext,
} from "./routing/routing-modes";
export { PolicyValidator } from "./routing/policy-validator";
export { TemplateExecutor } from "./routing/template-executor";
export type { TemplateExecutionPlan } from "./routing/template-executor";
export { PolicyManager } from "./routing/policy-manager";

// Workflow execution
export { WorkflowInterpreter } from "./workflow-interpreter";
export type {
  WorkflowNode,
  WorkflowDefinition,
  WorkflowExecutionOptions,
  WorkflowExecutionResult,
} from "./workflow-interpreter";

// Expression evaluation
export {
  evaluateExpression,
  validateExpression,
  evaluateSimpleCondition,
  testExpression,
  getContextField,
  CONTEXT_FIELDS,
  EXPRESSION_TEMPLATES,
} from "./expression-evaluator";
export type {
  ExpressionContext,
  ExpressionResult,
  ValidationResult as ExpressionValidationResult,
  ContextField,
  ExpressionTemplate,
} from "./expression-evaluator";

// Logger utility
export { logger, createLogger, LogLevel } from "./logger";
export type { LogContext, LoggerConfig } from "./logger";

// Auto-Router for intelligent pipeline routing
export { AutoRouter, autoRouter } from "./auto-router";
export type { AutoRouterOptions } from "./auto-router";

// Re-export Eyes for convenience
export * from "@third-eye/eyes";
