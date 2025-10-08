/**
 * Smart MCP Guidance Engine
 *
 * Provides intelligent workflow routing and delegation recommendations
 * Makes Third Eye MCP a "must-use" server by guiding agents through optimal Eye workflows
 */
/**
 * Workflow state machine - tracks current phase of work
 */
var WorkflowStage;
(function (WorkflowStage) {
    WorkflowStage["INITIAL"] = "initial_classification";
    WorkflowStage["CLARIFICATION"] = "clarification";
    WorkflowStage["INTENT_VALIDATION"] = "intent_validation";
    WorkflowStage["REQUIREMENTS"] = "requirements";
    WorkflowStage["PLANNING"] = "planning";
    WorkflowStage["SCAFFOLD"] = "scaffold_review";
    WorkflowStage["IMPLEMENTATION"] = "implementation_review";
    WorkflowStage["TESTING"] = "testing_review";
    WorkflowStage["DOCUMENTATION"] = "documentation_review";
    WorkflowStage["VALIDATION"] = "validation";
    WorkflowStage["APPROVAL"] = "final_approval";
    WorkflowStage["COMPLETE"] = "complete";
})(WorkflowStage || (WorkflowStage = {}));
/**
 * Eye delegation rules - defines optimal workflow paths
 */
const WORKFLOW_PATHS = {
    // Fast path for unambiguous code tasks
    code_fast: [
        'third_eye_navigator',
        'third_eye_sharingan_clarify',
        'third_eye_jogan_confirm_intent',
        'third_eye_rinnegan_plan_requirements',
        'third_eye_rinnegan_plan_review',
        'third_eye_mangekyo_review_scaffold',
        'third_eye_mangekyo_review_impl',
        'third_eye_mangekyo_review_tests',
        'third_eye_mangekyo_review_docs',
        'third_eye_tenseigan_validate_claims',
        'third_eye_byakugan_consistency_check',
        'third_eye_rinnegan_final_approval',
    ],
    // Full path for ambiguous code tasks
    code_full: [
        'third_eye_navigator',
        'third_eye_sharingan_clarify',
        'third_eye_helper_rewrite_prompt',
        'third_eye_jogan_confirm_intent',
        'third_eye_rinnegan_plan_requirements',
        'third_eye_rinnegan_plan_review',
        'third_eye_mangekyo_review_scaffold',
        'third_eye_mangekyo_review_impl',
        'third_eye_mangekyo_review_tests',
        'third_eye_mangekyo_review_docs',
        'third_eye_tenseigan_validate_claims',
        'third_eye_byakugan_consistency_check',
        'third_eye_rinnegan_final_approval',
    ],
    // Path for documentation/validation tasks
    validation_only: [
        'third_eye_navigator',
        'third_eye_tenseigan_validate_claims',
        'third_eye_byakugan_consistency_check',
    ],
    // Path for quick clarifications
    clarification: [
        'third_eye_sharingan_clarify',
        'third_eye_helper_rewrite_prompt',
        'third_eye_jogan_confirm_intent',
    ],
};
/**
 * Analyze task description and last response to recommend next Eye
 */
export function getWorkflowGuidance(request) {
    const { taskDescription, currentState, lastEyeResponse, sessionId } = request;
    // Detect task type from description
    const isCodeRelated = detectCodeTask(taskDescription);
    const isAmbiguous = detectAmbiguity(taskDescription, lastEyeResponse);
    const isValidationOnly = detectValidationTask(taskDescription);
    // Determine current workflow stage
    const stage = determineWorkflowStage(currentState, lastEyeResponse);
    // Select optimal workflow path
    let workflowPath;
    if (isValidationOnly) {
        workflowPath = WORKFLOW_PATHS.validation_only;
    }
    else if (isCodeRelated) {
        workflowPath = isAmbiguous ? WORKFLOW_PATHS.code_full : WORKFLOW_PATHS.code_fast;
    }
    else {
        workflowPath = WORKFLOW_PATHS.clarification;
    }
    // Find current position in workflow
    const currentTool = lastEyeResponse?.tool || null;
    const currentIndex = currentTool ? workflowPath.indexOf(currentTool) : -1;
    // Recommend next tool
    const recommendedTool = currentIndex >= 0 && currentIndex < workflowPath.length - 1
        ? workflowPath[currentIndex + 1]
        : workflowPath[0];
    // Build reasoning
    const reasoning = buildReasoning(taskDescription, isCodeRelated, isAmbiguous, isValidationOnly, stage, recommendedTool);
    // Suggest alternatives
    const alternatives = suggestAlternatives(recommendedTool, isCodeRelated, stage);
    // Build delegation chain (remaining steps)
    const delegationChain = currentIndex >= 0
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
function detectCodeTask(description) {
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
function detectAmbiguity(description, lastResponse) {
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
function detectValidationTask(description) {
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
function determineWorkflowStage(currentState, lastResponse) {
    if (lastResponse?.code === 'APPROVED' || lastResponse?.data?.approved) {
        return WorkflowStage.APPROVAL;
    }
    if (lastResponse?.tool?.includes('rinnegan_final_approval')) {
        return WorkflowStage.COMPLETE;
    }
    if (lastResponse?.tool?.includes('mangekyo_review_docs')) {
        return WorkflowStage.DOCUMENTATION;
    }
    if (lastResponse?.tool?.includes('mangekyo_review_tests')) {
        return WorkflowStage.TESTING;
    }
    if (lastResponse?.tool?.includes('mangekyo_review_impl')) {
        return WorkflowStage.IMPLEMENTATION;
    }
    if (lastResponse?.tool?.includes('mangekyo_review_scaffold')) {
        return WorkflowStage.SCAFFOLD;
    }
    if (lastResponse?.tool?.includes('rinnegan')) {
        return WorkflowStage.PLANNING;
    }
    if (lastResponse?.tool?.includes('jogan')) {
        return WorkflowStage.INTENT_VALIDATION;
    }
    if (lastResponse?.tool?.includes('helper')) {
        return WorkflowStage.CLARIFICATION;
    }
    return WorkflowStage.INITIAL;
}
/**
 * Build human-readable reasoning
 */
function buildReasoning(task, isCode, isAmbiguous, isValidation, stage, tool) {
    const reasons = [];
    if (isValidation) {
        reasons.push('Task appears to be validation-focused');
    }
    else if (isCode) {
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
function suggestAlternatives(tool, isCode, stage) {
    const alternatives = [];
    // If recommending Sharingan, alternatives could include direct navigation
    if (tool === 'third_eye_sharingan_clarify') {
        alternatives.push('third_eye_navigator');
    }
    // If recommending code review, alternatives include validation tools
    if (tool.includes('mangekyo')) {
        alternatives.push('third_eye_tenseigan_validate_claims');
        alternatives.push('third_eye_byakugan_consistency_check');
    }
    // If recommending planning, could skip to scaffold if already have plan
    if (tool.includes('rinnegan_plan')) {
        alternatives.push('third_eye_mangekyo_review_scaffold');
    }
    return alternatives;
}
/**
 * Generate actionable next steps
 */
function generateNextSteps(tool, stage, lastResponse) {
    const steps = [];
    if (tool === 'third_eye_sharingan_clarify') {
        steps.push('Submit your task description to Sharingan for classification');
        steps.push('Answer any clarifying questions that emerge');
        if (lastResponse?.data?.questions) {
            steps.push(`Prepare answers for ${lastResponse.data.questions.length} questions`);
        }
    }
    if (tool === 'third_eye_helper_rewrite_prompt') {
        steps.push('Provide your ambiguous prompt for restructuring');
        steps.push('Include any clarifications you have');
    }
    if (tool === 'third_eye_jogan_confirm_intent') {
        steps.push('Submit restructured prompt for validation');
        steps.push('Ensure all required sections are present');
    }
    if (tool.includes('rinnegan_plan')) {
        steps.push('Prepare or review your implementation plan');
        steps.push('Include file impact table and testing strategy');
    }
    if (tool.includes('mangekyo')) {
        steps.push('Submit your code changes for review');
        steps.push('Include diffs, reasoning, and test results');
    }
    if (tool.includes('tenseigan')) {
        steps.push('Provide content with factual claims');
        steps.push('Include evidence sources for verification');
    }
    if (tool.includes('byakugan')) {
        steps.push('Submit content for consistency check');
        steps.push('Previous session context will be automatically included');
    }
    return steps;
}
/**
 * Auto-delegation: Given an Eye response, determine if delegation is needed
 */
export function shouldDelegate(eyeResponse) {
    // Check if response has "next" field suggesting delegation
    if (eyeResponse.next && eyeResponse.next !== 'COMPLETE') {
        return { delegate: true, toEye: eyeResponse.next };
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
//# sourceMappingURL=guidance.js.map