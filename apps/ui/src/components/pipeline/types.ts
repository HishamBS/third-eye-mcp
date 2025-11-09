/**
 * Type definitions for pipeline configuration modals
 */

import type { NodeType } from './constants';
import type { OPERATORS, LOGICAL_OPERATORS } from './constants';

export type Operator = typeof OPERATORS[number]['value'];
export type LogicalOperator = typeof LOGICAL_OPERATORS[keyof typeof LOGICAL_OPERATORS];

export interface SimpleCondition {
  field: string;
  operator: Operator;
  value: string;
}

export interface SwitchRule {
  expression: string;
  label: string;
  outputIndex: number;
}

export interface SwitchNodeConfig {
  mode: 'rules' | 'expression';
  rules?: SwitchRule[];
  fallbackIndex?: number;
  sendToAll?: boolean;
}

export interface IFNodeConfig {
  condition: string;
  trueLabel?: string;
  falseLabel?: string;
}

export interface LoopNodeConfig {
  maxIterations?: number;
  batchSize?: number;
}

export interface PipelineStep {
  id: string;
  eye?: string;
  type?: NodeType;
  next?: string;
  condition?: string;
  true?: string;
  false?: string;
  prompt?: string;
  switchConfig?: SwitchNodeConfig;
  loopConfig?: LoopNodeConfig;
  trueLabel?: string;
  falseLabel?: string;
}

export interface WorkflowJson {
  steps: PipelineStep[];
}

export interface ExpressionBuilderProps {
  value: string;
  onChange: (expression: string) => void;
  mode?: 'simple' | 'advanced';
  placeholder?: string;
  availableFields?: string[];
  showTemplates?: boolean;
}
