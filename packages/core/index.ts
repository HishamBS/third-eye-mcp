/**
 * @third-eye/core - Eyes orchestrator, envelope validator, routing, personas
 */

// Core orchestrator
export { EyeOrchestrator } from './orchestrator';

// Intelligent pipeline orchestrator
export { PipelineOrchestrator, pipelineOrchestrator } from './pipeline-orchestrator';
export type {
  PipelineDefinition,
  PipelineStep,
  PipelineExecutionContext,
  PipelineExecutionResult
} from './pipeline-orchestrator';

// Encryption utilities
export * from './encryption';

// Model discovery and caching
export { ModelDiscoveryService, modelDiscovery } from './model-discovery';
export type { ModelCacheEntry } from './model-discovery';

// WebSocket bridge registration
export { registerWebSocketBridge, clearWebSocketBridge, getWebSocketBridge } from './websocket-registry';
export type { WebSocketBridge } from './websocket-registry';

// Guidance functions
export { getWorkflowGuidance, shouldDelegate } from './guidance';

// Dynamic routing (Phase 17)
export { DynamicRouter, dynamicRouter } from './routing/dynamic-router';
export type {
  EyeRouteStep,
  EyeSequence,
  ValidationResult,
  SessionContext
} from './routing/dynamic-router';

// Logger utility
export { logger, createLogger, LogLevel } from './logger';
export type { LogContext, LoggerConfig } from './logger';

// Re-export Eyes for convenience
export * from '@third-eye/eyes';
