/**
 * Smart MCP Guidance Engine
 *
 * Provides intelligent workflow routing and delegation recommendations
 * Makes Third Eye MCP a "must-use" server by guiding agents through optimal Eye workflows
 */
interface GuidanceRequest {
    taskDescription: string;
    currentState?: string;
    lastEyeResponse?: any;
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
 * Analyze task description and last response to recommend next Eye
 */
export declare function getWorkflowGuidance(request: GuidanceRequest): GuidanceResponse;
/**
 * Auto-delegation: Given an Eye response, determine if delegation is needed
 */
export declare function shouldDelegate(eyeResponse: any): {
    delegate: boolean;
    toEye?: string;
};
export {};
//# sourceMappingURL=guidance.d.ts.map