/**
 * Workflow node type constants - SSOT for all workflow node types
 */

export const WORKFLOW_NODE_TYPES = {
  EYE: "eye",
  CONDITION: "condition",
  SWITCH: "switch",
  LOOP: "loop",
  USER_INPUT: "user_input",
  TERMINAL: "terminal",
} as const;

export type WorkflowNodeType =
  (typeof WORKFLOW_NODE_TYPES)[keyof typeof WORKFLOW_NODE_TYPES];

/**
 * Workflow-level status codes used by the workflow interpreter.
 * These are distinct from the Eye-level StatusCodes in @third-eye/types/envelope
 * which contain fine-grained codes like OK_PLAN, OK_CLASSIFICATION, etc.
 * The workflow interpreter only needs coarse OK / NEED_CLARIFICATION signals.
 */
export const WORKFLOW_STATUS_CODES = {
  OK: "OK",
  NEED_CLARIFICATION: "NEED_CLARIFICATION",
} as const;

/**
 * @deprecated Use WORKFLOW_STATUS_CODES instead. Alias for backward compatibility.
 */
export const STATUS_CODES = WORKFLOW_STATUS_CODES;
