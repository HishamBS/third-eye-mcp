/**
 * Smart MCP Guidance Engine
 *
 * Provides intelligent workflow routing and delegation recommendations
 * Makes Third Eye MCP a "must-use" server by guiding agents through optimal Eye workflows
 */

import type { EyeResponse } from '@third-eye/eyes';
import { EyeId } from '@third-eye/constants';

interface GuidanceRequest {
  taskDescription: string;
  currentState?: string;
  lastEyeResponse?: EyeResponse;
  sessionId: string;
}

interface GuidanceResponse {
  recommendedTool: string;
  reasoning: string;
  workflowStage: string;
  alternativeTools: string[];
  delegationChain: string[];
  nextSteps: string[];
}

/**
 * Workflow state machine - tracks current phase of work
 */
enum WorkflowStage {
  INITIAL = 'initial_classification',
  CLARIFICATION = 'clarification',
  INTENT_VALIDATION = 'intent_validation',
  REQUIREMENTS = 'requirements',
  PLANNING = 'planning',
  SCAFFOLD = 'scaffold_review',
  IMPLEMENTATION = 'implementation_review',
  TESTING = 'testing_review',
  DOCUMENTATION = 'documentation_review',
  VALIDATION = 'validation',
  APPROVAL = 'final_approval',
  COMPLETE = 'complete',
}

/**
 * Helper to construct MCP tool names from EyeId constants (SSOT)
 */
const toolName = (eyeId: string, action: string): string => `third_eye_${eyeId}_${action}`;
const navigatorTool = 'third_eye_navigator'; // Overseer navigation tool
const helperTool = 'third_eye_helper_rewrite_prompt'; // Kyuubi prompt helper tool

/**
 * Eye delegation rules - defines optimal workflow paths
 * Uses EyeId constants from SSOT
 */
const WORKFLOW_PATHS = {
  // Fast path for unambiguous code tasks
  code_fast: [
    navigatorTool,
    toolName(EyeId.SHARINGAN, 'clarify'),
    toolName(EyeId.JOGAN, 'confirm_intent'),
    toolName(EyeId.RINNEGAN, 'plan_requirements'),
    toolName(EyeId.RINNEGAN, 'plan_review'),
    toolName(EyeId.MANGEKYO, 'review_scaffold'),
    toolName(EyeId.MANGEKYO, 'review_impl'),
    toolName(EyeId.MANGEKYO, 'review_tests'),
    toolName(EyeId.MANGEKYO, 'review_docs'),
    toolName(EyeId.TENSEIGAN, 'validate_claims'),
    toolName(EyeId.BYAKUGAN, 'consistency_check'),
    toolName(EyeId.RINNEGAN, 'final_approval'),
  ],

  // Full path for ambiguous code tasks
  code_full: [
    navigatorTool,
    toolName(EyeId.SHARINGAN, 'clarify'),
    helperTool,
    toolName(EyeId.JOGAN, 'confirm_intent'),
    toolName(EyeId.RINNEGAN, 'plan_requirements'),
    toolName(EyeId.RINNEGAN, 'plan_review'),
    toolName(EyeId.MANGEKYO, 'review_scaffold'),
    toolName(EyeId.MANGEKYO, 'review_impl'),
    toolName(EyeId.MANGEKYO, 'review_tests'),
    toolName(EyeId.MANGEKYO, 'review_docs'),
    toolName(EyeId.TENSEIGAN, 'validate_claims'),
    toolName(EyeId.BYAKUGAN, 'consistency_check'),
    toolName(EyeId.RINNEGAN, 'final_approval'),
  ],

  // Path for documentation/validation tasks
  validation_only: [
    navigatorTool,
    toolName(EyeId.TENSEIGAN, 'validate_claims'),
    toolName(EyeId.BYAKUGAN, 'consistency_check'),
  ],

  // Path for quick clarifications
  clarification: [
    toolName(EyeId.SHARINGAN, 'clarify'),
    helperTool,
    toolName(EyeId.JOGAN, 'confirm_intent'),
  ],
};

/**
 * Analyze task description and last response to recommend next Eye
 */
export function getWorkflowGuidance(request: GuidanceRequest): GuidanceResponse {
  const { taskDescription, currentState, lastEyeResponse, sessionId } = request;

  // Detect task type from description
  const isCodeRelated = detectCodeTask(taskDescription);
  const isAmbiguous = detectAmbiguity(taskDescription, lastEyeResponse);
  const isValidationOnly = detectValidationTask(taskDescription);

  // Determine current workflow stage
  const stage = determineWorkflowStage(currentState, lastEyeResponse);

  // Select optimal workflow path
  let workflowPath: string[];
  if (isValidationOnly) {
    workflowPath = WORKFLOW_PATHS.validation_only;
  } else if (isCodeRelated) {
    workflowPath = isAmbiguous ? WORKFLOW_PATHS.code_full : WORKFLOW_PATHS.code_fast;
  } else {
    workflowPath = WORKFLOW_PATHS.clarification;
  }

  // Find current position in workflow using tag property
  const currentTag = lastEyeResponse?.tag ? `third_eye_${lastEyeResponse.tag}` : null;
  const currentIndex = currentTag ? workflowPath.indexOf(currentTag) : -1;

  // Recommend next tool
  const recommendedTool =
    currentIndex >= 0 && currentIndex < workflowPath.length - 1
      ? workflowPath[currentIndex + 1]
      : workflowPath[0];

  // Build reasoning
  const reasoning = buildReasoning(
    taskDescription,
    isCodeRelated,
    isAmbiguous,
    isValidationOnly,
    stage,
    recommendedTool
  );

  // Suggest alternatives
  const alternatives = suggestAlternatives(recommendedTool, isCodeRelated, stage);

  // Build delegation chain (remaining steps)
  const delegationChain =
    currentIndex >= 0
      ? workflowPath.slice(currentIndex + 1)
      : workflowPath;

  // Generate next steps guidance
  const nextSteps = generateNextSteps(recommendedTool, stage, lastEyeResponse);

  return {
    recommendedTool,
    reasoning,
    workflowStage: stage,
    alternativeTools: alternatives,
    delegationChain,
    nextSteps,
  };
}

/**
 * Detect if task is code-related
 */
function detectCodeTask(description: string): boolean {
  const codeKeywords = [
    'code',
    'implement',
    'function',
    'class',
    'api',
    'endpoint',
    'test',
    'debug',
    'fix',
    'refactor',
    'component',
    'module',
    'file',
    'diff',
    'commit',
    'merge',
    'deploy',
    'build',
  ];

  const lowerDesc = description.toLowerCase();
  return codeKeywords.some((keyword) => lowerDesc.includes(keyword));
}

/**
 * Detect if task has ambiguity
 */
function detectAmbiguity(description: string, lastResponse?: EyeResponse): boolean {
  // Check Sharingan response for ambiguity flag
  if (lastResponse?.data?.ambiguous === true) {
    return true;
  }

  // Heuristic: short descriptions (< 20 words) are often ambiguous
  const wordCount = description.split(/\s+/).length;
  if (wordCount < 20) {
    return true;
  }

  // Check for ambiguous language
  const ambiguousKeywords = [
    'maybe',
    'somehow',
    'something',
    'or something',
    'i think',
    'not sure',
    'might',
    'could be',
  ];

  const lowerDesc = description.toLowerCase();
  return ambiguousKeywords.some((keyword) => lowerDesc.includes(keyword));
}

/**
 * Detect if task is validation-only
 */
function detectValidationTask(description: string): boolean {
  const validationKeywords = [
    'validate',
    'verify',
    'check',
    'review',
    'audit',
    'consistency',
    'evidence',
    'citation',
  ];

  const lowerDesc = description.toLowerCase();
  return validationKeywords.some((keyword) => lowerDesc.includes(keyword));
}

/**
 * Determine current workflow stage
 */
function determineWorkflowStage(currentState?: string, lastResponse?: EyeResponse): string {
  // Check for approval status using proper enum comparison
  if (lastResponse?.ok === true || lastResponse?.data?.approved === true) {
    return WorkflowStage.APPROVAL;
  }

  // Use tag property instead of non-existent tool property
  const tag = lastResponse?.tag?.toLowerCase() || '';
  const nextAction = typeof lastResponse?.next === 'string' ? lastResponse.next.toLowerCase() : Array.isArray(lastResponse?.next) ? lastResponse.next.join(' ').toLowerCase() : '';

  // Check tag for eye type (using EyeId constants from SSOT)
  if (tag === EyeId.BYAKUGAN && nextAction.includes('final')) {
    return WorkflowStage.COMPLETE;
  }

  if (tag === EyeId.MANGEKYO) {
    if (nextAction.includes('docs') || nextAction.includes('documentation')) {
      return WorkflowStage.DOCUMENTATION;
    }
    if (nextAction.includes('test') || nextAction.includes('testing')) {
      return WorkflowStage.TESTING;
    }
    if (nextAction.includes('impl') || nextAction.includes('implementation')) {
      return WorkflowStage.IMPLEMENTATION;
    }
    if (nextAction.includes('scaffold')) {
      return WorkflowStage.SCAFFOLD;
    }
  }

  if (tag === EyeId.RINNEGAN) {
    return WorkflowStage.PLANNING;
  }

  if (tag === EyeId.JOGAN) {
    return WorkflowStage.INTENT_VALIDATION;
  }

  if (tag === EyeId.KYUUBI || tag === 'prompt-helper') {
    return WorkflowStage.CLARIFICATION;
  }

  return WorkflowStage.INITIAL;
}

/**
 * Build human-readable reasoning
 */
function buildReasoning(
  task: string,
  isCode: boolean,
  isAmbiguous: boolean,
  isValidation: boolean,
  stage: string,
  tool: string
): string {
  const reasons: string[] = [];

  if (isValidation) {
    reasons.push('Task appears to be validation-focused');
  } else if (isCode) {
    reasons.push('Task involves code development');
  }

  if (isAmbiguous) {
    reasons.push('Task description has ambiguities that need clarification');
  }

  reasons.push(`Current workflow stage: ${stage}`);
  reasons.push(`Recommended next step: ${tool}`);

  return reasons.join('. ');
}

/**
 * Suggest alternative tools based on context
 */
function suggestAlternatives(tool: string, isCode: boolean, stage: string): string[] {
  const alternatives: string[] = [];

  // If recommending Sharingan, alternatives could include direct navigation
  if (tool === toolName(EyeId.SHARINGAN, 'clarify')) {
    alternatives.push(navigatorTool);
  }

  // If recommending code review, alternatives include validation tools
  if (tool.includes(EyeId.MANGEKYO)) {
    alternatives.push(toolName(EyeId.TENSEIGAN, 'validate_claims'));
    alternatives.push(toolName(EyeId.BYAKUGAN, 'consistency_check'));
  }

  // If recommending planning, could skip to scaffold if already have plan
  if (tool.includes(`${EyeId.RINNEGAN}_plan`)) {
    alternatives.push(toolName(EyeId.MANGEKYO, 'review_scaffold'));
  }

  return alternatives;
}

/**
 * Generate actionable next steps
 */
function generateNextSteps(tool: string, stage: string, lastResponse?: EyeResponse): string[] {
  const steps: string[] = [];

  if (tool === toolName(EyeId.SHARINGAN, 'clarify')) {
    steps.push('Submit your task description to Sharingan for classification');
    steps.push('Answer any clarifying questions that emerge');
    // Type guard for questions array
    if (lastResponse?.data?.questions && Array.isArray(lastResponse.data.questions)) {
      steps.push(`Prepare answers for ${lastResponse.data.questions.length} questions`);
    }
  }

  if (tool === helperTool) {
    steps.push('Provide your ambiguous prompt for restructuring');
    steps.push('Include any clarifications you have');
  }

  if (tool === toolName(EyeId.JOGAN, 'confirm_intent')) {
    steps.push('Submit restructured prompt for validation');
    steps.push('Ensure all required sections are present');
  }

  if (tool.includes(`${EyeId.RINNEGAN}_plan`)) {
    steps.push('Prepare or review your implementation plan');
    steps.push('Include file impact table and testing strategy');
  }

  if (tool.includes(EyeId.MANGEKYO)) {
    steps.push('Submit your code changes for review');
    steps.push('Include diffs, reasoning, and test results');
  }

  if (tool.includes(EyeId.TENSEIGAN)) {
    steps.push('Provide content with factual claims');
    steps.push('Include evidence sources for verification');
  }

  if (tool.includes(EyeId.BYAKUGAN)) {
    steps.push('Submit content for consistency check');
    steps.push('Previous session context will be automatically included');
  }

  return steps;
}

/**
 * Auto-delegation: Given an Eye response, determine if delegation is needed
 */
export function shouldDelegate(eyeResponse: EyeResponse): { delegate: boolean; toEye?: string } {
  // Check if response has "next" field suggesting delegation
  // Handle both string and string[] types for next property
  const nextValue = Array.isArray(eyeResponse.next) ? eyeResponse.next[0] : eyeResponse.next;
  if (nextValue && typeof nextValue === 'string' && nextValue !== 'COMPLETE') {
    return { delegate: true, toEye: nextValue };
  }

  // Check ambiguity flag from Sharingan
  if (eyeResponse.data?.ambiguous === true) {
    return { delegate: true, toEye: 'third_eye_helper_rewrite_prompt' };
  }

  // Check approval flag from any review Eye
  if (eyeResponse.data?.approved === false) {
    // Don't auto-delegate on rejection - user needs to fix
    return { delegate: false };
  }

  // Check for completion codes
  if (['APPROVED', 'OK', 'VALID'].includes(eyeResponse.code)) {
    // Continue workflow
    return { delegate: false };
  }

  return { delegate: false };
}
