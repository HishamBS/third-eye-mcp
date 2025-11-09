/**
 * Workflow node type constants - SSOT for all workflow node types
 */

export const WORKFLOW_NODE_TYPES = {
  EYE: 'eye',
  CONDITION: 'condition',
  SWITCH: 'switch',
  LOOP: 'loop',
  USER_INPUT: 'user_input',
  TERMINAL: 'terminal',
} as const;

export type WorkflowNodeType = typeof WORKFLOW_NODE_TYPES[keyof typeof WORKFLOW_NODE_TYPES];

/**
 * Status code constants - Re-exported from eyes for convenience
 */
export const STATUS_CODES = {
  OK: 'OK',
  NEED_CLARIFICATION: 'NEED_CLARIFICATION',
} as const;
