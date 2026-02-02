/**
 * Type Guards - SSOT for all runtime type checking
 *
 * R07 (Strict Typing): Type guards replace `as any` casts
 *
 * Usage: Use these guards instead of `as any` or `as unknown as T`
 */

import type { PipelineDag, PipelineDagNode, PipelineDagEdge } from "./pipeline";

/**
 * Valid node types for pipeline DAG
 */
export const VALID_NODE_TYPES = [
  "Eye",
  "condition",
  "user_input",
  "terminal",
  "switch",
  "if",
  "loop_over_items",
] as const;

export type ValidNodeType = (typeof VALID_NODE_TYPES)[number];

/**
 * Type guard for valid node type
 */
export function isValidNodeType(type: unknown): type is ValidNodeType {
  return (
    typeof type === "string" && VALID_NODE_TYPES.includes(type as ValidNodeType)
  );
}

/**
 * Type guard for PipelineDagNode
 */
export function isPipelineDagNode(value: unknown): value is PipelineDagNode {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.id === "string" && isValidNodeType(obj.type);
}

/**
 * Type guard for PipelineDagEdge
 */
export function isPipelineDagEdge(value: unknown): value is PipelineDagEdge {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.from === "string" && typeof obj.to === "string";
}

/**
 * Type guard for PipelineDag
 */
export function isPipelineDag(value: unknown): value is PipelineDag {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
    return false;
  }

  // Validate all nodes
  if (!obj.nodes.every(isPipelineDagNode)) {
    return false;
  }

  // Validate all edges
  if (!obj.edges.every(isPipelineDagEdge)) {
    return false;
  }

  return true;
}

/**
 * Type guard for non-null values
 * Use instead of non-null assertion (!)
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Type guard for record with string keys
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Type guard for array of specific type
 */
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

/**
 * Type guard for error object with message
 */
export function isErrorWithMessage(
  error: unknown,
): error is { message: string } {
  return (
    isRecord(error) &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

/**
 * Type guard for error with status code
 */
export function isErrorWithStatus(
  error: unknown,
): error is { status: number } | { statusCode: number } {
  if (!isRecord(error)) return false;
  const obj = error as Record<string, unknown>;
  return typeof obj.status === "number" || typeof obj.statusCode === "number";
}

/**
 * Type guard for error with error code
 */
export function isErrorWithCode(error: unknown): error is { code: string } {
  return (
    isRecord(error) &&
    typeof (error as Record<string, unknown>).code === "string"
  );
}

/**
 * Safe cast helper - returns undefined if guard fails
 */
export function safeCast<T>(
  value: unknown,
  guard: (v: unknown) => v is T,
): T | undefined {
  return guard(value) ? value : undefined;
}

/**
 * Assert helper - throws if guard fails
 */
export function assertType<T>(
  value: unknown,
  guard: (v: unknown) => v is T,
  message: string,
): asserts value is T {
  if (!guard(value)) {
    throw new Error(message);
  }
}
