/**
 * Intent Confirmation & Resume Flow
 *
 * Manages intent confirmation workflow and pipeline resumption.
 */
import type { IntentConfirmation } from '@third-eye/db';
export interface IntentAnalysis {
    primary: string;
    secondary: string[];
    scope: string;
    estimatedEffort: string;
    deliverables: string[];
}
export interface ConfirmationRequest {
    sessionId: string;
    intentAnalysis: IntentAnalysis;
    confirmationPrompt: string;
}
export interface ConfirmationResponse {
    confirmationId: string;
    approved: boolean;
    modified?: string;
}
/**
 * Request intent confirmation from user
 */
export declare function requestIntentConfirmation(sessionId: string, request: ConfirmationRequest): Promise<string>;
/**
 * Process user's confirmation response
 */
export declare function processConfirmationResponse(confirmationId: string, response: 'approved' | 'rejected' | 'modified', userIdentity?: string, modification?: string): Promise<void>;
/**
 * Check if session needs confirmation before proceeding
 */
export declare function checkConfirmationRequired(sessionId: string): Promise<IntentConfirmation | null>;
/**
 * Determine if pipeline can resume after confirmation
 */
export declare function canResumeAfterConfirmation(confirmation: IntentConfirmation): {
    canResume: boolean;
    statusCode: string;
    nextAction: string;
};
//# sourceMappingURL=intent-confirmation-flow.d.ts.map