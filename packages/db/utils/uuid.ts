import { randomUUID } from "node:crypto";

/**
 * UUID Generation Utility - SSOT for all entity ID generation
 *
 * R01 (SSOT/DRY): ALL ID generation MUST use this module
 * R13 (No Magic Numbers): ID prefixes centralized here
 *
 * V2 Standard: All IDs use crypto.randomUUID() for consistency
 */

/**
 * ID Prefixes - SSOT for all entity ID prefixes
 */
export const ID_PREFIXES = {
  DUEL: "duel-",
  WEBSOCKET: "ws-",
  TEMPLATE: "tmpl-",
  REQUEST: "req-",
  PLAYGROUND: "playground-",
  SESSION: "sess-",
  RUN: "run-",
  EVENT: "evt-",
  PIPELINE: "pipe-",
  POLICY: "pol-",
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

/**
 * Generate a UUID - SSOT for all ID generation
 * All IDs standardized on crypto.randomUUID() format
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Generate a prefixed ID
 * @param prefix - Prefix from ID_PREFIXES or custom string
 */
export function generatePrefixedId(prefix: IdPrefix | string): string {
  return `${prefix}${randomUUID()}`;
}

/**
 * Generate a session ID (no prefix for backward compatibility)
 */
export function generateSessionId(): string {
  return randomUUID();
}

/**
 * Generate a duel session ID
 */
export function generateDuelSessionId(): string {
  return generatePrefixedId(ID_PREFIXES.DUEL);
}

/**
 * Generate a WebSocket connection ID
 */
export function generateWebSocketId(): string {
  return generatePrefixedId(ID_PREFIXES.WEBSOCKET);
}

/**
 * Generate a request ID
 */
export function generateRequestId(): string {
  return generatePrefixedId(ID_PREFIXES.REQUEST);
}

/**
 * Generate a template ID
 */
export function generateTemplateId(): string {
  return generatePrefixedId(ID_PREFIXES.TEMPLATE);
}

/**
 * Generate a run ID
 */
export function generateRunId(): string {
  return randomUUID();
}

/**
 * Generate an event ID
 */
export function generateEventId(): string {
  return randomUUID();
}

/**
 * Generate a pipeline ID
 */
export function generatePipelineId(): string {
  return randomUUID();
}

/**
 * Generate a playground session ID
 */
export function generatePlaygroundSessionId(): string {
  return generatePrefixedId(ID_PREFIXES.PLAYGROUND);
}

/**
 * Generate a policy ID
 */
export function generatePolicyId(): string {
  return randomUUID();
}

// Alias for clarity in contexts expecting UUID terminology
export const generateUUID = generateId;
