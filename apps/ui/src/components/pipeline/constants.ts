/**
 * Pipeline Node Type Constants
 * Single source of truth for all pipeline node types
 */

export const NODE_TYPES = {
  EYE: 'eye',
  CONDITION: 'condition',
  SWITCH: 'switch',
  LOOP: 'loop',
  USER_INPUT: 'user_input',
  TERMINAL: 'terminal',
} as const;

export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES];

/**
 * Operators for expression builder
 */
export const OPERATORS = [
  { value: '==', label: 'equals (==)' },
  { value: '!=', label: 'not equals (!=)' },
  { value: '>', label: 'greater than (>)' },
  { value: '>=', label: 'greater or equal (>=)' },
  { value: '<', label: 'less than (<)' },
  { value: '<=', label: 'less or equal (<=)' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'regex', label: 'matches regex' },
  { value: 'in', label: 'in list' },
  { value: 'not_in', label: 'not in list' },
] as const;

export const LOGICAL_OPERATORS = {
  AND: 'AND',
  OR: 'OR',
} as const;
